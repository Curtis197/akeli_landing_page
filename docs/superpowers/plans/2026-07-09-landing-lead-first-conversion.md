# Landing Page Lead-First Conversion Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the landing page into a single lead-first conversion funnel (bilan wizard → email → early-access invite) with honest pre-launch copy and Supabase-backed funnel analytics.

**Architecture:** All CTAs anchor to the embedded `TestOnboarding` wizard; a new `landing_event` table + `/api/track/event` route (mirroring the existing `recipe_impression` pattern) records the funnel; the Resend lead email becomes an early-access invitation with env-driven store links. Page sections are resequenced into the emotional arc defined in the spec (§3.4), including a new "Problem" section.

**Tech Stack:** Next.js App Router (TS strict), next-intl, Supabase (service-role inserts via `lib/tracking/supabase-admin.ts`), Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-landing-lead-first-conversion-design.md`

## Global Constraints

- Every new i18n key goes in **both** `messages/fr.json` and `messages/en.json`.
- No secret keys client-side; `getSupabaseAdmin()` is only imported in API routes.
- Tracking must never degrade UX: client util swallows all errors; route returns 400 only on malformed payloads.
- Schema changes only via a migration file in `supabase/migrations/` (shared DB with the mobile app — additive changes only).
- Visitor-facing beta copy never uses the word "test"/"tester" — always "accès anticipé" / "early access".
- Follow the existing style of `app/[locale]/page.tsx`: Tailwind classes + inline `style={{}}` with CSS variables (`--color-brand-dark`, `--color-brand-cream`, `--color-brand-green`, `--color-brand-amber`, `--color-brand-forest`).
- The event whitelist is exactly: `cta_click`, `wizard_step`, `wizard_results`, `lead_submitted`. `wizard_step` means **step completed** (fired when the user validates a step), not step viewed.
- Commits: one per task, `git add` only the task's files (the branch has unrelated pending changes).

---

### Task 1: Migration — `landing_event` table + `onboarding_lead.session_id`

**Files:**
- Create: `supabase/migrations/20260709100000_create_landing_event.sql`

**Interfaces:**
- Consumes: existing `public.onboarding_lead` table (from `20260708100000_create_onboarding_leads.sql`).
- Produces: table `public.landing_event(id, session_id, event, step, locale, metadata, created_at)` and nullable column `public.onboarding_lead.session_id` — used by Tasks 3 and 9.

- [ ] **Step 1: Write the migration**

```sql
-- Migration: Create landing_event table (landing page funnel analytics)
--            + add session_id to onboarding_lead to join leads to their funnel path
-- Created at: 2026-07-09

CREATE TABLE IF NOT EXISTS public.landing_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event text NOT NULL,
  step integer,
  locale text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_event_session_id_idx ON public.landing_event (session_id);
CREATE INDEX IF NOT EXISTS landing_event_event_idx ON public.landing_event (event, created_at);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.landing_event ENABLE ROW LEVEL SECURITY;

-- Allow only service_role (Next.js backend client) to read and write events
CREATE POLICY "service_role_access" ON public.landing_event
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Join leads to their funnel session
ALTER TABLE public.onboarding_lead ADD COLUMN IF NOT EXISTS session_id text;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: output lists `20260709100000_create_landing_event.sql` as applied.
If `db push` reports drift from older migrations, apply this file's SQL manually in the Supabase SQL editor instead (it is idempotent: `IF NOT EXISTS` everywhere).

- [ ] **Step 3: Verify the table exists**

Run in Supabase SQL editor (or `psql`):
```sql
select column_name from information_schema.columns where table_name = 'landing_event';
select column_name from information_schema.columns where table_name = 'onboarding_lead' and column_name = 'session_id';
```
Expected: 7 columns for `landing_event`; 1 row (`session_id`) for the second query.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260709100000_create_landing_event.sql
git commit -m "feat: add landing_event table and onboarding_lead.session_id for funnel analytics"
```

---

### Task 2: Event whitelist module (TDD)

**Files:**
- Create: `lib/tracking/landing-events.ts`
- Test: `tests/landing-events.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `LANDING_EVENTS: readonly string[]`, `type LandingEventName = 'cta_click' | 'wizard_step' | 'wizard_results' | 'lead_submitted'`, `isLandingEvent(value: unknown): value is LandingEventName` — used by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test**

Create `tests/landing-events.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LANDING_EVENTS, isLandingEvent } from "@/lib/tracking/landing-events";

describe("landing event whitelist", () => {
  it("contains exactly the four funnel events", () => {
    expect([...LANDING_EVENTS].sort()).toEqual(
      ["cta_click", "lead_submitted", "wizard_results", "wizard_step"]
    );
  });

  it("accepts whitelisted event names", () => {
    expect(isLandingEvent("cta_click")).toBe(true);
    expect(isLandingEvent("wizard_step")).toBe(true);
    expect(isLandingEvent("wizard_results")).toBe(true);
    expect(isLandingEvent("lead_submitted")).toBe(true);
  });

  it("rejects unknown events and non-strings", () => {
    expect(isLandingEvent("drop table")).toBe(false);
    expect(isLandingEvent("")).toBe(false);
    expect(isLandingEvent(42)).toBe(false);
    expect(isLandingEvent(null)).toBe(false);
    expect(isLandingEvent(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/landing-events.test.ts`
Expected: FAIL — cannot resolve `@/lib/tracking/landing-events`.

- [ ] **Step 3: Write the implementation**

Create `lib/tracking/landing-events.ts`:

```ts
// Whitelist of landing-page funnel events. `wizard_step` = step COMPLETED (user
// validated the step), not step viewed — keeps the funnel counts meaningful.
export const LANDING_EVENTS = [
  "cta_click",
  "wizard_step",
  "wizard_results",
  "lead_submitted",
] as const;

export type LandingEventName = (typeof LANDING_EVENTS)[number];

export function isLandingEvent(value: unknown): value is LandingEventName {
  return typeof value === "string" && (LANDING_EVENTS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/landing-events.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tracking/landing-events.ts tests/landing-events.test.ts
git commit -m "feat: landing funnel event whitelist"
```

---

### Task 3: `/api/track/event` route (TDD)

**Files:**
- Create: `app/api/track/event/route.ts`
- Test: `tests/track-event-route.test.ts`

**Interfaces:**
- Consumes: `isLandingEvent` from `@/lib/tracking/landing-events` (Task 2); `getSupabaseAdmin()` from `@/lib/tracking/supabase-admin` (existing); table `landing_event` (Task 1).
- Produces: `POST /api/track/event` accepting JSON `{ session_id: string, event: LandingEventName, step?: number|null, locale?: string|null, metadata?: object|null }`, returning `{ ok: true }` (200), `{ error }` (400 malformed), `{ ok: false }` (500) — used by Task 4's client util.

- [ ] **Step 1: Write the failing test**

Create `tests/track-event-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above const declarations — vi.hoisted is required
const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/tracking/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: () => ({ insert: insertMock }) }),
}));

import { POST } from "@/app/api/track/event/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/track/event", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/track/event", () => {
  beforeEach(() => insertMock.mockClear());

  it("rejects unknown event names with 400 and does not insert", async () => {
    const res = await POST(makeRequest({ session_id: "s-1", event: "hack_attempt" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects missing session_id with 400", async () => {
    const res = await POST(makeRequest({ event: "cta_click" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a valid event and returns ok", async () => {
    const res = await POST(
      makeRequest({
        session_id: "s-1",
        event: "wizard_step",
        step: 2,
        locale: "fr",
        metadata: { source: "hero" },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith({
      session_id: "s-1",
      event: "wizard_step",
      step: 2,
      locale: "fr",
      metadata: { source: "hero" },
    });
  });

  it("defaults optional fields to null", async () => {
    await POST(makeRequest({ session_id: "s-2", event: "lead_submitted" }));
    expect(insertMock).toHaveBeenCalledWith({
      session_id: "s-2",
      event: "lead_submitted",
      step: null,
      locale: null,
      metadata: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/track-event-route.test.ts`
Expected: FAIL — cannot resolve `@/app/api/track/event/route`.

- [ ] **Step 3: Write the route**

Create `app/api/track/event/route.ts` (mirrors `app/api/track/impression/route.ts` style):

```ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';
import { isLandingEvent } from '@/lib/tracking/landing-events';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.session_id !== 'string' || body.session_id.length === 0 || !isLandingEvent(body.event)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await (getSupabaseAdmin() as any).from('landing_event').insert({
      session_id: body.session_id,
      event: body.event,
      step: typeof body.step === 'number' ? body.step : null,
      locale: typeof body.locale === 'string' ? body.locale : null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/event]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/track-event-route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/track/event/route.ts tests/track-event-route.test.ts
git commit -m "feat: /api/track/event route for landing funnel events"
```

---

### Task 4: Client tracking util + TrackedLink component

**Files:**
- Create: `lib/tracking/landing.ts`
- Create: `components/tracking/TrackedLink.tsx`

**Interfaces:**
- Consumes: `LandingEventName` type (Task 2); `POST /api/track/event` (Task 3).
- Produces: `getLandingSessionId(): string` and `trackLandingEvent(event: LandingEventName, data?: { step?: number; metadata?: Record<string, string> }): void` — used by Tasks 6 and 8. `<TrackedLink href source className? style?>` renders an `<a>` firing `cta_click` with `metadata.source` — used by Task 6.

No unit test: both files are browser-only (sessionStorage, DOM) and vitest runs in `node` environment with no jsdom configured. They are verified by the Task 3 route tests (payload contract) plus the manual funnel walkthrough in Task 10.

- [ ] **Step 1: Write the client util**

Create `lib/tracking/landing.ts`:

```ts
"use client";

import type { LandingEventName } from "./landing-events";

const SESSION_KEY = "akeli_lp_session";

// One id per browser session so funnel events can be joined into a path.
export function getLandingSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

// Fire-and-forget: tracking must never break or slow the page.
export function trackLandingEvent(
  event: LandingEventName,
  data?: { step?: number; metadata?: Record<string, string> }
): void {
  try {
    fetch("/api/track/event", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getLandingSessionId(),
        event,
        step: data?.step ?? null,
        locale: typeof document !== "undefined" ? document.documentElement.lang || null : null,
        metadata: data?.metadata ?? null,
      }),
    }).catch(() => {});
  } catch {
    // ignore — never surface tracking failures
  }
}
```

- [ ] **Step 2: Write the TrackedLink component**

Create `components/tracking/TrackedLink.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackLandingEvent } from "@/lib/tracking/landing";

interface TrackedLinkProps {
  href: string;
  source: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Anchor used by server components (landing page) to record cta_click events.
export default function TrackedLink({ href, source, className, style, children }: TrackedLinkProps) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => trackLandingEvent("cta_click", { metadata: { source } })}
    >
      {children}
    </a>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unrelated — note them and continue).

- [ ] **Step 4: Commit**

```bash
git add lib/tracking/landing.ts components/tracking/TrackedLink.tsx
git commit -m "feat: client-side landing event tracking util and TrackedLink"
```

---

### Task 5: i18n keys — `messages/fr.json` + `messages/en.json`

**Files:**
- Modify: `messages/fr.json` (the `landing` namespace)
- Modify: `messages/en.json` (the `landing` namespace)

**Interfaces:**
- Consumes: nothing.
- Produces: keys used by Task 6 — `landing.hero.ctaTry`, `landing.hero.storeBadge`, `landing.problem.{eyebrow,headline,body}`, `landing.pricing.cta`, `landing.pricing.note`, `landing.finalCta.ctaTry`. Removes `landing.hero.ctaDownload`, `landing.finalCta.ctaDownload`, `landing.finalCta.ctaCreator`.

- [ ] **Step 1: Edit `messages/fr.json`**

In the `landing.hero` object, replace:

```json
"hero": {
  "title": "Mangez comme vous êtes.",
  "subtitle": "Retrouvez votre corps avec les plats de chez vous.",
  "ctaDownload": "Télécharger l'app",
  "ctaTry": "Essayer l'onboarding"
}
```

with:

```json
"hero": {
  "title": "Mangez comme vous êtes.",
  "subtitle": "Retrouvez votre corps avec les plats de chez vous.",
  "ctaTry": "Faire mon bilan gratuit",
  "storeBadge": "Bientôt sur iOS & Android"
}
```

After the `ticker` object, add a new `problem` object:

```json
"problem": {
  "eyebrow": "Le vrai problème",
  "headline": "Les régimes classiques vous demandent de choisir entre votre santé et votre culture.",
  "body": "Des menus qui ignorent vos plats. Des portions pensées pour d'autres. Et l'impression que retrouver la forme, c'est renoncer à la cuisine de chez vous."
}
```

In `landing.pricing`, replace `"cta": "Télécharger l'app"` with:

```json
"cta": "Commencer mon bilan gratuit",
"note": "Disponible au lancement sur iOS et Android — sans engagement."
```

In `landing.finalCta`, replace:

```json
"finalCta": {
  "eyebrow": "On commence ?",
  "title": "Mangez comme vous êtes.",
  "ctaDownload": "Télécharger l'app",
  "ctaCreator": "Devenir créateur"
}
```

with:

```json
"finalCta": {
  "eyebrow": "On commence ?",
  "title": "Mangez comme vous êtes.",
  "ctaTry": "Faire mon bilan gratuit"
}
```

- [ ] **Step 2: Edit `messages/en.json` (mirror)**

`landing.hero`:

```json
"hero": {
  "title": "Eat as you are.",
  "subtitle": "Get your body back, with the dishes from home.",
  "ctaTry": "Get my free assessment",
  "storeBadge": "Coming soon to iOS & Android"
}
```

New `problem` object after `ticker`:

```json
"problem": {
  "eyebrow": "The real problem",
  "headline": "Classic diets ask you to choose between your health and your culture.",
  "body": "Meal plans that ignore your dishes. Portions designed for someone else. And the feeling that getting in shape means giving up the food from home."
}
```

`landing.pricing`: replace `"cta": "Download the app"` with:

```json
"cta": "Start my free assessment",
"note": "Available at launch on iOS and Android — no commitment."
```

`landing.finalCta`:

```json
"finalCta": {
  "eyebrow": "Shall we start?",
  "title": "Eat as you are.",
  "ctaTry": "Get my free assessment"
}
```

- [ ] **Step 3: Verify both files parse and mirror**

Run:
```bash
node -e "const fr=require('./messages/fr.json').landing, en=require('./messages/en.json').landing; const keys=o=>JSON.stringify(Object.keys(o.hero).sort())+JSON.stringify(Object.keys(o.problem).sort())+JSON.stringify(Object.keys(o.pricing).sort())+JSON.stringify(Object.keys(o.finalCta).sort()); console.log(keys(fr)===keys(en) ? 'MIRRORED' : 'MISMATCH'); console.log(fr.hero.ctaDownload===undefined && fr.finalCta.ctaCreator===undefined ? 'OLD KEYS REMOVED' : 'OLD KEYS REMAIN');"
```
Expected: `MIRRORED` and `OLD KEYS REMOVED`.

- [ ] **Step 4: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat: lead-first landing copy keys (bilan CTAs, problem section, store badge)"
```

---

### Task 6: `page.tsx` — CTA rewiring, Problem section, resequencing

**Files:**
- Modify: `app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `TrackedLink` (Task 4), i18n keys (Task 5).
- Produces: final section order `Hero → Ticker → Problem → Mechanism → Try-it-yourself → Payoff → Proof → Pricing → FAQ → Creator teaser → Final CTA → Footer`; no `href="#"` remains.

- [ ] **Step 1: Add the import**

At the top of `app/[locale]/page.tsx`, after the `TestOnboarding` import, add:

```tsx
import TrackedLink from "@/components/tracking/TrackedLink";
```

- [ ] **Step 2: Rewire the hero CTA block**

Replace the hero CTA `<div>` (the block containing the two `<a>` tags with `t("hero.ctaTry")` and `t("hero.ctaDownload")`):

```tsx
<div className="flex flex-col sm:flex-row gap-3 mb-12" style={{ animation: "fadeInUp 0.65s 0.3s ease both" }}>
  <TrackedLink href="#try-it-yourself" source="hero"
    className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
    style={{ backgroundColor: "var(--color-brand-dark)", color: "#fff" }}>
    {t("hero.ctaTry")}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  </TrackedLink>
  <span className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-7 py-4 text-sm font-semibold"
    style={{ borderColor: "rgba(28,43,28,0.18)", color: "var(--color-brand-forest)" }}>
    {t("hero.storeBadge")}
  </span>
</div>
```

- [ ] **Step 3: Insert the Problem section directly after the TICKER block**

```tsx
{/* PROBLEM */}
<section className="px-6 sm:px-12 py-20 sm:py-24" style={{ backgroundColor: "var(--color-brand-dark)" }}>
  <div className="max-w-3xl mx-auto text-center">
    <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--color-brand-amber)" }}>
      {t("problem.eyebrow")}
    </p>
    <h2 className="text-3xl sm:text-5xl font-bold leading-tight mb-6"
      style={{ fontFamily: "var(--font-display)", color: "#F7F2EA" }}>
      {t("problem.headline")}
    </h2>
    <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "rgba(247,242,234,0.75)" }}>
      {t("problem.body")}
    </p>
  </div>
</section>
```

- [ ] **Step 4: Resequence the sections**

Reorder the JSX blocks inside `<main>` (cut/paste whole `{/* … */}` sections, no internal edits except where other steps say so) to:

1. `{/* HERO */}`
2. `{/* TICKER */}`
3. `{/* PROBLEM */}` (new, from Step 3)
4. `{/* MECHANISM */}`
5. `{/* TRY IT YOURSELF */}` (moved up from position 8)
6. `{/* EMOTIONAL PAYOFF */}`
7. `{/* PROOF */}`
8. `{/* PRICING */}`
9. `{/* FAQ */}`
10. `{/* CREATOR TEASER */}` (moved down from position 4)
11. `{/* CTA FINALE */}`
12. `{/* FOOTER */}`

- [ ] **Step 5: Rewire the pricing CTA and add the note**

In the PRICING section, replace:

```tsx
<a href="#" className="block w-full text-center rounded-xl py-4 text-sm font-semibold transition-all hover:scale-[1.01]"
  style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
  {t("pricing.cta")}
</a>
```

with:

```tsx
<TrackedLink href="#try-it-yourself" source="pricing"
  className="block w-full text-center rounded-xl py-4 text-sm font-semibold transition-all hover:scale-[1.01]"
  style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
  {t("pricing.cta")}
</TrackedLink>
<p className="text-xs text-center mt-4" style={{ color:"rgba(247,242,234,0.5)" }}>
  {t("pricing.note")}
</p>
```

- [ ] **Step 6: Rewire the final CTA to a single ask**

In the CTA FINALE section, replace the CTA `<div>` (containing the download `<a href="#">` and the `Link` to `/become-creator`):

```tsx
<div className="flex justify-center">
  <TrackedLink href="#try-it-yourself" source="final"
    className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
    style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
    {t("finalCta.ctaTry")}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  </TrackedLink>
</div>
```

- [ ] **Step 7: Verify no dead links and the build passes**

Run:
```bash
grep -n 'href="#"' "app/[locale]/page.tsx" || echo "NO DEAD LINKS"
npm run build
```
Expected: `NO DEAD LINKS`; build succeeds. (If `Link` from `@/lib/i18n/navigation` is now unused, the build/lint will say so — it is still used by the creator teaser and the footer, so it should remain.)

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/page.tsx"
git commit -m "feat: resequence landing sections into emotional arc, single bilan conversion path"
```

---

### Task 7: FAQ launch-honest copy — `data/faq.ts`

**Files:**
- Modify: `data/faq.ts` (entries `user-disponibilite` and `user-prix` only)

**Interfaces:**
- Consumes/Produces: nothing outside this file (rendered by `FAQAccordion` unchanged).

- [ ] **Step 1: Replace the two entries**

Replace the `user-disponibilite` entry with:

```ts
{
  id: "user-disponibilite",
  question: "Quand l'app sera-t-elle disponible ?",
  answer:
    "Très bientôt. Akeli arrive sur l'App Store et Google Play. En attendant, faites votre bilan nutritionnel gratuit et laissez votre e-mail : vous ferez partie des premiers à recevoir l'accès anticipé à l'app. Le téléchargement sera gratuit.",
  audience: "user",
  placement: "landing",
  category: "Application",
},
```

Replace the `user-prix` entry's `answer` with:

```ts
answer:
  "Akeli Premium coûtera 2,99€/mois au lancement. C'est sans engagement — vous pourrez annuler à tout moment depuis l'app en un clic.",
```

- [ ] **Step 2: Verify the build still passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add data/faq.ts
git commit -m "fix: FAQ no longer claims the app is already on the stores"
```

---

### Task 8: `TestOnboarding` — early-access copy, success state, funnel tracking

**Files:**
- Modify: `components/onboarding/TestOnboarding.tsx`

**Interfaces:**
- Consumes: `trackLandingEvent`, `getLandingSessionId` (Task 4).
- Produces: lead POST body now includes `session_id: string` — consumed by Task 9.

- [ ] **Step 1: Add the tracking import**

After the existing imports:

```tsx
import { trackLandingEvent, getLandingSessionId } from "@/lib/tracking/landing";
```

- [ ] **Step 2: Update the FR copy in `TRANSLATIONS.fr`**

Replace these four keys:

```ts
email_title: "Recevoir mon bilan + l'accès anticipé",
email_desc: "Entrez votre adresse pour recevoir votre bilan complet et faire partie des premiers à accéder à l'app Akeli — vos retours façonneront la suite.",
email_submit: "Recevoir mon accès anticipé",
email_success: "Bilan envoyé ! Votre accès anticipé arrive par e-mail.",
```

and add one new key right after `email_success`:

```ts
email_success_sub: "Bientôt sur iOS & Android — vous serez parmi les premiers.",
```

- [ ] **Step 3: Update the EN copy in `TRANSLATIONS.en` (mirror)**

```ts
email_title: "Get my report + early access",
email_desc: "Enter your email to receive your full report and be among the first to access the Akeli app — your feedback will shape what comes next.",
email_submit: "Get my early access",
email_success: "Report sent! Your early access is on its way by email.",
```

and after `email_success`:

```ts
email_success_sub: "Coming soon to iOS & Android — you'll be among the first.",
```

- [ ] **Step 4: Fire step-completion events in `handleNextStep`**

Replace the body of `handleNextStep` with:

```tsx
const handleNextStep = () => {
  setUiError("");
  if (step === 3) {
    if (!age || !height || !weight || (goal !== "maintenance" && (!targetWeight || !remainingWeeks))) {
      setUiError(t.error_fields);
      return;
    }
    trackLandingEvent("wizard_step", { step: 3 });
    setLoadingTextIndex(0);
    setStep(4);
  } else {
    trackLandingEvent("wizard_step", { step });
    setStep(prev => prev + 1);
  }
};
```

- [ ] **Step 5: Fire `wizard_results` when results are shown**

In `fetchRecipesAndCalculate`, immediately after `setStep(5);` add:

```tsx
trackLandingEvent("wizard_results");
```

- [ ] **Step 6: Send `session_id` with the lead and fire `lead_submitted`**

In `handleSubmitLead`, add `session_id` to the JSON body:

```tsx
body: JSON.stringify({
  email,
  session_id: getLandingSessionId(),
  calorie_goal: sliderCalories,
  protein_g: currentMacros.protein,
  carb_g: currentMacros.carbs,
  fat_g: currentMacros.fat,
  region: selectedRegion,
  target_weight_kg: goal === "maintenance" ? null : targetWeight,
  remaining_weeks: goal === "maintenance" ? null : remainingWeeks
})
```

and inside the `if (res.ok)` branch, before `setEmailSubmitted(true);`:

```tsx
trackLandingEvent("lead_submitted");
```

- [ ] **Step 7: Extend the success state (no more dead end)**

Replace the `emailSubmitted ? (...)` success block:

```tsx
{emailSubmitted ? (
  <div className="py-4">
    <div className="text-[#3bb78f] font-bold text-lg flex items-center justify-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      {t.email_success}
    </div>
    <p className="text-xs sm:text-sm text-gray-300 mt-3">
      {t.email_success_sub}
    </p>
  </div>
) : (
```

- [ ] **Step 8: Verify the build passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 9: Commit**

```bash
git add components/onboarding/TestOnboarding.tsx
git commit -m "feat: wizard funnel tracking, session_id on leads, early-access success state"
```

---

### Task 9: Lead route — `session_id` + early-access Resend email

**Files:**
- Modify: `app/api/onboarding-lead/route.ts`
- Modify: `.env.local.example` (document the two new optional vars)

**Interfaces:**
- Consumes: `session_id` in the POST body (Task 8); `onboarding_lead.session_id` column (Task 1); env vars `TESTFLIGHT_PUBLIC_LINK`, `PLAY_OPTIN_LINK` (optional).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Store `session_id`**

In the destructuring line add `session_id`:

```ts
const { email, calorie_goal, protein_g, carb_g, fat_g, region, target_weight_kg, remaining_weeks, session_id } = body;
```

In the `.insert({ ... })` object add:

```ts
session_id: typeof session_id === "string" && session_id ? session_id : null,
```

- [ ] **Step 2: Replace the email content with the early-access version**

Replace the entire `await resend.emails.send({ ... })` call with:

```ts
const testflightLink = process.env.TESTFLIGHT_PUBLIC_LINK;
const playLink = process.env.PLAY_OPTIN_LINK;

const accessBlock = (testflightLink || playLink)
  ? `
    <p><strong>Votre accès anticipé est prêt.</strong> Installez l'app dès maintenant et faites partie des premiers — vos retours façonneront la suite :</p>
    <div style="text-align: center; margin: 24px 0;">
      ${testflightLink ? `<a href="${testflightLink}" style="background: #1c2b1c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 4px;">Accès anticipé iPhone</a>` : ""}
      ${playLink ? `<a href="${playLink}" style="background: #3bb78f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 4px;">Accès anticipé Android</a>` : ""}
    </div>`
  : `
    <p><strong>Vous êtes sur la liste d'accès anticipé.</strong> L'app Akeli arrive très bientôt sur iOS et Android — vous serez parmi les premiers à la recevoir, avec vos recettes adaptées à ce bilan.</p>`;

await resend.emails.send({
  from: "Akeli Nutrition <onboarding@a-keli.com>",
  to: email,
  subject: "Votre bilan nutritionnel Akeli + votre accès anticipé",
  html: `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: #1c2b1c; margin-bottom: 20px; text-align: center;">Votre bilan personnalisé 🎉</h2>
      <p>Bonjour,</p>
      <p>Voici le bilan de votre analyse nutritionnelle gratuite effectuée sur le site d'Akeli :</p>

      <div style="background: #f7f2ea; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3bb78f;">
        <p style="margin: 5px 0;"><strong>Objectif Calorique :</strong> ${calorie_goal} kcal / jour</p>
        <p style="margin: 5px 0;"><strong>Protéines :</strong> ${protein_g}g</p>
        <p style="margin: 5px 0;"><strong>Glucides :</strong> ${carb_g}g</p>
        <p style="margin: 5px 0;"><strong>Lipides :</strong> ${fat_g}g</p>
      </div>

      ${accessBlock}

      <p style="font-size: 12px; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        Cet e-mail vous a été envoyé automatiquement suite à votre demande d'analyse gratuite sur le site a-keli.com.
      </p>
    </div>
  `
});
```

- [ ] **Step 3: Document the env vars**

In `.env.local.example`, add at the end:

```
# Liens d'accès anticipé (optionnels — l'e-mail lead s'adapte s'ils sont absents)
TESTFLIGHT_PUBLIC_LINK=
PLAY_OPTIN_LINK=
```

If `.env.local.example` does not exist, create it with exactly:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=

# Liens d'accès anticipé (optionnels — l'e-mail lead s'adapte s'ils sont absents)
TESTFLIGHT_PUBLIC_LINK=
PLAY_OPTIN_LINK=
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add app/api/onboarding-lead/route.ts .env.local.example
git commit -m "feat: early-access lead email with env-driven store links, store session_id"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Automated checks**

```bash
npm run lint
npm run test
npm run build
```
Expected: all pass (4 route tests + 3 whitelist tests).

- [ ] **Step 2: Manual funnel walkthrough (FR then EN)**

Run `npm run dev`, open `http://localhost:3000/fr` and `http://localhost:3000/en`, and check:

1. Section order matches: Hero → Ticker → Problem → Mechanism → Wizard → Payoff → Proof → Pricing → FAQ → Creator teaser → Final CTA.
2. Hero shows "Faire mon bilan gratuit" + "Bientôt sur iOS & Android" badge; clicking the CTA scrolls to the wizard.
3. Pricing CTA and Final CTA both scroll to the wizard; no button anywhere does nothing.
4. FAQ first entry reads "Quand l'app sera-t-elle disponible ?".
5. Complete the wizard: region → goal/activity → metrics → results → submit an email → success state shows "accès anticipé" copy with the sub-line.

- [ ] **Step 3: Verify events landed**

In Supabase SQL editor:

```sql
select event, step, locale, metadata, created_at
from landing_event
order by created_at desc
limit 20;

select email, session_id from onboarding_lead order by created_at desc limit 5;
```
Expected: `cta_click` rows with `{"source":"hero"|"pricing"|"final"}`, `wizard_step` 1–3, `wizard_results`, `lead_submitted`; the newest lead has a non-null `session_id` matching the events' `session_id`.

- [ ] **Step 4: Verify the lead email**

Check the inbox used in Step 2.5: subject "Votre bilan nutritionnel Akeli + votre accès anticipé", macros block, and the fallback early-access paragraph (env links unset locally). No "téléchargez dès maintenant" claim anywhere.
