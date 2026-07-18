-- supabase/migrations/20260718120000_guard_newsletter_triggers_with_when_clause.sql

-- on_blog_post_published_newsletter and on_recipe_published_newsletter fired
-- on EVERY UPDATE to their table (no WHEN clause) — including non-publish
-- writes like increment_post_view()'s view_count bump, which Phase 3's
-- public post page now calls on every real pageview. The downstream Edge
-- Function already no-ops anything that isn't the specific
-- not-published-to-published transition, so no spam results, but every
-- call still pays a Vault decrypt + a pg_net queue insert + an Edge
-- Function invocation for nothing. Adding a WHEN clause matching each
-- function's own transition logic (send-creator-newsletter/index.ts)
-- makes the trigger only fire when it can actually do something.

DROP TRIGGER IF EXISTS on_blog_post_published_newsletter ON public.blog_post;
CREATE TRIGGER on_blog_post_published_newsletter
  AFTER UPDATE ON public.blog_post
  FOR EACH ROW
  WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published AND NEW.is_published = true)
  EXECUTE FUNCTION public.notify_creator_newsletter();

DROP TRIGGER IF EXISTS on_recipe_published_newsletter ON public.recipe;
CREATE TRIGGER on_recipe_published_newsletter
  AFTER UPDATE ON public.recipe
  FOR EACH ROW
  WHEN (
    NOT (OLD.is_published AND OLD.show_on_website)
    AND (NEW.is_published AND NEW.show_on_website)
  )
  EXECUTE FUNCTION public.notify_creator_newsletter();
