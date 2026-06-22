# become-creator + About Recraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: executing-plans or subagent-driven-development. Checkbox (`- [ ]`) steps.

**Goal:** Recraft the describe-us surfaces (become-creator, About) to the brand layer, move copy into `becomeCreator.*`/`about.*` namespaces (FR + EN), "vous" throughout.

**Architecture:** Edit `messages/fr.json` and `messages/en.json` (add two namespaces), then rewrite `app/[locale]/become-creator/page.tsx` and `app/[locale]/about/page.tsx` to read every string via next-intl. No `ar.json` (locale disabled). Visual shells largely kept; About is a copy rewrite.

**Tech Stack:** Next.js App Router, next-intl, TypeScript, Tailwind.

**Verbatim copy source:** `docs/superpowers/specs/2026-06-22-becomecreator-about-recraft-design.md` — the "become-creator — copy" and "About — copy" sections hold the exact FR + EN strings for every key. Use them verbatim.

## Global Constraints

- Describe-us layer: positive, dignified, no competitor, no comparison; "vous" throughout.
- Both `becomeCreator.*` and `about.*` keys must exist in `fr.json` AND `en.json` (not `ar.json`).
- No hardcoded marketing string left in either page.
- Keep the existing `prospectFAQ` accordion on become-creator and the legal footer on About.

---

### Task 1: Add `becomeCreator` + `about` namespaces to `fr.json` and `en.json`

**Files:** Modify `messages/fr.json`, `messages/en.json`

**Interfaces:** Produces the `becomeCreator.*` and `about.*` keys (structure listed in the spec's "i18n keys") consumed by Tasks 2–3.

- [ ] **Step 1:** Append a `"becomeCreator"` object and an `"about"` object to `fr.json` (after `recipe_form` or before `common` — any top-level position) using the exact **FR** strings from the spec. Arrays: `becomeCreator.stats` (4 × `{value,label}`), `becomeCreator.steps.step1..step4`. Use a Node script if helpful to avoid JSON edit errors.
- [ ] **Step 2:** Add the SAME structure to `en.json` using the exact **EN** strings from the spec.
- [ ] **Step 3: Validate JSON**

Run: `node -e "['fr','en'].forEach(l=>{const m=JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8'));if(!m.becomeCreator||!m.about)throw new Error(l+' missing namespace');});console.log('fr+en OK')"`
Expected: `fr+en OK`

---

### Task 2: Rewrite `become-creator/page.tsx`

**Files:** Modify `app/[locale]/become-creator/page.tsx`

**Interfaces:** Consumes `becomeCreator.*`.

- [ ] **Step 1:** Replace the hardcoded `metadata` export with `generateMetadata` reading `becomeCreator.meta.{title,description}` via `getTranslations`.
- [ ] **Step 2:** Make the component read `const t = useTranslations("becomeCreator")`. Replace the `STEPS` and `STATS` consts with `t.raw("steps.stepN")` lookups / `t.raw("stats")` array.
- [ ] **Step 3:** Bind hero (title/subtitle/ctaJoin/ctaFaq), steps (eyebrow/title + 4 cards), model (eyebrow/title/body/badge/standard/fan), finalCta, and footer to `becomeCreator.*` keys.
- [ ] **Step 4:** Insert a new **belief band** section between the steps section and the "Modèle économique" section, reading `belief.{eyebrow,headline,body}` (centered band on `--color-brand-cream` or dark; match existing section styling).
- [ ] **Step 5:** Keep the `prospectFAQ` accordion and `faqTitle` binding.
- [ ] **Step 6: Build** — `npm run build` succeeds.

---

### Task 3: Rewrite `about/page.tsx`

**Files:** Modify `app/[locale]/about/page.tsx`

**Interfaces:** Consumes `about.*`.

- [ ] **Step 1:** Replace `metadata` with `generateMetadata` reading `about.meta.*`.
- [ ] **Step 2:** `const t = useTranslations("about")`. Rewrite the body to: intro (title + lead + genesis), three pillar sections (`pillar1..3.{title,body}`), a CTA block (`cta.{title,ctaCreator,ctaUser}` — ctaCreator → `/become-creator`, ctaUser → `/` or `#`), the contact line, and the legal footer (`footer.{terms,privacy,legal}`).
- [ ] **Step 3:** Ensure "vous" register throughout (no "tu"/"ton"/"tes").
- [ ] **Step 4: Build** — `npm run build` succeeds.

---

### Task 4: Verify

- [ ] **Step 1:** `grep -niE "\btu\b|\bton\b|\btes\b" "app/[locale]/about/page.tsx" || echo "PASS: no tu register"` → PASS.
- [ ] **Step 2:** Fetch all four pages on the dev server, expect HTTP 200:
  `for u in fr/become-creator en/become-creator fr/about en/about; do curl -s -o /dev/null -w "$u %{http_code}\n" http://localhost:3000/$u; done`
- [ ] **Step 3: Commit**

```bash
git add messages/fr.json messages/en.json "app/[locale]/become-creator/page.tsx" "app/[locale]/about/page.tsx"
git commit -m "feat(creator,about): recraft describe-us copy (FR+EN), move to i18n namespaces

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** namespaces+FR+EN → Task 1; become-creator (hero/steps/belief/model/faq/cta/footer/meta) → Task 2; About (intro/3 pillars/cta/contact/footer/meta, vous) → Task 3; build+register+render checks → Tasks 2–4. All covered.

**Placeholders:** Copy lives verbatim in the committed spec (referenced, not re-pasted, since execution is inline with the spec in context). No TBD.

**Consistency:** Key paths here (`becomeCreator.steps.step1.title`, `becomeCreator.stats`, `becomeCreator.model.fan.value`, `about.pillar1.body`, `about.cta.ctaCreator`) match the spec's i18n key list.
