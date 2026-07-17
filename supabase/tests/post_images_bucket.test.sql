-- supabase/tests/post_images_bucket.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(4);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'post-images'),
  true,
  'post-images bucket exists and is public'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Creators upload their own post images'),
  1,
  'creator upload policy exists on storage.objects'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Creators delete their own post images'),
  1,
  'creator delete policy exists on storage.objects'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Anyone reads post images'),
  1,
  'public read policy exists on storage.objects'
);

SELECT * FROM finish();
ROLLBACK;
