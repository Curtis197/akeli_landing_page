-- Secure the creator-newsletter webhook triggers.
--
-- The previous triggers (add_recipe_newsletter_trigger / create_blog_system) called the
-- edge function via supabase_functions.http_request with a HARDCODED service_role JWT in the
-- Authorization header. That key was leaked (public repo) and has been rotated/disabled.
--
-- New design: a SECURITY DEFINER trigger function mints a short-lived, scoped JWT
-- ({ scope: 'newsletter_trigger' }) signed with the VISITOR_JWT_SECRET read from Vault, and
-- calls the edge function via pg_net. No secret is stored in this migration or in any trigger
-- definition. The edge function authorizes the call by verifying that JWT with the same secret.
--
-- ── ONE-TIME PREREQUISITE (run manually in the SQL editor — DO NOT commit the value) ──
--   select vault.create_secret('<VISITOR_JWT_SECRET value>', 'visitor_jwt_secret');
-- (Skip if a Vault secret named 'visitor_jwt_secret' already exists.)

-- Drop the old insecure webhook triggers.
DROP TRIGGER IF EXISTS on_recipe_published_newsletter ON public.recipe;
DROP TRIGGER IF EXISTS on_blog_post_published_newsletter ON public.blog_post;

CREATE OR REPLACE FUNCTION public.notify_creator_newsletter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
  v_token  text;
  v_now    int := floor(extract(epoch FROM now()))::int;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'visitor_jwt_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'notify_creator_newsletter: vault secret "visitor_jwt_secret" missing; skipping newsletter dispatch';
    RETURN NEW;
  END IF;

  -- Short-lived (120s) scoped token — only the edge function accepts scope=newsletter_trigger.
  v_token := extensions.sign(
    json_build_object('scope', 'newsletter_trigger', 'iat', v_now, 'exp', v_now + 120),
    v_secret,
    'HS256'
  );

  -- Mirror the Supabase webhook payload shape the function expects: { type, table, record, old_record }.
  PERFORM net.http_post(
    url     := 'https://njzqcftjzskwcpforwzf.supabase.co/functions/v1/send-creator-newsletter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
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
