# Batch Step-Translation Script — Design Spec

**Date:** 2026-06-25
**Status:** Approved for implementation

---

## Overview

121 recipes have steps; only 18 have EN step translations. This script performs a
one-off backfill: for every recipe with steps and no EN step translations, it calls
Gemini once per recipe (translating all steps in a single call), then upserts the
results into `recipe_step_translation`.

---

## Key decisions

| Decision | Choice |
|---|---|
| Target locale | **EN only** |
| Execution | **Local Node.js script** (`batch_translate_steps.js`) run once from terminal |
| Skip logic | Skip recipes that already have EN step translations by default; `--force` flag overwrites |
| Concurrency | **Sequential** with 600ms pause between calls (Gemini free-tier safety) |
| Auth | Service-role key from `.env.local` — no creator JWT, no ownership check |
| Rate-limit table | Not used (that's for the UI function `recipe-cleaner` only) |
| Error handling | Log failure + continue; print failed recipe list at end |

---

## File

`batch_translate_steps.js` — project root, already gitignored (`test-*.mjs` covers it;
will add explicit entry if needed). Reads `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

---

## Execution flow

1. Load env vars from `.env.local` (via `dotenv`).
2. Create Supabase admin client (service_role).
3. Fetch all recipes that have steps:
   ```sql
   SELECT r.id, r.title, r.language,
          array_agg(DISTINCT rst.locale) FILTER (WHERE rst.locale IS NOT NULL) AS existing_locales
   FROM recipe r
   JOIN recipe_step rs ON rs.recipe_id = r.id
   LEFT JOIN recipe_step_translation rst ON rst.step_id = rs.id
   GROUP BY r.id, r.title, r.language
   ```
4. Filter: skip recipes already having `'en'` in `existing_locales` (unless `--force`).
5. For each recipe (sequentially, 600ms gap):
   - Fetch `recipe_step (id, step_number, sort_order, title, content, is_section_header)` ordered by `sort_order`.
   - One Gemini call: translate all steps from `recipe.language` → `en`.
     - Same prompt contract as `translate-recipe-steps`: preserve `id`, section-header rules (translate `title`, null `content`; translate `content`, null `title` for normal steps), no nutrition commentary, keep dish proper nouns.
     - Model: `gemini-3.5-flash`. Retry on 429/5xx (max 3 attempts, exponential backoff).
   - Parse JSON array `{ steps: [{ id, title, content }] }`.
   - Filter to known step IDs (guard against hallucinated IDs).
   - Upsert `recipe_step_translation` rows: `(step_id, locale='en', title, content, is_auto=true, generated_at=now, updated_at=now)` on conflict `(step_id, locale)`.
   - Log: `✓ Thiéboudienne (12 steps)` or `✗ Basbousa — <error>`.
6. Print summary: `X translated, Y failed, Z skipped`.

---

## Output example

```
[batch-translate-steps] 103 to translate, 18 skipped (already have EN)
[ 1/103] ✓ Achu Soup          (16 steps)
[ 2/103] ✓ Akara              (13 steps)
[ 3/103] ✗ Alloco             — Gemini 429 after 3 retries
...
Done. 101 translated, 2 failed, 18 skipped.
Failed: Alloco, Atiéké & Poisson Grillé
```

---

## Success criteria

- All 103 recipes without EN step translations get `recipe_step_translation` rows for `locale='en'`.
- The 18 already-translated recipes are untouched (skipped).
- One recipe failing does not stop the batch.
- `recipe_step_translation` IDs are validated against known step IDs before upsert (no hallucinated rows).
- Script is idempotent: re-running skips already-translated recipes (unless `--force`).
