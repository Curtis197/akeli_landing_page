# Landing Copy Recraft (FR) — Design Spec

**Date:** 2026-06-22
**Status:** Approved for implementation
**Phase:** 2 · Increment 1 of the copywriting recraft

---

## Overview

Recraft the user landing page (`app/[locale]/page.tsx`) copy to the **buying-act layer**
of the approved messaging foundation, and move **all** landing marketing copy into
`messages/fr.json` so it is translation-ready. French only this increment; EN/AR are a later
increment. The visual design and section shells stay; what changes is the **copy** and the
**purpose** of each section.

**Source of truth:** `akeli-nutrition-app/docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md`
(the copywriting bible) and `AKELI_GENESE_PERSONA.md`.

**Locked decisions:** hero *« Mangez comme vous êtes. »* · subhead S2 *« Retrouvez votre corps
avec les plats de chez vous. »* · creator section slimmed to a teaser · stats = 100+ recettes /
12 régions / honest third · price corrected 3 € → **2,99 €**.

---

## Global Constraints (voice rules — apply to every line below)

1. Affirmative only — no negation (*ne… pas, sans, jamais, plus de*).
2. No diet/"healthy" vocabulary (*régime, maigrir, perdre/perte de poids, calories, allégé,
   light, sain, brûler*).
3. Body outcome via positive proxy only (*retrouvez votre corps / votre énergie / vous-même*).
4. Every word safe in isolation.
5. Stand on our own — no competitor, no comparison.
6. Encouragement before outcome.
7. "Vous", consistent.
8. No shame, pressure, or obligation.
9. No invented numbers — every figure must be true (100+ recipes confirmed real).

---

## Scope

**In scope:**
- Rewrite all user-facing copy in `app/[locale]/page.tsx` to read from the `landing` namespace.
- Expand the `landing` namespace in `messages/fr.json` with all new keys (real FR copy).
- **Mirror the identical key structure into `messages/en.json` and `messages/ar.json`** with the
  FR strings as **temporary placeholders** (except `hero.title`/`hero.subtitle`, which already
  have real EN/AR values — keep those). This prevents missing-key breakage on the en/ar locales
  and satisfies the `CLAUDE.md` rule (every key in every message file).
- Remove now-dead keys from all three files (e.g. the old `landing.howItWorks.*` replaced by
  `landing.mechanism.*`).
- Slim the creator-feature section to a teaser band.
- Fix the price binding to 2,99 €.

**Out of scope (later increments):**
- `become-creator`, `About`, FAQ recraft (Increments 2–3).
- Real EN/AR **translation values** (Increment 4) — the keys + FR placeholders land now.
- Mojibake elsewhere in `fr.json` (creators/recipe_form/ingredientCategories) — Increment 3.
  The `landing` namespace is already mojibake-free.

---

## i18n approach

All landing copy lives under the `landing` namespace, present in **all three** message files
(`fr.json` real copy; `en.json`/`ar.json` mirrored structure with FR placeholders, except the
already-translated `hero.title`/`hero.subtitle`). The page calls `useTranslations("landing")`.
No marketing string remains hardcoded in JSX. New/changed keys:

```
landing.hero.title|subtitle|ctaDownload|ctaCreator
landing.ticker.items            (array of 6 short affirmative phrases)
landing.mechanism.eyebrow|title|step1.{title,description}|step2.{…}|step3.{…}
landing.payoff.eyebrow|headline
landing.proof.eyebrow|title|stats.recipes.{value,label}|stats.regions.{…}|stats.culture.{…}
landing.creatorTeaser.eyebrow|headline|cta
landing.pricing.eyebrow|title|price|description|features (array of 4)|cta
landing.faqTitle
landing.finalCta.eyebrow|title|ctaDownload|ctaCreator
landing.footer.{about,becomeCreator,terms,privacy,legal}
```

---

## Section-by-section recrafted FR copy

### 1. Hero
- **title:** « Mangez comme vous êtes. »
- **subtitle:** « Retrouvez votre corps avec les plats de chez vous. »
- **ctaDownload:** « Télécharger l'app »
- **ctaCreator:** « Devenir créateur »

### 2. Ticker (`items`)
« La cuisine que vous aimez » · « Faite pour vous » · « Mangez à votre faim » · « Vos plats,
repensés » · « Retrouvez votre énergie » · « Chez vous, partout »

### 3. Mechanism (repurposed "How It Works")
- **eyebrow:** « Votre cuisine, repensée pour vous »
- **title:** « Comment Akeli vous accompagne »
- **step1.title:** « Vos plats, repensés »
  **step1.description:** « Vos plats préférés, repensés pour vous faire du bien — le goût reste entier. »
- **step2.title:** « Mangez à votre faim »
  **step2.description:** « Des recettes généreuses qui rassasient vraiment. Le plaisir reste, la satiété aussi. »
- **step3.title:** « Un plan qui part de vous »
  **step3.description:** « Un accompagnement construit à partir de votre cuisine, de vos habitudes et de votre profil. »

### 4. Emotional payoff (repurposed food quote)
- **eyebrow:** « Votre raison d'y croire »
- **headline:** « Retrouvez votre corps. Restez vous-même. »

### 5. Proof (community stats)
- **eyebrow:** « La communauté grandit »
- **title:** « Une cuisine qui vous ressemble »
- **stats.recipes:** value « 100+ » · label « recettes pour commencer »
- **stats.regions:** value « 12 » · label « régions de cuisine »
- **stats.culture:** value « 100% » · label « cuisine de chez vous »
  *(honest third, replaces "100% fait avec passion": all recipes are African/diaspora cuisine)*

### 6. Creator teaser (slimmed band — replaces "Créez. Partagez. Gagnez.")
- **eyebrow:** « Pour celles et ceux qui cuisinent »
- **headline:** « Votre cuisine peut vous nourrir en retour. »
- **cta:** « Devenir créateur » → `/become-creator`

### 7. Pricing
- **eyebrow:** « Tarif »
- **title:** « Un abonnement simple »
- **price:** « 2,99 €/mois »
- **description:** « Toutes les recettes, et un accompagnement fait pour vous. »
- **features:** « Toutes les recettes de la plateforme » · « Un plan construit à partir de votre
  cuisine » · « De nouvelles recettes chaque semaine » · « Sur iOS et Android »
- **cta (reuses hero.ctaDownload):** « Télécharger l'app »

### 8. FAQ
- **faqTitle:** « Questions fréquentes » — FAQ items unchanged this increment (the existing
  landing/user items already use "vous" and pass the filter; full voice-pass is Increment 3).

### 9. Final CTA
- **eyebrow:** « On commence ? »
- **title:** « Mangez comme vous êtes. »
- **ctaDownload:** « Télécharger l'app » · **ctaCreator:** « Devenir créateur »

### 10. Footer
- Unchanged keys (`about, becomeCreator, terms, privacy, legal`).

---

## Component changes (`app/[locale]/page.tsx`)

- Replace the hardcoded `TICKER_ITEMS` array with `t("ticker.items")`.
- Repurpose the "HOW IT WORKS" section to read `mechanism.*` (titles/descriptions change;
  the 3-card layout and images stay).
- Replace the FOOD QUOTE hardcoded headline with `payoff.*`.
- Replace COMMUNITY stats hardcoded array with `proof.stats.*` (3 entries).
- Replace the CREATOR FEATURE two-column block with a slim teaser band reading
  `creatorTeaser.*` (one eyebrow + headline + CTA; drop the image column and feature list).
- PRICING: bind price/description/features to `pricing.*` (no hardcoded "3€"/bullets).
- CTA FINALE: bind eyebrow/title to `finalCta.*`.
- Remove every hardcoded French marketing string from the JSX.

---

## Success criteria

- A French visitor reads, in order: *you're accepted as you are* (hero) → *retrouvez votre corps
  avec les plats de chez vous* (subhead) → *how it works for you* (mechanism) → *emotional payoff*
  → *honest proof* → *2,99 €* → CTA.
- Zero hardcoded marketing strings remain in `page.tsx`; all come from `messages/fr.json`.
- No line violates the 9 global constraints; no invented number.
- Price reads **2,99 €** everywhere on the landing.
- The en/ar landing pages **still render without missing-key errors** (mirrored keys with FR
  placeholders); real EN/AR translations are Increment 4.
- `npm run build` succeeds.
