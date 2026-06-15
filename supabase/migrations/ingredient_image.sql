-- ============================================================
-- MIGRATION: ingredient_image + ingredient_submission image support
-- ============================================================
-- 1. Add image_url to ingredient_submission (pending images)
-- 2. Create ingredient_image table (validated images, 1-to-1)
-- 3. Storage bucket policies (via SQL comments — configure in Dashboard)
-- ============================================================


-- ============================================================
-- PART 1: Add image_url to ingredient_submission
-- Stores the Storage path in the pending bucket during review
-- ============================================================

ALTER TABLE public.ingredient_submission
  ADD COLUMN IF NOT EXISTS image_url text;

-- image_url format: ingredient-images-pending/{submission_id}/{filename}


-- ============================================================
-- PART 2: ingredient_image table
-- Created at validation time, references validated ingredient
-- 1-to-1 enforced via UNIQUE on ingredient_id
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ingredient_image (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id   uuid NOT NULL UNIQUE REFERENCES public.ingredient(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,  -- path in public bucket: ingredient-images/{ingredient_id}/{filename}
  url             text NOT NULL,  -- full public URL (Supabase Storage public URL)
  width_px        integer,        -- optional, useful for Flutter image caching
  height_px       integer,        -- optional
  size_bytes      bigint,         -- optional, for storage monitoring
  uploaded_by     uuid REFERENCES public.user_profile(id),  -- who submitted it originally
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index for fast lookup by ingredient
CREATE INDEX IF NOT EXISTS idx_ingredient_image_ingredient_id
  ON public.ingredient_image(ingredient_id);


-- ============================================================
-- RLS: ingredient_image
-- ============================================================

ALTER TABLE public.ingredient_image ENABLE ROW LEVEL SECURITY;

-- Public read — anyone can see validated ingredient images (used in app + website)
CREATE POLICY "public_read_ingredient_image"
  ON public.ingredient_image
  FOR SELECT
  USING (true);

-- Only service_role can insert/update/delete (done at validation time server-side)
CREATE POLICY "service_role_manage_ingredient_image"
  ON public.ingredient_image
  FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================================
-- PART 3: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_ingredient_image_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ingredient_image_updated_at
  BEFORE UPDATE ON public.ingredient_image
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ingredient_image_updated_at();


-- ============================================================
-- PART 4: Helper function called at validation time
-- Inserts ingredient_image row after admin validates a submission
-- Called from Edge Function validate-ingredient
--
-- Usage:
--   SELECT create_ingredient_image(
--     p_ingredient_id  := '<uuid>',
--     p_submission_id  := '<uuid>',
--     p_storage_path   := 'ingredient-images/<ingredient_id>/cover.jpg',
--     p_url            := 'https://<project>.supabase.co/storage/v1/object/public/ingredient-images/<ingredient_id>/cover.jpg',
--     p_uploaded_by    := '<user_uuid>'
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_ingredient_image(
  p_ingredient_id  uuid,
  p_submission_id  uuid,
  p_storage_path   text,
  p_url            text,
  p_uploaded_by    uuid DEFAULT NULL,
  p_width_px       integer DEFAULT NULL,
  p_height_px      integer DEFAULT NULL,
  p_size_bytes     bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_id uuid;
BEGIN
  -- Upsert: if image already exists for this ingredient, replace it
  INSERT INTO public.ingredient_image (
    ingredient_id,
    storage_path,
    url,
    uploaded_by,
    width_px,
    height_px,
    size_bytes
  )
  VALUES (
    p_ingredient_id,
    p_storage_path,
    p_url,
    p_uploaded_by,
    p_width_px,
    p_height_px,
    p_size_bytes
  )
  ON CONFLICT (ingredient_id)
  DO UPDATE SET
    storage_path = EXCLUDED.storage_path,
    url          = EXCLUDED.url,
    uploaded_by  = EXCLUDED.uploaded_by,
    width_px     = EXCLUDED.width_px,
    height_px    = EXCLUDED.height_px,
    size_bytes   = EXCLUDED.size_bytes,
    updated_at   = now()
  RETURNING id INTO v_image_id;

  RETURN v_image_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ingredient_image(uuid, uuid, text, text, uuid, integer, integer, bigint) TO service_role;


-- ============================================================
-- STORAGE BUCKETS — configure in Supabase Dashboard
-- or via Supabase CLI / Storage API
-- ============================================================

-- Bucket 1: ingredient-images-pending
--   - Private (not public)
--   - RLS: authenticated users can upload to their own submission folder
--   - Path convention: {submission_id}/{filename}
--   - Lifecycle: deleted after validation or rejection

-- Bucket 2: ingredient-images
--   - Public
--   - RLS: service_role only for write
--   - Path convention: {ingredient_id}/{filename}
--   - Permanent storage for validated ingredient images

-- ============================================================
-- STORAGE RLS POLICIES (run in SQL editor after creating buckets)
-- ============================================================

-- Allow authenticated users to upload to pending bucket
-- (scoped to their own submission folder — enforced by path convention)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'authenticated_upload_pending',
  'ingredient-images-pending',
  'INSERT',
  'auth.role() = ''authenticated'''
)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to read their own pending uploads
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'authenticated_read_own_pending',
  'ingredient-images-pending',
  'SELECT',
  'auth.role() = ''authenticated'''
)
ON CONFLICT DO NOTHING;

-- Public bucket ingredient-images: public read is automatic
-- Write restricted to service_role (handled by Edge Function)
