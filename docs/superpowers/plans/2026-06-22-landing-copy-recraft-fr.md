# Landing Copy Recraft (FR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Recraft the user landing copy to the buying-act layer and move all of it into the `landing` i18n namespace (FR real copy; EN/AR mirrored with FR placeholders).

**Architecture:** Edit three message files (`fr/en/ar.json`) and rewrite `app/[locale]/page.tsx` so every marketing string comes from `useTranslations("landing")`. No visual redesign — section shells stay, copy and section purpose change.

**Tech Stack:** Next.js App Router, next-intl, TypeScript, Tailwind.

**Source spec:** `docs/superpowers/specs/2026-06-22-landing-copy-recraft-fr-design.md` — the section-by-section copy there is the verbatim source for all keys.

## Global Constraints

- Voice rules (apply to every FR line): affirmative only; no negation (*ne… pas, sans, jamais*); no diet vocabulary (*régime, maigrir, perdre/perte de poids, calories, allégé, light, sain*); body outcome via positive proxy; "vous"; no comparison; no invented numbers.
- Hero locked: « Mangez comme vous êtes. » / subhead « Retrouvez votre corps avec les plats de chez vous. »
- Price: **2,99 €/mois** (never 3 €).
- Every `landing.*` key must exist in `fr.json`, `en.json`, AND `ar.json`.
- No hardcoded marketing string left in `page.tsx`.

---

### Task 1: Rewrite the `landing` namespace in `messages/fr.json`

**Files:**
- Modify: `messages/fr.json` (the `"landing": { … }` block)

**Interfaces:**
- Produces: the `landing.*` keys consumed by `page.tsx` (Task 3): `hero.{title,subtitle,ctaDownload,ctaCreator}`, `ticker.items` (array[6]), `mechanism.{eyebrow,title,step1,step2,step3}` each step `{title,description}`, `payoff.{eyebrow,headline}`, `proof.{eyebrow,title,stats.{recipes,regions,culture}}` each `{value,label}`, `creatorTeaser.{eyebrow,headline,cta}`, `pricing.{eyebrow,title,price,description,features[4],cta}`, `faqTitle`, `finalCta.{eyebrow,title,ctaDownload,ctaCreator}`, `footer.{about,becomeCreator,terms,privacy,legal}`.

- [ ] **Step 1: Replace the `landing` block** with the exact FR copy from the spec's "Section-by-section recrafted FR copy". Use this JSON:

```json
  "landing": {
    "hero": {
      "title": "Mangez comme vous êtes.",
      "subtitle": "Retrouvez votre corps avec les plats de chez vous.",
      "ctaDownload": "Télécharger l'app",
      "ctaCreator": "Devenir créateur"
    },
    "ticker": {
      "items": [
        "La cuisine que vous aimez",
        "Faite pour vous",
        "Mangez à votre faim",
        "Vos plats, repensés",
        "Retrouvez votre énergie",
        "Chez vous, partout"
      ]
    },
    "mechanism": {
      "eyebrow": "Votre cuisine, repensée pour vous",
      "title": "Comment Akeli vous accompagne",
      "step1": { "title": "Vos plats, repensés", "description": "Vos plats préférés, repensés pour vous faire du bien — le goût reste entier." },
      "step2": { "title": "Mangez à votre faim", "description": "Des recettes généreuses qui rassasient vraiment. Le plaisir reste, la satiété aussi." },
      "step3": { "title": "Un plan qui part de vous", "description": "Un accompagnement construit à partir de votre cuisine, de vos habitudes et de votre profil." }
    },
    "payoff": {
      "eyebrow": "Votre raison d'y croire",
      "headline": "Retrouvez votre corps. Restez vous-même."
    },
    "proof": {
      "eyebrow": "La communauté grandit",
      "title": "Une cuisine qui vous ressemble",
      "stats": {
        "recipes": { "value": "100+", "label": "recettes pour commencer" },
        "regions": { "value": "12", "label": "régions de cuisine" },
        "culture": { "value": "100%", "label": "cuisine de chez vous" }
      }
    },
    "creatorTeaser": {
      "eyebrow": "Pour celles et ceux qui cuisinent",
      "headline": "Votre cuisine peut vous nourrir en retour.",
      "cta": "Devenir créateur"
    },
    "pricing": {
      "eyebrow": "Tarif",
      "title": "Un abonnement simple",
      "price": "2,99 €/mois",
      "description": "Toutes les recettes, et un accompagnement fait pour vous.",
      "features": [
        "Toutes les recettes de la plateforme",
        "Un plan construit à partir de votre cuisine",
        "De nouvelles recettes chaque semaine",
        "Sur iOS et Android"
      ],
      "cta": "Télécharger l'app"
    },
    "faqTitle": "Questions fréquentes",
    "finalCta": {
      "eyebrow": "On commence ?",
      "title": "Mangez comme vous êtes.",
      "ctaDownload": "Télécharger l'app",
      "ctaCreator": "Devenir créateur"
    },
    "footer": {
      "about": "À propos",
      "becomeCreator": "Devenir créateur",
      "terms": "CGU",
      "privacy": "Confidentialité",
      "legal": "Mentions légales"
    }
  },
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); console.log('fr OK')"`
Expected: `fr OK`

---

### Task 2: Mirror the `landing` namespace into `messages/en.json` and `messages/ar.json`

**Files:**
- Modify: `messages/en.json`, `messages/ar.json` (their `"landing"` blocks)

**Interfaces:**
- Consumes: the key structure from Task 1.
- Produces: identical key paths in all locales (prevents missing-key errors).

- [ ] **Step 1: Read the existing en/ar landing blocks** to preserve their already-translated `hero.title`/`hero.subtitle` (EN: "Eat as you are." / its subtitle; AR: existing values).

Run: `node -e "const m=require('./messages/en.json'); console.log(JSON.stringify(m.landing.hero))"`
Run: `node -e "const m=require('./messages/ar.json'); console.log(JSON.stringify(m.landing.hero))"`

- [ ] **Step 2: Replace each `landing` block with the SAME structure as Task 1**, using FR placeholder strings for every value EXCEPT `hero.title` and `hero.subtitle`, which keep the locale's existing translated values. (All other keys = the FR strings verbatim, to be translated in Increment 4.)

- [ ] **Step 3: Validate JSON for both**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/ar.json','utf8'));console.log('en+ar OK')"`
Expected: `en+ar OK`

---

### Task 3: Rewrite `app/[locale]/page.tsx` to consume the namespace

**Files:**
- Modify: `app/[locale]/page.tsx`

**Interfaces:**
- Consumes: all `landing.*` keys from Task 1.

- [ ] **Step 1: Hero** — keep `t("hero.title")`/`t("hero.subtitle")`/CTAs (already bound). No change needed beyond confirming.

- [ ] **Step 2: Ticker** — remove the hardcoded `TICKER_ITEMS` const; render from translations:

```tsx
const tickerItems = t.raw("ticker.items") as string[];
// in JSX:
{[...tickerItems, ...tickerItems].map((item, i) => (
  <span key={i} className="mx-8 text-sm font-semibold" style={{ color:"var(--color-brand-dark)" }}>
    &#10022; {item}
  </span>
))}
```

- [ ] **Step 3: Mechanism section** — replace the "Simple & intuitif" eyebrow and `howItWorks` bindings with `mechanism.*`:

```tsx
<p className="..." >{t("mechanism.eyebrow")}</p>
<h2 ...>{t("mechanism.title")}</h2>
// cards map over step1/step2/step3:
{(["step1","step2","step3"] as const).map((key, idx) => ( /* image array unchanged */
  // <h3>{t(`mechanism.${key}.title`)}</h3>
  // <p>{t(`mechanism.${key}.description`)}</p>
))}
```

- [ ] **Step 4: Creator teaser** — replace the entire "CREATOR FEATURE" two-column block with a slim band:

```tsx
<section className="px-6 sm:px-12 py-16" style={{ backgroundColor:"var(--color-brand-dark)" }}>
  <div className="max-w-3xl mx-auto text-center">
    <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color:"var(--color-brand-amber)" }}>
      {t("creatorTeaser.eyebrow")}
    </p>
    <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ fontFamily:"var(--font-display)", color:"#F7F2EA" }}>
      {t("creatorTeaser.headline")}
    </h2>
    <Link href="/become-creator" className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
      style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
      {t("creatorTeaser.cta")}
    </Link>
  </div>
</section>
```

- [ ] **Step 5: Food quote → payoff** — replace the hardcoded eyebrow + quote:

```tsx
<p className="..." style={{ color:"var(--color-brand-amber)" }}>{t("payoff.eyebrow")}</p>
<h2 className="...">{t("payoff.headline")}</h2>
```

- [ ] **Step 6: Community → proof** — replace hardcoded eyebrow/title and the stats array:

```tsx
<p ...>{t("proof.eyebrow")}</p>
<h2 ...>{t("proof.title")}</h2>
{(["recipes","regions","culture"] as const).map((k) => (
  <div key={k} ...>
    <p ...>{t(`proof.stats.${k}.value`)}</p>
    <p ...>{t(`proof.stats.${k}.label`)}</p>
  </div>
))}
```

- [ ] **Step 7: Pricing** — bind eyebrow/title/price/description/features/cta:

```tsx
<p ...>{t("pricing.eyebrow")}</p>
<h2 ...>{t("pricing.title")}</h2>
<p ...>{t("pricing.price")}</p>
<p ...>{t("pricing.description")}</p>
{(t.raw("pricing.features") as string[]).map((item) => ( /* checkmark row */ ))}
<a ...>{t("pricing.cta")}</a>
```

- [ ] **Step 8: Final CTA** — bind eyebrow/title/CTAs to `finalCta.*`.

- [ ] **Step 9: Remove dead code** — delete the `TICKER_ITEMS` const and any now-unused hardcoded strings.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: build succeeds, no missing-key/type errors.

---

### Task 4: Verify no hardcoded marketing copy + locales render

- [ ] **Step 1: Confirm no leftover hardcoded marketing strings**

Run: `grep -nE "Créez|Gagnez|fait avec passion|3€|Recettes publiees|racontee par ceux" app/[locale]/page.tsx || echo "PASS: no hardcoded marketing copy"`
Expected: `PASS: no hardcoded marketing copy`

- [ ] **Step 2: Confirm price is 2,99 across messages**

Run: `grep -n "2,99" messages/fr.json && (grep -n "\"3€/mois\"" messages/fr.json && echo "FAIL: old price remains" || echo "PASS: price fixed")`
Expected: `PASS: price fixed`

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/page.tsx messages/fr.json messages/en.json messages/ar.json
git commit -m "feat(landing): recraft FR copy to buying-act layer, move to i18n namespace

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** i18n move → Tasks 1–3; mirror to en/ar → Task 2; section recrafts (hero, ticker, mechanism, payoff, proof, creator teaser, pricing, final CTA) → Task 3; price fix → Tasks 1+4; no-hardcoded check → Task 4; build → Task 3 step 10. All spec sections covered.

**Placeholder scan:** All copy is verbatim from the spec; en/ar "placeholders" are the FR strings (intentional, documented). No TBD/TODO.

**Consistency:** Key paths in Task 3 bindings match Task 1's JSON exactly (`mechanism.step1.title`, `proof.stats.recipes.value`, `pricing.features`, `creatorTeaser.cta`, `finalCta.*`).
