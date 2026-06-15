-- supabase/tests/recipe_wizard.test.sql
BEGIN;
SELECT plan(12);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@akeli.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES ('00000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001', 'Test Creator');

INSERT INTO public.food_region (code, name_fr, name_en)
VALUES ('WAF', 'Afrique de l''Ouest', 'West Africa');

INSERT INTO public.measurement_unit (code, name_fr, name_en)
VALUES ('g', 'grammes', 'grams'), ('kg', 'kilogrammes', 'kilograms');

INSERT INTO public.ingredient_category (code, name_fr, name_en)
VALUES ('GRAIN', 'Céréales', 'Grains');

INSERT INTO public.ingredient (id, name, name_fr, status, calories_per_100g,
  protein_per_100g, carbs_per_100g, fat_per_100g, category)
VALUES ('00000000-0000-0000-0000-000000000003', 'Riz', 'Riz', 'validated',
        130, 2.7, 28.0, 0.3, 'GRAIN');

INSERT INTO public.tag (id, name, name_fr)
VALUES ('00000000-0000-0000-0000-000000000004', 'africain', 'Africain');

-- ── Test 1: slug auto-generated on INSERT ─────────────────────────────────────

INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000002',
        'Jollof Rice Test', 'easy', 30, 4);

SELECT ok(
  (SELECT slug IS NOT NULL FROM public.recipe
   WHERE id = '00000000-0000-0000-0000-000000000010'),
  'slug auto-generated on recipe INSERT'
);

-- ── Test 2: recipe_macro auto-created on INSERT ───────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM public.recipe_macro
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_macro row created automatically after recipe INSERT'
);

-- ── Test 3: recipe_macro UPDATE succeeds ──────────────────────────────────────

UPDATE public.recipe_macro
SET calories = 520, protein_g = 10.8
WHERE recipe_id = '00000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT calories::int FROM public.recipe_macro
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  520,
  'recipe_macro UPDATE persists correctly'
);

-- ── Test 4: recipe_ingredient with valid unit FK accepted ─────────────────────

INSERT INTO public.recipe_ingredient
  (recipe_id, ingredient_id, quantity, unit, sort_order)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000003', 200, 'g', 0);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_ingredient
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_ingredient with valid unit FK inserts successfully'
);

-- ── Test 5: recipe_ingredient with invalid unit FK rejected ───────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe_ingredient
    (recipe_id, ingredient_id, quantity, unit, sort_order)
   VALUES ('00000000-0000-0000-0000-000000000010',
           '00000000-0000-0000-0000-000000000003', 100, 'invalid_unit', 1)$$,
  '23503',
  NULL,
  'recipe_ingredient with unknown unit code raises FK violation'
);

-- ── Test 6: section header row (ingredient_id null) accepted ──────────────────

INSERT INTO public.recipe_ingredient
  (recipe_id, ingredient_id, quantity, unit, sort_order, is_section_header, title)
VALUES ('00000000-0000-0000-0000-000000000010',
        NULL, NULL, NULL, 1, TRUE, 'Pour la sauce');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_ingredient
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = TRUE),
  1,
  'section header row with null ingredient_id/quantity/unit inserts successfully'
);

-- ── Test 7: recipe_step with section header accepted ──────────────────────────

INSERT INTO public.recipe_step
  (recipe_id, step_number, content, sort_order, is_section_header, title)
VALUES ('00000000-0000-0000-0000-000000000010', 0, NULL, 0, TRUE, 'Préparation');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_step
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = TRUE),
  1,
  'recipe_step section header with null content inserts successfully'
);

-- ── Test 8: recipe_step with ingredient_ids array accepted ────────────────────

INSERT INTO public.recipe_step
  (recipe_id, step_number, content, sort_order, is_section_header, ingredient_ids)
VALUES ('00000000-0000-0000-0000-000000000010', 1, 'Faire cuire le riz.', 1, FALSE,
        ARRAY['00000000-0000-0000-0000-000000000003']::uuid[]);

SELECT is(
  (SELECT array_length(ingredient_ids, 1)
   FROM public.recipe_step
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = FALSE),
  1,
  'recipe_step ingredient_ids array stored correctly'
);

-- ── Test 9: recipe difficulty constraint ──────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings)
    VALUES ('00000000-0000-0000-0000-000000000011',
            '00000000-0000-0000-0000-000000000002',
            'Bad Recipe', 'super_easy', 10, 2)$$,
  '23514',
  NULL,
  'recipe with invalid difficulty value raises check constraint'
);

-- ── Test 10: recipe preferred_meal_type constraint ────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings,
      preferred_meal_type)
    VALUES ('00000000-0000-0000-0000-000000000012',
            '00000000-0000-0000-0000-000000000002',
            'Bad Meal Type', 'easy', 10, 2, 'brunch')$$,
  '23514',
  NULL,
  'recipe with invalid preferred_meal_type raises check constraint'
);

-- ── Test 11: recipe_tag FK enforced ──────────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe_tag (recipe_id, tag_id)
    VALUES ('00000000-0000-0000-0000-000000000010',
            '99999999-9999-9999-9999-999999999999')$$,
  '23503',
  NULL,
  'recipe_tag with unknown tag_id raises FK violation'
);

-- ── Test 12: recipe_tag valid insert accepted ─────────────────────────────────

INSERT INTO public.recipe_tag (recipe_id, tag_id)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000004');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_tag
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_tag with valid tag_id inserts successfully'
);

SELECT * FROM finish();
ROLLBACK;
