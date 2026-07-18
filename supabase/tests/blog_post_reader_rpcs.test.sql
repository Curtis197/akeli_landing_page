-- supabase/tests/blog_post_reader_rpcs.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(14);

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

-- ── Additional fixtures for fans tier, anon role, owner bypass, and isolation ──

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES
  ('61000000-0000-0000-0000-000000000005', 'fan@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000006', 'other-creator-user@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000007', 'inactive-follower@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000008', 'cancelled-fan@blogrpc.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES
  ('61000000-0000-0000-0000-000000000005'),
  ('61000000-0000-0000-0000-000000000006'),
  ('61000000-0000-0000-0000-000000000007'),
  ('61000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('61000000-0000-0000-0000-000000000011',
        '61000000-0000-0000-0000-000000000006', 'Other Creator');

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES
  ('61000000-0000-0000-0000-000000000022', '61000000-0000-0000-0000-000000000010', 'fans-post', 'fans', true, now()),
  ('61000000-0000-0000-0000-000000000023', '61000000-0000-0000-0000-000000000010', 'draft-post', 'public', false, NULL),
  ('61000000-0000-0000-0000-000000000024', '61000000-0000-0000-0000-000000000011', 'other-creator-public-post', 'public', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES
  ('61000000-0000-0000-0000-000000000022', 'fr', 'Fans Post', '[{"id":"b3","type":"paragraph","text":"fan-only"}]'::jsonb, 'excerpt', 2),
  ('61000000-0000-0000-0000-000000000023', 'fr', 'Draft Post', '[{"id":"b4","type":"paragraph","text":"draft"}]'::jsonb, 'excerpt', 2),
  ('61000000-0000-0000-0000-000000000024', 'fr', 'Other Creator Post', '[{"id":"b5","type":"paragraph","text":"other"}]'::jsonb, 'excerpt', 2);

INSERT INTO public.fan_subscription (user_id, creator_id, status)
VALUES
  ('61000000-0000-0000-0000-000000000005', '61000000-0000-0000-0000-000000000010', 'active'),
  ('61000000-0000-0000-0000-000000000008', '61000000-0000-0000-0000-000000000010', 'cancelled');

INSERT INTO public.creator_follow (user_id, creator_id, active)
VALUES ('61000000-0000-0000-0000-000000000007', '61000000-0000-0000-0000-000000000010', false);

-- ── Test 7-8: fans tier ────────────────────────────────────────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000005';

SELECT isnt(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'fans-post')),
  NULL,
  'An active fan gets real content_json for a fans-only post'
);

SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000008';

SELECT is(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'fans-post')),
  NULL,
  'A cancelled fan subscription does not grant content_json for a fans-only post'
);

RESET ROLE;

-- ── Test 9-10: anon role (no session at all) ────────────────────────────────────

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.sub = '';

SELECT is(
  (SELECT can_read FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'public-post'),
  true,
  'anon role sees can_read=true on a public post'
);

SELECT is(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'followers-post')),
  NULL,
  'anon role gets NULL content_json for a followers-only post'
);

RESET ROLE;

-- ── Test 11: creator-owner bypass ────────────────────────────────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000003';

SELECT isnt(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'fans-post')),
  NULL,
  'The owning creator can read their own fans-only post without a subscription'
);

-- ── Test 12: unpublished posts excluded, even for the owning creator ─────────────

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'draft-post'),
  0,
  'An unpublished post never appears in the feed RPC, even for its own creator'
);

RESET ROLE;

-- ── Test 13: cross-creator isolation ─────────────────────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'other-creator-public-post'),
  0,
  'get_creator_blog_feed never returns another creator''s posts'
);

-- ── Test 14: inactive follow does not grant access ────────────────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000007';

SELECT is(
  (SELECT can_read FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  false,
  'An inactive follow does not grant can_read on a followers-only post'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
