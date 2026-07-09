# Landing Page — Lead-First Conversion Pivot (P0)

**Date:** 2026-07-09
**Status:** Validated — pending user review
**Branch:** feat/test-onboarding

---

## 1. Context

The mobile app V1 is **not yet submitted to the stores**. Until launch, the landing page's only real conversion is the **email lead** captured at the end of the embedded bilan wizard (`TestOnboarding`). Yet today:

- Every "Télécharger l'app" CTA is a dead `href="#"` (hero, pricing card, final CTA).
- The FAQ and the Resend lead email both claim the app is already downloadable on iOS/Android — false, and a trust killer.
- After submitting their email, the visitor hits a dead end ("Résultats envoyés !") with no launch framing.
- Zero funnel measurement: no way to see where visitors drop.

## 2. Approved decisions

1. **Single conversion path:** all download CTAs become anchors to the wizard (`#try-it-yourself`) with benefit copy. A static "Bientôt sur iOS & Android" badge replaces download buttons. No separate waitlist form.
2. **Analytics via Supabase:** new `landing_event` table + `/api/track/event` route, mirroring the existing `recipe_impression` pattern (`lib/tracking/`, service-role insert). No third-party analytics.

## 3. Changes

### 3.1 CTA rewiring — `app/[locale]/page.tsx` + `messages/{fr,en}.json`

| Location | Today | After |
|---|---|---|
| Hero primary | "Essayer l'onboarding" → `#try-it-yourself` | "Faire mon bilan gratuit" (EN: "Get my free assessment") — same anchor, benefit copy |
| Hero secondary | "Télécharger l'app" → `#` | Static badge "Bientôt sur iOS & Android" (non-interactive) |
| Pricing card CTA | "Télécharger l'app" → `#` | "Commencer mon bilan gratuit" → `#try-it-yourself`, plus note under price: "Disponible au lancement sur iOS et Android — sans engagement." |
| Final CTA primary | "Télécharger l'app" → `#` | "Faire mon bilan gratuit" → `#try-it-yourself` |
| Final CTA secondary | "Devenir créateur" | Unchanged (P1 scope) |

New/changed i18n keys added to **both** `fr.json` and `en.json`: `hero.ctaTry` (reworded), `hero.storeBadge` (new, replaces `ctaDownload` usage in hero), `pricing.cta` (reworded), `pricing.note` (new), `finalCta.ctaTry` (replaces `ctaDownload`).

### 3.2 Launch-honest copy

- **`data/faq.ts` — `user-disponibilite`:** question becomes "Quand l'app sera-t-elle disponible ?"; answer: launching very soon on the App Store and Google Play, do the free bilan and leave your email to be notified first at launch, download will be free.
- **`data/faq.ts` — `user-prix`:** "coûtera 2,99€/mois au lancement" (future tense), rest unchanged.
- **`components/onboarding/TestOnboarding.tsx` (FR + EN entries in its `TRANSLATIONS`):**
  - `email_title` / `email_desc`: email delivers the bilan **and** a spot on the launch list ("vous serez prévenu·e dès que l'app sera disponible").
  - Success state: "Bilan envoyé ! Vous êtes sur la liste de lancement." + a "Bientôt sur iOS & Android" line. No more dead end.
- **`app/api/onboarding-lead/route.ts` (Resend email):** replace "téléchargez dès maintenant l'application mobile Akeli" with launch-list framing ("l'app arrive très bientôt sur iOS et Android — vous serez averti·e en premier"). Button links to a-keli.com. Swap the off-brand `#9c88ff` accents for brand green `#3bb78f`.

### 3.3 Funnel analytics

**Migration** `supabase/migrations/20260709100000_create_landing_event.sql` (same RLS pattern as `onboarding_lead`):

```sql
CREATE TABLE IF NOT EXISTS public.landing_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event text NOT NULL,
  step integer,
  locale text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
-- RLS enabled; single service_role policy (FOR ALL TO service_role)
ALTER TABLE public.onboarding_lead ADD COLUMN IF NOT EXISTS session_id text;
```

**API route** `app/api/track/event/route.ts`: POST, validates `session_id` + whitelisted `event` name, inserts via `getSupabaseAdmin()` (existing `lib/tracking/supabase-admin.ts`). Never throws to the client; returns `{ ok }`.

**Client util** `lib/tracking/landing.ts` (`"use client"` consumers): `trackLandingEvent(event, { step?, metadata? })` — fire-and-forget `fetch(..., { keepalive: true })`, errors swallowed. `session_id` = `crypto.randomUUID()` persisted in `sessionStorage` (`akeli_lp_session`).

**Events (whitelist):**

| Event | Fired from | Data |
|---|---|---|
| `cta_click` | hero / pricing / final CTA | `metadata.source` |
| `wizard_step` | `TestOnboarding` on step change | `step` 1–3 |
| `wizard_results` | results dashboard reached (step 5) | — |
| `lead_submitted` | successful lead POST | — |

Because `page.tsx` is a server component, the three tracked CTAs render through a small client component `components/tracking/TrackedLink.tsx` (renders `<a>`, fires `cta_click` on click). `TestOnboarding` is already client-side and calls the util directly; the lead POST also sends `session_id` so leads join to their funnel path.

## 4. Non-goals (deliberately out of scope)

Navbar CTA rework, social proof section, mobile sticky CTA (P1 — next iteration); wizard next-intl refactor and remaining hardcoded French (P2); ingredient-teasing policy on the results screen (needs product decision).

## 5. Error handling

Tracking must never degrade UX: client util swallows all errors; route returns 200-shaped failures except malformed payloads (400). Lead flow unchanged: DB insert failure still returns 500 to the form; Resend failure still silent.

## 6. Testing & verification

- Vitest unit tests for `/api/track/event` payload validation (event whitelist, missing fields).
- Manual walkthrough on `npm run dev` (FR + EN): every CTA scrolls to the wizard, no `href="#"` remains, wizard → results → email → launch-list success state, rows appear in `landing_event` and `onboarding_lead.session_id` populated.
- Migration applied via Supabase CLI before the feature is exercised.
