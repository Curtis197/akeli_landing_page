-- supabase/migrations/20260717130000_create_post_images_bucket.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Creators upload their own post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators update their own post images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone reads post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');
