-- supabase/tests/visitor_system.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(14);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

-- 1. Create a Creator User
INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'creator@akeli.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id, locale, first_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'fr', 'Creator User')
ON CONFLICT (id) DO UPDATE SET locale = EXCLUDED.locale, first_name = EXCLUDED.first_name;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001', 'Test Creator');

-- 2. Create a Regular Registered Akeli User
INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'user@akeli.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id, locale, first_name)
VALUES ('00000000-0000-0000-0000-000000000003', 'en', 'Akeli User')
ON CONFLICT (id) DO UPDATE SET locale = EXCLUDED.locale, first_name = EXCLUDED.first_name;

-- ── Test 1: Insert visitor (verified = false) succeeds ──────────────────────────

INSERT INTO public.visitor (id, email, email_verified, password_hash, locale, first_name)
VALUES ('00000000-0000-0000-0000-000000000010', 'visitor1@example.com', false, 'hash123', 'fr', 'Visitor One');

SELECT is(
  (SELECT count(*)::int FROM public.visitor WHERE id = '00000000-0000-0000-0000-000000000010'),
  1,
  'visitor inserts successfully'
);

-- ── Test 2: Insert visitor with duplicate email fails ─────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.visitor (id, email, email_verified, password_hash, locale, first_name)
    VALUES ('00000000-0000-0000-0000-000000000011', 'visitor1@example.com', false, 'hash123', 'fr', 'Visitor Two')$$,
  '23505', -- unique_violation
  NULL,
  'visitor with duplicate email raises unique violation'
);

-- ── Test 3: Insert visitor with email matching Akeli user fails ───────────────

SELECT throws_ok(
  $$INSERT INTO public.visitor (id, email, email_verified, password_hash, locale, first_name)
    VALUES ('00000000-0000-0000-0000-000000000012', 'user@akeli.test', false, 'hash123', 'fr', 'Visitor Three')$$,
  'P0001', -- raise_exception
  'email_belongs_to_akeli_user',
  'visitor with email belonging to Akeli user raises exception'
);

-- ── Test 4: Insert token for visitor succeeds ─────────────────────────────────

INSERT INTO public.visitor_auth_token (visitor_id, token_hash, purpose, expires_at)
VALUES ('00000000-0000-0000-0000-000000000010', 'tokenhash123', 'verify_email', now() + interval '1 day');

SELECT is(
  (SELECT count(*)::int FROM public.visitor_auth_token WHERE visitor_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'visitor auth token inserts successfully'
);

-- ── Test 5: Insert follow relation for visitor succeeds ───────────────────────

INSERT INTO public.visitor_creator_follow (visitor_id, creator_id, active)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', true);

SELECT is(
  (SELECT count(*)::int FROM public.visitor_creator_follow
   WHERE visitor_id = '00000000-0000-0000-0000-000000000010'
     AND creator_id = '00000000-0000-0000-0000-000000000002'),
  1,
  'visitor follow inserts successfully'
);

-- ── Test 6: Insert fan subscription with invalid status fails ─────────────────

SELECT throws_ok(
  $$INSERT INTO public.visitor_fan_subscription (visitor_id, creator_id, status)
    VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'invalid_status')$$,
  '23514', -- check_violation
  NULL,
  'fan subscription with invalid status raises check constraint violation'
);

-- ── Test 7: get_creator_newsletter_emails function behavior ───────────────────

-- Add a verified visitor
INSERT INTO public.visitor (id, email, email_verified, password_hash, locale, first_name)
VALUES ('00000000-0000-0000-0000-000000000020', 'verified_visitor@example.com', true, 'hash123', 'en', 'Verified');

INSERT INTO public.visitor_creator_follow (visitor_id, creator_id, active)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', true);

-- Add follow for regular Akeli user
INSERT INTO public.creator_follow (user_id, creator_id, active)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', true);

-- Query the helper
SELECT is(
  (SELECT count(*)::int FROM public.get_creator_newsletter_emails('00000000-0000-0000-0000-000000000002')),
  2, -- verified visitor + registered user (unverified visitor is excluded)
  'get_creator_newsletter_emails returns exactly the active verified visitor + registered user'
);

-- ── Test 8: RLS enabled on all visitor tables ─────────────────────────────────

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.visitor'::regclass),
  'RLS is enabled on visitor table'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.visitor_auth_token'::regclass),
  'RLS is enabled on visitor_auth_token table'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.visitor_creator_follow'::regclass),
  'RLS is enabled on visitor_creator_follow table'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.visitor_fan_subscription'::regclass),
  'RLS is enabled on visitor_fan_subscription table'
);

-- ── Test 9: visitor tables have no policies (service-role only) ───────────────

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE tablename IN ('visitor', 'visitor_auth_token', 'visitor_creator_follow', 'visitor_fan_subscription')),
  0,
  'visitor tables have exactly 0 policies defined (service-role only)'
);

-- ── Test 10: RLS enabled on creator_follow ─────────────────────────────────────

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.creator_follow'::regclass),
  'RLS is enabled on creator_follow table'
);

-- ── Test 11: creator_follow has owner policy ───────────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE tablename = 'creator_follow' AND policyname = 'Users manage own follows'),
  1,
  'creator_follow has the "Users manage own follows" policy'
);

SELECT * FROM finish();
ROLLBACK;
