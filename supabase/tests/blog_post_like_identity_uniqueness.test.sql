-- supabase/tests/blog_post_like_identity_uniqueness.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(4);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'liker1@blog.test', now(), now(), 'authenticated', 'authenticated'),
  ('40000000-0000-0000-0000-000000000002', 'liker2@blog.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES
  ('40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('40000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000001', 'Like Uniqueness Creator');

INSERT INTO public.visitor (id, email, password_hash, email_verified, locale, first_name)
VALUES
  ('40000000-0000-0000-0000-000000000004', 'v1@blog.test', '$2b$10$fakehash', true, 'fr', 'V1'),
  ('40000000-0000-0000-0000-000000000005', 'v2@blog.test', '$2b$10$fakehash', true, 'fr', 'V2');

INSERT INTO public.blog_post (id, creator_id, visibility)
VALUES ('40000000-0000-0000-0000-000000000010',
        '40000000-0000-0000-0000-000000000003', 'public');

-- ── Test 1: two distinct Akeli users can both like the same post ─────────────

INSERT INTO public.blog_post_like (post_id, user_id)
VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001');

SELECT lives_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id)
     VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000002') $$,
  'A second distinct Akeli user can like the same post'
);

-- ── Test 2: two distinct visitors can both like the same post ────────────────

INSERT INTO public.blog_post_like (post_id, visitor_id)
VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000004');

SELECT lives_ok(
  $$ INSERT INTO public.blog_post_like (post_id, visitor_id)
     VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000005') $$,
  'A second distinct visitor can like the same post'
);

-- ── Test 3: like_count reflects all 4 likes ───────────────────────────────────

SELECT is(
  (SELECT like_count FROM public.blog_post WHERE id = '40000000-0000-0000-0000-000000000010'),
  4,
  'like_count reflects all 4 distinct likers'
);

-- ── Test 4: the same user still cannot like twice ─────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id)
     VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001') $$,
  '23505', NULL,
  'The same Akeli user cannot like the same post twice'
);

SELECT * FROM finish();
ROLLBACK;
