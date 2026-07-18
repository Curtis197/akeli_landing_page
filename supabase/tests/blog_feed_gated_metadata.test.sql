-- supabase/tests/blog_feed_gated_metadata.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(4);

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES
  ('63000000-0000-0000-0000-000000000001', 'follower@feedmeta.test', now(), now(), 'authenticated', 'authenticated'),
  ('63000000-0000-0000-0000-000000000002', 'stranger@feedmeta.test', now(), now(), 'authenticated', 'authenticated'),
  ('63000000-0000-0000-0000-000000000003', 'creator-user@feedmeta.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES
  ('63000000-0000-0000-0000-000000000001'),
  ('63000000-0000-0000-0000-000000000002'),
  ('63000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('63000000-0000-0000-0000-000000000010',
        '63000000-0000-0000-0000-000000000003', 'Feed Metadata Test Creator');

INSERT INTO public.creator_follow (user_id, creator_id, active)
VALUES ('63000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000010', true);

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES ('63000000-0000-0000-0000-000000000020',
        '63000000-0000-0000-0000-000000000010', 'followers-post', 'followers', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES ('63000000-0000-0000-0000-000000000020', 'fr', 'Followers Post',
        '[{"id":"b1","type":"paragraph","text":"secret"}]'::jsonb, 'a secret excerpt', 3);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '63000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT excerpt FROM get_creator_blog_feed('63000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  NULL,
  'A stranger gets NULL excerpt for a followers-only feed row'
);

SELECT is(
  (SELECT reading_time_min FROM get_creator_blog_feed('63000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  NULL,
  'A stranger gets NULL reading_time_min for a followers-only feed row'
);

SET LOCAL request.jwt.claim.sub = '63000000-0000-0000-0000-000000000001';

SELECT isnt(
  (SELECT excerpt FROM get_creator_blog_feed('63000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  NULL,
  'A follower gets the real excerpt for a followers-only feed row'
);

SELECT isnt(
  (SELECT reading_time_min FROM get_creator_blog_feed('63000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  NULL,
  'A follower gets the real reading_time_min for a followers-only feed row'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
