# Visitor Fan Mode — Design Spec

**Date:** 2026-06-20
**Status:** Approved for implementation

---

## Overview

Akeli has two distinct user streams that must never be conflated:

- **Akeli users** — health-goal driven (weight loss, energy, nutrition tracking), onboarded via the mobile app
- **Visitor fans** — creator-driven, web-only, no health context, following creators they love

This spec defines the **visitor identity system** and the **visitor → creator relationship layer** (free follow for newsletter + paid fan subscription). The UI surfaces are deferred to a separate branch; this spec focuses on the database schema and backend flows that can be built immediately.

---

## Scope

**In scope (V1 — build now):**
- Visitor identity: `visitor` table, password auth via Edge Functions, email verification
- Free follow: `visitor_creator_follow` + `creator_follow` (registered users)
- Paid fan subscription: `visitor_fan_subscription`
- Newsletter trigger: Edge Function fired when a recipe is published
- Password reset flow

**Out of scope (UI deferred):**
- Visitor portal UI (subscribe widget on creator profile, visitor dashboard)
- Creator offer definition (exclusive recipes, chat, courses, coaching — TBD)
- Creator opt-in/threshold for visitor fan mode
- Visitor → Akeli user upgrade UI

**V2:**
- Visitor portal web experience (magic-link-free access to gated content)
- Visitor fan perks delivery (web-exclusive content, creator chat, kitchen courses)
- Visitor → full Akeli account upgrade flow (UI + data bridge)
- Analytics: follower counts per creator, newsletter open rates

---

## Two Parallel Identity Systems

```
auth.users + user_profile          visitor (new)
──────────────────────────         ──────────────────────
Akeli mobile app users             Creator fans, web-only
Health goals, onboarding           No health context
Supabase Auth (OAuth, email)       Custom password auth (Edge Functions)
fan_subscription (paid)            visitor_fan_subscription (paid)
creator_follow (free follow)       visitor_creator_follow (free follow)
```

The two systems are linked only at one explicit point: `visitor.akeli_user_id → user_profile.id`, populated if a visitor consciously creates an Akeli account.

---

## Schema

### `visitor`

Core identity for visitor fans. Completely separate from `auth.users` and `user_profile`.

```sql
CREATE TABLE IF NOT EXISTS public.visitor (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email               text UNIQUE NOT NULL,
  email_verified      boolean DEFAULT false,
  password_hash       text NOT NULL,           -- bcrypt via pgcrypto
  locale              text DEFAULT 'fr',
  first_name          text,
  avatar_url          text,
  stripe_customer_id  text,                    -- created on first paid subscription
  akeli_user_id       uuid REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_visitor_updated_at
  BEFORE UPDATE ON public.visitor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### `visitor_auth_token`

Password reset and email verification tokens. Raw token sent by email, hash stored.

```sql
CREATE TABLE IF NOT EXISTS public.visitor_auth_token (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id  uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('reset_password', 'verify_email')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,       -- null = still valid, one-time use
  created_at  timestamptz DEFAULT now()
);
```

### `visitor_creator_follow`

Free newsletter follow. A visitor can follow many creators; one row per pair.

```sql
CREATE TABLE IF NOT EXISTS public.visitor_creator_follow (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id      uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  creator_id      uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  active          boolean DEFAULT true,
  subscribed_at   timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE (visitor_id, creator_id)
);
```

### `visitor_fan_subscription`

Paid fan access. Stripe manages billing; this table reflects Stripe state via webhook.
Perks are intentionally undefined at this stage — the table is extensible.

```sql
CREATE TABLE IF NOT EXISTS public.visitor_fan_subscription (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id             uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  creator_id             uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  status                 text DEFAULT 'active'
                           CHECK (status IN ('active', 'cancelled', 'past_due')),
  stripe_subscription_id text,
  stripe_price_id        text,
  amount_cents           integer,
  current_period_end     timestamptz,     -- synced from Stripe webhook
  subscribed_at          timestamptz DEFAULT now(),
  cancelled_at           timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  UNIQUE (visitor_id, creator_id)
);

CREATE OR REPLACE TRIGGER trg_visitor_fan_sub_updated_at
  BEFORE UPDATE ON public.visitor_fan_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### `creator_follow`

Free newsletter follow for registered Akeli users. `fan_subscription` covers paid; this covers free.

```sql
CREATE TABLE IF NOT EXISTS public.creator_follow (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES public.user_profile(id) ON DELETE CASCADE,
  creator_id      uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  active          boolean DEFAULT true,
  subscribed_at   timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE (user_id, creator_id)
);
```

---

## Schema Summary

| Table | Who | Purpose |
|---|---|---|
| `visitor` | Visitors | Identity, password auth, Stripe + upgrade bridge |
| `visitor_auth_token` | Visitors | Password reset, email verification |
| `visitor_creator_follow` | Visitors | Free follow → newsletter |
| `visitor_fan_subscription` | Visitors | Paid fan access (Stripe-backed) |
| `creator_follow` | Akeli users | Free follow → newsletter |
| `fan_subscription` | Akeli users | Paid fan access — **already exists** |

---

## Key Flows

### Visitor Signup
1. Visitor submits `email` + `password` via creator profile page
2. Edge Function `visitor-signup`: check email not taken in `visitor` table → if same email exists in `auth.users`, return a clear error ("this email belongs to an Akeli account — please log in via the app") → hash password with `crypt()` (pgcrypto) → insert visitor row → generate `verify_email` token → send verification email (Resend)
3. Visitor clicks verification link → Edge Function `visitor-verify-email`: validate token hash + expiry → set `email_verified = true`, mark token `used_at`

### Visitor Login
1. Visitor submits `email` + `password`
2. Edge Function `visitor-login`: fetch visitor by email → verify with `crypt()` → issue signed JWT (`visitor_id`, `email`, `exp: 7d`) → returned to browser
3. Browser stores JWT in `httpOnly` cookie or `localStorage`; sent as `Authorization: Bearer` on subsequent requests

### Password Reset
1. Visitor submits email
2. Edge Function `visitor-request-reset`: generate random token → hash → insert `visitor_auth_token` (purpose: `reset_password`, expires: 30 min) → send email with raw token in link
3. Visitor clicks link → Edge Function `visitor-reset-password`: hash submitted token → match against stored hash + expiry → update `password_hash` → mark token `used_at`

### Creator Newsletter (recipe published)
1. Creator publishes recipe (`is_published = true`, `show_on_website = true`)
2. Supabase DB Webhook fires on `recipe` UPDATE → Edge Function `send-creator-newsletter`
3. Edge Function fetches:
   - `visitor_creator_follow` WHERE `creator_id = X` AND `active = true` → get visitor emails
   - `creator_follow` WHERE `creator_id = X` AND `active = true` → get user emails via `auth.users`
4. Sends email batch via Resend: recipe title, cover image, teaser, link to `/recipe/[slug]`
5. Full ingredients/steps remain app-only (teasing only on web)

### Visitor Free Follow
1. Authenticated visitor clicks "Follow" on a creator's public profile
2. Edge Function `visitor-follow-creator`: verify JWT → upsert `visitor_creator_follow` (`active = true`)

### Visitor Paid Fan Subscription
1. Authenticated visitor clicks "Become a Fan" on creator's profile
2. Edge Function `visitor-subscribe-fan`:
   - If `visitor.stripe_customer_id` is null → create Stripe Customer with visitor email → store on `visitor`
   - Create Stripe Checkout Session for creator's fan price
3. Stripe redirects back on success
4. Stripe Webhook → Edge Function `visitor-stripe-webhook`:
   - `customer.subscription.created` → insert `visitor_fan_subscription` (status: `active`)
   - `invoice.payment_failed` → update status to `past_due`
   - `customer.subscription.deleted` → update status to `cancelled`, set `cancelled_at`

### Visitor → Akeli User Upgrade (V2, schema-ready now)
When a visitor creates a full Akeli account:
- `visitor.akeli_user_id` is set to the new `user_profile.id`
- Follow/subscription history stays in visitor tables, linked via the bridge column
- No data migration required in V1

---

## Edge Functions Required

| Function | Trigger | Description |
|---|---|---|
| `visitor-signup` | HTTP POST | Create visitor, send verification email |
| `visitor-verify-email` | HTTP GET | Consume verify token, set email_verified |
| `visitor-login` | HTTP POST | Verify password, return JWT |
| `visitor-request-reset` | HTTP POST | Generate reset token, send email |
| `visitor-reset-password` | HTTP POST | Consume reset token, update password |
| `visitor-follow-creator` | HTTP POST | Upsert visitor_creator_follow |
| `visitor-unfollow-creator` | HTTP POST | Set active=false, set unsubscribed_at |
| `send-creator-newsletter` | DB Webhook | Fan newsletter on recipe publish |
| `visitor-subscribe-fan` | HTTP POST | Create Stripe Customer + Checkout Session |
| `visitor-stripe-webhook` | Stripe Webhook | Sync visitor_fan_subscription status |

---

## RLS Policies

- `visitor` table: no RLS (service role only via Edge Functions — never exposed to client)
- `visitor_auth_token`: same (service role only)
- `visitor_creator_follow`: service role only
- `visitor_fan_subscription`: service role only
- `creator_follow`: authenticated users can read/write their own rows

---

## Dependencies

- **Resend** — email delivery (not yet installed, needs `RESEND_API_KEY` in Supabase secrets)
- **pgcrypto** — already installed, used for `crypt()` password hashing
- **Stripe** — already integrated via `stripe-webhook` Edge Function; visitor fan billing extends the existing pattern
- `show_on_website` column on `recipe` — already added via migration `20260619080000`

---

## Open Questions (defer to creator offer spec)

- What perks does a paying visitor fan receive? (exclusive recipes, creator chat, kitchen courses, coaching)
- Does a creator need to opt in to enable visitor fan mode on their profile?
- Is there a minimum recipe count threshold for visitor fan mode (similar to the 30-recipe threshold for registered fan mode)?
- Pricing: fixed platform price or creator-set price?
