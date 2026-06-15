# Recipe Wizard Full Rewrite — Design Spec
**Date:** 2026-06-14  
**Branch:** gemini-version  
**Status:** Approved, pending implementation plan

---

## Context

The Supabase database has received major schema improvements that break or bypass several parts of the existing 6-step recipe creation wizard. This spec describes a full rewrite to align the wizard with the real schema and exploit all new capabilities.

The existing wizard was written against an outdated schema (tables with typos, no normalized ingredient catalog, steps stored only as a stringified text blob). The new schema is clean, normalized, and trigger-driven.

---

## Decisions Made

| Topic | Decision |
|---|---|
| Ingredient entry | Catalog-first, strict — ingredient_id required; new ingredients via `ingredient_submission` (blocking) |
| Step enrichment | Full — title, image, timer, ingredient_ids per step |
| Macro calculation | Auto-computed read-only from catalog nutritional data |
| Sodium | Out of scope for V1 |
| Save strategy | Hybrid (Approach C) — recipe always, steps/ingredients on "Next" |
| Variant system | V2 scope |
| Recipe combinations | V2 scope |
| Compatible starches | V2 scope |

---

## Section 1 — Form State & Data Model

### `RecipeFormState` (full shape)

```ts
interface RecipeFormState {
  // Step 1
  title: string
  description: string
  region: string                                          // food_region.code FK
  meal_types: string[]                                    // recipe.meal_types[]
  preferred_meal_type: "any"|"breakfast"|"lunch"|"dinner"|"snack"  // NEW
  difficulty: "easy" | "medium" | "hard" | ""
  prep_time_min: number
  cook_time_min: number
  servings: number

  // Step 2
  ingredients: Array<{
    id: string                    // local UUID (not persisted)
    ingredient_id: string         // ingredient.id FK — required for non-section rows
    name: string                  // ingredient.name_fr (display)
    quantity: number
    unit: string                  // measurement_unit.code FK
    is_optional: boolean
    sort_order: number
    is_section_header: boolean    // NEW — section divider row
    title?: string                // NEW — section label when is_section_header=true
  }>

  // Step 3
  steps: Array<{
    id: string                    // local UUID (not persisted)
    step_number: number
    title?: string                // NEW
    content: string
    image_url?: string            // NEW
    timer_seconds?: number        // NEW
    sort_order: number
    is_section_header: boolean    // NEW
    ingredient_ids: string[]      // NEW — catalog ingredient_ids used in this step
  }>

  // Step 4 — all computed, no user input
  // (computed_calories, computed_protein_g, etc. are derived, not stored in form state)

  // Step 5
  cover_image_url: string
  gallery_urls: string[]

  // Step 6
  tags: string[]                  // tag.id UUIDs → recipe_tag junction on publish
  is_pork_free: boolean
  is_private: boolean             // NEW — recipe.is_private
  allergen_tags: string[]         // NEW — auto-populated from ingredient_allergen at publish
}
```

### Fields intentionally excluded (V2)
- `compatible_starches uuid[]`
- `parent_recipe_id`, `variant_type`, `substitution_notes`
- `recipe_combination` pairing

### Removed from current form state
- `macros_skipped` — no longer needed (macros always computed)
- `sodium_mg` — out of scope V1

---

## Section 2 — Save Strategy

### Trigger awareness
| Trigger | Effect on wizard |
|---|---|
| `trg_recipe_slug` | Auto-generates slug on INSERT/UPDATE — never send slug from wizard |
| `trg_recipe_create_macro` | Auto-creates `recipe_macro` row on INSERT — wizard only UPDATEs |
| `translate_recipe` | Fires on INSERT/UPDATE automatically — **remove** the manual `functions.invoke("translate-recipe")` call in `handlePublish` |
| `trg_updated_at` | Auto-updates `updated_at` |

### Autosave (every 30s + on each "Next")
Writes to `recipe` table only:
```
title, description, region, difficulty, prep_time_min, cook_time_min,
servings, cover_image_url, language, is_pork_free, is_private,
meal_types, preferred_meal_type, draft_data (full form snapshot)
```

### On Step 2 "Next" — sync `recipe_ingredient`
```sql
DELETE FROM recipe_ingredient WHERE recipe_id = $id;
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit,
  is_optional, sort_order, is_section_header, title) VALUES ...
```
Section header rows: `ingredient_id = null`, `quantity = null`, `unit = null`.

### On Step 3 "Next" — sync `recipe_step`
```sql
DELETE FROM recipe_step WHERE recipe_id = $id;
INSERT INTO recipe_step (recipe_id, step_number, title, content, image_url,
  timer_seconds, sort_order, is_section_header, ingredient_ids) VALUES ...
```
Section header rows: `content = null`.

### On Step 4 "Next" — update `recipe_macro`
```sql
UPDATE recipe_macro SET
  calories = $cal, protein_g = $prot, carbs_g = $carbs,
  fat_g = $fat, fiber_g = $fiber,
  total_weight_g = $total_g,
  calories_per_100g = $cal / ($total_g / 100),
  ...
WHERE recipe_id = $id;
```
Row guaranteed to exist (auto-created by trigger on first INSERT).

### On Step 5 — sync `recipe_image` (unchanged, already works)

### On Publish
1. DELETE + INSERT `recipe_tag` (tag_id FKs)
2. Compute `allergen_tags[]` from `ingredient_allergen` for all ingredient_ids in recipe
3. `UPDATE recipe SET is_published = true, allergen_tags = $allergens WHERE id = $id`
4. ~~`functions.invoke("translate-recipe")`~~ — trigger handles it automatically

### Draft loading
On edit page load:
1. Read `draft_data` jsonb as primary source for form state
2. Hydrate steps from `recipe_step` table for display accuracy
3. Hydrate ingredients from `recipe_ingredient` table

---

## Section 3 — Per-Step UI Design

### Step 1 — Basic Info
**Existing fields:** title, description, region, meal_types, difficulty, prep_time_min, cook_time_min, servings

**New fields appended:**
- **Moment préféré** — single-select pill row (`Peu importe / Petit-déj / Déjeuner / Dîner / Snack`) → `preferred_meal_type`
- **Visibilité** — toggle (`Public / Privé`) → `is_private`

---

### Step 2 — Ingredients (full rewrite)

**Catalog search flow:**
1. Creator types ingredient name → debounced search (`ingredient.name_fr ILIKE %query%`, status = 'validated')
2. Dropdown shows results with name + category badge
3. On select → `ingredient_id` locked, `name` set, unit dropdown populated from `measurement_unit` (DB-fetched, displayed as `name_fr`, value = `code`)
4. If no result → "Soumettre un nouvel ingrédient" → inline modal:
   - Fields: `name` (required), `name_fr`, `name_en`, `category_hint`, `notes`
   - On submit → INSERT `ingredient_submission` → ingredient shows in list with **🕐 En attente de validation** badge
   - **Blocks publishing** — Step 6 checklist fails if any ingredient is pending

**Section headers:**
- "+ Ajouter une section" button alongside "+ Ajouter un ingrédient"
- Section rows render as styled divider with label text input
- Section rows are not draggable (fixed relative to surrounding ingredients)
- Stored as `is_section_header = true, ingredient_id = null, quantity = null`

**Unit select:** Fetched from `measurement_unit` table on wizard mount, cached. Displayed as `name_fr`, value = `code`.

---

### Step 3 — Steps (full rewrite)

Each step card (collapsed/expanded):

**Collapsed:** step number badge + content preview + drag handle  
**Expanded:**
- **Titre** — optional text field → `title`
- **Instructions** — textarea (required, min 10 chars) → `content`
- **Timer** — optional number field (displayed in minutes, stored as seconds) → `timer_seconds`
- **Photo** — optional image upload (reuses `ImageUpload` component) → `image_url`
- **Ingrédients utilisés** — multi-select chips from the ingredient list built in Step 2 (non-section items only) → `ingredient_ids[]`

**Section headers:** Same pattern as Step 2 — "+ Ajouter une section" inserts a `is_section_header = true` divider row with a label.

DnD (desktop) and arrow buttons (mobile) reorder non-header rows only.

---

### Step 4 — Nutrition (full rewrite, read-only)

Computed client-side from Step 2 ingredient data using `unit_conversion` table (fetched once on mount).

**Layout:**
- Header: "Macros calculées automatiquement" + servings selector (already in Step 1 but shown for reference)
- 5 macro bars: Calories, Protéines, Glucides, Lipides, Fibres — each shows value + visual bar
- Footer: estimated total weight per portion
- Warning banner if any ingredient lacks nutritional data: "X ingrédient(s) sans données — macros approximatives"

**Computation:**
```
for each ingredient (non-section):
  grams = convert(quantity, unit) using unit_conversion
  calories += ingredient.calories_per_100g * grams / 100
  ... same for protein, carbs, fat, fiber
total_weight_g = sum of all grams
per_portion = totals / servings
```

---

### Step 5 — Images
Unchanged.

---

### Step 6 — Tags & Publication

**Existing:** tag multi-select (from `tag` table), `is_pork_free` toggle  
**New:**
- **Allergènes détectés** — read-only chips showing auto-computed `allergen_tags[]` from ingredient catalog. Shown as info ("Ces allergènes ont été détectés automatiquement depuis vos ingrédients")
- **Récapitulatif avant publication** — summary card: title, region, X ingrédients, Y étapes, macros snapshot, visibility badge (Public / Privé)
- **Blocking checklist** — publish button disabled if: no cover image, <3 ingredients, <3 steps, any pending `ingredient_submission`

---

## Section 4 — New Components & File Structure

### Component tree

```
components/creator/recipe-form/
├── RecipeWizard.tsx                ← rewrite
├── Step1Basic.tsx                  ← extend
├── Step2Ingredients.tsx            ← full rewrite
│   ├── IngredientSearch.tsx        ← NEW: debounced catalog autocomplete
│   ├── IngredientSubmitModal.tsx   ← NEW: ingredient submission form
│   └── SectionHeaderRow.tsx        ← NEW: shared divider component (Step2 + Step3)
├── Step3Steps.tsx                  ← full rewrite
│   └── StepCard.tsx                ← NEW: expanded step editor
├── Step4Nutrition.tsx              ← full rewrite (read-only computed)
├── Step5Images.tsx                 ← unchanged
└── Step6Tags.tsx                   ← extend
```

### New lib files

```
lib/
├── queries/
│   ├── ingredients.ts         ← searchIngredients(query), fetchUnitConversions()
│   ├── measurement-units.ts   ← fetchMeasurementUnits()
│   └── allergens.ts           ← fetchIngredientAllergens(ingredient_ids[])
└── utils/
    └── macro-calculator.ts    ← computeMacros(ingredients, unitConversions, servings)
```

### Zod schema changes (`lib/validations/recipe.schema.ts`)

- `step2Schema` — ingredient items: `ingredient_id` required (on non-section rows), add `is_section_header`, `title`; remove `UNITS` constant (runtime fetch)
- `step3Schema` — step items: add `title`, `image_url`, `timer_seconds`, `is_section_header`, `ingredient_ids`
- `step4Schema` — removed entirely (macros are computed, not user input); `macros_skipped` gone
- `step1Schema` — add `preferred_meal_type`
- `step6Schema` — add `is_private`, `allergen_tags`
- `RecipeFormState` — sync with above

---

## Section 5 — Testing Strategy

### SQL / Database

**Goal:** Verify triggers, constraints, and cascade behaviour against the real schema before the wizard writes real data.

Test file location: `supabase/tests/recipe_wizard.test.sql`  
Runner: `supabase test db` (pgTAP).

**Tests to cover:**

| Test | What it checks |
|---|---|
| `trg_recipe_slug` fires | INSERT recipe without slug → slug auto-generated, not null |
| `trg_recipe_create_macro` fires | INSERT recipe → `recipe_macro` row created automatically |
| `trg_recipe_count` fires | INSERT + DELETE recipe → `creator.recipe_count` increments / decrements |
| `recipe_ingredient` unit FK | INSERT ingredient row with unknown unit code → rejected |
| `recipe_ingredient` ingredient FK | INSERT ingredient row with unknown ingredient_id → rejected |
| `recipe_ingredient` section header | INSERT `is_section_header=true` with `ingredient_id=null, quantity=null, unit=null` → accepted |
| `recipe_step` section header | INSERT `is_section_header=true` with `content=null` → accepted |
| `recipe_macro` UPDATE only | Macro row exists after recipe INSERT, UPDATE succeeds, second INSERT raises unique violation |
| `recipe.preferred_meal_type` check | INSERT with invalid value → rejected by constraint |
| `recipe.difficulty` check | INSERT with invalid value → rejected |
| `ingredient_submission` status flow | INSERT `status='pending'` → readable; UPDATE to `validated` → accepted |
| `food_region` FK | INSERT recipe with unknown region code → rejected |
| `recipe_tag` FK | INSERT recipe_tag with unknown tag_id → rejected |

### Edge Functions

**Goal:** Verify `translate-recipe` is not double-triggered and behaves correctly when called by the DB trigger alone.

Test file location: `supabase/functions/translate-recipe/index.test.ts`  
Runner: Deno test (`supabase functions test`).

**Tests to cover:**

| Test | What it checks |
|---|---|
| Trigger fires on INSERT | After inserting a recipe via wizard save, `recipe_translation` rows appear for configured locales (fr, en) within the trigger timeout |
| Trigger fires on UPDATE | Updating `title` or `description` re-triggers translation update |
| No duplicate invocation | Wizard `handlePublish` does NOT call `functions.invoke("translate-recipe")` — confirmed by code review + absence of duplicate `recipe_translation` rows with same `generated_at` |
| Missing locale handled | If translation for a locale fails, other locales still created (partial success) |
| `is_auto = true` on generated rows | All auto-generated translations have `is_auto = true` |

### Wizard Integration (manual / Playwright)

Lightweight smoke tests to run after each wizard step implementation:

| Step | Test |
|---|---|
| Step 2 | Search ingredient by name → result appears → select → `ingredient_id` populated in state |
| Step 2 | Submit new ingredient → `ingredient_submission` row created with `status='pending'` → publish blocked |
| Step 3 | Add step with timer → `timer_seconds` persisted to `recipe_step` on "Next" |
| Step 3 | Add step image → `image_url` persisted |
| Step 4 | Macros computed after Step 2 ingredients set → values non-zero if ingredients have nutritional data |
| Publish | `is_published = true` set → `recipe_translation` rows exist → no duplicate trigger call |

---

## Out of Scope (V2)

- `compatible_starches uuid[]` on recipe
- `parent_recipe_id` / `variant_type` / `substitution_notes` (variant system)
- `recipe_combination` (pairing system)
- `recipe_development` (improvement tracking)
- Sodium (`sodium_mg`) in macros
