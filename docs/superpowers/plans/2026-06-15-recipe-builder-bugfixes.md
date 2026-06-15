# Recipe Builder Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four confirmed bugs: missing `name_ar` DB column (crashes ingredient search), unseeded `ingredient_category` table (broken FK + badges on fresh env), French-only ingredient search (EN/AR users get zero results), and non-functional drag handle on mobile section headers.

**Architecture:** Three SQL migrations fix the DB state (column addition + category seeding); one targeted change to `searchIngredients()` fixes the query; one component change adds ▲▼ fallback buttons to mobile section headers via new optional props on `SectionHeaderRow`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase PostgreSQL, `@dnd-kit/sortable` v10, `next-intl` v4.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/20260615202000_add_name_ar_columns.sql` | **Create** — adds `name_ar` to `ingredient` and `ingredient_category` |
| `supabase/migrations/20260615203000_seed_ingredient_categories.sql` | **Create** — upserts all 19 categories with FR/EN/AR names |
| `lib/queries/ingredients.ts` | **Modify** — replace single-column ILIKE with 3-column OR |
| `hooks/use-ingredient-search.ts` | **Modify** — add `ar` to category label resolution |
| `components/creator/recipe-form/SectionHeaderRow.tsx` | **Modify** — add optional `onMoveUp`/`onMoveDown` props, show ▲▼ on mobile |
| `components/creator/recipe-form/Step2Ingredients.tsx` | **Modify** — pass ▲▼ callbacks to `SectionHeaderRow` in mobile list |
| `components/creator/recipe-form/Step3Steps.tsx` | **Modify** — same as Step2 for steps list |

---

## Task 1 — Add `name_ar` columns (fixes the crash)

**Files:**
- Create: `supabase/migrations/20260615202000_add_name_ar_columns.sql`

The production schema (`akeli-claude-code/database_schema.sql`) already has `name_ar` on both tables. The init migration never defined it, so a fresh `supabase db reset` produces a schema without it — causing `searchIngredients()` to throw `column ingredient.name_ar does not exist` for every user.

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260615202000_add_name_ar_columns.sql
ALTER TABLE public.ingredient
  ADD COLUMN IF NOT EXISTS name_ar text;

ALTER TABLE public.ingredient_category
  ADD COLUMN IF NOT EXISTS name_ar text;
```

- [ ] **Step 2: Verify the migration parses cleanly**

```bash
# Just a syntax check — push happens after all migrations are written
cat supabase/migrations/20260615202000_add_name_ar_columns.sql
```

Expected: the two ALTER TABLE lines, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260615202000_add_name_ar_columns.sql
git commit -m "fix(db): add name_ar column to ingredient and ingredient_category"
```

---

## Task 2 — Seed `ingredient_category` (fixes data integrity on fresh env)

**Files:**
- Create: `supabase/migrations/20260615203000_seed_ingredient_categories.sql`

The init migration creates the table and sets up FK constraints but inserts zero rows. The only seeding that exists is the `fried_oil` migration which ran last — leaving base categories (meat, oil, liquid…) missing. A fresh `db reset` breaks the FK from `ingredient.category → ingredient_category.code`. This migration upserts all 19 categories and also backfills the `name_ar` the `fried_oil` row is missing (since that earlier migration ran before the column existed).

- [ ] **Step 1: Create the seed migration**

```sql
-- supabase/migrations/20260615203000_seed_ingredient_categories.sql
INSERT INTO public.ingredient_category (code, name_fr, name_en, name_ar)
VALUES
  ('liquid',    'Liquide',                'Liquid',          'سائل'),
  ('oil',       'Huile & Matière grasse', 'Oil & Fat',       'زيت ودهون'),
  ('fried_oil', 'Huile de friture',       'Frying Oil',      'زيت للقلي'),
  ('meat',      'Viande',                 'Meat',            'لحوم'),
  ('poultry',   'Volaille',               'Poultry',         'دواجن'),
  ('seafood',   'Poisson & Fruits de mer','Seafood',         'مأكولات بحرية'),
  ('vegetable', 'Légume',                 'Vegetable',       'خضار'),
  ('fruit',     'Fruit',                  'Fruit',           'فاكهة'),
  ('dairy',     'Laitage & Œuf',          'Dairy & Egg',     'ألبان وبيض'),
  ('grain',     'Céréale & Pâte',         'Grain & Pasta',   'حبوب ومعكرونة'),
  ('spice',     'Épice',                  'Spice',           'توابل'),
  ('herb',      'Herbe',                  'Herb',            'أعشاب'),
  ('condiment', 'Condiment',              'Condiment',       'صلصات'),
  ('baking',    'Boulangerie',            'Baking',          'مخبوزات'),
  ('nut',       'Noix & Graine',          'Nut & Seed',      'مكسرات وبذور'),
  ('legume',    'Légumineuse',            'Legume',          'بقوليات'),
  ('sweetener', 'Sucre & Édulcorant',     'Sweetener',       'محليات'),
  ('alcohol',   'Alcool',                 'Alcohol',         'كحول'),
  ('other',     'Autre',                  'Other',           'أخرى')
ON CONFLICT (code) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar;
```

- [ ] **Step 2: Verify the file**

```bash
cat supabase/migrations/20260615203000_seed_ingredient_categories.sql
```

Expected: 19 INSERT value rows, one ON CONFLICT clause.

- [ ] **Step 3: Push both new migrations to your remote Supabase project**

```bash
npx supabase db push
```

Expected output ends with: `Finished supabase db push.` If it errors on `name_ar` not existing, check that migration `20260615202000` ran before `20260615203000` (they're ordered by timestamp prefix — this is correct as written).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260615203000_seed_ingredient_categories.sql
git commit -m "fix(db): seed ingredient_category with all 19 base rows (FR/EN/AR)"
```

---

## Task 3 — Fix bilingual ingredient search

**Files:**
- Modify: `lib/queries/ingredients.ts` (line 36)
- Modify: `hooks/use-ingredient-search.ts` (line 49 and 63–64)

`searchIngredients()` currently uses `.ilike("name_fr", ...)` only. An English creator typing "chicken" gets zero results because the query never checks `name_en`. The fix uses Supabase's `.or()` filter to search all three name columns. We also update `useIngredientSearch` (used by `IngredientCombobox`) to fetch `name_ar` from the category join and resolve it for Arabic locale.

- [ ] **Step 1: Fix `searchIngredients` in `lib/queries/ingredients.ts`**

Replace lines 30–36:
```ts
// OLD
let supabaseQuery = supabase
  .from("ingredient")
  .select(
    "id, name_fr, name_en, name_ar, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_metric_unit, default_us_unit, hide_in_metric"
  )
  .eq("status", "validated")
  .ilike("name_fr", `%${query.trim()}%`);
```

With:
```ts
// NEW
const q = query.trim();
let supabaseQuery = supabase
  .from("ingredient")
  .select(
    "id, name_fr, name_en, name_ar, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_metric_unit, default_us_unit, hide_in_metric"
  )
  .eq("status", "validated")
  .or(`name_fr.ilike.%${q}%,name_en.ilike.%${q}%,name_ar.ilike.%${q}%`);
```

- [ ] **Step 2: Fix `useIngredientSearch` to include `name_ar` in category join and resolve it for Arabic**

In `hooks/use-ingredient-search.ts`, replace line 49:
```ts
// OLD
.select("id, name, name_fr, name_en, status, ingredient_category(name_fr, name_en)")
// NEW
.select("id, name, name_fr, name_en, status, ingredient_category(name_fr, name_en, name_ar)")
```

Replace lines 63–64:
```ts
// OLD
const categoryLabel = cat
  ? (locale === "fr" ? cat.name_fr : cat.name_en) ?? cat.name_fr ?? null
  : null;
// NEW
const catKey = `name_${locale}` as "name_fr" | "name_en" | "name_ar";
const categoryLabel = cat ? (cat[catKey] ?? cat.name_fr ?? null) : null;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Property 'name_ar' does not exist on type ...` from the Supabase generated types, that is expected because `database.types.ts` hasn't been regenerated yet. The `as "name_fr" | "name_en" | "name_ar"` cast in the hook already handles this. For the `IngredientResult` type, `name_ar` is already declared as optional (`name_ar?: string | null`) in `lib/queries/ingredients.ts` — no change needed.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/ingredients.ts hooks/use-ingredient-search.ts
git commit -m "fix(search): search name_fr/name_en/name_ar columns for bilingual ingredient lookup"
```

---

## Task 4 — Fix mobile section header reordering

**Files:**
- Modify: `components/creator/recipe-form/SectionHeaderRow.tsx`
- Modify: `components/creator/recipe-form/Step2Ingredients.tsx` (mobile list, lines 238–291)
- Modify: `components/creator/recipe-form/Step3Steps.tsx` (mobile list, lines 163–193)

On mobile (`sm:hidden`), `SectionHeaderRow` renders inside a plain `<ul>` with no `DndContext`. The `useSortable` drag handle is silently non-functional. Regular ingredient rows have ▲▼ buttons on mobile, but section headers have none — making them impossible to reorder on mobile. The fix adds optional `onMoveUp`/`onMoveDown` props; when provided, the component renders ▲▼ buttons instead of the inert drag handle.

- [ ] **Step 1: Update `SectionHeaderRow.tsx` to accept move callbacks**

Full file replacement:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionHeaderRowProps {
  id: string;
  title: string;
  onChange: (title: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function SectionHeaderRow({
  id,
  title,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionHeaderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const isMobileMode = onMoveUp !== undefined || onMoveDown !== undefined;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 py-2"
    >
      {isMobileMode ? (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="p-0.5 text-muted-foreground disabled:opacity-30"
            aria-label="Remonter la section"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="p-0.5 text-muted-foreground disabled:opacity-30"
            aria-label="Descendre la section"
          >
            ▼
          </button>
        </div>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 hover:text-foreground transition-colors"
          aria-label="Réordonner la section"
        >
          ⠿
        </button>
      )}
      <div className="flex-1 h-px bg-border" />
      <input
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nom de la section"
        className="px-3 py-1 rounded-md border border-dashed border-primary/50 bg-primary/5 text-sm font-medium text-primary placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-ring w-48 text-center"
      />
      <div className="flex-1 h-px bg-border" />
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Supprimer la section"
      >
        ✕
      </button>
    </li>
  );
}
```

- [ ] **Step 2: Update the mobile list in `Step2Ingredients.tsx`**

In the `sm:hidden` block (around line 239), the `SectionHeaderRow` rendering currently is:
```tsx
<SectionHeaderRow
  key={ing.id}
  id={ing.id}
  title={ing.title ?? ""}
  onChange={(t) => updateSectionTitle(ing.id, t)}
  onRemove={() => removeItem(ing.id)}
/>
```

Replace with:
```tsx
<SectionHeaderRow
  key={ing.id}
  id={ing.id}
  title={ing.title ?? ""}
  onChange={(t) => updateSectionTitle(ing.id, t)}
  onRemove={() => removeItem(ing.id)}
  onMoveUp={index > 0 ? () => moveItem(index, "up") : undefined}
  onMoveDown={index < ingredients.length - 1 ? () => moveItem(index, "down") : undefined}
/>
```

Note: `index` is already available in the `.map((ing, index) =>` callback at this location.

- [ ] **Step 3: Update the mobile list in `Step3Steps.tsx`**

In the `sm:hidden` block (around line 165), the `SectionHeaderRow` rendering currently is:
```tsx
<SectionHeaderRow
  key={step.id}
  id={step.id}
  title={step.title ?? ""}
  onChange={(t) => updateStep({ ...step, title: t })}
  onRemove={() => removeItem(step.id)}
/>
```

Replace with:
```tsx
<SectionHeaderRow
  key={step.id}
  id={step.id}
  title={step.title ?? ""}
  onChange={(t) => updateStep({ ...step, title: t })}
  onRemove={() => removeItem(step.id)}
  onMoveUp={index > 0 ? () => updateSteps(arrayMove(steps, index, index - 1)) : undefined}
  onMoveDown={index < steps.length - 1 ? () => updateSteps(arrayMove(steps, index, index + 1)) : undefined}
/>
```

Note: `index` is already available in the `.map((step, index) =>` callback at this location. `arrayMove` and `updateSteps` are already in scope.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/creator/recipe-form/SectionHeaderRow.tsx \
        components/creator/recipe-form/Step2Ingredients.tsx \
        components/creator/recipe-form/Step3Steps.tsx
git commit -m "fix(builder): add up/down reorder buttons for section headers on mobile"
```

---

## Self-Review Checklist

- [x] **Crash fix**: Task 1 adds `name_ar` to `ingredient` table → `searchIngredients()` no longer throws
- [x] **Data integrity**: Task 2 seeds all 19 categories → FK constraint satisfied on fresh env, all category badges show localized names
- [x] **Bilingual search**: Task 3 uses `.or()` → creators can search in French, English, or Arabic
- [x] **Mobile reorder**: Task 4 adds ▲▼ buttons to section headers on mobile → functional parity with regular ingredient rows
- [x] **Arabic categories in IngredientCombobox**: Task 3 also fixes `useIngredientSearch` → Arabic locale gets Arabic category labels from DB join
- [x] **No breaking changes**: `SectionHeaderRow` props are additive (optional `onMoveUp`/`onMoveDown`); all existing desktop call sites unchanged
- [x] **Migration order**: Timestamp prefixes ensure `202000` (column add) runs before `203000` (seed with `name_ar`); `fried_oil` gets its `name_ar` backfilled by the ON CONFLICT UPDATE
