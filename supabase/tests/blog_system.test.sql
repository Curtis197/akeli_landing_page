-- supabase/tests/blog_system.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(13);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('20000000-0000-0000-0000-000000000001', 'creator@blog.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001', 'Blog Creator');

INSERT INTO public.visitor (id, email, password_hash, email_verified, locale, first_name)
VALUES ('20000000-0000-0000-0000-000000000003',
        'fan@blog.test', '$2b$10$fakehash', true, 'fr', 'FanVisitor');

-- ── Test 1: blog_post INSERT succeeds ────────────────────────────────────────

INSERT INTO public.blog_post (id, creator_id, visibility)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000002', 'public');

SELECT is(
  (SELECT count(*)::int FROM public.blog_post WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'blog_post INSERT with valid visibility succeeds'
);

-- ── Test 2: invalid visibility rejected ──────────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post (creator_id, visibility)
     VALUES ('20000000-0000-0000-0000-000000000002', 'private') $$,
  '23514', NULL,
  'Invalid blog_post visibility is rejected'
);

-- ── Test 3: blog_post_translation UNIQUE (post_id, locale) ───────────────────

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json)
VALUES ('20000000-0000-0000-0000-000000000010', 'fr', 'Mon Article', '[]');

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_translation (post_id, locale, title, content_json)
     VALUES ('20000000-0000-0000-0000-000000000010', 'fr', 'Duplicate FR', '[]') $$,
  '23505', NULL,
  'Duplicate (post_id, locale) on blog_post_translation is rejected'
);

-- ── Test 4: blog_post_like single identity — both null rejected ───────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010', NULL, NULL) $$,
  '23514', NULL,
  'blog_post_like with both identities null is rejected'
);

-- ── Test 5: blog_post_like single identity — both non-null rejected ───────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010',
             '20000000-0000-0000-0000-000000000001',
             '20000000-0000-0000-0000-000000000003') $$,
  '23514', NULL,
  'blog_post_like with both identities set is rejected'
);

-- ── Test 6: blog_post_like UNIQUE per visitor per post ────────────────────────

INSERT INTO public.blog_post_like (post_id, visitor_id)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003');

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010',
             '20000000-0000-0000-0000-000000000003') $$,
  '23505', NULL,
  'Duplicate visitor like on same post is rejected'
);

-- ── Test 7: like_count increments on like INSERT ──────────────────────────────

SELECT is(
  (SELECT like_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'like_count increments to 1 after visitor like INSERT'
);

-- ── Test 8: like_count decrements on like DELETE ──────────────────────────────

DELETE FROM public.blog_post_like
WHERE post_id = '20000000-0000-0000-0000-000000000010'
  AND visitor_id = '20000000-0000-0000-0000-000000000003';

SELECT is(
  (SELECT like_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'like_count decrements to 0 after like DELETE'
);

-- ── Test 9: blog_comment single identity constraint ───────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_comment (post_id, user_id, visitor_id, content)
     VALUES ('20000000-0000-0000-0000-000000000010', NULL, NULL, 'Both null') $$,
  '23514', NULL,
  'blog_comment with both identities null is rejected'
);

-- ── Test 10: comment_count increments on root comment INSERT ─────────────────

INSERT INTO public.blog_comment (id, post_id, visitor_id, content)
VALUES ('20000000-0000-0000-0000-000000000020',
        '20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003',
        'Great post!');

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'comment_count increments to 1 after root comment INSERT'
);

-- ── Test 11: comment_count does NOT increment on reply INSERT ────────────────

INSERT INTO public.blog_comment (post_id, visitor_id, content, parent_id)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003',
        'A reply!',
        '20000000-0000-0000-0000-000000000020');

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'comment_count stays at 1 after reply INSERT (replies not counted)'
);

-- ── Test 12: comment_count decrements on root comment DELETE ─────────────────

DELETE FROM public.blog_comment
WHERE id = '20000000-0000-0000-0000-000000000020';

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'comment_count decrements to 0 after root comment DELETE (cascade removes reply)'
);

-- ── Test 13: get_creator_fan_emails returns active verified visitor fans ──────

INSERT INTO public.visitor_fan_subscription (visitor_id, creator_id, status)
VALUES ('20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002',
        'active');

SELECT is(
  (SELECT count(*)::int FROM public.get_creator_fan_emails(
    '20000000-0000-0000-0000-000000000002')),
  1,
  'get_creator_fan_emails returns 1 active verified visitor fan'
);

SELECT * FROM finish();
ROLLBACK;
