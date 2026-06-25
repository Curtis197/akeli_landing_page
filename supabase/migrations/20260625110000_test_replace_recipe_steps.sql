-- pgTAP tests for replace_recipe_steps RPC.
-- Runs inside BEGIN/ROLLBACK — no data persists.
--
-- Three cases:
--   1. Happy path: replaces old steps, returns correct count.
--   2. Constraint-violation rollback: null content on a non-header step
--      triggers chk_recipe_step_section_header; old rows survive.
--   3. Empty-array reject: raises exception, no rows changed.

BEGIN;
SELECT plan(9);

-- Fixture: temp recipe inside this transaction (no FK to auth.users needed
-- because creator.user_id -> user_profile, and recipe.creator_id -> creator).
-- We insert a minimal user_profile → creator → recipe chain so FK constraints pass.
INSERT INTO public.user_profile (id) VALUES ('00000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name, username)
VALUES ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'pgTAP', 'pgtap_rrs');

INSERT INTO public.recipe (id, creator_id, title, language)
VALUES ('00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000002',
        'pgTAP Recipe', 'fr');

-- Seed two original steps.
INSERT INTO public.recipe_step (recipe_id, step_number, sort_order, content, is_section_header)
VALUES
  ('00000000-0000-0000-0000-000000000003', 1, 0, 'Original A', false),
  ('00000000-0000-0000-0000-000000000003', 2, 1, 'Original B', false);

-- ── Test 1: Happy path ─────────────────────────────────────────────────────

DO $$
DECLARE
  v_result int;
  v_recipe uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
  v_result := public.replace_recipe_steps(v_recipe, '[
    {"step_number":1,"sort_order":0,"title":null,"content":"New A","timer_seconds":null,"is_section_header":false},
    {"step_number":2,"sort_order":1,"title":null,"content":"New B","timer_seconds":null,"is_section_header":false},
    {"step_number":3,"sort_order":2,"title":null,"content":"New C","timer_seconds":null,"is_section_header":false}
  ]'::jsonb);
  PERFORM ok(v_result = 3, 'happy path: returns step count 3');
  PERFORM is((SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe), 3,
             'happy path: 3 rows in recipe_step');
  PERFORM is((SELECT count(*)::int FROM public.recipe_step
              WHERE recipe_id = v_recipe AND content IN ('New A','New B','New C')), 3,
             'happy path: new step contents present');
  PERFORM is((SELECT count(*)::int FROM public.recipe_step
              WHERE recipe_id = v_recipe AND content IN ('Original A','Original B')), 0,
             'happy path: old steps removed');
END $$;

-- ── Test 2: Constraint-violation rollback ──────────────────────────────────

DO $$
DECLARE
  v_recipe uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
  BEGIN
    PERFORM public.replace_recipe_steps(v_recipe, '[
      {"step_number":1,"sort_order":0,"title":null,"content":"Good","timer_seconds":null,"is_section_header":false},
      {"step_number":2,"sort_order":1,"title":null,"content":null,"timer_seconds":null,"is_section_header":false}
    ]'::jsonb);
    PERFORM fail('constraint violation: expected exception, got none');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pass('constraint violation: exception raised');
  END;
  PERFORM is((SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe), 3,
             'constraint violation rollback: step count unchanged (3 from test 1)');
  PERFORM is((SELECT count(*)::int FROM public.recipe_step
              WHERE recipe_id = v_recipe AND content = 'Good'), 0,
             'constraint violation rollback: partial insert did not survive');
END $$;

-- ── Test 3: Empty-array rejected ───────────────────────────────────────────

DO $$
DECLARE
  v_recipe  uuid := '00000000-0000-0000-0000-000000000003';
  v_before  int;
BEGIN
  SELECT count(*)::int INTO v_before FROM public.recipe_step WHERE recipe_id = v_recipe;
  BEGIN
    PERFORM public.replace_recipe_steps(v_recipe, '[]'::jsonb);
    PERFORM fail('empty array: expected exception, got none');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pass('empty array: exception raised');
  END;
  PERFORM is((SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe), v_before,
             'empty array: row count unchanged');
END $$;

SELECT * FROM finish();
ROLLBACK;
