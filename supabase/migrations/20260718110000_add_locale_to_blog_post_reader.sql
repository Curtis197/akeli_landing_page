-- supabase/migrations/20260718110000_add_locale_to_blog_post_reader.sql

-- get_blog_post_for_reader's generateMetadata caller needs the translation's
-- actual locale to set an accurate og:locale tag — deriving it from the
-- route's URL locale segment instead was a workaround that can mismatch the
-- real content language (e.g. a French-only post viewed at an /en/ URL).
-- Adding locale as an output column lets callers derive og:locale from the
-- real content, not the URL. Requires DROP+CREATE since adding a column to
-- RETURNS TABLE changes the function's return type.

DROP FUNCTION IF EXISTS public.get_blog_post_for_reader(uuid, text);

CREATE FUNCTION public.get_blog_post_for_reader(p_creator_id uuid, p_slug text)
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
  JOIN public.blog_post_translation bpt ON bpt.post_id = post.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_post_for_reader(uuid, text) TO anon, authenticated;
ALTER FUNCTION public.get_blog_post_for_reader(uuid, text) OWNER TO postgres;
