# Cooking Fan Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add creator-configured fan subscription tiers with per-perk access enforcement, a tier management dashboard, and fan-gated recipe content on the visitor profile page.

**Architecture:** 4 new DB objects (2 tables, 3 RPCs, schema changes to 3 existing tables) feed 4 modified/new Edge Functions and 2 frontend surfaces: a creator dashboard tier manager and a visitor-facing creator profile with tier cards. Fan access on recipes is enforced via a Next.js API route that verifies the visitor JWT server-side.

**Tech Stack:** Supabase PostgreSQL 15, pgTAP, Deno Edge Functions (`https://esm.sh/`), Next.js App Router, React Hook Form + Zod, Tailwind CSS, Stripe

## Global Constraints

- `UNIQUE NULLS NOT DISTINCT` / `perk_type` is `text`, not a DB enum — new perk types added without migrations
- Migration naming: `YYYYMMDDHHMMSS_description.sql` — next: `20260621100000`
- Edge Function imports use `https://esm.sh/` — never `npm:`
- Response format: `{ data: ..., error: null }` / `{ data: null, error: "..." }`
- Visitor JWT stored in `localStorage` under key `visitor-token`; JWT secret is `VISITOR_JWT_SECRET` (must be in Supabase secrets AND Next.js `.env.local`)
- `SUPABASE_SERVICE_ROLE_KEY` must be in Next.js `.env.local` (server-side only, never exposed to client)
- Creator layout nav uses `useTranslations("nav")` — new items require translation keys in `fr.json` + `en.json`
- Server Actions use `createClient()` from `@/lib/supabase/server`
- Max 3 active tiers per creator — enforced in Server Action, not DB
- `get_creator_fan_emails` (from blog migration) is dropped — superseded by `get_creator_fan_emails_for_perk`

---

### Task 1: Database Migration — Fan Tier Schema

**Files:**
- Create: `supabase/migrations/20260621100000_create_fan_tier_system.sql`
- Create: `supabase/tests/cooking_fan_service.test.sql`

**Interfaces:**
- Produces:
  - Table `public.creator_fan_tier(id, creator_id, name, description, stripe_price_id, price_cents, currency, billing_interval, is_active, position, created_at, updated_at)`
  - Table `public.creator_fan_tier_perk(id, tier_id, perk_type, config, created_at)` — UNIQUE (tier_id, perk_type)
  - Column `public.recipe.visibility text DEFAULT 'public'`
  - Column `public.visitor_fan_subscription.tier_id uuid → creator_fan_tier`
  - Column `public.fan_subscription.tier_id uuid → creator_fan_tier`
  - RPC `public.visitor_has_perk(p_visitor_id uuid, p_creator_id uuid, p_perk_type text) → boolean`
  - RPC `public.user_has_perk(p_user_id uuid, p_creator_id uuid, p_perk_type text) → boolean`
  - RPC `public.get_creator_fan_emails_for_perk(p_creator_id uuid, p_perk_type text) → TABLE(email text, locale text, first_name text)`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260621100000_create_fan_tier_system.sql

-- ── creator_fan_tier ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_fan_tier (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id       uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  stripe_price_id  text NOT NULL,
  price_cents      integer NOT NULL,
  currency         text NOT NULL DEFAULT 'eur',
  billing_interval text NOT NULL DEFAULT 'month'
                     CHECK (billing_interval IN ('month', 'year')),
  is_active        boolean DEFAULT true,
  position         integer NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TRIGGER trg_creator_fan_tier_updated_at
  BEFORE UPDATE ON public.creator_fan_tier
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.creator_fan_tier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own tiers"
  ON public.creator_fan_tier FOR ALL
  USING (creator_id IN (
    SELECT id FROM public.creator WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone reads active tiers"
  ON public.creator_fan_tier FOR SELECT
  USING (is_active = true);

-- ── creator_fan_tier_perk ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_fan_tier_perk (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id    uuid REFERENCES public.creator_fan_tier(id) ON DELETE CASCADE,
  perk_type  text NOT NULL,
  config     jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tier_id, perk_type)
);

ALTER TABLE public.creator_fan_tier_perk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own tier perks"
  ON public.creator_fan_tier_perk FOR ALL
  USING (tier_id IN (
    SELECT cft.id FROM public.creator_fan_tier cft
    JOIN public.creator c ON c.id = cft.creator_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Anyone reads tier perks"
  ON public.creator_fan_tier_perk FOR SELECT
  USING (true);

-- ── Existing table changes ────────────────────────────────────────────────────

ALTER TABLE public.recipe
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'fans'));

ALTER TABLE public.visitor_fan_subscription
  ADD COLUMN IF NOT EXISTS tier_id uuid
    REFERENCES public.creator_fan_tier(id) ON DELETE SET NULL;

ALTER TABLE public.fan_subscription
  ADD COLUMN IF NOT EXISTS tier_id uuid
    REFERENCES public.creator_fan_tier(id) ON DELETE SET NULL;

-- ── Drop superseded RPC ───────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_creator_fan_emails(uuid);

-- ── visitor_has_perk ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.visitor_has_perk(
  p_visitor_id uuid,
  p_creator_id uuid,
  p_perk_type  text
) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visitor_fan_subscription vfs
    JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = vfs.tier_id
    WHERE vfs.visitor_id = p_visitor_id
      AND vfs.creator_id = p_creator_id
      AND vfs.status     = 'active'
      AND cftp.perk_type = p_perk_type
  );
$$;
ALTER FUNCTION public.visitor_has_perk(uuid, uuid, text) OWNER TO postgres;

-- ── user_has_perk ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_has_perk(
  p_user_id    uuid,
  p_creator_id uuid,
  p_perk_type  text
) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fan_subscription fs
    JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = fs.tier_id
    WHERE fs.user_id     = p_user_id
      AND fs.creator_id  = p_creator_id
      AND fs.status      = 'active'
      AND cftp.perk_type = p_perk_type
  );
$$;
ALTER FUNCTION public.user_has_perk(uuid, uuid, text) OWNER TO postgres;

-- ── get_creator_fan_emails_for_perk ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_creator_fan_emails_for_perk(
  p_creator_id uuid,
  p_perk_type  text
) RETURNS TABLE(email text, locale text, first_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.email, v.locale, v.first_name
  FROM public.visitor_fan_subscription vfs
  JOIN public.visitor v ON v.id = vfs.visitor_id
  JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = vfs.tier_id
  WHERE vfs.creator_id  = p_creator_id
    AND vfs.status       = 'active'
    AND v.email_verified = true
    AND cftp.perk_type   = p_perk_type;

  RETURN QUERY
  SELECT au.email::text, up.locale, up.first_name
  FROM public.fan_subscription fs
  JOIN public.user_profile up ON up.id = fs.user_id
  JOIN auth.users au ON au.id = fs.user_id
  JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = fs.tier_id
  WHERE fs.creator_id  = p_creator_id
    AND fs.status       = 'active'
    AND cftp.perk_type  = p_perk_type;
END;
$$;
ALTER FUNCTION public.get_creator_fan_emails_for_perk(uuid, text) OWNER TO postgres;
```

- [ ] **Step 2: Write the SQL tests**

```sql
-- supabase/tests/cooking_fan_service.test.sql
BEGIN;
SELECT plan(10);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('30000000-0000-0000-0000-000000000001', 'creator@tiertest.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('30000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001', 'Tier Test Creator');

INSERT INTO public.creator_fan_tier (id, creator_id, name, stripe_price_id, price_cents, position)
VALUES
  ('30000000-0000-0000-0000-000000000010',
   '30000000-0000-0000-0000-000000000002', 'Fan', 'price_test_fan', 700, 0),
  ('30000000-0000-0000-0000-000000000011',
   '30000000-0000-0000-0000-000000000002', 'Super Fan', 'price_test_super', 2000, 1);

INSERT INTO public.creator_fan_tier_perk (tier_id, perk_type, config)
VALUES
  ('30000000-0000-0000-0000-000000000010', 'exclusive_recipes', '{}'),
  ('30000000-0000-0000-0000-000000000011', 'exclusive_recipes', '{}'),
  ('30000000-0000-0000-0000-000000000011', 'live_session',
   '{"frequency":"1x/month","platform":"Zoom"}');

INSERT INTO public.visitor (id, email, password_hash, email_verified, locale, first_name)
VALUES ('30000000-0000-0000-0000-000000000003',
        'visitor@tiertest.test', '$2b$10$fakehash', true, 'fr', 'TierFan');

-- ── Test 1: creator_fan_tier INSERT succeeds ──────────────────────────────────

SELECT ok(
  (SELECT count(*)::int FROM public.creator_fan_tier
   WHERE creator_id = '30000000-0000-0000-0000-000000000002') = 2,
  'creator_fan_tier rows inserted successfully'
);

-- ── Test 2: invalid billing_interval rejected ─────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.creator_fan_tier
     (creator_id, name, stripe_price_id, price_cents, billing_interval)
     VALUES ('30000000-0000-0000-0000-000000000002',
             'Bad', 'price_bad', 500, 'week') $$,
  '23514', NULL,
  'Invalid billing_interval is rejected'
);

-- ── Test 3: duplicate perk_type in same tier rejected ─────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.creator_fan_tier_perk (tier_id, perk_type)
     VALUES ('30000000-0000-0000-0000-000000000010', 'exclusive_recipes') $$,
  '23505', NULL,
  'Duplicate perk_type in same tier is rejected'
);

-- ── Test 4: recipe.visibility column has default public ───────────────────────

SELECT is(
  (SELECT column_default FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'recipe'
     AND column_name = 'visibility'),
  '''public''::text',
  'recipe.visibility has default value of public'
);

-- ── Test 5: visitor_has_perk returns false when no subscription ───────────────

SELECT is(
  public.visitor_has_perk(
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'exclusive_recipes'
  ),
  false,
  'visitor_has_perk returns false when no subscription exists'
);

-- ── Test 6: visitor_has_perk returns false when tier lacks perk ───────────────

INSERT INTO public.visitor_fan_subscription (visitor_id, creator_id, tier_id, status)
VALUES ('30000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000011', 'active');

SELECT is(
  public.visitor_has_perk(
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'cooking_feedback'
  ),
  false,
  'visitor_has_perk returns false when tier lacks the perk'
);

-- ── Test 7: visitor_has_perk returns true when tier has perk ─────────────────

SELECT is(
  public.visitor_has_perk(
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'exclusive_recipes'
  ),
  true,
  'visitor_has_perk returns true when tier has the perk'
);

-- ── Test 8: visitor_has_perk returns false when subscription cancelled ────────

UPDATE public.visitor_fan_subscription
SET status = 'cancelled'
WHERE visitor_id = '30000000-0000-0000-0000-000000000003';

SELECT is(
  public.visitor_has_perk(
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'exclusive_recipes'
  ),
  false,
  'visitor_has_perk returns false when subscription is cancelled'
);

UPDATE public.visitor_fan_subscription
SET status = 'active'
WHERE visitor_id = '30000000-0000-0000-0000-000000000003';

-- ── Test 9: get_creator_fan_emails_for_perk returns fan with matching perk ────

SELECT is(
  (SELECT count(*)::int FROM public.get_creator_fan_emails_for_perk(
    '30000000-0000-0000-0000-000000000002',
    'exclusive_recipes'
  )),
  1,
  'get_creator_fan_emails_for_perk returns 1 fan with exclusive_recipes perk'
);

-- ── Test 10: get_creator_fan_emails_for_perk excludes fans without perk ───────

SELECT is(
  (SELECT count(*)::int FROM public.get_creator_fan_emails_for_perk(
    '30000000-0000-0000-0000-000000000002',
    'cooking_feedback'
  )),
  0,
  'get_creator_fan_emails_for_perk returns 0 for perk not in subscribed tier'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 3: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 4: Run the SQL tests**

```bash
npx supabase test db
```

Expected: `1..10` then `ok 1` through `ok 10`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260621100000_create_fan_tier_system.sql supabase/tests/cooking_fan_service.test.sql
git commit -m "feat(fan-tiers): add creator_fan_tier schema, perk RPCs, recipe visibility"
```

---

### Task 2: Edge Function Updates

**Files:**
- Modify: `supabase/functions/visitor-subscribe-fan/index.ts`
- Modify: `supabase/functions/visitor-stripe-webhook/index.ts`
- Modify: `supabase/functions/send-creator-newsletter/index.ts`
- Create: `supabase/functions/visitor-change-fan-tier/index.ts`

**Interfaces:**
- Consumes (from Task 1): `creator_fan_tier`, `creator_fan_tier_perk`, `visitor_fan_subscription.tier_id`, `get_creator_fan_emails_for_perk`
- `visitor-subscribe-fan` request body changes: `{ creator_id, tier_id }` (was `{ creator_id, price_id }`)
- `visitor-change-fan-tier` request body: `{ creator_id, new_tier_id }`
- `send-creator-newsletter` now calls `get_creator_fan_emails_for_perk` for fans content

- [ ] **Step 1: Rewrite visitor-subscribe-fan**

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

    const { creator_id, tier_id } = await req.json();
    if (!creator_id || !tier_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id and tier_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tier, error: tierError } = await supabase
      .from('creator_fan_tier')
      .select('id, creator_id, stripe_price_id, name, is_active')
      .eq('id', tier_id)
      .eq('creator_id', creator_id)
      .eq('is_active', true)
      .single();

    if (tierError || !tier) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid or inactive tier' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY missing');
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';

    const { data: visitorRow, error: visitorError } = await supabase
      .from('visitor')
      .select('stripe_customer_id, email, email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (visitorError || !visitorRow) {
      return new Response(JSON.stringify({ data: null, error: 'Visitor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitorRow.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let stripeCustomerId = visitorRow.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: visitorRow.email,
        metadata: { visitor_id: visitor.visitor_id },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from('visitor')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', visitor.visitor_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${siteUrl}/visitor/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/creator/${creator_id}`,
      metadata: { visitor_id: visitor.visitor_id, creator_id, tier_id },
    });

    return new Response(JSON.stringify({ data: { checkout_url: session.url }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-subscribe-fan] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Update visitor-stripe-webhook — add tier_id to checkout upsert**

In `supabase/functions/visitor-stripe-webhook/index.ts`, find the `checkout.session.completed` branch (line 57) and replace the upsert object:

```typescript
// Replace the upsert object inside checkout.session.completed (line 57–68)
const { error: upsertError } = await supabase
  .from('visitor_fan_subscription')
  .upsert({
    visitor_id: session.metadata.visitor_id,
    creator_id: session.metadata.creator_id,
    tier_id: session.metadata.tier_id ?? null,       // ← new
    status: 'active',
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    amount_cents: subscription.items.data[0].price.unit_amount,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    subscribed_at: new Date().toISOString(),
  }, { onConflict: 'visitor_id,creator_id' });
```

- [ ] **Step 3: Update send-creator-newsletter — replace get_creator_fan_emails**

Two changes in `supabase/functions/send-creator-newsletter/index.ts`:

**Change 1** — update the `NewsletterPayload` type (line 19–28):

```typescript
interface NewsletterPayload {
  creatorId: string;
  rpc: 'get_creator_newsletter_emails' | 'get_creator_fan_emails_for_perk';
  perkType?: string;   // required when rpc === 'get_creator_fan_emails_for_perk'
  subjectFr: string;
  subjectEn: string;
  title: string;
  coverUrl: string | null;
  linkUrl: string;
  type: 'recipe' | 'blog';
}
```

**Change 2** — update the RPC call in `sendNewsletter` (line 82):

```typescript
// Replace line 82
const rpcArgs = payload.rpc === 'get_creator_fan_emails_for_perk'
  ? { p_creator_id: creatorId, p_perk_type: payload.perkType! }
  : { p_creator_id: creatorId };
const { data: recipients, error: rpcError } = await supabase.rpc(payload.rpc, rpcArgs);
```

**Change 3** — update the blog post branch (line 238–241):

```typescript
// Replace lines 238–241
const rpc = record.visibility === 'fans'
  ? 'get_creator_fan_emails_for_perk' as const
  : 'get_creator_newsletter_emails' as const;

return sendNewsletter(supabase, resend, {
  creatorId: record.creator_id,
  rpc,
  perkType: record.visibility === 'fans' ? 'fans_blog_posts' : undefined,
  subjectFr: '✍️ Nouvel article',
  subjectEn: '✍️ New post',
  title: postTitle,
  coverUrl: record.cover_image_url ?? null,
  linkUrl: `${siteUrl}/blog/${record.slug}`,
  type: 'blog',
});
```

- [ ] **Step 4: Create visitor-change-fan-tier**

```typescript
// supabase/functions/visitor-change-fan-tier/index.ts
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

    const { creator_id, new_tier_id } = await req.json();
    if (!creator_id || !new_tier_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id and new_tier_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: currentSub } = await supabase
      .from('visitor_fan_subscription')
      .select('id, stripe_subscription_id, tier_id')
      .eq('visitor_id', visitor.visitor_id)
      .eq('creator_id', creator_id)
      .eq('status', 'active')
      .single();

    if (!currentSub) {
      return new Response(JSON.stringify({ data: null, error: 'No active subscription found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (currentSub.tier_id === new_tier_id) {
      return new Response(JSON.stringify({ data: null, error: 'Already subscribed to this tier' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newTier } = await supabase
      .from('creator_fan_tier')
      .select('id, stripe_price_id, is_active')
      .eq('id', new_tier_id)
      .eq('creator_id', creator_id)
      .eq('is_active', true)
      .single();

    if (!newTier) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid or inactive tier' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
    const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id!);
    const currentItemId = stripeSub.items.data[0].id;

    await stripe.subscriptions.update(currentSub.stripe_subscription_id!, {
      items: [{ id: currentItemId, price: newTier.stripe_price_id }],
      proration_behavior: 'create_prorations',
    });

    await supabase
      .from('visitor_fan_subscription')
      .update({ tier_id: new_tier_id, updated_at: new Date().toISOString() })
      .eq('id', currentSub.id);

    console.log(`[visitor-change-fan-tier] visitor=${visitor.visitor_id} → tier=${new_tier_id}`);
    return new Response(JSON.stringify({ data: { tier_id: new_tier_id }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-change-fan-tier] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 5: Deploy all four functions**

```bash
npx supabase functions deploy visitor-subscribe-fan
npx supabase functions deploy visitor-stripe-webhook
npx supabase functions deploy send-creator-newsletter
npx supabase functions deploy visitor-change-fan-tier
```

Expected: all four deploy with no errors.

- [ ] **Step 6: Smoke test visitor-subscribe-fan accepts tier_id**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/visitor-subscribe-fan \
  -H "Authorization: Bearer <visitor_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"creator_id":"<valid_creator_id>","tier_id":"nonexistent-tier-id"}'
```

Expected: `{"data":null,"error":"Invalid or inactive tier"}` (400)

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/visitor-subscribe-fan/ \
        supabase/functions/visitor-stripe-webhook/ \
        supabase/functions/send-creator-newsletter/ \
        supabase/functions/visitor-change-fan-tier/
git commit -m "feat(fan-tiers): update Edge Functions for tier_id support and perk-aware newsletter"
```

---

### Task 3: Creator Dashboard — Tier Management

**Files:**
- Create: `lib/actions/fan-tiers.ts`
- Create: `app/[locale]/(creator)/dashboard/fan-tiers/page.tsx`
- Create: `components/creator/fan-tiers/TierList.tsx`
- Create: `components/creator/fan-tiers/TierForm.tsx`
- Modify: `app/[locale]/(creator)/layout.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes (from Task 1): `creator_fan_tier`, `creator_fan_tier_perk` tables
- Server Actions: `createFanTier`, `updateFanTier`, `deactivateFanTier`, `reorderFanTiers`
- Page fetches tiers server-side, passes to `TierList`
- `TierList` renders cards + opens `TierForm` modal

- [ ] **Step 1: Add translation keys**

In `messages/fr.json`, add at the root level:
```json
"fanTiers": {
  "title": "Abonnements fans",
  "subtitle": "Définissez vos offres d'abonnement pour vos fans visiteurs.",
  "addTier": "Ajouter un palier",
  "noTiers": "Aucun palier créé. Commencez par en ajouter un.",
  "editTier": "Modifier",
  "deactivate": "Désactiver",
  "active": "Actif",
  "inactive": "Inactif",
  "maxTiers": "Vous avez atteint le maximum de 3 paliers actifs.",
  "perMonth": "/ mois",
  "perYear": "/ an",
  "form": {
    "name": "Nom du palier",
    "description": "Description",
    "stripePriceId": "Stripe Price ID",
    "stripePriceIdHint": "Créez d'abord votre prix dans le Dashboard Stripe, puis collez l'ID ici (price_...).",
    "displayPrice": "Prix affiché",
    "currency": "Devise",
    "billingInterval": "Facturation",
    "monthly": "Mensuelle",
    "yearly": "Annuelle",
    "accessPerks": "Ce que les fans peuvent accéder",
    "servicePerks": "Ce que vous vous engagez à livrer",
    "serviceDisclaimer": "Ces engagements sont affichés à vos fans. Akeli ne suit pas la livraison.",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "daysBeforePublic": "Jours avant le public",
    "requestsPerMonth": "Demandes par mois",
    "maxPerMonth": "Max par mois",
    "frequency": "Fréquence",
    "platform": "Plateforme",
    "description_label": "Description",
    "perks": {
      "exclusive_recipes": "Recettes exclusives",
      "early_access_recipes": "Accès anticipé aux recettes",
      "fans_blog_posts": "Articles de blog fans uniquement",
      "fan_community": "Communauté fans (bientôt disponible)",
      "live_session": "Session live de cuisine",
      "private_chat": "Chat privé",
      "recipe_request": "Demandes de recettes",
      "cooking_feedback": "Feedback sur vos essais culinaires",
      "meal_plan": "Plan de repas",
      "cook_along": "Événements cook-along"
    }
  }
}
```

In `messages/en.json`, add at the root level:
```json
"fanTiers": {
  "title": "Fan Tiers",
  "subtitle": "Define your subscription offers for visitor fans.",
  "addTier": "Add a tier",
  "noTiers": "No tiers created yet. Start by adding one.",
  "editTier": "Edit",
  "deactivate": "Deactivate",
  "active": "Active",
  "inactive": "Inactive",
  "maxTiers": "You've reached the maximum of 3 active tiers.",
  "perMonth": "/ month",
  "perYear": "/ year",
  "form": {
    "name": "Tier name",
    "description": "Description",
    "stripePriceId": "Stripe Price ID",
    "stripePriceIdHint": "Create your price in the Stripe Dashboard first, then paste the ID here (price_...).",
    "displayPrice": "Display price",
    "currency": "Currency",
    "billingInterval": "Billing",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "accessPerks": "What fans can access",
    "servicePerks": "What you commit to deliver",
    "serviceDisclaimer": "These are commitments displayed to your fans. Akeli does not track delivery.",
    "save": "Save",
    "cancel": "Cancel",
    "daysBeforePublic": "Days before public",
    "requestsPerMonth": "Requests per month",
    "maxPerMonth": "Max per month",
    "frequency": "Frequency",
    "platform": "Platform",
    "description_label": "Description",
    "perks": {
      "exclusive_recipes": "Exclusive recipes",
      "early_access_recipes": "Early access to recipes",
      "fans_blog_posts": "Fans-only blog posts",
      "fan_community": "Fan community (coming soon)",
      "live_session": "Live cooking session",
      "private_chat": "Private chat",
      "recipe_request": "Recipe requests",
      "cooking_feedback": "Feedback on cooking attempts",
      "meal_plan": "Meal plan",
      "cook_along": "Cook-along events"
    }
  }
}
```

Also add `"fanTiers": "Abonnements fans"` inside the existing `nav` key in `fr.json`, and `"fanTiers": "Fan Tiers"` in `en.json`.

- [ ] **Step 2: Add nav item to creator layout**

In `app/[locale]/(creator)/layout.tsx`, add to the `navItems` array after the `fan-mode` item:

```typescript
{ label: t("fanTiers"), href: "/dashboard/fan-tiers" },
```

- [ ] **Step 3: Write Server Actions**

```typescript
// lib/actions/fan-tiers.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type PerkConfig = Record<string, string | number>;

export interface PerkInput {
  perk_type: string;
  config: PerkConfig;
}

export interface TierFormData {
  name: string;
  description?: string;
  stripe_price_id: string;
  price_cents: number;
  currency: string;
  billing_interval: 'month' | 'year';
  perks: PerkInput[];
}

async function getCreatorId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('creator')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return data?.id ?? null;
}

export async function createFanTier(data: TierFormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) return { error: 'Not authenticated' };

  const { count } = await supabase
    .from('creator_fan_tier')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('is_active', true);

  if ((count ?? 0) >= 3) return { error: 'Maximum 3 active tiers allowed' };

  const { data: tiers } = await supabase
    .from('creator_fan_tier')
    .select('position')
    .eq('creator_id', creatorId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (tiers?.[0]?.position ?? -1) + 1;

  const { data: tier, error: tierError } = await supabase
    .from('creator_fan_tier')
    .insert({
      creator_id: creatorId,
      name: data.name,
      description: data.description ?? null,
      stripe_price_id: data.stripe_price_id,
      price_cents: data.price_cents,
      currency: data.currency,
      billing_interval: data.billing_interval,
      position: nextPosition,
    })
    .select('id')
    .single();

  if (tierError || !tier) return { error: tierError?.message ?? 'Failed to create tier' };

  if (data.perks.length > 0) {
    const { error: perksError } = await supabase
      .from('creator_fan_tier_perk')
      .insert(data.perks.map((p) => ({
        tier_id: tier.id,
        perk_type: p.perk_type,
        config: p.config,
      })));
    if (perksError) return { error: perksError.message };
  }

  revalidatePath('/dashboard/fan-tiers');
  return {};
}

export async function updateFanTier(tierId: string, data: TierFormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) return { error: 'Not authenticated' };

  const { error: tierError } = await supabase
    .from('creator_fan_tier')
    .update({
      name: data.name,
      description: data.description ?? null,
      stripe_price_id: data.stripe_price_id,
      price_cents: data.price_cents,
      currency: data.currency,
      billing_interval: data.billing_interval,
    })
    .eq('id', tierId)
    .eq('creator_id', creatorId);

  if (tierError) return { error: tierError.message };

  await supabase.from('creator_fan_tier_perk').delete().eq('tier_id', tierId);

  if (data.perks.length > 0) {
    const { error: perksError } = await supabase
      .from('creator_fan_tier_perk')
      .insert(data.perks.map((p) => ({
        tier_id: tierId,
        perk_type: p.perk_type,
        config: p.config,
      })));
    if (perksError) return { error: perksError.message };
  }

  revalidatePath('/dashboard/fan-tiers');
  return {};
}

export async function deactivateFanTier(tierId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('creator_fan_tier')
    .update({ is_active: false })
    .eq('id', tierId)
    .eq('creator_id', creatorId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/fan-tiers');
  return {};
}

export async function reorderFanTiers(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const creatorId = await getCreatorId(supabase);
  if (!creatorId) return { error: 'Not authenticated' };

  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase
        .from('creator_fan_tier')
        .update({ position: idx })
        .eq('id', id)
        .eq('creator_id', creatorId)
    )
  );

  revalidatePath('/dashboard/fan-tiers');
  return {};
}
```

- [ ] **Step 4: Write TierForm component**

```tsx
// components/creator/fan-tiers/TierForm.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TierFormData, PerkInput } from '@/lib/actions/fan-tiers';

const ACCESS_PERKS = [
  'exclusive_recipes',
  'early_access_recipes',
  'fans_blog_posts',
  'fan_community',
] as const;

const SERVICE_PERKS = [
  'live_session',
  'private_chat',
  'recipe_request',
  'cooking_feedback',
  'meal_plan',
  'cook_along',
] as const;

interface TierPerk { perk_type: string; config: Record<string, string | number>; }

interface Props {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    stripe_price_id: string;
    price_cents: number;
    currency: string;
    billing_interval: string;
    creator_fan_tier_perk: TierPerk[];
  };
  onSave: (data: TierFormData) => Promise<{ error?: string }>;
  onCancel: () => void;
}

export default function TierForm({ initialData, onSave, onCancel }: Props) {
  const t = useTranslations('fanTiers.form');

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [stripePriceId, setStripePriceId] = useState(initialData?.stripe_price_id ?? '');
  const [priceCents, setPriceCents] = useState(initialData?.price_cents ? String(initialData.price_cents / 100) : '');
  const [currency, setCurrency] = useState(initialData?.currency ?? 'eur');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
    (initialData?.billing_interval as 'month' | 'year') ?? 'month'
  );
  const [selectedPerks, setSelectedPerks] = useState<Set<string>>(
    new Set(initialData?.creator_fan_tier_perk.map((p) => p.perk_type) ?? [])
  );
  const [perkConfigs, setPerkConfigs] = useState<Record<string, Record<string, string | number>>>(
    Object.fromEntries(
      (initialData?.creator_fan_tier_perk ?? []).map((p) => [p.perk_type, p.config])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePerk(perkType: string) {
    setSelectedPerks((prev) => {
      const next = new Set(prev);
      if (next.has(perkType)) next.delete(perkType);
      else next.add(perkType);
      return next;
    });
  }

  function setPerkConfig(perkType: string, key: string, value: string | number) {
    setPerkConfigs((prev) => ({
      ...prev,
      [perkType]: { ...(prev[perkType] ?? {}), [key]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const perks: PerkInput[] = Array.from(selectedPerks).map((perk_type) => ({
      perk_type,
      config: perkConfigs[perk_type] ?? {},
    }));

    const result = await onSave({
      name,
      description: description || undefined,
      stripe_price_id: stripePriceId,
      price_cents: Math.round(parseFloat(priceCents) * 100),
      currency,
      billing_interval: billingInterval,
      perks,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('name')} *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('stripePriceId')} *</label>
          <input
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            required
            placeholder="price_..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground">{t('stripePriceIdHint')}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t('description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('displayPrice')} *</label>
          <input
            type="number"
            min="0.50"
            step="0.01"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            required
            placeholder="7.00"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('currency')}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="eur">EUR €</option>
            <option value="usd">USD $</option>
            <option value="gbp">GBP £</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('billingInterval')}</label>
          <select
            value={billingInterval}
            onChange={(e) => setBillingInterval(e.target.value as 'month' | 'year')}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="month">{t('monthly')}</option>
            <option value="year">{t('yearly')}</option>
          </select>
        </div>
      </div>

      {/* Access perks */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground border-b border-border pb-2">{t('accessPerks')}</p>
        {ACCESS_PERKS.map((perk) => {
          const checked = selectedPerks.has(perk);
          const isComing = perk === 'fan_community';
          return (
            <div key={perk}>
              <label className={`flex items-center gap-3 ${isComing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isComing}
                  onChange={() => !isComing && togglePerk(perk)}
                  className="rounded border-input accent-primary w-4 h-4"
                />
                <span className="text-sm text-foreground">{t(`perks.${perk}`)}</span>
              </label>
              {checked && perk === 'early_access_recipes' && (
                <div className="ml-7 mt-2">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={perkConfigs['early_access_recipes']?.days_before_public ?? ''}
                    onChange={(e) => setPerkConfig('early_access_recipes', 'days_before_public', parseInt(e.target.value))}
                    placeholder="3"
                    className="w-24 px-2 py-1 rounded border border-input bg-background text-sm"
                  />
                  <span className="text-xs text-muted-foreground ml-2">{t('daysBeforePublic')}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Service perks */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground border-b border-border pb-2">{t('servicePerks')}</p>
        {SERVICE_PERKS.map((perk) => {
          const checked = selectedPerks.has(perk);
          return (
            <div key={perk}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePerk(perk)}
                  className="rounded border-input accent-primary w-4 h-4"
                />
                <span className="text-sm text-foreground">{t(`perks.${perk}`)}</span>
              </label>
              {checked && (
                <div className="ml-7 mt-2 space-y-2">
                  {(perk === 'live_session' || perk === 'meal_plan' || perk === 'cook_along') && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={String(perkConfigs[perk]?.frequency ?? '')}
                        onChange={(e) => setPerkConfig(perk, 'frequency', e.target.value)}
                        placeholder="1x/month"
                        className="w-32 px-2 py-1 rounded border border-input bg-background text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('frequency')}</span>
                    </div>
                  )}
                  {perk === 'live_session' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={String(perkConfigs[perk]?.platform ?? '')}
                        onChange={(e) => setPerkConfig(perk, 'platform', e.target.value)}
                        placeholder="Zoom"
                        className="w-32 px-2 py-1 rounded border border-input bg-background text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('platform')}</span>
                    </div>
                  )}
                  {(perk === 'recipe_request') && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={perkConfigs[perk]?.requests_per_month ?? ''}
                        onChange={(e) => setPerkConfig(perk, 'requests_per_month', parseInt(e.target.value))}
                        placeholder="3"
                        className="w-20 px-2 py-1 rounded border border-input bg-background text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('requestsPerMonth')}</span>
                    </div>
                  )}
                  {perk === 'cooking_feedback' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={perkConfigs[perk]?.max_per_month ?? ''}
                        onChange={(e) => setPerkConfig(perk, 'max_per_month', parseInt(e.target.value))}
                        placeholder="2"
                        className="w-20 px-2 py-1 rounded border border-input bg-background text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('maxPerMonth')}</span>
                    </div>
                  )}
                  {(perk === 'private_chat' || perk === 'cook_along') && (
                    <input
                      type="text"
                      value={String(perkConfigs[perk]?.description ?? '')}
                      onChange={(e) => setPerkConfig(perk, 'description', e.target.value)}
                      placeholder="Details..."
                      className="w-64 px-2 py-1 rounded border border-input bg-background text-sm"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground italic">{t('serviceDisclaimer')}</p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? '...' : t('save')}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Write TierList component**

```tsx
// components/creator/fan-tiers/TierList.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import TierForm from './TierForm';
import { createFanTier, updateFanTier, deactivateFanTier } from '@/lib/actions/fan-tiers';
import type { TierFormData } from '@/lib/actions/fan-tiers';

interface TierPerk { perk_type: string; config: Record<string, string | number>; }

interface Tier {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
  is_active: boolean;
  position: number;
  creator_fan_tier_perk: TierPerk[];
}

interface Props { tiers: Tier[]; }

export default function TierList({ tiers: initialTiers }: Props) {
  const t = useTranslations('fanTiers');
  const [tiers, setTiers] = useState(initialTiers);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);

  const activeTiers = tiers.filter((t) => t.is_active);
  const atMax = activeTiers.length >= 3;

  async function handleCreate(data: TierFormData) {
    const result = await createFanTier(data);
    if (!result.error) setShowForm(false);
    return result;
  }

  async function handleUpdate(data: TierFormData) {
    if (!editingTier) return { error: 'No tier selected' };
    const result = await updateFanTier(editingTier.id, data);
    if (!result.error) setEditingTier(null);
    return result;
  }

  async function handleDeactivate(tierId: string) {
    if (!confirm('Désactiver ce palier ? Les abonnements existants ne seront pas annulés automatiquement.')) return;
    await deactivateFanTier(tierId);
    setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, is_active: false } : t));
  }

  const currencySymbol: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };

  return (
    <div className="space-y-6">
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-6">{t('addTier')}</h2>
          <TierForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editingTier && (
        <div className="rounded-2xl border border-primary/30 bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-6">{t('editTier')}</h2>
          <TierForm
            initialData={editingTier}
            onSave={handleUpdate}
            onCancel={() => setEditingTier(null)}
          />
        </div>
      )}

      {tiers.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{t('noTiers')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl border bg-card p-5 space-y-4 ${
                tier.is_active ? 'border-border' : 'border-border/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{tier.name}</h3>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    {currencySymbol[tier.currency] ?? tier.currency}
                    {(tier.price_cents / 100).toFixed(2)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {tier.billing_interval === 'month' ? t('perMonth') : t('perYear')}
                    </span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  tier.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {tier.is_active ? t('active') : t('inactive')}
                </span>
              </div>

              {tier.description && (
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {tier.creator_fan_tier_perk.map((p) => (
                  <span
                    key={p.perk_type}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                  >
                    {p.perk_type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {tier.is_active && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setEditingTier(tier)}
                    className="flex-1 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    {t('editTier')}
                  </button>
                  <button
                    onClick={() => handleDeactivate(tier.id)}
                    className="flex-1 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                  >
                    {t('deactivate')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showForm && !editingTier && (
        <button
          onClick={() => setShowForm(true)}
          disabled={atMax}
          title={atMax ? t('maxTiers') : undefined}
          className="px-5 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + {t('addTier')}
        </button>
      )}

      {atMax && (
        <p className="text-xs text-muted-foreground">{t('maxTiers')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write the dashboard page**

```tsx
// app/[locale]/(creator)/dashboard/fan-tiers/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import TierList from '@/components/creator/fan-tiers/TierList';

export default async function FanTiersPage() {
  const t = await getTranslations('fanTiers');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: creatorData } = await supabase
    .from('creator')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!creatorData) redirect('/dashboard');

  const { data: tiers } = await supabase
    .from('creator_fan_tier')
    .select(`
      id, name, description, stripe_price_id, price_cents, currency,
      billing_interval, is_active, position,
      creator_fan_tier_perk ( perk_type, config )
    `)
    .eq('creator_id', creatorData.id)
    .order('position', { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>
      <TierList tiers={tiers ?? []} />
    </div>
  );
}
```

- [ ] **Step 7: Verify the page loads**

Start dev server:
```bash
npm run dev
```

Navigate to `http://localhost:3000/fr/dashboard/fan-tiers` while logged in as a creator.

Expected: page renders with "Aucun palier créé" and "Ajouter un palier" button. Create a tier, verify it appears as a card. Deactivate it, verify it goes grey.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/fan-tiers.ts \
        components/creator/fan-tiers/ \
        app/[locale]/\(creator\)/dashboard/fan-tiers/ \
        app/[locale]/\(creator\)/layout.tsx \
        messages/fr.json messages/en.json
git commit -m "feat(fan-tiers): creator dashboard tier management — list, create, edit, deactivate"
```

---

### Task 4: Visitor Profile + Gated Recipe Content

**Files:**
- Create: `components/public/creator/FanTierCards.tsx`
- Create: `components/public/creator/GatedContentTeaser.tsx`
- Create: `app/api/check-perk/route.ts`
- Modify: `app/[locale]/creator/[username]/page.tsx`
- Modify: `app/[locale]/recipe/[slug]/page.tsx`

**Interfaces:**
- Consumes (from Task 1): `creator_fan_tier`, `creator_fan_tier_perk` (public reads via anon key), `visitor_has_perk` RPC (via API route)
- Consumes (from Task 2): `visitor-subscribe-fan` with `{ creator_id, tier_id }`
- `POST /api/check-perk` → `{ has_perk: boolean }` — verifies visitor JWT server-side, calls `visitor_has_perk` RPC with service role
- Requires in `.env.local`:
  - `VISITOR_JWT_SECRET=<same value as in Supabase secrets>`
  - `SUPABASE_SERVICE_ROLE_KEY=<your service role key>`

- [ ] **Step 1: Add env vars to .env.local**

Add to `.env.local`:
```
VISITOR_JWT_SECRET=your_visitor_jwt_secret_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

These values must match what's configured in Supabase secrets (`supabase secrets list`).

- [ ] **Step 2: Create the check-perk API route**

```typescript
// app/api/check-perk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { visitor_token, creator_id, perk_type } = await req.json();

    if (!visitor_token || !creator_id || !perk_type) {
      return NextResponse.json({ has_perk: false });
    }

    const jwtSecret = process.env.VISITOR_JWT_SECRET;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!jwtSecret || !serviceKey || !supabaseUrl) {
      console.error('[check-perk] Missing env vars');
      return NextResponse.json({ has_perk: false });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(visitor_token, secret);
    const visitor_id = payload.visitor_id as string;

    if (!visitor_id) return NextResponse.json({ has_perk: false });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data } = await supabase.rpc('visitor_has_perk', {
      p_visitor_id: visitor_id,
      p_creator_id: creator_id,
      p_perk_type: perk_type,
    });

    return NextResponse.json({ has_perk: data ?? false });
  } catch {
    return NextResponse.json({ has_perk: false });
  }
}
```

- [ ] **Step 3: Create GatedContentTeaser**

```tsx
// components/public/creator/GatedContentTeaser.tsx
'use client';

interface Props {
  creatorName: string;
  tierName: string;
  priceDisplay: string;
  onSubscribe: () => void;
  loading?: boolean;
}

export default function GatedContentTeaser({ creatorName, tierName, priceDisplay, onSubscribe, loading }: Props) {
  return (
    <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center space-y-4">
      <div className="text-3xl">🔒</div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">
          Cette recette est réservée aux fans de {creatorName}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Le palier <strong>{tierName}</strong> à {priceDisplay} inclut les recettes exclusives.
        </p>
      </div>
      <button
        onClick={onSubscribe}
        disabled={loading}
        className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {loading ? '...' : `Devenir fan · ${priceDisplay}`}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Create FanTierCards**

```tsx
// components/public/creator/FanTierCards.tsx
'use client';

import { useState } from 'react';

interface TierPerk { perk_type: string; config: Record<string, string | number>; }

interface Tier {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
  creator_fan_tier_perk: TierPerk[];
}

interface Props {
  creatorId: string;
  creatorName: string;
  tiers: Tier[];
}

const PERK_LABELS: Record<string, string> = {
  exclusive_recipes: 'Recettes exclusives',
  early_access_recipes: 'Accès anticipé',
  fans_blog_posts: 'Articles fans',
  fan_community: 'Communauté fans',
  live_session: 'Session live',
  private_chat: 'Chat privé',
  recipe_request: 'Demandes de recettes',
  cooking_feedback: 'Feedback culinaire',
  meal_plan: 'Plan de repas',
  cook_along: 'Cook-along',
};

const CURRENCY_SYMBOL: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };

async function initiateSubscription(creatorId: string, tierId: string, supabaseUrl: string) {
  const token = localStorage.getItem('visitor-token');
  if (!token) {
    window.location.href = `/auth/visitor-login?return_to=/creator/${creatorId}`;
    return;
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/visitor-subscribe-fan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ creator_id: creatorId, tier_id: tierId }),
  });

  const { data, error } = await resp.json();
  if (error) { alert(error); return; }
  if (data?.checkout_url) window.location.href = data.checkout_url;
}

export default function FanTierCards({ creatorId, creatorName, tiers }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (tiers.length === 0) return null;

  async function handleSubscribe(tierId: string) {
    setLoading(tierId);
    await initiateSubscription(creatorId, tierId, supabaseUrl);
    setLoading(null);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Soutenir {creatorName}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const symbol = CURRENCY_SYMBOL[tier.currency] ?? tier.currency.toUpperCase();
          const price = `${symbol}${(tier.price_cents / 100).toFixed(2)}`;
          const interval = tier.billing_interval === 'month' ? '/ mois' : '/ an';

          return (
            <div
              key={tier.id}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:border-primary/30 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-foreground">{tier.name}</h3>
                <p className="text-xl font-bold text-primary mt-1">
                  {price} <span className="text-xs font-normal text-muted-foreground">{interval}</span>
                </p>
              </div>

              {tier.description && (
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              )}

              <ul className="space-y-1.5">
                {tier.creator_fan_tier_perk.map((p) => (
                  <li key={p.perk_type} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="text-primary">✓</span>
                    {PERK_LABELS[p.perk_type] ?? p.perk_type.replace(/_/g, ' ')}
                    {p.perk_type === 'early_access_recipes' && p.config?.days_before_public &&
                      ` (${p.config.days_before_public}j avant)`}
                    {p.perk_type === 'recipe_request' && p.config?.requests_per_month &&
                      ` · ${p.config.requests_per_month}/mois`}
                    {p.perk_type === 'cooking_feedback' && p.config?.max_per_month &&
                      ` · ${p.config.max_per_month}/mois`}
                    {p.perk_type === 'live_session' && p.config?.frequency &&
                      ` · ${p.config.frequency}`}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading === tier.id}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {loading === tier.id ? '...' : `Devenir ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update creator profile page to fetch + display tiers**

In `app/[locale]/creator/[username]/page.tsx`, add the tiers fetch inside the existing `useEffect`:

```typescript
// Add to the interface at the top of the file
interface FanTierPerk { perk_type: string; config: Record<string, string | number>; }
interface FanTier {
  id: string; name: string; description: string | null;
  stripe_price_id: string; price_cents: number; currency: string;
  billing_interval: string; creator_fan_tier_perk: FanTierPerk[];
}

// Add state
const [fanTiers, setFanTiers] = useState<FanTier[]>([]);

// Add to the Promise.all inside useEffect (third query):
supabase
  .from('creator_fan_tier')
  .select('id, name, description, stripe_price_id, price_cents, currency, billing_interval, creator_fan_tier_perk(perk_type, config)')
  .eq('creator_id', creatorId)
  .eq('is_active', true)
  .order('position', { ascending: true }),
```

Update the `.then` to destructure the third result:
```typescript
.then(([creatorRes, recipesRes, tiersRes]) => {
  // ... existing code ...
  if (tiersRes.data) setFanTiers(tiersRes.data as FanTier[]);
});
```

Add the import at the top:
```typescript
import FanTierCards from '@/components/public/creator/FanTierCards';
```

Add the `FanTierCards` section in the JSX, between the profile header and the recipes section:
```tsx
{fanTiers.length > 0 && (
  <FanTierCards
    creatorId={creator.id}
    creatorName={creator.display_name ?? ''}
    tiers={fanTiers}
  />
)}
```

- [ ] **Step 6: Update recipe page — fan visibility gate**

In `app/[locale]/recipe/[slug]/page.tsx`:

Add state for the fan gate check:
```typescript
const [fanGated, setFanGated] = useState<boolean | null>(null); // null = checking
```

Add this inside the `load()` function, after `setRecipe(...)`, before `setLoading(false)`:
```typescript
// Fan visibility gate check
if (raw.visibility === 'fans') {
  const token = localStorage.getItem('visitor-token');
  if (!token) {
    setFanGated(true);
  } else {
    try {
      const resp = await fetch('/api/check-perk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_token: token,
          creator_id: raw.creator_id,
          perk_type: 'exclusive_recipes',
        }),
      });
      const { has_perk } = await resp.json();
      setFanGated(!has_perk);
    } catch {
      setFanGated(true);
    }
  }
} else {
  setFanGated(false);
}
```

Add the `GatedContentTeaser` import:
```typescript
import GatedContentTeaser from '@/components/public/creator/GatedContentTeaser';
```

In the JSX, replace the `{recipe.show_on_website ? (...) : (...)}` block's `show_on_website` branch — add a fan gate check BEFORE the full content:

```tsx
{recipe.show_on_website ? (
  <>
    {fanGated === true ? (
      <GatedContentTeaser
        creatorName={recipe.creator?.display_name ?? ''}
        tierName="Fan"
        priceDisplay="à partir de €7/mois"
        onSubscribe={() => {
          window.location.href = `/creator/${recipe.creator_id}#fan-tiers`;
        }}
      />
    ) : fanGated === null ? (
      <div className="h-32 rounded-2xl bg-secondary animate-pulse" />
    ) : (
      // existing full recipe content...
      <div className="space-y-8 pt-4 border-t border-border">
        {/* ... all the existing ingredients/steps/cooking mode JSX ... */}
      </div>
    )}
  </>
) : (
  // existing app-only CTA ...
)}
```

- [ ] **Step 7: Test the full visitor flow**

1. Navigate to a creator profile page — verify tier cards appear if creator has active tiers.
2. Click "Devenir Fan" without being logged in — verify redirect to `/auth/visitor-login`.
3. Add a recipe with `visibility = 'fans'` in Supabase Studio. Navigate to its page.
4. Without a visitor token in localStorage — verify `GatedContentTeaser` appears.
5. Add `visitor-token` in localStorage (a valid JWT from a visitor with no active subscription) — verify teaser still appears.
6. Add the visitor's subscription with the tier that has `exclusive_recipes` perk in Supabase Studio — verify full recipe content appears.

- [ ] **Step 8: Run production build to catch TypeScript errors**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add components/public/creator/ \
        app/api/check-perk/ \
        app/[locale]/creator/ \
        app/[locale]/recipe/
git commit -m "feat(fan-tiers): visitor profile tier cards, fan-gated recipe content, perk check API route"
```

---

## Self-Review Checklist

- [x] **Task 1 covers:** `creator_fan_tier`, `creator_fan_tier_perk`, `recipe.visibility`, `tier_id` on both subscription tables, `visitor_has_perk`, `user_has_perk`, `get_creator_fan_emails_for_perk`, drop `get_creator_fan_emails` — all from spec schema section
- [x] **Task 2 covers:** `visitor-subscribe-fan` now uses `tier_id` not `price_id`; `visitor-stripe-webhook` stores `tier_id`; `send-creator-newsletter` uses perk-aware RPC; `visitor-change-fan-tier` new function — all from spec Edge Function section
- [x] **Task 3 covers:** Creator dashboard `/dashboard/fan-tiers`, max 3 tiers enforced, full perk checklist with config inputs, service perk disclaimer — all from spec creator dashboard section
- [x] **Task 4 covers:** `FanTierCards` on creator profile, `GatedContentTeaser` on recipe page, `POST /api/check-perk` server-side perk verification — all from spec visitor experience section
- [x] **`fan_community` perk** correctly disabled in form (is_coming = true)
- [x] **`visitor-subscribe-fan` security:** uses `tier.stripe_price_id` from DB, not client-provided `price_id`
- [x] **Visitor token** read from `localStorage('visitor-token')` consistently across Task 4 files
- [x] **`get_creator_fan_emails`** drop is in the migration (Task 1)
- [x] **`VISITOR_JWT_SECRET`** and `SUPABASE_SERVICE_ROLE_KEY` documented in Task 4 env setup step
- [x] **Newsletter routing:** blog fans → `get_creator_fan_emails_for_perk(id, 'fans_blog_posts')`; recipe fans (future) would need the same pattern
