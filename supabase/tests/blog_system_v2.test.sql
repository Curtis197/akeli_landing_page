-- supabase/tests/blog_system_v2.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(8);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('30000000-0000-0000-0000-000000000001', 'creator2@blog.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001', 'Blog Creator V2');

INSERT INTO public.blog_post (id, creator_id, visibility)
VALUES ('30000000-0000-0000-0000-000000000010',
        '30000000-0000-0000-0000-000000000002', 'public');

-- ── Test 1: valid category accepted ───────────────────────────────────────────

UPDATE public.blog_post SET category = 'technique'
WHERE id = '30000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT category FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  'technique',
  'Valid category is accepted'
);

-- ── Test 2: invalid category rejected ─────────────────────────────────────────

SELECT throws_ok(
  $$ UPDATE public.blog_post SET category = 'not-a-category'
     WHERE id = '30000000-0000-0000-0000-000000000010' $$,
  '23514', NULL,
  'Invalid blog_post category is rejected'
);

-- ── Test 3: tags/view_count/recipe_embeds defaults ────────────────────────────

SELECT is(
  (SELECT tags FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  '{}'::text[],
  'tags defaults to empty array'
);

SELECT is(
  (SELECT view_count FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  0,
  'view_count defaults to 0'
);

SELECT is(
  (SELECT recipe_embeds FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  '{}'::uuid[],
  'recipe_embeds defaults to empty array'
);

-- ── Test 4: draft_data stores arbitrary JSONB ─────────────────────────────────

UPDATE public.blog_post
SET draft_data = '{"title": "draft"}'::jsonb,
    scheduled_publish_at = now() + interval '1 day'
WHERE id = '30000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT draft_data ->> 'title' FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  'draft',
  'draft_data stores arbitrary JSONB'
);

-- ── Test 5: blog_post_translation new columns accept values ──────────────────

INSERT INTO public.blog_post_translation
  (post_id, locale, title, content_json, excerpt, seo_title, seo_description, reading_time_min)
VALUES
  ('30000000-0000-0000-0000-000000000010', 'fr', 'Mon Article V2', '[]',
   'Un extrait', 'Titre SEO', 'Description SEO', 4);

SELECT is(
  (SELECT reading_time_min FROM public.blog_post_translation
   WHERE post_id = '30000000-0000-0000-0000-000000000010' AND locale = 'fr'),
  4,
  'reading_time_min stores computed value'
);

-- ── Test 6: increment_post_view increments view_count ─────────────────────────

SELECT public.increment_post_view('30000000-0000-0000-0000-000000000010');

SELECT is(
  (SELECT view_count FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  1,
  'increment_post_view increments view_count by 1'
);

SELECT * FROM finish();
ROLLBACK;
