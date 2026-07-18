-- supabase/migrations/20260718100000_fix_blog_feed_gated_metadata_leak.sql

-- get_creator_blog_feed originally returned excerpt/reading_time_min
-- unconditionally for every row, including gated (followers/fans) posts the
-- caller isn't allowed to read — a real data leak (retrievable via the raw
-- RPC response/devtools even though the client UI only conditionally
-- rendered these fields). Redefines the function to null both fields out
-- for non-qualifying readers, matching the same pattern
-- get_blog_post_for_reader already uses for content_json.

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
    access.can_read,
    bpt.title,
    CASE WHEN access.can_read THEN bpt.excerpt ELSE NULL END AS excerpt,
    CASE WHEN access.can_read THEN bpt.reading_time_min ELSE NULL END AS reading_time_min
  FROM public.blog_post bp
  JOIN public.blog_post_translation bpt ON bpt.post_id = bp.id
  CROSS JOIN LATERAL (SELECT public.can_read_blog_post(bp.creator_id, bp.visibility) AS can_read) access
  WHERE bp.creator_id = p_creator_id
    AND bp.is_published = true
  ORDER BY bp.published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_blog_feed(uuid) TO anon, authenticated;
ALTER FUNCTION public.get_creator_blog_feed(uuid) OWNER TO postgres;
