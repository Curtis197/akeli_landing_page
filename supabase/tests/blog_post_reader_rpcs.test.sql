-- supabase/tests/blog_post_reader_rpcs.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(6);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES
  ('61000000-0000-0000-0000-000000000001', 'follower@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000002', 'stranger@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000003', 'creator-user@blogrpc.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES
  ('61000000-0000-0000-0000-000000000001'),
  ('61000000-0000-0000-0000-000000000002'),
  ('61000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('61000000-0000-0000-0000-000000000010',
        '61000000-0000-0000-0000-000000000003', 'RPC Test Creator');

INSERT INTO public.creator_follow (user_id, creator_id, active)
VALUES ('61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000010', true);

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES
  ('61000000-0000-0000-0000-000000000020', '61000000-0000-0000-0000-000000000010', 'public-post', 'public', true, now()),
  ('61000000-0000-0000-0000-000000000021', '61000000-0000-0000-0000-000000000010', 'followers-post', 'followers', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES
  ('61000000-0000-0000-0000-000000000020', 'fr', 'Public Post', '[{"id":"b1","type":"paragraph","text":"hello"}]'::jsonb, 'excerpt', 2),
  ('61000000-0000-0000-0000-000000000021', 'fr', 'Followers Post', '[{"id":"b2","type":"paragraph","text":"secret"}]'::jsonb, 'excerpt', 2);

-- ── Test 1-2: feed RPC as a follower — both posts visible, can_read true for both ─

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  2,
  'Follower sees both posts in the feed RPC'
);

SELECT is(
  (SELECT bool_and(can_read) FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  true,
  'Follower has can_read=true on every post in the feed'
);

RESET ROLE;

-- ── Test 3-4: feed RPC as a stranger — both rows present, but can_read differs ────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  2,
  'Stranger still sees both posts (as teaser rows) in the feed RPC'
);

SELECT is(
  (SELECT can_read FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  false,
  'Stranger has can_read=false on the followers-only post'
);

RESET ROLE;

-- ── Test 5-6: detail RPC — content_json hidden vs shown based on can_read ─────────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'followers-post')),
  NULL,
  'Stranger gets NULL content_json for a followers-only post'
);

SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000001';

SELECT isnt(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'followers-post')),
  NULL,
  'Follower gets real content_json for the same post'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
