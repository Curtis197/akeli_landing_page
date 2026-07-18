-- supabase/tests/blog_reader_translation_dedup.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(2);

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('65000000-0000-0000-0000-000000000001', 'creator-user@deduptest.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES ('65000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('65000000-0000-0000-0000-000000000010', '65000000-0000-0000-0000-000000000001', 'Dedup Test Creator');

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES ('65000000-0000-0000-0000-000000000020', '65000000-0000-0000-0000-000000000010', 'dedup-test-post', 'public', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES
  ('65000000-0000-0000-0000-000000000020', 'en', 'English Title', '[]'::jsonb, 'en excerpt', 1),
  ('65000000-0000-0000-0000-000000000020', 'fr', 'Titre Francais', '[]'::jsonb, 'fr excerpt', 1);

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('65000000-0000-0000-0000-000000000010') WHERE slug = 'dedup-test-post'),
  1,
  'get_creator_blog_feed returns exactly one row for a post with two translation rows'
);

SELECT is(
  (SELECT count(*)::int FROM get_blog_post_for_reader('65000000-0000-0000-0000-000000000010', 'dedup-test-post')),
  1,
  'get_blog_post_for_reader returns exactly one row for a post with two translation rows'
);

SELECT * FROM finish();
ROLLBACK;
