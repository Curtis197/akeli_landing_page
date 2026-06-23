-- Secure the creator-newsletter webhook triggers.
--
-- The previous triggers (add_recipe_newsletter_trigger / create_blog_system) called the edge
-- function via supabase_functions.http_request with a HARDCODED service_role JWT in the
-- Authorization header. That key was leaked (public repo) and has been rotated/disabled.
--
-- New design: a SECURITY DEFINER trigger function reads the CURRENT service key from Vault and
-- calls the edge function via pg_net. No secret lives in this migration or in any trigger
-- definition. The edge function authorizes the call by matching the key against its
-- SUPABASE_SERVICE_ROLE_KEY env var (verifyServiceRole). (pgjwt is not enabled on this project,
-- so JWT minting in SQL is avoided; the key is read from Vault and sent over the internal
-- HTTPS call only.)
--
-- ── ONE-TIME PREREQUISITES (run manually — DO NOT commit the value) ──
--   select vault.create_secret('<new sb_secret… service key>', 'newsletter_service_key');
--   -- and set the SAME key as SUPABASE_SERVICE_ROLE_KEY on the send-creator-newsletter function.

DROP TRIGGER IF EXISTS on_recipe_published_newsletter ON public.recipe;
DROP TRIGGER IF EXISTS on_blog_post_published_newsletter ON public.blog_post;

CREATE OR REPLACE FUNCTION public.notify_creator_newsletter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'newsletter_service_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE WARNING 'notify_creator_newsletter: vault secret "newsletter_service_key" missing; skipping newsletter dispatch';
    RETURN NEW;
  END IF;

  -- Mirror the Supabase webhook payload the edge function expects: { type, table, record, old_record }.
  PERFORM net.http_post(
    url     := 'https://njzqcftjzskwcpforwzf.supabase.co/functions/v1/send-creator-newsletter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recipe_published_newsletter
  AFTER UPDATE ON public.recipe
  FOR EACH ROW EXECUTE FUNCTION public.notify_creator_newsletter();

CREATE TRIGGER on_blog_post_published_newsletter
  AFTER UPDATE ON public.blog_post
  FOR EACH ROW EXECUTE FUNCTION public.notify_creator_newsletter();
