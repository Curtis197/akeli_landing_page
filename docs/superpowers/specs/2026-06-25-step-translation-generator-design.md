# Recipe Step-Translation Generator — Design Spec

**Date:** 2026-06-25
**Status:** Approved for implementation

---

## Overview

`recipe-cleaner` rewrites a recipe's `recipe_step` rows; the `recipe_step_translation.step_id`
FK is `ON DELETE CASCADE`, so committing a clean deletes that recipe's step translations. The
public recipe page falls back to source-locale step text when a translation is missing, so
nothing breaks — but cleaned multilingual recipes silently lose their translated steps, and
**no generator for `recipe_step_translation` exists in the repo** (`translate-recipe` only
handles the recipe's `instructions` text → `recipe_translation`, a different table).

This adds a step-translation generator and wires it into the cleaner so cleaning **regenerates
exactly the locales the recipe already had**.

---

## Key decisions (approved)

| Decision | Choice |
|---|---|
| Locale scope | **Preserve the recipe's existing set** — re-translate only the locales that had step translations before the clean |
| Function shape | **New standalone `translate-recipe-steps`** (reusable; also callable on manual step edits) |
| Trigger | **Background** from recipe-cleaner (`EdgeRuntime.waitUntil`), best-effort |
| Backfill | **None** — forward fix only (originals were generated outside this repo) |
| Model | `gemini-3.5-flash` (verified working in this project) |

---

## New Edge Function: `translate-recipe-steps`

**File:** `supabase/functions/translate-recipe-steps/index.ts` · `verify_jwt: true`

**Request:** `{ recipe_id: string, source_locale: string, target_locales: string[] }`

**Auth (mirrors recipe-cleaner):**
- Require `Authorization`; `userClient.auth.getUser()`.
- Resolve creator (`creator.user_id = auth.uid()`); 403 if none.
- Ownership: fetch the recipe's `creator_id`; **403 unless it equals the caller's creator**.

**Work:**
1. Fetch the recipe's current steps: `recipe_step (id, step_number, sort_order, title, content, is_section_header)` ordered by `sort_order`.
2. `targets = target_locales.filter(l => l !== source_locale)`. If empty, return `{ translated: 0 }`.
3. For each target locale (`Promise.allSettled`):
   - **One Gemini call** translating all steps. Prompt sends an array of `{ id, title, content, is_section_header }` and asks for the same array back with `title`/`content` translated, **`id` preserved**, section headers' `title` translated and `content` left null.
   - Parse the JSON array; for each returned item whose `id` matches a known step id, **upsert** `recipe_step_translation (step_id=id, locale, title, content, is_auto=true, generated_at=now, updated_at=now)` `onConflict: 'step_id,locale'`. Items with an unknown id are skipped.
4. Return `{ translated: <locales succeeded>, failed: <locales failed> }`.

**Errors:** one locale failing does not sink the others (`allSettled`); function-level failure → 500 with a generic body (no internal leak). Gemini call uses the same **retry-with-backoff** helper added to recipe-cleaner.

**Translation prompt:** adapt `translate-recipe`'s African-cuisine rules (keep dish proper nouns, natural language, do not add/remove steps, no nutrition commentary), but operate on the structured step array and return JSON.

**Schema reference (confirmed):** `recipe_step_translation(id, step_id, locale, content, title, is_auto default true, generated_at default now, updated_at default now)`, unique `(step_id, locale)`. `recipe.language` is the source locale.

---

## Wiring into `recipe-cleaner` (commit path only)

1. **Before** the RPC commit, capture the existing set:
   ```sql
   SELECT DISTINCT rst.locale
   FROM recipe_step_translation rst
   JOIN recipe_step rs ON rs.id = rst.step_id
   WHERE rs.recipe_id = :recipe_id
   ```
   (Run via `adminClient.rpc` or a direct select; store as `priorLocales: string[]`.)
2. Run the existing atomic `replace_recipe_steps` commit (CASCADE clears old steps + their translations; inserts new steps).
3. **After** a successful commit, if `priorLocales.length > 0`, fire `translate-recipe-steps` in the background:
   ```ts
   const trigger = fetch(`${SUPABASE_URL}/functions/v1/translate-recipe-steps`, {
     method: 'POST',
     headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
     body: JSON.stringify({ recipe_id, source_locale: recipe.language, target_locales: priorLocales }),
   }).catch((e) => console.error('step re-translation trigger failed:', e));
   // run after the response is sent, do not block the clean
   const ert = (globalThis as any).EdgeRuntime;
   if (ert?.waitUntil) ert.waitUntil(trigger); else await trigger;
   ```
   The clean's HTTP response is returned immediately; re-translation runs in the background. If it fails, the page still falls back to source-locale steps.

`recipe.language` must be added to the cleaner's recipe `select` (it currently selects `id, title, description, creator_id, …`).

---

## Out of scope
- Backfilling recipes already de-translated by the earlier batch run.
- Translating recipe-level `instructions`/`recipe_translation` (that's `translate-recipe`).
- Ingredient translations.

## Success criteria
- After a creator cleans a recipe that had EN+AR step translations, EN+AR step translations are regenerated (within seconds, in the background) and the public page shows translated steps again.
- A recipe with no prior step translations triggers no extra work.
- `translate-recipe-steps` rejects a creator cleaning a recipe they don't own (403).
- The clean response latency is unchanged (trigger is backgrounded).
- `npm run build` unaffected (edge functions are not part of the Next build).
