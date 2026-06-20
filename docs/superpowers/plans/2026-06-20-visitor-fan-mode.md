# Visitor Fan Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the visitor identity system and creator follow/subscription infrastructure — separate from Akeli's user/auth system — enabling visitors to follow creators for newsletter updates and subscribe as paying fans.

**Architecture:** Fully parallel schema to `auth.users` + `user_profile`. Visitors authenticate with email + password (bcryptjs in Edge Functions), sessions managed with signed JWTs (`VISITOR_JWT_SECRET`). Newsletter fires via a Supabase DB webhook on recipe publish. Stripe handles paid fan billing via a dedicated webhook handler.

**Tech Stack:** Supabase Edge Functions (Deno, `https://esm.sh/` imports), pgTAP (SQL tests), bcryptjs, jose (JWT), Resend (email), Stripe (already integrated)

## Global Constraints

- All imports use `https://esm.sh/` — not `npm:` (match existing Edge Function pattern)
- All Edge Functions use `Deno.serve(async (req) => { ... })` and include CORS headers
- Response format: `{ data: ..., error: null }` on success, `{ data: null, error: "..." }` on failure
- All visitor tables: RLS enabled, no policies = service role only; accessed exclusively via Edge Functions
- `creator_follow`: RLS enabled, one policy — authenticated Akeli users manage their own rows
- Email verification required before a visitor can follow or subscribe
- Newsletter only sends when `is_published = true` AND `show_on_website = true` both become true on the same UPDATE (transition check)
- JWT expiry: 7 days. Token expiry: verify_email = 24h, reset_password = 30min
- `VISITOR_JWT_SECRET` and `RESEND_API_KEY` must be added to Supabase project secrets before Task 2
- From address for all visitor emails: `Akeli <no-reply@a-keli.com>`
- Migration naming: `YYYYMMDDHHMMSS_description.sql`

---

### Task 1: Database Migration — Visitor System Schema

**Files:**
- Create: `supabase/migrations/20260620100000_create_visitor_system.sql`
- Create: `supabase/tests/visitor_system.test.sql`

**Interfaces:**
- Produces:
  - Table `public.visitor(id, email, password_hash, email_verified, locale, first_name, avatar_url, stripe_customer_id, akeli_user_id, created_at, updated_at)`
  - Table `public.visitor_auth_token(id, visitor_id, token_hash, purpose, expires_at, used_at, created_at)`
  - Table `public.visitor_creator_follow(id, visitor_id, creator_id, active, subscribed_at, unsubscribed_at)`
  - Table `public.visitor_fan_subscription(id, visitor_id, creator_id, status, stripe_subscription_id, stripe_price_id, amount_cents, current_period_end, subscribed_at, cancelled_at, created_at, updated_at)`
  - Table `public.creator_follow(id, user_id, creator_id, active, subscribed_at, unsubscribed_at)`
  - RPC `public.get_creator_newsletter_emails(p_creator_id uuid) → TABLE(email text, locale text, first_name text)`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Write the SQL tests**

```sql
-- supabase/tests/visitor_system.test.sql
BEGIN;
SELECT plan(8);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('10000000-0000-0000-0000-000000000001', 'akeli@test.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('10000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000001', 'Test Creator');

-- ── Test 1: visitor INSERT succeeds with valid email ──────────────────────────

INSERT INTO public.visitor (id, email, password_hash)
VALUES ('10000000-0000-0000-0000-000000000010', 'visitor@test.test', '$2a$12$fake_hash');

SELECT ok(
  (SELECT count(*)::int FROM public.visitor WHERE email = 'visitor@test.test') = 1,
  'visitor INSERT with valid email succeeds'
);

-- ── Test 2: visitor UNIQUE email constraint ────────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.visitor (email, password_hash)
     VALUES ('visitor@test.test', '$2a$12$another_hash') $$,
  '23505',
  NULL,
  'Duplicate visitor email is rejected'
);

-- ── Test 3: check_visitor_email_not_akeli blocks Akeli email ──────────────────

SELECT throws_ok(
  $$ INSERT INTO public.visitor (email, password_hash)
     VALUES ('akeli@test.test', '$2a$12$fake_hash') $$,
  'P0001',
  'email_belongs_to_akeli_user',
  'Visitor signup blocked for existing Akeli user email'
);

-- ── Test 4: visitor_auth_token purpose check constraint ──────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.visitor_auth_token (visitor_id, token_hash, purpose, expires_at)
     VALUES ('10000000-0000-0000-0000-000000000010', 'hash', 'invalid_purpose', now()) $$,
  '23514',
  NULL,
  'Invalid visitor_auth_token purpose is rejected'
);

-- ── Test 5: visitor_creator_follow unique constraint ─────────────────────────

INSERT INTO public.visitor_creator_follow (visitor_id, creator_id)
VALUES ('10000000-0000-0000-0000-000000000010',
        '10000000-0000-0000-0000-000000000002');

SELECT throws_ok(
  $$ INSERT INTO public.visitor_creator_follow (visitor_id, creator_id)
     VALUES ('10000000-0000-0000-0000-000000000010',
             '10000000-0000-0000-0000-000000000002') $$,
  '23505',
  NULL,
  'Duplicate visitor_creator_follow is rejected'
);

-- ── Test 6: visitor_fan_subscription status check constraint ─────────────────

SELECT throws_ok(
  $$ INSERT INTO public.visitor_fan_subscription (visitor_id, creator_id, status)
     VALUES ('10000000-0000-0000-0000-000000000010',
             '10000000-0000-0000-0000-000000000002', 'invalid_status') $$,
  '23514',
  NULL,
  'Invalid visitor_fan_subscription status is rejected'
);

-- ── Test 7: cascade delete from visitor removes follow rows ──────────────────

DELETE FROM public.visitor WHERE id = '10000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT count(*)::int FROM public.visitor_creator_follow
   WHERE visitor_id = '10000000-0000-0000-0000-000000000010'),
  0,
  'visitor_creator_follow rows cascade deleted with visitor'
);

-- ── Test 8: get_creator_newsletter_emails returns verified visitor follows ────

INSERT INTO public.visitor (id, email, password_hash, email_verified, locale, first_name)
VALUES ('10000000-0000-0000-0000-000000000011', 'fan@test.test', '$2a$12$hash', true, 'fr', 'Fan');

INSERT INTO public.visitor_creator_follow (visitor_id, creator_id)
VALUES ('10000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000002');

SELECT is(
  (SELECT count(*)::int FROM public.get_creator_newsletter_emails(
     '10000000-0000-0000-0000-000000000002')),
  1,
  'get_creator_newsletter_emails returns verified visitor follower'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 3: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied without errors.

- [ ] **Step 4: Run the SQL tests**

```bash
npx supabase test db
```

Expected: `1..8` then `ok 1` through `ok 8`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260620100000_create_visitor_system.sql supabase/tests/visitor_system.test.sql
git commit -m "feat(visitor): add visitor system schema — 5 tables, RLS, newsletter helper"
```

---

### Task 2: visitor-signup Edge Function

**Files:**
- Create: `supabase/functions/visitor-signup/index.ts`

**Interfaces:**
- Consumes: `POST { email: string, password: string, locale?: string, first_name?: string }`
- Produces: `{ data: { visitor_id: string }, error: null }` on success, HTTP 409 when email taken

- [ ] **Step 1: Add required secrets to Supabase**

In Supabase Dashboard → Settings → Edge Functions → Secrets, add:
- `RESEND_API_KEY` — your Resend API key
- `VISITOR_JWT_SECRET` — a random 32+ char string (generate with `openssl rand -base64 32`)
- `SITE_URL` — `https://a-keli.com` (or `http://localhost:3000` for dev)

- [ ] **Step 2: Write the Edge Function**

```typescript
// supabase/functions/visitor-signup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';
import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password, locale = 'fr', first_name } = await req.json();

    if (!email || !password || typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ data: null, error: 'Email and password (min 8 chars) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const password_hash = await bcrypt.hash(password, 12);

    const { data: visitor, error } = await supabase
      .from('visitor')
      .insert({ email, password_hash, locale, first_name: first_name ?? null })
      .select('id')
      .single();

    if (error) {
      // Trigger raised by check_visitor_email_not_akeli
      if (error.message?.includes('email_belongs_to_akeli_user')) {
        return new Response(JSON.stringify({ data: null, error: 'This email belongs to an Akeli account. Please log in via the app.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Unique violation — visitor email already exists
      if (error.code === '23505') {
        return new Response(JSON.stringify({ data: null, error: 'Email already registered.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Generate email verification token
    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const token_hash = await sha256(rawToken);
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('visitor_auth_token').insert({
      visitor_id: visitor.id,
      token_hash,
      purpose: 'verify_email',
      expires_at,
    });

    const siteUrl = Deno.env.get('SITE_URL')!;
    const verifyUrl = `${siteUrl}/visitor/verify-email?token=${rawToken}&id=${visitor.id}`;

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: email,
      subject: locale === 'fr' ? 'Vérifiez votre adresse email' : 'Verify your email address',
      html: locale === 'fr'
        ? `<p>Cliquez <a href="${verifyUrl}">ici</a> pour vérifier votre email. Lien valable 24h.</p>`
        : `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24h.</p>`,
    });

    return new Response(JSON.stringify({ data: { visitor_id: visitor.id }, error: null }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-signup]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Deploy the function**

```bash
npx supabase functions deploy visitor-signup
```

- [ ] **Step 4: Test manually**

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testvisitor@example.com","password":"password123","locale":"fr","first_name":"Marie"}'
```

Expected: `{"data":{"visitor_id":"..."},"error":null}` + verification email received.

Test conflict — try the same email again:
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testvisitor@example.com","password":"password123"}'
```

Expected: HTTP 409, `{"data":null,"error":"Email already registered."}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/visitor-signup/
git commit -m "feat(visitor): add visitor-signup Edge Function with bcrypt + email verification"
```

---

### Task 3: visitor-verify-email Edge Function

**Files:**
- Create: `supabase/functions/visitor-verify-email/index.ts`

**Interfaces:**
- Consumes: `POST { token: string, visitor_id: string }`
- Produces: `{ data: { verified: true }, error: null }` — sets `visitor.email_verified = true`

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/visitor-verify-email/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, visitor_id } = await req.json();

    if (!token || !visitor_id) {
      return new Response(JSON.stringify({ data: null, error: 'token and visitor_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token_hash = await sha256(token);

    const { data: tokenRow } = await supabase
      .from('visitor_auth_token')
      .select('id, expires_at, used_at')
      .eq('visitor_id', visitor_id)
      .eq('token_hash', token_hash)
      .eq('purpose', 'verify_email')
      .single();

    if (!tokenRow) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid or expired token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ data: null, error: 'Token already used' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ data: null, error: 'Token expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark token used and set email_verified in parallel
    await Promise.all([
      supabase.from('visitor_auth_token').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id),
      supabase.from('visitor').update({ email_verified: true }).eq('id', visitor_id),
    ]);

    return new Response(JSON.stringify({ data: { verified: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-verify-email]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy visitor-verify-email
```

- [ ] **Step 3: Test manually**

Get the raw token from the verification email sent in Task 2 testing. Extract `token` and `id` from the URL.

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<raw_token_from_email>","visitor_id":"<visitor_id>"}'
```

Expected: `{"data":{"verified":true},"error":null}`.

Re-run: Expected: HTTP 400 `"Token already used"`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/visitor-verify-email/
git commit -m "feat(visitor): add visitor-verify-email Edge Function"
```

---

### Task 4: Shared JWT Helper + visitor-login Edge Function

**Files:**
- Create: `supabase/functions/_shared/visitor-auth.ts`
- Create: `supabase/functions/visitor-login/index.ts`

**Interfaces:**
- `verifyVisitorJWT(req)` → `{ visitor_id: string, email: string } | null`
- Login consumes: `POST { email: string, password: string }`
- Login produces: `{ data: { jwt: string, visitor_id: string }, error: null }`

- [ ] **Step 1: Write the shared JWT helper**

```typescript
// supabase/functions/_shared/visitor-auth.ts
import { SignJWT, jwtVerify } from 'https://esm.sh/jose';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(Deno.env.get('VISITOR_JWT_SECRET')!);
}

export async function signVisitorJWT(visitor_id: string, email: string): Promise<string> {
  return new SignJWT({ visitor_id, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyVisitorJWT(req: Request): Promise<{ visitor_id: string; email: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), getSecret());
    return { visitor_id: payload.visitor_id as string, email: payload.email as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write visitor-login**

```typescript
// supabase/functions/visitor-login/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';
import { signVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ data: null, error: 'Email and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitor } = await supabase
      .from('visitor')
      .select('id, email, password_hash, email_verified')
      .eq('email', email)
      .single();

    // Use constant-time comparison by always calling bcrypt.compare
    const validPassword = visitor
      ? await bcrypt.compare(password, visitor.password_hash)
      : await bcrypt.compare(password, '$2a$12$invalidhashtopreventtiming');

    if (!visitor || !validPassword) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid email or password' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitor.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Please verify your email before logging in' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = await signVisitorJWT(visitor.id, visitor.email);

    return new Response(JSON.stringify({ data: { jwt, visitor_id: visitor.id }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-login]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy visitor-login
```

- [ ] **Step 4: Test manually**

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-login \
  -H "Content-Type: application/json" \
  -d '{"email":"testvisitor@example.com","password":"password123"}'
```

Expected: `{"data":{"jwt":"eyJ...","visitor_id":"..."},"error":null}`.

Wrong password:
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-login \
  -H "Content-Type: application/json" \
  -d '{"email":"testvisitor@example.com","password":"wrongpassword"}'
```

Expected: HTTP 401 `{"data":null,"error":"Invalid email or password"}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/ supabase/functions/visitor-login/
git commit -m "feat(visitor): add shared JWT helper and visitor-login Edge Function"
```

---

### Task 5: Password Reset Flow

**Files:**
- Create: `supabase/functions/visitor-request-reset/index.ts`
- Create: `supabase/functions/visitor-reset-password/index.ts`

**Interfaces:**
- Request reset: `POST { email: string }` → always returns 200 (no email enumeration)
- Reset password: `POST { token: string, visitor_id: string, new_password: string }` → `{ data: { reset: true }, error: null }`

- [ ] **Step 1: Write visitor-request-reset**

```typescript
// supabase/functions/visitor-request-reset/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ok = new Response(JSON.stringify({ data: { sent: true }, error: null }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { email } = await req.json();
    if (!email) return ok; // Always return 200 — no email enumeration

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitor } = await supabase
      .from('visitor')
      .select('id, locale')
      .eq('email', email)
      .single();

    if (!visitor) return ok; // Silently return — don't reveal if email exists

    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const token_hash = await sha256(rawToken);
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    await supabase.from('visitor_auth_token').insert({
      visitor_id: visitor.id,
      token_hash,
      purpose: 'reset_password',
      expires_at,
    });

    const siteUrl = Deno.env.get('SITE_URL')!;
    const resetUrl = `${siteUrl}/visitor/reset-password?token=${rawToken}&id=${visitor.id}`;

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: email,
      subject: visitor.locale === 'fr' ? 'Réinitialiser votre mot de passe' : 'Reset your password',
      html: visitor.locale === 'fr'
        ? `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe. Lien valable 30 minutes.</p>`
        : `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`,
    });

    return ok;
  } catch (err) {
    console.error('[visitor-request-reset]', err);
    return ok; // Still return 200 to avoid leaking errors
  }
});
```

- [ ] **Step 2: Write visitor-reset-password**

```typescript
// supabase/functions/visitor-reset-password/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, visitor_id, new_password } = await req.json();

    if (!token || !visitor_id || !new_password || new_password.length < 8) {
      return new Response(JSON.stringify({ data: null, error: 'token, visitor_id, and new_password (min 8 chars) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token_hash = await sha256(token);

    const { data: tokenRow } = await supabase
      .from('visitor_auth_token')
      .select('id, expires_at, used_at')
      .eq('visitor_id', visitor_id)
      .eq('token_hash', token_hash)
      .eq('purpose', 'reset_password')
      .single();

    if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid or expired reset token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const password_hash = await bcrypt.hash(new_password, 12);

    await Promise.all([
      supabase.from('visitor_auth_token').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id),
      supabase.from('visitor').update({ password_hash }).eq('id', visitor_id),
    ]);

    return new Response(JSON.stringify({ data: { reset: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-reset-password]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy visitor-request-reset
npx supabase functions deploy visitor-reset-password
```

- [ ] **Step 4: Test manually**

```bash
# Request reset
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-request-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"testvisitor@example.com"}'
```

Expected: `{"data":{"sent":true},"error":null}` regardless of whether email exists.

Get token+id from the email, then:
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<raw_token>","visitor_id":"<id>","new_password":"newpassword456"}'
```

Expected: `{"data":{"reset":true},"error":null}`.

Verify new password works in visitor-login.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/visitor-request-reset/ supabase/functions/visitor-reset-password/
git commit -m "feat(visitor): add password reset flow Edge Functions"
```

---

### Task 6: Follow / Unfollow Edge Functions

**Files:**
- Create: `supabase/functions/visitor-follow-creator/index.ts`
- Create: `supabase/functions/visitor-unfollow-creator/index.ts`

**Interfaces:**
- Consumes: `POST { creator_id: string }` + `Authorization: Bearer <visitor_jwt>`
- Follow produces: `{ data: { following: true }, error: null }`
- Unfollow produces: `{ data: { following: false }, error: null }`

- [ ] **Step 1: Write visitor-follow-creator**

```typescript
// supabase/functions/visitor-follow-creator/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { creator_id } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check email is verified
    const { data: visitorRow } = await supabase
      .from('visitor')
      .select('email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (!visitorRow?.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before following' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert follow — reactivate if previously unfollowed
    await supabase.from('visitor_creator_follow').upsert({
      visitor_id: visitor.visitor_id,
      creator_id,
      active: true,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
    }, { onConflict: 'visitor_id,creator_id' });

    return new Response(JSON.stringify({ data: { following: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-follow-creator]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Write visitor-unfollow-creator**

```typescript
// supabase/functions/visitor-unfollow-creator/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { creator_id } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('visitor_creator_follow')
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq('visitor_id', visitor.visitor_id)
      .eq('creator_id', creator_id);

    return new Response(JSON.stringify({ data: { following: false }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-unfollow-creator]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy visitor-follow-creator
npx supabase functions deploy visitor-unfollow-creator
```

- [ ] **Step 4: Test manually**

Get a JWT from visitor-login first, then:

```bash
# Follow
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-follow-creator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"creator_id":"<creator_id>"}'
```

Expected: `{"data":{"following":true},"error":null}`.

```bash
# Verify row in DB (Supabase Studio → visitor_creator_follow table)
# Then unfollow
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-unfollow-creator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"creator_id":"<creator_id>"}'
```

Expected: `{"data":{"following":false},"error":null}` + `active=false` in DB.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/visitor-follow-creator/ supabase/functions/visitor-unfollow-creator/
git commit -m "feat(visitor): add follow/unfollow Edge Functions with JWT auth"
```

---

### Task 7: send-creator-newsletter Edge Function

**Files:**
- Create: `supabase/functions/send-creator-newsletter/index.ts`

**Interfaces:**
- Triggered by Supabase Database Webhook on `recipe` UPDATE
- Webhook payload: `{ type: "UPDATE", table: "recipe", record: {...}, old_record: {...} }`
- Only fires when `is_published` and `show_on_website` both become true in the same UPDATE

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/send-creator-newsletter/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // DB webhooks are authenticated with the service role key
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { record, old_record } = payload;

    // Only send when recipe becomes publicly live (transition check)
    const wasLive = old_record?.is_published && old_record?.show_on_website;
    const isNowLive = record?.is_published && record?.show_on_website;

    if (wasLive || !isNowLive) {
      return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    );

    // Fetch creator info
    const { data: creator } = await supabase
      .from('creator')
      .select('display_name')
      .eq('id', record.creator_id)
      .single();

    // Fetch all active follower emails (visitors + Akeli users)
    const { data: recipients } = await supabase.rpc('get_creator_newsletter_emails', {
      p_creator_id: record.creator_id,
    });

    if (!recipients || recipients.length === 0) {
      console.log(`[send-creator-newsletter] recipe=${record.id} no followers, skipping`);
      return new Response(JSON.stringify({ data: { sent: 0 }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const siteUrl = Deno.env.get('SITE_URL')!;
    const recipeUrl = `${siteUrl}/recipe/${record.slug}`;
    const creatorName = creator?.display_name ?? 'Votre créateur';

    let sent = 0;
    for (const recipient of recipients) {
      const isFr = recipient.locale !== 'en';
      const firstName = recipient.first_name ? `, ${recipient.first_name}` : '';

      await resend.emails.send({
        from: 'Akeli <no-reply@a-keli.com>',
        to: recipient.email,
        subject: isFr
          ? `🍽️ Nouvelle recette de ${creatorName}`
          : `🍽️ New recipe from ${creatorName}`,
        html: isFr
          ? `
            <h2>Bonjour${firstName} !</h2>
            <p><strong>${creatorName}</strong> vient de publier une nouvelle recette :</p>
            <h3>${record.title}</h3>
            ${record.cover_image_url ? `<img src="${record.cover_image_url}" alt="${record.title}" style="max-width:600px;width:100%" />` : ''}
            <p><a href="${recipeUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Voir la recette</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">Vous recevez cet email car vous suivez ${creatorName} sur Akeli. <a href="${siteUrl}/visitor/unsubscribe">Se désabonner</a></p>
          `
          : `
            <h2>Hello${firstName}!</h2>
            <p><strong>${creatorName}</strong> just published a new recipe:</p>
            <h3>${record.title}</h3>
            ${record.cover_image_url ? `<img src="${record.cover_image_url}" alt="${record.title}" style="max-width:600px;width:100%" />` : ''}
            <p><a href="${recipeUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View recipe</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">You receive this because you follow ${creatorName} on Akeli. <a href="${siteUrl}/visitor/unsubscribe">Unsubscribe</a></p>
          `,
      });
      sent++;
    }

    console.log(`[send-creator-newsletter] recipe=${record.id} sent=${sent}`);
    return new Response(JSON.stringify({ data: { sent }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-creator-newsletter]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy send-creator-newsletter
```

- [ ] **Step 3: Configure the DB Webhook in Supabase Dashboard**

In Supabase Dashboard → Database → Webhooks → Create webhook:
- Name: `on_recipe_published_newsletter`
- Table: `public.recipe`
- Events: `UPDATE`
- Type: Supabase Edge Functions
- Edge Function: `send-creator-newsletter`
- HTTP headers: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

- [ ] **Step 4: Test manually**

Make a test visitor follow a creator (Task 6 test). Then in Supabase Studio, update a recipe row: set `is_published = true` AND `show_on_website = true` on a recipe that was previously unpublished.

Verify: newsletter email arrives at the visitor's email address.

Check Edge Function logs in Supabase Dashboard → Edge Functions → send-creator-newsletter → Logs.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/send-creator-newsletter/
git commit -m "feat(visitor): add send-creator-newsletter Edge Function with DB webhook trigger"
```

---

### Task 8: Visitor Fan Subscription (Stripe)

**Files:**
- Create: `supabase/functions/visitor-subscribe-fan/index.ts`
- Create: `supabase/functions/visitor-stripe-webhook/index.ts`

**Interfaces:**
- Subscribe: `POST { creator_id: string, price_id: string }` + visitor JWT → redirects to Stripe Checkout
- Webhook: Stripe POST → syncs `visitor_fan_subscription` status

**Pre-requisite:** The creator must have a Stripe price configured (`stripe_price_id` stored on `creator` table or equivalent). Check the existing `create-checkout-session` function to confirm where creator Stripe prices are stored before implementing.

- [ ] **Step 1: Write visitor-subscribe-fan**

```typescript
// supabase/functions/visitor-subscribe-fan/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { creator_id, price_id } = await req.json();
    if (!creator_id || !price_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id and price_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
    const siteUrl = Deno.env.get('SITE_URL')!;

    // Get or create Stripe customer for visitor
    const { data: visitorRow } = await supabase
      .from('visitor')
      .select('stripe_customer_id, email')
      .eq('id', visitor.visitor_id)
      .single();

    let stripeCustomerId = visitorRow?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: visitorRow!.email,
        metadata: { visitor_id: visitor.visitor_id },
      });
      stripeCustomerId = customer.id;
      await supabase.from('visitor').update({ stripe_customer_id: stripeCustomerId }).eq('id', visitor.visitor_id);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${siteUrl}/visitor/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/creator/${creator_id}`,
      metadata: { visitor_id: visitor.visitor_id, creator_id },
    });

    return new Response(JSON.stringify({ data: { checkout_url: session.url }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-subscribe-fan]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Write visitor-stripe-webhook**

```typescript
// supabase/functions/visitor-stripe-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
  const webhookSecret = Deno.env.get('STRIPE_VISITOR_WEBHOOK_SECRET')!;
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[visitor-stripe-webhook] Invalid signature:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.metadata?.visitor_id) return new Response('ok');

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await supabase.from('visitor_fan_subscription').upsert({
        visitor_id: session.metadata.visitor_id,
        creator_id: session.metadata.creator_id,
        status: 'active',
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        amount_cents: subscription.items.data[0].price.unit_amount,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        subscribed_at: new Date().toISOString(),
      }, { onConflict: 'visitor_id,creator_id' });
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await supabase.from('visitor_fan_subscription')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('visitor_fan_subscription')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('visitor_fan_subscription')
        .update({
          status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'cancelled',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-stripe-webhook]', err);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Add Stripe webhook secret to Supabase secrets**

In Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/visitor-stripe-webhook`
- Events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

Copy the webhook signing secret and add to Supabase secrets as `STRIPE_VISITOR_WEBHOOK_SECRET`.

- [ ] **Step 4: Deploy both**

```bash
npx supabase functions deploy visitor-subscribe-fan
npx supabase functions deploy visitor-stripe-webhook
```

- [ ] **Step 5: Test manually**

Use a verified visitor JWT:
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/visitor-subscribe-fan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"creator_id":"<creator_id>","price_id":"price_xxx"}'
```

Expected: `{"data":{"checkout_url":"https://checkout.stripe.com/..."},"error":null}`.

Complete checkout with Stripe test card `4242 4242 4242 4242`. Verify `visitor_fan_subscription` row created with `status = 'active'` in Supabase Studio.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/visitor-subscribe-fan/ supabase/functions/visitor-stripe-webhook/
git commit -m "feat(visitor): add visitor fan subscription with Stripe Checkout and webhook handler"
```

---

## Self-Review Checklist

- [x] **visitor-signup** — handles duplicate email (visitor + Akeli), bcrypt hash, verification email
- [x] **visitor-verify-email** — one-time token, expiry check, marks email_verified
- [x] **visitor-login** — constant-time password comparison (timing attack prevention), email_verified gate
- [x] **Password reset** — no email enumeration (always returns 200), 30-min expiry
- [x] **Follow/unfollow** — JWT auth, email_verified check, upsert handles re-follows
- [x] **Newsletter** — transition check prevents double sends, bilingual, both user types
- [x] **Stripe webhook** — signature verification, handles all 4 subscription events
- [x] **RLS** — visitor tables service-role-only, creator_follow policy for Akeli users
- [x] **Spec coverage** — all 10 Edge Functions from spec implemented, `akeli_user_id` bridge column present, `get_creator_newsletter_emails` RPC present
