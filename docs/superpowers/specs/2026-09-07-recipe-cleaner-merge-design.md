# Recipe Cleaner / AI Correction Merge — Design

## Context

Two independent Gemini-backed Supabase Edge Functions exist for AI-assisted recipe
text quality, and neither is currently wired into the creator-facing wizard:

- **`gemini-correct-text`** — lightweight, per-field spelling/grammar correction
  (`title` | `description` | `step` | `bio`). Returns a structured list of
  corrections (`original` / `suggestion` / `type` / `explanation`). Never writes
  to the database. Has explicit guardrails against commenting on culinary
  quality, nutrition, or cultural/traditional choices. Client wrapper
  `correctText()` exists in `lib/edge-functions.ts` but is never called from any
  component — dead code.
- **`recipe-cleaner`** — heavier, whole-recipe structural pass. Given a
  `recipe_id`, fetches ingredients + steps from the DB, asks Gemini to split
  compound steps into single actions, verify every ingredient is used, estimate
  timers, and enforce DB shape constraints. Can `commit: true` to atomically
  replace the recipe's steps (`replace_recipe_steps` RPC) and re-trigger step
  translation for locales that existed before. Has a persistent DB-backed rate
  limit (200 calls/creator/24h). Currently only called by a standalone batch
  script (`batch_normalize_recipes.js`), not from the wizard UI.

Decision: **standardize on one merged function**, built on `recipe-cleaner`
(the more robust engineering artifact — retries, DB-backed rate limiting,
transactional commit, translation-safety on step replacement), while folding in
what `gemini-correct-text` did well: per-field granularity (title/description,
not just steps), a structured suggestion format the creator can act on
individually, and its non-judgment guardrails.

## Goals

- One edge function covers title, description, and step-level AI correction
  for a recipe.
- Creator can review each suggested change individually and accept or reject
  it — not an all-or-nothing rewrite.
- Preserve `recipe-cleaner`'s structural value: split-step detection,
  ingredient-usage completeness, timer estimation, DB-safe output shape,
  transactional step replacement, translation-safety on commit.
- Preserve `gemini-correct-text`'s restraint: title/description corrections are
  spelling/grammar only, never a stylistic rewrite; explicit prompt guardrails
  against commenting on culinary/nutritional/cultural matters.
- No orphaned code left behind: `gemini-correct-text` and its dead client
  wrapper are removed; the batch script is updated to the new contract.

## Non-goals

- No live/per-keystroke correction while typing (that was `gemini-correct-text`'s
  UX; dropped in favor of a single "Standardize with AI" review action once a
  draft has ingredients + steps saved).
- No auto-apply of reordering suggestions — sequencing issues remain advisory
  text (`evaluation.ordering_issues`), not a toggleable action. Reordering is
  too structurally ambiguous to safely diff/accept-reject.
- No new database tables or migrations. Review state is ephemeral client-side
  React state for the duration of one review session; nothing is persisted
  until the creator applies it.
- No bio correction (creator profile bio). Out of scope — this merge is
  recipe-focused.

## Architecture

Single edge function (`recipe-cleaner`, extended in place), two modes,
replacing today's `commit` boolean:

- **`mode: "preview"`** — the only mode that calls Gemini.
  1. Auth check (Authorization header → `auth.getUser()`).
  2. Creator lookup, 403 if not a creator.
  3. **Rate-limit check** (`check_and_record_cleaner_call`, 200/24h) — gated to
     this mode only.
  4. Fetch the recipe (title, description, `language`, ingredients, steps) by
     `recipe_id`; 404 if missing, 403 if `recipe.creator_id !== creatorId`.
  5. Build the merged prompt (see below) and call Gemini
     (`gemini-3.5-flash`) with the existing retry-with-backoff
     (`callGeminiWithRetry`).
  6. Parse and validate the JSON response against the new schema; categorized
     error on failure (`gemini_failed`, `invalid_ai_output`).
  7. Return proposals. No DB writes.

- **`mode: "apply"`** — pure persistence, no Gemini call, therefore **not**
  rate-limited.
  1. Auth + creator + ownership checks (same as preview).
  2. Client sends the fully resolved final state: `{ recipe_id, mode: "apply",
     title, description, steps[] }` — already merged from whichever proposals
     the creator accepted, in final wizard step shape (`step_number`,
     `sort_order`, `title`, `content`, `image_url`, `timer_seconds`,
     `is_section_header`, `ingredient_ids`).
  3. Capture the recipe's current step-translation locales (existing logic,
     read before the replace cascades them away).
  4. `replace_recipe_steps` RPC with the resolved `steps` (existing
     transactional atomic replace).
  5. If the steps RPC succeeds, update `recipe.title` /
     `recipe.description` in a follow-up write.
  6. Re-trigger `translate-recipe-steps` for the captured locales
     (fire-and-forget via `EdgeRuntime.waitUntil`, existing pattern).
  7. Return `{ applied: true, steps_count }`, or a specific error state if the
     step-write succeeded but the title/description write failed (so the UI
     can tell the creator exactly what did and didn't persist).

The batch script (`batch_normalize_recipes.js`) calls `preview`, accepts every
suggestion by construction (no human review), and calls `apply` with the
fully-accepted resolved payload — same two-call shape as its current
preview/commit flow, no special server-side "accept everything" mode needed.

## API contract

### `preview` response

```jsonc
{
  "title_suggestion": { "suggested": "string", "reason": "string" } | null,
  "description_suggestion": { "suggested": "string", "reason": "string" } | null,
  "step_proposals": [
    {
      "step_id": "uuid",              // existing recipe_step.id
      "change_type": "reworded" | "split",
      "suggested": [                   // 1 item normally; 2+ if split
        {
          "title": "string | null",
          "content": "string | null",
          "timer_seconds": "number | null",
          "is_section_header": "boolean"
        }
      ],
      "reason": "string | null"
    }
  ],
  "new_step_suggestions": [
    {
      "after_step_id": "uuid | null",  // null = insert at start
      "content": "string",
      "reason": "string"                // e.g. ingredient X never appears in any step
    }
  ],
  "evaluation": {
    "ordering_issues": "string | null",
    "general_observations": "string | null"
  }
}
```

Only entries with an actual proposed change are included — `step_proposals`
omits steps Gemini found no issue with, so the review UI only ever shows real
suggestions.

### `apply` request

```jsonc
{
  "recipe_id": "uuid",
  "mode": "apply",
  "title": "string",
  "description": "string | null",
  "steps": [ /* final resolved wizard-shaped step array */ ]
}
```

## Client-side resolution

A pure function (new: `lib/utils/recipe-cleaner-resolve.ts`) takes the current
step list + the creator's accept/reject decisions and produces the final
resolved `steps[]`:

- Accepted `step_proposals` entry → splice `suggested[]` in at that step's
  position, replacing the original.
- Rejected / no proposal → original step passes through unchanged.
- Accepted `new_step_suggestions` entry → splice a new step in after
  `after_step_id` (or at the start).
- Renumber `step_number` / `sort_order` after splicing — reuses the same
  renumbering logic already in `Step3Steps.tsx`'s `updateSteps`.

Isolating this as a pure function keeps it unit-testable without touching
Gemini or Supabase, and keeps the merge logic out of the review component.

## Prompt design

One merged prompt, gemini-3.5-flash, `responseMimeType: 'application/json'`.
Carries forward:

- From `gemini-correct-text`: hard guardrails applied to *all* fields — never
  comment on culinary/nutritional quality, never suggest ingredient/quantity
  changes for health reasons, never judge cultural or traditional choices.
  Title/description instructions are explicitly conservative: fix spelling and
  grammar only, never rephrase for style.
- From `recipe-cleaner`: structural rules for steps — one action per step,
  every ingredient must be used or flagged via `new_step_suggestions`, DB shape
  constraints (section header vs. normal step), timer estimation.
- Language is read from `recipe.language` (currently always `"fr"` — the
  wizard hardcodes this on every save — but the prompt must reference the
  column, not a literal `"French"` string, so it isn't a landmine if a language
  selector is ever added).

## Components touched

- **`supabase/functions/recipe-cleaner/index.ts`** — new prompt, new response
  schema, `mode` param replacing `commit`, rate-limit gated to preview,
  apply path drops the Gemini call entirely.
- **`supabase/functions/gemini-correct-text/`** — deleted.
- **`lib/edge-functions.ts`** — `correctText()` removed; add
  `previewRecipeClean(recipeId)` and
  `applyRecipeClean(recipeId, { title, description, steps })`.
- **New `components/creator/recipe-form/RecipeCleanerReview.tsx`** — modal
  opened from Step 3. Lists every proposal (title, description, each step
  proposal, each new-step suggestion) with an accept/reject toggle; shows
  `evaluation` notes read-only; "Apply selected" button resolves via
  `recipe-cleaner-resolve.ts` and calls `applyRecipeClean`.
- **`components/creator/recipe-form/Step3Steps.tsx`** — new "✨ Standardize
  with AI" button. Saves the current draft first (preview reads from the DB,
  so unsaved edits must be flushed), then opens `RecipeCleanerReview`.
- **`components/creator/recipe-form/RecipeWizard.tsx`** — exposes a
  save-current-step callback to `Step3Steps`; applies the review result back
  into `formState` via `updateForm` after a successful apply, so the wizard
  reflects the change without a reload.
- **`batch_normalize_recipes.js`** — updated to the two-mode contract; drops
  the `x-bypass-key` header (the function has never read it — "No bypass key,
  no admin backdoor" — so it's dead weight).
- **i18n** — new keys added to both `messages/fr.json` and `messages/en.json`
  for the review UI (button label, per-item accept/reject controls, evaluation
  section headers, apply/cancel actions), per project convention.
- **No DB migration** — same `recipe_cleaner_call` table / RPC, just invoked
  conditionally (preview only) instead of unconditionally.

## Error handling

- **Preview**: existing categorized errors (`gemini_failed`, `invalid_ai_output`)
  plus schema validation on the new shape (all four top-level keys present,
  arrays are arrays, even when empty).
- **Apply**: steps write first (RPC's existing transaction covers that
  atomically) — if the steps RPC fails, nothing changes and the client shows a
  generic apply failure. If steps succeed but the title/description follow-up
  write fails, the client is told specifically which part failed ("steps
  saved, title/description didn't — retry") rather than reporting total
  failure or silently dropping it.
- **Auth/ownership**: unchanged from today's `recipe-cleaner` (401 unauth,
  403 non-creator or non-owner, 404 recipe not found).

## Testing

- Unit tests for `recipe-cleaner-resolve.ts` (accept/reject combinations →
  final steps array), following the existing `lib/utils/*.test.ts` pattern
  (`recipe-formatter.test.ts`, `macro-calculator.test.ts`).
- Manual verification: save a draft through Step 3 with ingredients + steps,
  trigger "Standardize with AI", mix accepts/rejects including at least one
  split and one new-step insertion, apply, and confirm in the DB that rejected
  items are untouched and accepted items landed correctly. Re-run with
  everything rejected (apply should be a no-op beyond whatever was already
  saved) and everything accepted (should match today's full-commit behavior).
- Batch script: dry run (no `--commit`) against a small recipe set to confirm
  the new preview/apply shape round-trips correctly before any live use.

## Open items for the implementation plan

- Exact review-modal visual design (accept/reject control style, layout for a
  split-step proposal showing N replacement steps) — left to implementation,
  not a spec-level decision.
- Whether `RecipeCleanerReview` needs a loading/streaming state for long
  preview calls (16k max output tokens historically) — worth deciding during
  implementation based on observed latency.
