# Cooking Fan Service — Design Spec

**Date:** 2026-06-21
**Status:** Approved for implementation

---

## Overview

Akeli's fan subscription service lets visitors pay creators for a curated set of cooking-oriented perks. Unlike Patreon or OnlyFans (pure content unlocks), the model is participatory — perks span gated access (exclusive recipes, early access) AND active creator commitments (live sessions, recipe feedback, private chat, meal plans). Creators configure their own tiers freely; Akeli enforces access perks automatically, and service perks are creator-declared commitments displayed to fans without platform enforcement.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Who defines the offer | Creator-configured | No fixed packages — each creator owns their pitch |
| Tiers per creator | Multiple (max 3) | Creators can stack a basic + premium offer |
| Perk access model | Per-tier perk bundles | Each tier has its own independent perk set, no inheritance |
| Access vs service perks | Both | Access perks auto-enforced; service perks are displayed commitments only |
| Stripe price creation | Creator pastes `price_id` | Creator sets up in Stripe Dashboard, pastes ID into Akeli |
| Recipe visibility | Extend existing `visibility` enum | Mirrors `blog_post.visibility`: `public`, `followers`, `fans` |

---

## Scope

**In scope:**
- `creator_fan_tier` and `creator_fan_tier_perk` tables
- `visitor_has_perk` and `user_has_perk` RPCs
- `get_creator_fan_emails_for_perk` RPC (replaces `get_creator_fan_emails`)
- `recipe.visibility` column (migration)
- `tier_id` on `visitor_fan_subscription` and `fan_subscription`
- Creator dashboard tier management page (`/dashboard/fan-tiers`)
- Visitor-facing tier cards on creator profile (`/creator/[username]`)
- Updated subscribe flow (`visitor-subscribe-fan` + `visitor-stripe-webhook`)
- New `visitor-change-fan-tier` Edge Function (upgrade/downgrade)
- Gated content teaser cards on recipes and blog posts
- Updated `send-creator-newsletter` to use perk-aware RPC

**Out of scope:**
- Automatic Stripe product/price creation (creator uses Stripe Dashboard)
- Platform enforcement of service perk delivery (no quota tracking or alerts)
- Fan community feature (`fan_community` perk defined in catalog, UI deferred)
- Visitor portal dashboard (fan's view of their subscriptions — V2)
- Analytics: subscriber counts per tier, churn, revenue by creator

---

## Perk Catalog

Platform-defined perk types. New types can be added without schema changes — `perk_type` is a `text` column with documented values, not a DB enum.

### Access Perks (platform-enforced)

| `perk_type` | What fans get | Config keys |
|---|---|---|
| `exclusive_recipes` | Recipes with `visibility = 'fans'` | — |
| `early_access_recipes` | Recipes before their `published_at` date | `days_before_public` (integer) |
| `fans_blog_posts` | Blog posts with `visibility = 'fans'` | — |
| `fan_community` | Fan-only community space (UI deferred) | — |

### Service Perks (creator-declared, not platform-enforced)

| `perk_type` | What fans get | Config keys |
|---|---|---|
| `live_session` | Group live cooking session | `frequency` ("1×/month"), `platform` ("Zoom"), `description` |
| `private_chat` | Direct message access to creator | `description` |
| `recipe_request` | Submit recipe requests | `requests_per_month` (integer) |
| `cooking_feedback` | Creator feedback on cooking attempts | `max_per_month` (integer) |
| `meal_plan` | Creator-built meal plan | `frequency` ("monthly"), `description` |
| `cook_along` | Exclusive group cook-along events | `description` |

---

## Schema

### New table: `creator_fan_tier`

```sql
CREATE TABLE IF NOT EXISTS public.creator_fan_tier (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id        uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  stripe_price_id   text NOT NULL,
  price_cents       integer NOT NULL,
  currency          text NOT NULL DEFAULT 'eur',
  billing_interval  text NOT NULL DEFAULT 'month'
                      CHECK (billing_interval IN ('month', 'year')),
  is_active         boolean DEFAULT true,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
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
```

### New table: `creator_fan_tier_perk`

```sql
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
```

### Existing table changes

```sql
-- Add visibility to recipe (mirrors blog_post)
ALTER TABLE public.recipe
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'fans'));

-- Add tier_id to visitor_fan_subscription
ALTER TABLE public.visitor_fan_subscription
  ADD COLUMN IF NOT EXISTS tier_id uuid REFERENCES public.creator_fan_tier(id) ON DELETE SET NULL;

-- Add tier_id to fan_subscription (registered Akeli users)
ALTER TABLE public.fan_subscription
  ADD COLUMN IF NOT EXISTS tier_id uuid REFERENCES public.creator_fan_tier(id) ON DELETE SET NULL;
```

---

## Access Enforcement RPCs

### `visitor_has_perk`

Returns `true` if the visitor has an active subscription to any tier of this creator that includes `p_perk_type`.

```sql
CREATE OR REPLACE FUNCTION public.visitor_has_perk(
  p_visitor_id uuid,
  p_creator_id uuid,
  p_perk_type  text
) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visitor_fan_subscription vfs
    JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = vfs.tier_id
    WHERE vfs.visitor_id  = p_visitor_id
      AND vfs.creator_id  = p_creator_id
      AND vfs.status      = 'active'
      AND cftp.perk_type  = p_perk_type
  );
$$;
ALTER FUNCTION public.visitor_has_perk(uuid, uuid, text) OWNER TO postgres;
```

### `user_has_perk`

Same for registered Akeli users.

```sql
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
```

### `get_creator_fan_emails_for_perk`

Replaces `get_creator_fan_emails`. Returns only fans whose active tier includes `p_perk_type`. Used by `send-creator-newsletter`.

```sql
CREATE OR REPLACE FUNCTION public.get_creator_fan_emails_for_perk(
  p_creator_id uuid,
  p_perk_type  text
) RETURNS TABLE(email text, locale text, first_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verified visitor fans with the perk
  RETURN QUERY
  SELECT v.email, v.locale, v.first_name
  FROM public.visitor_fan_subscription vfs
  JOIN public.visitor v ON v.id = vfs.visitor_id
  JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = vfs.tier_id
  WHERE vfs.creator_id = p_creator_id
    AND vfs.status = 'active'
    AND v.email_verified = true
    AND cftp.perk_type = p_perk_type;

  -- Registered Akeli fans with the perk
  RETURN QUERY
  SELECT au.email::text, up.locale, up.first_name
  FROM public.fan_subscription fs
  JOIN public.user_profile up ON up.id = fs.user_id
  JOIN auth.users au ON au.id = fs.user_id
  JOIN public.creator_fan_tier_perk cftp ON cftp.tier_id = fs.tier_id
  WHERE fs.creator_id = p_creator_id
    AND fs.status = 'active'
    AND cftp.perk_type = p_perk_type;
END;
$$;
ALTER FUNCTION public.get_creator_fan_emails_for_perk(uuid, text) OWNER TO postgres;
```

**Newsletter routing table** (used in `send-creator-newsletter`):

| Content type | `visibility` | RPC call |
|---|---|---|
| Recipe | `fans` | `get_creator_fan_emails_for_perk(creator_id, 'exclusive_recipes')` |
| Blog post | `fans` | `get_creator_fan_emails_for_perk(creator_id, 'fans_blog_posts')` |
| Recipe / Blog | `followers` or `public` | `get_creator_newsletter_emails(creator_id)` (unchanged) |

The existing `show_on_website = true` gate on recipes remains the trigger condition for newsletter sends. `visibility` is only used to route recipients once the send is triggered. A recipe with `show_on_website = true` and `visibility = 'fans'` appears on the web (teaser for non-fans) and sends newsletter only to fans with the `exclusive_recipes` perk.

`get_creator_fan_emails` (added in the blog migration) is superseded by `get_creator_fan_emails_for_perk` and should be dropped in this migration.

### Early access recipes

A recipe is "early access gated" when `visibility = 'public'` AND `published_at > now()`. Access check at application layer:

```typescript
// In Server Component / Server Action
const isEarlyAccessFan = await supabase.rpc('visitor_has_perk', {
  p_visitor_id: visitorId,
  p_creator_id: recipe.creator_id,
  p_perk_type: 'early_access_recipes',
});
const earlyAccessDays = tier_perk.config?.days_before_public ?? 0;
const isWithinEarlyWindow =
  recipe.published_at > new Date() &&
  recipe.published_at <= addDays(new Date(), earlyAccessDays);

if (isWithinEarlyWindow && !isEarlyAccessFan) {
  // show teaser card
}
```

---

## Visibility Enforcement (Application Layer)

Mirrors the blog post pattern exactly.

| `recipe.visibility` | Who can read |
|---|---|
| `public` | Everyone — RLS allows |
| `followers` | Active `creator_follow` or `visitor_creator_follow` row |
| `fans` | `visitor_has_perk(visitor_id, creator_id, 'exclusive_recipes')` |

RLS on `recipe` covers `public` reads. `followers` and `fans` enforced in Server Components / Edge Functions — same pattern as blog posts.

**Teaser card** shown when access is blocked:

```
🔒 This recipe is for [Creator]'s fans
   Fan · €7/month — includes exclusive recipes
   [Become a Fan →]
```

Same teaser for fans-only blog posts, replacing the existing full-content block.

---

## Creator Dashboard — Tier Management

**Route:** `/[locale]/(creator)/dashboard/fan-tiers/page.tsx`

**Tier list view:**
- Cards ordered by `position`
- Each card: tier name, price display (e.g., "€7 / month"), active/inactive badge, perk chips, Edit / Deactivate buttons
- "Add tier" button — disabled and grayed when creator already has 3 tiers
- Drag-to-reorder or up/down arrows update `position`

**Tier form** (shared create + edit component):

```
Name                [__________________]
Description         [__________________]
                    [__________________]
Stripe Price ID     [price_XXXXXXXXXXXX]  ← paste from Stripe Dashboard
Display price       [7] [EUR ▾] [Monthly ▾]

── What fans can access ──────────────────────────
☐ Exclusive recipes
☐ Early access  __ days before public
☐ Fans-only blog posts
☐ Fan community (coming soon)

── What you commit to deliver ────────────────────
☐ Live cooking session
    Frequency [__________]  Platform [__________]
    Description [__________]
☐ Private chat
    Description [__________]
☐ Recipe requests  [_] per month
☐ Cooking feedback  [_] per month
☐ Meal plan
    Frequency [__________]
☐ Cook-along events
    Description [__________]

⚠ Service perks are commitments you display to fans.
  Akeli does not track or enforce delivery.

[Cancel]  [Save tier]
```

**Server Actions:**
- `createFanTier(formData)` — inserts `creator_fan_tier` + N rows in `creator_fan_tier_perk`
- `updateFanTier(tierId, formData)` — updates tier, deletes + re-inserts perks
- `deactivateFanTier(tierId)` — sets `is_active = false` (does not cancel Stripe subscriptions — creator handles that in Stripe Dashboard)
- `reorderFanTiers(orderedIds)` — batch updates `position`

All Server Actions use the Supabase server client (`createClient()` from `@/lib/supabase/server`).

---

## Visitor Experience — Creator Profile

**Route:** `/[locale]/creator/[username]/page.tsx`

New "Support [Creator Name]" section below bio, above recipe grid. Only shown if creator has at least one active tier.

**Tier cards** (side by side on desktop, stacked on mobile):

```
Support Awa
──────────────────────────────────────────

┌────────────────────────┐  ┌────────────────────────┐
│ Fan                    │  │ Super Fan               │
│ €7 / month             │  │ €20 / month             │
│                        │  │                         │
│ ✓ Exclusive recipes    │  │ ✓ Exclusive recipes     │
│ ✓ 3 days early access  │  │ ✓ 3 days early access   │
│ ✓ Fans-only posts      │  │ ✓ Fans-only posts       │
│                        │  │ ✓ Live session 1×/month │
│                        │  │ ✓ Private chat          │
│                        │  │ ✓ 3 recipe requests/mo  │
│                        │  │                         │
│ [Become a Fan]         │  │ [Become a Super Fan]    │
└────────────────────────┘  └────────────────────────┘
```

Active subscriber state — tier card replaces button with badge:
```
│ ✓ Your current plan    │
│ [Manage subscription]  │   ← links to Stripe Customer Portal
```

Other tiers for same creator show: `[Switch to Super Fan →]`

**Subscribe flow:**

1. Visitor clicks tier CTA
2. Not logged in → redirect to `/auth/visitor-login?return_to=/creator/[username]`
3. Logged in → `POST /functions/v1/visitor-subscribe-fan` with `{ creator_id, tier_id, price_id }`
4. Receive `{ data: { checkout_url } }` → redirect to Stripe Checkout
5. Stripe success → `visitor-stripe-webhook` writes `visitor_fan_subscription` with `tier_id`
6. Redirect to `/visitor/subscription-success?tier=[tier_name]&creator=[username]`

---

## Edge Function Changes

### `visitor-subscribe-fan` (modify existing)

Add `tier_id` to request body. Pass `tier_id` in Stripe session metadata.

```typescript
const { creator_id, tier_id, price_id } = await req.json();
// Validate tier belongs to creator
const { data: tier } = await supabase
  .from('creator_fan_tier')
  .select('id, creator_id, stripe_price_id, is_active')
  .eq('id', tier_id)
  .eq('creator_id', creator_id)
  .eq('is_active', true)
  .single();

if (!tier) return errorResponse(400, 'Invalid or inactive tier');

// Use tier.stripe_price_id (ignore client-provided price_id for security)
const session = await stripe.checkout.sessions.create({
  ...
  line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
  metadata: { visitor_id: visitor.visitor_id, creator_id, tier_id },
});
```

### `visitor-stripe-webhook` (modify existing)

On `customer.subscription.created`: write `tier_id` from session metadata to `visitor_fan_subscription`.

```typescript
case 'checkout.session.completed': {
  const session = event.data.object;
  const { visitor_id, creator_id, tier_id } = session.metadata;
  await supabase.from('visitor_fan_subscription').upsert({
    visitor_id, creator_id, tier_id,
    stripe_subscription_id: session.subscription,
    stripe_price_id: session.metadata.price_id,
    status: 'active',
  }, { onConflict: 'visitor_id,creator_id' });
  break;
}
```

### `visitor-change-fan-tier` (new)

Handles upgrade/downgrade between tiers of the same creator.

```typescript
// POST { creator_id, new_tier_id }
// 1. Verify visitor JWT
// 2. Fetch current visitor_fan_subscription (must be active)
// 3. Fetch new tier (must belong to same creator, must be active)
// 4. stripe.subscriptions.update(stripe_subscription_id, {
//      items: [{ id: currentItemId, price: newTier.stripe_price_id }],
//      proration_behavior: 'create_prorations',
//    })
// 5. Update visitor_fan_subscription.tier_id = new_tier_id
```

### `send-creator-newsletter` (modify existing)

Replace `get_creator_fan_emails` call with `get_creator_fan_emails_for_perk`:

```typescript
// Blog post fans-only
const rpc = record.visibility === 'fans'
  ? { fn: 'get_creator_fan_emails_for_perk',
      args: { p_creator_id: record.creator_id, p_perk_type: 'fans_blog_posts' } }
  : { fn: 'get_creator_newsletter_emails',
      args: { p_creator_id: record.creator_id } };
```

---

## SQL Tests

pgTAP suite `supabase/tests/cooking_fan_service.test.sql` — assertions to cover:

1. `creator_fan_tier` INSERT succeeds
2. `creator_fan_tier` invalid billing_interval rejected
3. `creator_fan_tier_perk` UNIQUE (tier_id, perk_type) enforced
4. `recipe.visibility` invalid value rejected
5. `visitor_has_perk` returns false when no subscription
6. `visitor_has_perk` returns false when subscription active but tier lacks perk
7. `visitor_has_perk` returns true when subscription active and tier has perk
8. `user_has_perk` returns true when registered fan's tier has perk
9. `get_creator_fan_emails_for_perk` returns only fans with matching perk
10. `get_creator_fan_emails_for_perk` excludes fans whose tier lacks the perk

---

## Open Questions (deferred)

- Does deactivating a tier cancel existing Stripe subscriptions automatically, or does the creator handle that in Stripe Dashboard? (V1: creator handles in Stripe)
- Is there a minimum recipe/follower count before a creator can activate fan tiers? (No gate for V1)
- Should visitor fan subscriptions be visible somewhere in the creator dashboard (subscriber count per tier)? (Deferred to analytics feature)
- `fan_community` perk — what platform does it use? Discord integration, Akeli-native? (Deferred)
- Can a creator archive a tier (hide from new subscribers but keep existing subscribers active)? (V1: deactivate only)
