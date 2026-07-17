-- The inline UNIQUE NULLS NOT DISTINCT constraints on blog_post_like collapse
-- all rows sharing a NULL companion column into a single collision target:
-- every visitor-identity like (user_id IS NULL) collides with every other
-- visitor-identity like on the same post via (post_id, user_id), and every
-- Akeli-user like collides via (post_id, visitor_id). Partial unique indexes
-- fix this by only enforcing uniqueness among rows where the column is
-- actually set, while still preventing the same identity from liking twice.

ALTER TABLE public.blog_post_like DROP CONSTRAINT IF EXISTS blog_post_like_post_id_user_id_key;
ALTER TABLE public.blog_post_like DROP CONSTRAINT IF EXISTS blog_post_like_post_id_visitor_id_key;

CREATE UNIQUE INDEX blog_post_like_post_id_user_id_key
  ON public.blog_post_like (post_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX blog_post_like_post_id_visitor_id_key
  ON public.blog_post_like (post_id, visitor_id)
  WHERE visitor_id IS NOT NULL;
