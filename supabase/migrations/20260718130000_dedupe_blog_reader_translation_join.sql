-- supabase/migrations/20260718130000_dedupe_blog_reader_translation_join.sql

-- get_creator_blog_feed and get_blog_post_for_reader both joined
-- blog_post_translation with no locale filter, relying entirely on the
-- application convention of "one translation row per post" to guarantee a
-- single row per post. fetchBlogPostForReaderServer calls .maybeSingle(),
-- which throws an uncaught PostgREST "multiple rows" error the moment a post
-- ever gets a second translation row — a documented future direction, not
-- currently reachable via the wizard but not blocked at the DB level either.
--
-- The fix must NOT filter by the site visitor's locale (posts must display
-- as-authored regardless of the visitor's active locale — no hiding a French
-- post from an English-browsing visitor, no auto-translation). Instead, both
-- joins are converted to a deterministic LATERAL join that always picks
-- exactly one translation row per post (ORDER BY locale LIMIT 1), regardless
-- of how many translation rows exist.
--
-- Only the function bodies change here, not their return signatures, so
-- CREATE OR REPLACE is used directly (no DROP needed).

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
  JOIN LATERAL (
    SELECT * FROM public.blog_post_translation t
    WHERE t.post_id = bp.id
    ORDER BY t.locale
    LIMIT 1
  ) bpt ON true
  CROSS JOIN LATERAL (SELECT public.can_read_blog_post(bp.creator_id, bp.visibility) AS can_read) access
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
  reading_time_min int,
  locale text
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
    bpt.reading_time_min,
    bpt.locale
  FROM post
  CROSS JOIN access
  JOIN LATERAL (
    SELECT * FROM public.blog_post_translation t
    WHERE t.post_id = post.id
    ORDER BY t.locale
    LIMIT 1
  ) bpt ON true;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_post_for_reader(uuid, text) TO anon, authenticated;
ALTER FUNCTION public.get_blog_post_for_reader(uuid, text) OWNER TO postgres;
