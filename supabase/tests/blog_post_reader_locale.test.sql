-- supabase/tests/blog_post_reader_locale.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(1);

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('64000000-0000-0000-0000-000000000001', 'creator-user@localetest.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES ('64000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('64000000-0000-0000-0000-000000000010', '64000000-0000-0000-0000-000000000001', 'Locale Test Creator');

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES ('64000000-0000-0000-0000-000000000020', '64000000-0000-0000-0000-000000000010', 'locale-test-post', 'public', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES ('64000000-0000-0000-0000-000000000020', 'en', 'English Title',
        '[{"id":"b1","type":"paragraph","text":"hello"}]'::jsonb, 'excerpt', 2);

SELECT is(
  (SELECT locale FROM get_blog_post_for_reader('64000000-0000-0000-0000-000000000010', 'locale-test-post')),
  'en',
  'get_blog_post_for_reader returns the translation''s actual locale'
);

SELECT * FROM finish();
ROLLBACK;
