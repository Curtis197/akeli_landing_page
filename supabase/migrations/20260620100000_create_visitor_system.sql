-- supabase/migrations/20260620100000_create_visitor_system.sql

-- ── visitor ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visitor (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email               text UNIQUE NOT NULL,
  email_verified      boolean DEFAULT false,
  password_hash       text NOT NULL,
  locale              text DEFAULT 'fr',
  first_name          text,
  avatar_url          text,
  stripe_customer_id  text,
  akeli_user_id       uuid REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Block visitor signup with an email already in Supabase Auth (Akeli users)
CREATE OR REPLACE FUNCTION public.check_visitor_email_not_akeli()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'email_belongs_to_akeli_user';
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.check_visitor_email_not_akeli() OWNER TO postgres;

CREATE TRIGGER trg_visitor_check_email
  BEFORE INSERT ON public.visitor
  FOR EACH ROW EXECUTE FUNCTION public.check_visitor_email_not_akeli();

CREATE TRIGGER trg_visitor_updated_at
  BEFORE UPDATE ON public.visitor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── visitor_auth_token ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visitor_auth_token (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id  uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('reset_password', 'verify_email')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- ── visitor_creator_follow ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visitor_creator_follow (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id      uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  creator_id      uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  active          boolean DEFAULT true,
  subscribed_at   timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE (visitor_id, creator_id)
);

-- ── visitor_fan_subscription ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visitor_fan_subscription (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id             uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  creator_id             uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  status                 text DEFAULT 'active'
                           CHECK (status IN ('active', 'cancelled', 'past_due')),
  stripe_subscription_id text,
  stripe_price_id        text,
  amount_cents           integer,
  current_period_end     timestamptz,
  subscribed_at          timestamptz DEFAULT now(),
  cancelled_at           timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  UNIQUE (visitor_id, creator_id)
);

CREATE TRIGGER trg_visitor_fan_sub_updated_at
  BEFORE UPDATE ON public.visitor_fan_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── creator_follow (registered Akeli users) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_follow (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES public.user_profile(id) ON DELETE CASCADE,
  creator_id      uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  active          boolean DEFAULT true,
  subscribed_at   timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE (user_id, creator_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.visitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_auth_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_creator_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_fan_subscription ENABLE ROW LEVEL SECURITY;
-- No policies on visitor tables → service role only

ALTER TABLE public.creator_follow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follows"
  ON public.creator_follow FOR ALL
  USING (auth.uid() = user_id);

-- ── Newsletter email helper ────────────────────────────────────────────────────
-- Returns emails of all active followers for a creator (visitors + Akeli users)

CREATE OR REPLACE FUNCTION public.get_creator_newsletter_emails(p_creator_id uuid)
RETURNS TABLE(email text, locale text, first_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verified visitor followers
  RETURN QUERY
  SELECT v.email, v.locale, v.first_name
  FROM public.visitor_creator_follow vcf
  JOIN public.visitor v ON v.id = vcf.visitor_id
  WHERE vcf.creator_id = p_creator_id
    AND vcf.active = true
    AND v.email_verified = true;

  -- Registered Akeli user followers
  RETURN QUERY
  SELECT au.email::text, up.locale, up.first_name
  FROM public.creator_follow cf
  JOIN public.user_profile up ON up.id = cf.user_id
  JOIN auth.users au ON au.id = cf.user_id
  WHERE cf.creator_id = p_creator_id
    AND cf.active = true;
END;
$$;
ALTER FUNCTION public.get_creator_newsletter_emails(uuid) OWNER TO postgres;
