-- supabase/migrations/20260717120000_extend_blog_system.sql

ALTER TABLE public.blog_post
  ADD COLUMN category text
    CHECK (category IN ('recette','culture','technique','ingredients','parcours','actualite')),
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN view_count integer DEFAULT 0,
  ADD COLUMN recipe_embeds uuid[] DEFAULT '{}',
  ADD COLUMN draft_data jsonb,
  ADD COLUMN scheduled_publish_at timestamptz;

ALTER TABLE public.blog_post_translation
  ADD COLUMN excerpt text,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text,
  ADD COLUMN reading_time_min integer;

CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_post SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;
ALTER FUNCTION public.increment_post_view(uuid) OWNER TO postgres;
