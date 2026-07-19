-- supabase/migrations/20260717150000_add_blog_post_reader_rpcs.sql

-- Phase 1's RLS only grants blog_post SELECT to the owning creator or to
-- anyone reading a 'public' post — a non-owning reader's query never returns
-- a 'followers'/'fans' row at all, which makes it impossible to show that
-- post as a "blurred cover, subscribe to read" teaser card (the spec's
-- explicit requirement for gated posts). These two SECURITY DEFINER
-- functions deliberately bypass RLS and compute a can_read flag themselves,
-- so metadata (title/cover) is always visible while body content
-- (content_json) is withheld unless the caller actually qualifies.
--
-- can_read_blog_post() is the shared access-control predicate both RPCs
-- call, so the follow/fan logic exists in exactly one place.

CREATE OR REPLACE FUNCTION public.can_read_blog_post(p_post_creator_id uuid, p_visibility text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_visibility = 'public'
    OR p_post_creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid())
    OR (p_visibility = 'followers' AND p_post_creator_id IN (
          SELECT creator_id FROM public.creator_follow WHERE user_id = auth.uid() AND active = true))
    OR (p_visibility = 'fans' AND p_post_creator_id IN (
          SELECT creator_id FROM public.fan_subscription WHERE user_id = auth.uid() AND status = 'active'));
$$;

GRANT EXECUTE ON FUNCTION public.can_read_blog_post(uuid, text) TO anon, authenticated;
ALTER FUNCTION public.can_read_blog_post(uuid, text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_creator_blog_feed(p_creator_id uuid)
RETURNS TABLE (
  id uuid,
  slug text,
  cover_image_url text,
  category text,
  published_at timestamptz,
  visibility text,
  can_read boolean,
  title text,
  excerpt text,
  reading_time_min int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    bp.id,
    bp.slug,
    bp.cover_image_url,
    bp.category,
    bp.published_at,
    bp.visibility,
    public.can_read_blog_post(bp.creator_id, bp.visibility) AS can_read,
    bpt.title,
    bpt.excerpt,
    bpt.reading_time_min
  FROM public.blog_post bp
  JOIN public.blog_post_translation bpt ON bpt.post_id = bp.id
  WHERE bp.creator_id = p_creator_id
    AND bp.is_published = true
  ORDER BY bp.published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_blog_feed(uuid) TO anon, authenticated;
ALTER FUNCTION public.get_creator_blog_feed(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_blog_post_for_reader(p_creator_id uuid, p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  cover_image_url text,
  category text,
  tags text[],
  visibility text,
  published_at timestamptz,
  view_count int,
  recipe_embeds uuid[],
  creator_id uuid,
  creator_display_name text,
  can_read boolean,
  title text,
  content_json jsonb,
  excerpt text,
  seo_title text,
  seo_description text,
  reading_time_min int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH post AS (
    SELECT bp.*, c.display_name AS creator_display_name
    FROM public.blog_post bp
    JOIN public.creator c ON c.id = bp.creator_id
    WHERE bp.creator_id = p_creator_id
      AND bp.slug = p_slug
      AND bp.is_published = true
  ),
  access AS (
    SELECT public.can_read_blog_post(post.creator_id, post.visibility) AS can_read
    FROM post
  )
  SELECT
    post.id,
    post.slug,
    post.cover_image_url,
    post.category,
    post.tags,
    post.visibility,
    post.published_at,
    post.view_count,
    post.recipe_embeds,
    post.creator_id,
    post.creator_display_name,
    access.can_read,
    bpt.title,
    CASE WHEN access.can_read THEN bpt.content_json ELSE NULL END AS content_json,
    bpt.excerpt,
    bpt.seo_title,
    bpt.seo_description,
    bpt.reading_time_min
  FROM post
  CROSS JOIN access
  JOIN public.blog_post_translation bpt ON bpt.post_id = post.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_post_for_reader(uuid, text) TO anon, authenticated;
ALTER FUNCTION public.get_blog_post_for_reader(uuid, text) OWNER TO postgres;
