-- pgTAP tests for the replace_recipe_steps RPC.
--
-- HOW TO RUN (via Supabase MCP execute_sql):
--   The MCP tool runs each statement in a separate session, so multi-statement
--   scripts that rely on shared temp-table state (e.g. BEGIN/plan/DO/finish)
--   do NOT work.  The correct approach is a single wrapper function:
--
--     1. CREATE OR REPLACE FUNCTION public._run_rrs_tests() ...
--     2. SELECT * FROM public._run_rrs_tests();
--     3. DROP FUNCTION public._run_rrs_tests();
--
--   pgTAP's ok()/is() etc. RETURN the TAP line as text — they must be called
--   with RETURN QUERY SELECT extensions.ok(...), not PERFORM extensions.ok(...).
--
-- HOW TO RUN (via psql / supabase db execute):
--   The multi-statement block at the bottom works directly in psql because all
--   statements share the same session.  Set search_path first:
--     SET search_path TO extensions, public;
--   then paste the full BEGIN … ROLLBACK block.
--
-- Three test cases:
--   1. Happy path        — replaces old steps, returns correct count.
--   2. Constraint rollback — null content on a non-header step violates
--                           chk_recipe_step_section_header; original rows survive.
--   3. Empty-array reject — raises exception, row count unchanged.
--
-- Fixture: uses existing creator f1414791-8f57-4bf4-a730-42f3c89dad95
-- ("Akeli Kitchen") to avoid triggering create_creator_support_conversation()
-- which requires a non-null user_id → FK to auth.users.

-- ─────────────────────────────────────────────────────────────────────────────
-- MCP runner (verified green 2026-06-25, all 9 assertions pass)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._run_rrs_tests()
RETURNS SETOF text LANGUAGE plpgsql AS $body$
DECLARE
  v_result int;
  v_recipe uuid := '00000000-0000-0000-0000-000000000003';
  v_before int;
BEGIN
  DELETE FROM public.recipe WHERE id = v_recipe;

  RETURN QUERY SELECT extensions.plan(9);

  INSERT INTO public.recipe (id, creator_id, title, language, is_published)
  VALUES (v_recipe, 'f1414791-8f57-4bf4-a730-42f3c89dad95', 'pgTAP RRS Test', 'fr', false);
  INSERT INTO public.recipe_step (recipe_id, step_number, sort_order, content, is_section_header)
  VALUES (v_recipe, 1, 0, 'Original A', false),
         (v_recipe, 2, 1, 'Original B', false);

  -- ── Test 1: Happy path ───────────────────────────────────────────────────────
  v_result := public.replace_recipe_steps(v_recipe, '[
    {"step_number":1,"sort_order":0,"title":null,"content":"New A","timer_seconds":null,"is_section_header":false},
    {"step_number":2,"sort_order":1,"title":null,"content":"New B","timer_seconds":null,"is_section_header":false},
    {"step_number":3,"sort_order":2,"title":null,"content":"New C","timer_seconds":null,"is_section_header":false}
  ]'::jsonb);

  RETURN QUERY SELECT extensions.ok(v_result = 3, 'happy path: return value = 3');
  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe),
    3, 'happy path: 3 rows in recipe_step');
  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step
     WHERE recipe_id = v_recipe AND content IN ('New A','New B','New C')),
    3, 'happy path: new step contents present');
  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step
     WHERE recipe_id = v_recipe AND content IN ('Original A','Original B')),
    0, 'happy path: old steps removed');

  -- ── Test 2: Constraint-violation rollback ────────────────────────────────────
  -- null content on a non-header step violates chk_recipe_step_section_header.
  BEGIN
    PERFORM public.replace_recipe_steps(v_recipe, '[
      {"step_number":1,"sort_order":0,"title":null,"content":"Good","timer_seconds":null,"is_section_header":false},
      {"step_number":2,"sort_order":1,"title":null,"content":null,"timer_seconds":null,"is_section_header":false}
    ]'::jsonb);
    RETURN QUERY SELECT extensions.fail('constraint violation: expected exception, got none');
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT extensions.pass('constraint violation: exception raised');
  END;

  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe),
    3, 'constraint rollback: step count unchanged (3 from test 1)');
  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step
     WHERE recipe_id = v_recipe AND content = 'Good'),
    0, 'constraint rollback: partial insert did not survive');

  -- ── Test 3: Empty-array rejected ─────────────────────────────────────────────
  SELECT count(*)::int INTO v_before
  FROM public.recipe_step WHERE recipe_id = v_recipe;

  BEGIN
    PERFORM public.replace_recipe_steps(v_recipe, '[]'::jsonb);
    RETURN QUERY SELECT extensions.fail('empty array: expected exception, got none');
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT extensions.pass('empty array: exception raised');
  END;

  RETURN QUERY SELECT extensions.is(
    (SELECT count(*)::int FROM public.recipe_step WHERE recipe_id = v_recipe),
    v_before, 'empty array: row count unchanged');

  RETURN QUERY SELECT * FROM extensions.finish();

  DELETE FROM public.recipe WHERE id = v_recipe;

EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.recipe WHERE id = v_recipe;
  RAISE;
END $body$;

-- Run:
SELECT * FROM public._run_rrs_tests();

-- Cleanup:
DROP FUNCTION public._run_rrs_tests();
