# Recipe Wizard Full Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully rewrite the 6-step recipe creation wizard to align with the updated Supabase schema, adding ingredient catalog search, per-step enrichment, auto-computed macros, and proper save strategy.

**Architecture:** Hybrid save — `recipe` row updated on every autosave; `recipe_ingredient` and `recipe_step` synced on their respective "Next" clicks; `recipe_macro` updated on Step 4 "Next"; publish writes `recipe_tag` and `allergen_tags`. DB triggers (slug, macro creation, translation) are relied upon — no duplicate calls from the wizard.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase JS v2, React Hook Form + Zod v4, @dnd-kit, Vitest (to be installed), pgTAP via `supabase test db`.

**Spec:** `docs/superpowers/specs/2026-06-14-recipe-wizard-rewrite-design.md`

---

## File Map

**Create:**
- `lib/queries/measurement-units.ts`
- `lib/queries/ingredients.ts`
- `lib/queries/allergens.ts`
- `lib/utils/upload-image.ts`
- `lib/utils/macro-calculator.ts`
- `lib/utils/macro-calculator.test.ts`
- `components/creator/recipe-form/SectionHeaderRow.tsx`
- `components/creator/recipe-form/IngredientSearch.tsx`
- `components/creator/recipe-form/IngredientSubmitModal.tsx`
- `components/creator/recipe-form/StepCard.tsx`
- `supabase/tests/recipe_wizard.test.sql`

**Rewrite:**
- `lib/validations/recipe.schema.ts`
- `components/creator/recipe-form/RecipeWizard.tsx`
- `components/creator/recipe-form/Step2Ingredients.tsx`
- `components/creator/recipe-form/Step3Steps.tsx`
- `components/creator/recipe-form/Step4Nutrition.tsx`

**Modify:**
- `components/creator/recipe-form/Step1Basic.tsx`
- `components/creator/recipe-form/Step6Tags.tsx`
- `app/[locale]/(creator)/dashboard/recipes/[id]/edit/page.tsx`
- `package.json` (add vitest)

---

## Task 1 — Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

- [ ] **Step 3: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify**

```bash
npx vitest run --reporter=verbose
```
Expected: "No test files found" (not an error).

---

## Task 2 — Update Zod schemas

**Files:**
- Rewrite: `lib/validations/recipe.schema.ts`

- [ ] **Step 1: Replace the entire file**

```ts
import { z } from "zod";

export const step1Schema = z.object({
  title: z.string().min(3, "Minimum 3 caractères").max(80, "Maximum 80 caractères"),
  description: z.string().max(300, "Maximum 300 caractères").optional(),
  region: z.string().min(1, "Région culinaire requise"),
  meal_types: z.array(z.string()).min(1, "Sélectionne au moins un type de repas"),
  preferred_meal_type: z
    .enum(["any", "breakfast", "lunch", "dinner", "snack"])
    .default("any"),
  difficulty: z.enum(["easy", "medium", "hard"], {
    message: "Sélectionne un niveau de difficulté",
  }),
  prep_time_min: z.number().int().min(1).max(480),
  cook_time_min: z.number().int().min(0).max(480).optional(),
  servings: z.number().int().min(1).max(50),
});

export const ingredientItemSchema = z.object({
  id: z.string(),
  ingredient_id: z.string().optional(),
  name: z.string().optional().default(""),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  is_optional: z.boolean().default(false),
  sort_order: z.number().int(),
  is_section_header: z.boolean().default(false),
  title: z.string().optional(),
  // Nutritional data from catalog (not persisted to recipe_ingredient, used for Step 4)
  calories_per_100g: z.number().nullable().optional(),
  protein_per_100g: z.number().nullable().optional(),
  carbs_per_100g: z.number().nullable().optional(),
  fat_per_100g: z.number().nullable().optional(),
});

export const step2Schema = z.object({
  ingredients: z
    .array(ingredientItemSchema)
    .refine(
      (items) => items.filter((i) => !i.is_section_header).length >= 3,
      { message: "Minimum 3 ingrédients (hors sections)" }
    )
    .refine(
      (items) =>
        items
          .filter((i) => !i.is_section_header)
          .every((i) => !!i.ingredient_id),
      { message: "Tous les ingrédients doivent être liés au catalogue" }
    ),
});

export const stepItemSchema = z.object({
  id: z.string(),
  step_number: z.number().int(),
  title: z.string().optional(),
  content: z.string().optional(),
  image_url: z.string().optional(),
  timer_seconds: z.number().int().min(0).optional(),
  sort_order: z.number().int(),
  is_section_header: z.boolean().default(false),
  ingredient_ids: z.array(z.string()).default([]),
});

export const step3Schema = z.object({
  steps: z
    .array(stepItemSchema)
    .refine(
      (items) => items.filter((i) => !i.is_section_header).length >= 3,
      { message: "Minimum 3 étapes (hors sections)" }
    )
    .refine(
      (items) =>
        items
          .filter((i) => !i.is_section_header)
          .every((i) => i.content && i.content.length >= 10),
      { message: "Chaque étape doit contenir au moins 10 caractères" }
    ),
});

export const step5Schema = z.object({
  cover_image_url: z.string().min(1, "Image de couverture requise"),
  gallery_urls: z.array(z.string()).max(5).default([]),
});

export const step6Schema = z.object({
  tags: z.array(z.string()).max(8, "Maximum 8 tags"),
  is_pork_free: z.boolean().default(false),
  is_private: z.boolean().default(false),
  allergen_tags: z.array(z.string()).default([]),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;
export type IngredientItem = z.infer<typeof ingredientItemSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;

export const MEAL_TYPES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
] as const;

export const PREFERRED_MEAL_TYPES = [
  { value: "any", label: "Peu importe" },
  { value: "breakfast", label: "Petit-déj" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
] as const;
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: errors only in files that import old types (will be fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add lib/validations/recipe.schema.ts
git commit -m "refactor: update recipe Zod schemas for new DB schema"
```

---

## Task 3 — Create query files

**Files:**
- Create: `lib/queries/measurement-units.ts`
- Create: `lib/queries/ingredients.ts`
- Create: `lib/queries/allergens.ts`

- [ ] **Step 1: Create measurement-units query**

```ts
// lib/queries/measurement-units.ts
import { createClient } from "@/lib/supabase/client";

export type MeasurementUnit = {
  code: string;
  name_fr: string;
  name_en: string;
};

export async function fetchMeasurementUnits(): Promise<MeasurementUnit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("measurement_unit")
    .select("code, name_fr, name_en")
    .order("name_fr");
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Create ingredients query**

```ts
// lib/queries/ingredients.ts
import { createClient } from "@/lib/supabase/client";

export type IngredientResult = {
  id: string;
  name_fr: string;
  name_en: string | null;
  category: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

export type UnitConversion = {
  unit: string;
  ingredient_id: string | null;
  grams_equivalent: number;
};

export async function searchIngredients(
  query: string
): Promise<IngredientResult[]> {
  if (query.trim().length < 2) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredient")
    .select(
      "id, name_fr, name_en, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g"
    )
    .eq("status", "validated")
    .ilike("name_fr", `%${query.trim()}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnitConversions(): Promise<UnitConversion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("unit_conversion")
    .select("unit, ingredient_id, grams_equivalent");
  if (error) throw error;
  return data ?? [];
}

export async function submitIngredient(params: {
  name: string;
  name_fr: string;
  name_en: string;
  category_hint: string;
  notes: string;
  submitted_by: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ingredient_submission").insert({
    name: params.name,
    name_fr: params.name_fr,
    name_en: params.name_en,
    category_hint: params.category_hint || null,
    notes: params.notes || null,
    submitted_by: params.submitted_by,
    status: "pending",
  });
  if (error) throw error;
}
```

- [ ] **Step 3: Create allergens query**

```ts
// lib/queries/allergens.ts
import { createClient } from "@/lib/supabase/client";

export async function fetchIngredientAllergens(
  ingredientIds: string[]
): Promise<string[]> {
  if (!ingredientIds.length) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredient_allergen")
    .select("allergen:allergen_id(slug)")
    .in("ingredient_id", ingredientIds);
  if (error) throw error;
  const slugs = new Set(
    (data ?? []).map((row: any) => row.allergen?.slug).filter(Boolean)
  );
  return Array.from(slugs);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/queries/
git commit -m "feat: add measurement-units, ingredients, and allergens query files"
```

---

## Task 4 — Create upload-image utility

**Files:**
- Create: `lib/utils/upload-image.ts`

The same upload logic exists inline in `Step5Images.tsx`. Extracting it here makes it reusable for step images in `StepCard`.

- [ ] **Step 1: Create the file**

```ts
// lib/utils/upload-image.ts
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function uploadImage(
  file: File,
  storagePath: string
): Promise<string> {
  const supabase = createClient();
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const ext = file.type === "image/png" ? "png" : "jpg";
  const finalPath = storagePath.endsWith(".webp")
    ? storagePath.replace(/.webp$/, "." + ext)
    : storagePath + "." + ext;

  const { error: uploadError } = await supabase.storage
    .from("recipe-images")
    .upload(finalPath, compressed, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("recipe-images")
    .getPublicUrl(finalPath);

  return data.publicUrl;
}
```

- [ ] **Step 2: Update Step5Images to use the shared utility**

In `components/creator/recipe-form/Step5Images.tsx`, replace the inline `uploadFile` function:

```ts
// Remove the local uploadFile function and its imports:
// import imageCompression from "browser-image-compression";
// const COMPRESSION_OPTIONS = { ... }
// const uploadFile = async (...) => { ... }

// Add at top:
import { uploadImage } from "@/lib/utils/upload-image";
```

Then replace all calls `uploadFile(file, path)` with `uploadImage(file, path)`.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: no errors in Step5Images.

- [ ] **Step 4: Commit**

```bash
git add lib/utils/upload-image.ts components/creator/recipe-form/Step5Images.tsx
git commit -m "refactor: extract image upload logic into shared utility"
```

---

## Task 5 — Create macro calculator + tests

**Files:**
- Create: `lib/utils/macro-calculator.ts`
- Create: `lib/utils/macro-calculator.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// lib/utils/macro-calculator.test.ts
import { describe, it, expect } from "vitest";
import { convertToGrams, computeMacros } from "./macro-calculator";

const baseConversions = [
  { unit: "g", ingredient_id: null, grams_equivalent: 1 },
  { unit: "kg", ingredient_id: null, grams_equivalent: 1000 },
  { unit: "ml", ingredient_id: null, grams_equivalent: 1 },
  { unit: "cl", ingredient_id: null, grams_equivalent: 10 },
  { unit: "L", ingredient_id: null, grams_equivalent: 1000 },
];

describe("convertToGrams", () => {
  it("converts g directly", () => {
    expect(convertToGrams(200, "g", "any", baseConversions)).toBe(200);
  });

  it("converts kg via table", () => {
    expect(convertToGrams(0.5, "kg", "any", baseConversions)).toBe(500);
  });

  it("prefers ingredient-specific conversion over generic", () => {
    const conversions = [
      ...baseConversions,
      { unit: "unit", ingredient_id: "egg-id", grams_equivalent: 55 },
      { unit: "unit", ingredient_id: null, grams_equivalent: 100 },
    ];
    expect(convertToGrams(2, "unit", "egg-id", conversions)).toBe(110);
    expect(convertToGrams(2, "unit", "other-id", conversions)).toBe(200);
  });

  it("returns null for unknown unit with no conversion", () => {
    expect(convertToGrams(1, "pinch", "any", baseConversions)).toBeNull();
  });
});

describe("computeMacros", () => {
  const ing = (overrides = {}) => ({
    ingredient_id: "rice",
    quantity: 100,
    unit: "g",
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28.0,
    fat_per_100g: 0.3,
    is_section_header: false,
    ...overrides,
  });

  it("computes per-portion macros correctly", () => {
    const result = computeMacros([ing()], baseConversions, 2);
    expect(result.calories).toBe(65); // 130 / 2
    expect(result.total_weight_g).toBe(50); // 100g / 2 portions
    expect(result.missing_data_count).toBe(0);
  });

  it("skips section header rows", () => {
    const result = computeMacros(
      [ing(), ing({ is_section_header: true, calories_per_100g: 999 })],
      baseConversions,
      1
    );
    expect(result.calories).toBe(130);
  });

  it("counts ingredients with null nutritional data", () => {
    const result = computeMacros(
      [ing({ calories_per_100g: null })],
      baseConversions,
      1
    );
    expect(result.missing_data_count).toBe(1);
    expect(result.calories).toBe(0);
  });

  it("counts ingredients with no unit conversion", () => {
    const result = computeMacros(
      [ing({ unit: "pinch" })],
      baseConversions,
      1
    );
    expect(result.missing_data_count).toBe(1);
  });

  it("handles servings = 0 without division by zero", () => {
    const result = computeMacros([ing()], baseConversions, 0);
    expect(result.calories).toBe(130); // falls back to servings=1
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run lib/utils/macro-calculator.test.ts
```
Expected: FAIL — "Cannot find module './macro-calculator'"

- [ ] **Step 3: Implement macro-calculator**

```ts
// lib/utils/macro-calculator.ts
import type { UnitConversion } from "@/lib/queries/ingredients";

export type IngredientForMacro = {
  ingredient_id: string;
  quantity: number;
  unit: string;
  calories_per_100g: number | null | undefined;
  protein_per_100g: number | null | undefined;
  carbs_per_100g: number | null | undefined;
  fat_per_100g: number | null | undefined;
  is_section_header: boolean;
};

export type MacroResult = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  total_weight_g: number;
  missing_data_count: number;
};

export function convertToGrams(
  quantity: number,
  unit: string,
  ingredientId: string,
  conversions: UnitConversion[]
): number | null {
  const specific = conversions.find(
    (c) => c.unit === unit && c.ingredient_id === ingredientId
  );
  if (specific) return quantity * specific.grams_equivalent;

  const generic = conversions.find(
    (c) => c.unit === unit && c.ingredient_id === null
  );
  if (generic) return quantity * generic.grams_equivalent;

  return null;
}

export function computeMacros(
  ingredients: IngredientForMacro[],
  conversions: UnitConversion[],
  servings: number
): MacroResult {
  const s = Math.max(servings, 1);
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    totalWeight = 0,
    missing = 0;

  for (const ing of ingredients) {
    if (ing.is_section_header) continue;

    const grams = convertToGrams(
      ing.quantity,
      ing.unit,
      ing.ingredient_id,
      conversions
    );

    if (grams === null || ing.calories_per_100g == null) {
      missing++;
      continue;
    }

    calories += (ing.calories_per_100g * grams) / 100;
    protein += ((ing.protein_per_100g ?? 0) * grams) / 100;
    carbs += ((ing.carbs_per_100g ?? 0) * grams) / 100;
    fat += ((ing.fat_per_100g ?? 0) * grams) / 100;
    totalWeight += grams;
  }

  return {
    calories: Math.round(calories / s),
    protein_g: Math.round((protein / s) * 10) / 10,
    carbs_g: Math.round((carbs / s) * 10) / 10,
    fat_g: Math.round((fat / s) * 10) / 10,
    fiber_g: 0, // ingredient table has no fiber_per_100g
    total_weight_g: Math.round(totalWeight / s),
    missing_data_count: missing,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/utils/macro-calculator.test.ts
```
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/macro-calculator.ts lib/utils/macro-calculator.test.ts
git commit -m "feat: add macro calculator with full unit test coverage"
```

---

## Task 6 — Create SectionHeaderRow component

**Files:**
- Create: `components/creator/recipe-form/SectionHeaderRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/creator/recipe-form/SectionHeaderRow.tsx
"use client";

interface SectionHeaderRowProps {
  title: string;
  onChange: (title: string) => void;
  onRemove: () => void;
}

export default function SectionHeaderRow({
  title,
  onChange,
  onRemove,
}: SectionHeaderRowProps) {
  return (
    <li className="flex items-center gap-2 py-2">
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

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/SectionHeaderRow.tsx
git commit -m "feat: add SectionHeaderRow shared component"
```

---

## Task 7 — Create IngredientSearch component

**Files:**
- Create: `components/creator/recipe-form/IngredientSearch.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/creator/recipe-form/IngredientSearch.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { searchIngredients } from "@/lib/queries/ingredients";
import type { IngredientResult } from "@/lib/queries/ingredients";

interface IngredientSearchProps {
  onSelect: (ingredient: IngredientResult) => void;
  onSubmitNew: (query: string) => void;
}

export default function IngredientSearch({
  onSelect,
  onSubmitNew,
}: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchIngredients(query);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ingredient: IngredientResult) => {
    onSelect(ingredient);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un ingrédient..."
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
          ...
        </span>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          {results.map((ing) => (
            <li key={ing.id}>
              <button
                type="button"
                onClick={() => handleSelect(ing)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <span className="flex-1 font-medium text-foreground">
                  {ing.name_fr}
                </span>
                {ing.category && (
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {ing.category}
                  </span>
                )}
                {ing.calories_per_100g != null && (
                  <span className="text-xs text-muted-foreground">
                    {ing.calories_per_100g} kcal/100g
                  </span>
                )}
              </button>
            </li>
          ))}
          {query.trim().length >= 2 && (
            <li className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSubmitNew(query.trim());
                }}
                className="w-full px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors text-left"
              >
                + Soumettre « {query.trim()} » comme nouvel ingrédient
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/IngredientSearch.tsx
git commit -m "feat: add IngredientSearch catalog autocomplete component"
```

---

## Task 8 — Create IngredientSubmitModal

**Files:**
- Create: `components/creator/recipe-form/IngredientSubmitModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/creator/recipe-form/IngredientSubmitModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitIngredient } from "@/lib/queries/ingredients";

interface IngredientSubmitModalProps {
  initialName: string;
  onClose: () => void;
}

export default function IngredientSubmitModal({
  initialName,
  onClose,
}: IngredientSubmitModalProps) {
  const supabase = createClient();
  const [categories, setCategories] = useState<
    { code: string; name_fr: string }[]
  >([]);
  const [nameFr, setNameFr] = useState(initialName);
  const [nameEn, setNameEn] = useState("");
  const [categoryHint, setCategoryHint] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("ingredient_category")
      .select("code, name_fr")
      .order("name_fr")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, [supabase]);

  const handleSubmit = async () => {
    if (!nameFr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      await submitIngredient({
        name: nameFr.trim(),
        name_fr: nameFr.trim(),
        name_en: nameEn.trim(),
        category_hint: categoryHint,
        notes: notes.trim(),
        submitted_by: user.id,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
        {done ? (
          <>
            <p className="text-sm font-medium text-foreground">
              ✅ Ingrédient soumis avec succès !
            </p>
            <p className="text-xs text-muted-foreground">
              Notre équipe le validera prochainement. Une fois approuvé, vous
              pourrez l'ajouter à vos recettes.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-foreground">
              Soumettre un nouvel ingrédient
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">
                  Nom en français <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Nom en anglais
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Catégorie
                </label>
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name_fr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Contexte, région d'origine, usage typique..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!nameFr.trim() || loading}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Soumettre"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/IngredientSubmitModal.tsx
git commit -m "feat: add IngredientSubmitModal for new ingredient submissions"
```

---

## Task 9 — Rewrite Step2Ingredients

**Files:**
- Rewrite: `components/creator/recipe-form/Step2Ingredients.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
// components/creator/recipe-form/Step2Ingredients.tsx
"use client";

import { useState, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RecipeFormState } from "./RecipeWizard";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { IngredientResult } from "@/lib/queries/ingredients";
import IngredientSearch from "./IngredientSearch";
import IngredientSubmitModal from "./IngredientSubmitModal";
import SectionHeaderRow from "./SectionHeaderRow";

type IngredientItem = RecipeFormState["ingredients"][number];

interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  units: MeasurementUnit[];
}

const EMPTY_DRAFT = (): Omit<IngredientItem, "sort_order"> => ({
  id: crypto.randomUUID(),
  ingredient_id: "",
  name: "",
  quantity: 1,
  unit: "g",
  is_optional: false,
  is_section_header: false,
  calories_per_100g: null,
  protein_per_100g: null,
  carbs_per_100g: null,
  fat_per_100g: null,
});

export default function Step2Ingredients({
  data,
  onChange,
  units,
}: Step2Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [submitModalQuery, setSubmitModalQuery] = useState<string | null>(null);
  const dndId = useId();

  const ingredients = data.ingredients;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateIngredients = (next: IngredientItem[]) => {
    onChange({ ingredients: next.map((ing, i) => ({ ...ing, sort_order: i })) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ingredients.findIndex((i) => i.id === active.id);
    const newIndex = ingredients.findIndex((i) => i.id === over.id);
    updateIngredients(arrayMove(ingredients, oldIndex, newIndex));
  };

  const moveItem = (index: number, dir: "up" | "down") => {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;
    updateIngredients(arrayMove(ingredients, index, newIndex));
  };

  const removeItem = (id: string) =>
    updateIngredients(ingredients.filter((i) => i.id !== id));

  const addSection = () => {
    const section: IngredientItem = {
      id: crypto.randomUUID(),
      ingredient_id: "",
      name: "",
      quantity: 0,
      unit: "",
      is_optional: false,
      sort_order: ingredients.length,
      is_section_header: true,
      title: "Nouvelle section",
    };
    updateIngredients([...ingredients, section]);
  };

  const updateSectionTitle = (id: string, title: string) => {
    updateIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, title } : i))
    );
  };

  const handleIngredientSelect = (ingredient: IngredientResult) => {
    setDraft((d) => ({
      ...d,
      ingredient_id: ingredient.id,
      name: ingredient.name_fr,
      calories_per_100g: ingredient.calories_per_100g,
      protein_per_100g: ingredient.protein_per_100g,
      carbs_per_100g: ingredient.carbs_per_100g,
      fat_per_100g: ingredient.fat_per_100g,
    }));
  };

  const handleAdd = () => {
    if (!draft.ingredient_id || !draft.quantity || !draft.unit) return;
    updateIngredients([
      ...ingredients,
      { ...draft, sort_order: ingredients.length },
    ]);
    setDraft(EMPTY_DRAFT());
    setAdding(false);
  };

  const nonSectionCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = nonSectionCount < 3;

  // Only non-section rows are draggable
  const draggableIds = ingredients
    .filter((i) => !i.is_section_header)
    .map((i) => i.id);

  return (
    <div className="space-y-6">
      {submitModalQuery !== null && (
        <IngredientSubmitModal
          initialName={submitModalQuery}
          onClose={() => setSubmitModalQuery(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ingrédients</h2>
        <span
          className={`text-xs ${tooFew ? "text-destructive" : "text-muted-foreground"}`}
        >
          {nonSectionCount} / minimum 3
        </span>
      </div>

      {ingredients.length > 0 && (
        <>
          {/* Desktop DnD (non-section items only) */}
          <div className="hidden sm:block">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draggableIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1">
                  {ingredients.map((ing, index) =>
                    ing.is_section_header ? (
                      <SectionHeaderRow
                        key={ing.id}
                        title={ing.title ?? ""}
                        onChange={(t) => updateSectionTitle(ing.id, t)}
                        onRemove={() => removeItem(ing.id)}
                      />
                    ) : (
                      <SortableIngredientRow
                        key={ing.id}
                        ingredient={ing}
                        units={units}
                        onRemove={removeItem}
                        onQuantityChange={(id, q) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, quantity: q } : i
                            )
                          )
                        }
                        onUnitChange={(id, u) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, unit: u } : i
                            )
                          )
                        }
                        onOptionalChange={(id, v) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, is_optional: v } : i
                            )
                          )
                        }
                      />
                    )
                  )}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ul className="sm:hidden space-y-1">
            {ingredients.map((ing, index) =>
              ing.is_section_header ? (
                <SectionHeaderRow
                  key={ing.id}
                  title={ing.title ?? ""}
                  onChange={(t) => updateSectionTitle(ing.id, t)}
                  onRemove={() => removeItem(ing.id)}
                />
              ) : (
                <li
                  key={ing.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 text-muted-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === ingredients.length - 1}
                      className="p-0.5 text-muted-foreground disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ing.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ing.quantity}{" "}
                      {units.find((u) => u.code === ing.unit)?.name_fr ??
                        ing.unit}
                      {ing.is_optional && " · optionnel"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(ing.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              )
            )}
          </ul>
        </>
      )}

      {/* Add ingredient form */}
      {adding ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Ajouter un ingrédient
          </h3>

          <IngredientSearch
            onSelect={handleIngredientSelect}
            onSubmitNew={(q) => {
              setSubmitModalQuery(q);
              setAdding(false);
            }}
          />

          {draft.ingredient_id && (
            <>
              <p className="text-xs text-primary font-medium">
                ✓ {draft.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={draft.quantity}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Quantité"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <select
                    value={draft.unit}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, unit: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Unité...</option>
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name_fr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_optional}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, is_optional: e.target.checked }))
                  }
                  className="rounded accent-primary"
                />
                <span className="text-sm text-foreground">
                  Ingrédient optionnel
                </span>
              </label>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.ingredient_id || !draft.quantity || !draft.unit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft(EMPTY_DRAFT());
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex-1 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Ajouter un ingrédient
          </button>
          <button
            type="button"
            onClick={addSection}
            className="py-3 px-4 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Section
          </button>
        </div>
      )}

      {tooFew && nonSectionCount > 0 && (
        <p className="text-xs text-destructive">
          Minimum 3 ingrédients requis ({nonSectionCount}/3)
        </p>
      )}
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableIngredientRow({
  ingredient,
  units,
  onRemove,
  onQuantityChange,
  onUnitChange,
  onOptionalChange,
}: {
  ingredient: IngredientItem;
  units: MeasurementUnit[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, q: number) => void;
  onUnitChange: (id: string, u: string) => void;
  onOptionalChange: (id: string, v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ingredient.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground p-1"
        aria-label="Réordonner"
      >
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {ingredient.name}
        </p>
      </div>
      <input
        type="number"
        min={0.01}
        step={0.01}
        value={ingredient.quantity}
        onChange={(e) =>
          onQuantityChange(ingredient.id, parseFloat(e.target.value) || 0)
        }
        className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <select
        value={ingredient.unit}
        onChange={(e) => onUnitChange(ingredient.id, e.target.value)}
        className="w-24 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {units.map((u) => (
          <option key={u.code} value={u.code}>
            {u.name_fr}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={ingredient.is_optional}
          onChange={(e) => onOptionalChange(ingredient.id, e.target.checked)}
          className="accent-primary"
        />
        opt.
      </label>
      <button
        type="button"
        onClick={() => onRemove(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-destructive"
      >
        ✕
      </button>
    </li>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/Step2Ingredients.tsx
git commit -m "feat: rewrite Step2Ingredients with catalog search and section headers"
```

---

## Task 10 — Create StepCard component

**Files:**
- Create: `components/creator/recipe-form/StepCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/creator/recipe-form/StepCard.tsx
"use client";

import { useState, useRef } from "react";
import { uploadImage } from "@/lib/utils/upload-image";
import type { RecipeFormState } from "./RecipeWizard";

type StepItem = RecipeFormState["steps"][number];
type IngredientItem = RecipeFormState["ingredients"][number];

interface StepCardProps {
  step: StepItem;
  stepNumber: number;
  availableIngredients: IngredientItem[];
  draftId: string | null;
  onChange: (updated: StepItem) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export default function StepCard({
  step,
  stepNumber,
  availableIngredients,
  draftId,
  onChange,
  onRemove,
  dragHandleProps,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<StepItem>) =>
    onChange({ ...step, ...patch });

  const handleImageUpload = async (file: File) => {
    if (!draftId) return;
    setUploading(true);
    try {
      const path = `step-images/${draftId}/${step.id}`;
      const url = await uploadImage(file, path);
      update({ image_url: url });
    } finally {
      setUploading(false);
    }
  };

  const toggleIngredient = (ingredientId: string) => {
    const current = step.ingredient_ids ?? [];
    const updated = current.includes(ingredientId)
      ? current.filter((id) => id !== ingredientId)
      : [...current, ingredientId];
    update({ ingredient_ids: updated });
  };

  const timerMinutes = step.timer_seconds
    ? Math.round(step.timer_seconds / 60)
    : "";

  const nonSectionIngredients = availableIngredients.filter(
    (i) => !i.is_section_header
  );

  return (
    <li className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 hidden sm:block"
            aria-label="Réordonner"
          >
            ⠿
          </button>
        )}
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {stepNumber}
        </span>
        <p className="flex-1 text-sm text-foreground line-clamp-1">
          {step.content || (
            <span className="text-muted-foreground italic">
              Décris cette étape...
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary px-2 py-1 rounded hover:bg-primary/10 transition-colors"
        >
          {expanded ? "Réduire" : "Modifier"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          ✕
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-secondary/10">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-foreground">
              Titre (optionnel)
            </label>
            <input
              type="text"
              value={step.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Ex : Faire revenir les oignons"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-foreground">
              Instructions <span className="text-destructive">*</span>
            </label>
            <textarea
              value={step.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              rows={3}
              placeholder="Décris cette étape en détail..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground">
                Minuteur (minutes, optionnel)
              </label>
              <input
                type="number"
                min={0}
                value={timerMinutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value, 10);
                  update({
                    timer_seconds: isNaN(mins) ? undefined : mins * 60,
                  });
                }}
                placeholder="Ex : 5"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Step image */}
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground">
                Photo de l'étape (optionnel)
              </label>
              <div className="mt-1">
                {step.image_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.image_url}
                      alt="Étape"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => update({ image_url: undefined })}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 text-destructive text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !draftId}
                      className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
                    >
                      {uploading ? "Envoi..." : "+ Photo"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ingredients used in this step */}
          {nonSectionIngredients.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground">
                Ingrédients utilisés dans cette étape
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {nonSectionIngredients.map((ing) => {
                  const selected = step.ingredient_ids?.includes(
                    ing.ingredient_id
                  );
                  return (
                    <button
                      key={ing.ingredient_id}
                      type="button"
                      onClick={() => toggleIngredient(ing.ingredient_id)}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {ing.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/StepCard.tsx
git commit -m "feat: add StepCard with title, timer, image, and ingredient linking"
```

---

## Task 11 — Rewrite Step3Steps

**Files:**
- Rewrite: `components/creator/recipe-form/Step3Steps.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
// components/creator/recipe-form/Step3Steps.tsx
"use client";

import { useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RecipeFormState } from "./RecipeWizard";
import StepCard from "./StepCard";
import SectionHeaderRow from "./SectionHeaderRow";

type StepItem = RecipeFormState["steps"][number];

interface Step3Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  draftId: string | null;
}

export default function Step3Steps({ data, onChange, draftId }: Step3Props) {
  const dndId = useId();
  const steps = data.steps;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateSteps = (next: StepItem[]) => {
    let stepNum = 0;
    onChange({
      steps: next.map((s, i) => {
        if (!s.is_section_header) stepNum++;
        return { ...s, sort_order: i, step_number: s.is_section_header ? 0 : stepNum };
      }),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    updateSteps(arrayMove(steps, oldIndex, newIndex));
  };

  const moveItem = (index: number, dir: "up" | "down") => {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    updateSteps(arrayMove(steps, index, newIndex));
  };

  const removeItem = (id: string) =>
    updateSteps(steps.filter((s) => s.id !== id));

  const updateStep = (updated: StepItem) =>
    updateSteps(steps.map((s) => (s.id === updated.id ? updated : s)));

  const addStep = () => {
    const newStep: StepItem = {
      id: crypto.randomUUID(),
      step_number: steps.filter((s) => !s.is_section_header).length + 1,
      title: undefined,
      content: "",
      image_url: undefined,
      timer_seconds: undefined,
      sort_order: steps.length,
      is_section_header: false,
      ingredient_ids: [],
    };
    updateSteps([...steps, newStep]);
  };

  const addSection = () => {
    const section: StepItem = {
      id: crypto.randomUUID(),
      step_number: 0,
      title: "Nouvelle section",
      content: undefined,
      sort_order: steps.length,
      is_section_header: true,
      ingredient_ids: [],
    };
    updateSteps([...steps, section]);
  };

  const nonSectionCount = steps.filter((s) => !s.is_section_header).length;
  const draggableIds = steps.filter((s) => !s.is_section_header).map((s) => s.id);
  let displayStepNum = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Étapes de préparation
        </h2>
        <span
          className={`text-xs ${nonSectionCount < 3 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {nonSectionCount} / minimum 3
        </span>
      </div>

      {steps.length > 0 && (
        <>
          {/* Desktop DnD */}
          <div className="hidden sm:block">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draggableIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {steps.map((step) => {
                    if (step.is_section_header) {
                      return (
                        <SectionHeaderRow
                          key={step.id}
                          title={step.title ?? ""}
                          onChange={(t) =>
                            updateStep({ ...step, title: t })
                          }
                          onRemove={() => removeItem(step.id)}
                        />
                      );
                    }
                    displayStepNum++;
                    return (
                      <SortableStepCard
                        key={step.id}
                        step={step}
                        stepNumber={displayStepNum}
                        availableIngredients={data.ingredients}
                        draftId={draftId}
                        onChange={updateStep}
                        onRemove={() => removeItem(step.id)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ul className="sm:hidden space-y-2">
            {steps.map((step, index) => {
              if (step.is_section_header) {
                return (
                  <SectionHeaderRow
                    key={step.id}
                    title={step.title ?? ""}
                    onChange={(t) => updateStep({ ...step, title: t })}
                    onRemove={() => removeItem(step.id)}
                  />
                );
              }
              const num = steps
                .slice(0, index + 1)
                .filter((s) => !s.is_section_header).length;
              return (
                <StepCard
                  key={step.id}
                  step={step}
                  stepNumber={num}
                  availableIngredients={data.ingredients}
                  draftId={draftId}
                  onChange={updateStep}
                  onRemove={() => removeItem(step.id)}
                  dragHandleProps={undefined}
                />
              );
            })}
          </ul>
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addStep}
          className="flex-1 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter une étape
        </button>
        <button
          type="button"
          onClick={addSection}
          className="py-3 px-4 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Section
        </button>
      </div>
    </div>
  );
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableStepCard(props: {
  step: RecipeFormState["steps"][number];
  stepNumber: number;
  availableIngredients: RecipeFormState["ingredients"];
  draftId: string | null;
  onChange: (s: RecipeFormState["steps"][number]) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.step.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <StepCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners } as any}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/Step3Steps.tsx
git commit -m "feat: rewrite Step3Steps with section headers and StepCard integration"
```

---

## Task 12 — Rewrite Step4Nutrition

**Files:**
- Rewrite: `components/creator/recipe-form/Step4Nutrition.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
// components/creator/recipe-form/Step4Nutrition.tsx
"use client";

import { useMemo } from "react";
import { computeMacros } from "@/lib/utils/macro-calculator";
import type { RecipeFormState } from "./RecipeWizard";
import type { UnitConversion } from "@/lib/queries/ingredients";

interface Step4Props {
  data: RecipeFormState;
  unitConversions: UnitConversion[];
}

export default function Step4Nutrition({ data, unitConversions }: Step4Props) {
  const macros = useMemo(
    () => computeMacros(data.ingredients, unitConversions, data.servings),
    [data.ingredients, unitConversions, data.servings]
  );

  const rows = [
    { label: "Calories", value: macros.calories, unit: "kcal", max: 800 },
    { label: "Protéines", value: macros.protein_g, unit: "g", max: 50 },
    { label: "Glucides", value: macros.carbs_g, unit: "g", max: 100 },
    { label: "Lipides", value: macros.fat_g, unit: "g", max: 60 },
    { label: "Fibres", value: macros.fiber_g, unit: "g", max: 20 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Nutrition</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculées automatiquement à partir du catalogue d'ingrédients — par
          portion ({data.servings} pers.)
        </p>
      </div>

      {macros.missing_data_count > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠ {macros.missing_data_count} ingrédient
            {macros.missing_data_count > 1 ? "s" : ""} sans données
            nutritionnelles — valeurs approximatives.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/10">
        {rows.map(({ label, value, unit, max }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              <span className="text-sm text-foreground font-semibold">
                {value} {unit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Poids total estimé par portion
          </span>
          <span className="text-xs font-medium text-foreground">
            {macros.total_weight_g} g
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Les fibres ne sont pas encore disponibles dans notre catalogue
        d'ingrédients. Elles seront calculées dans une prochaine version.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/creator/recipe-form/Step4Nutrition.tsx
git commit -m "feat: rewrite Step4Nutrition as computed read-only macro display"
```

---

## Task 13 — Extend Step1Basic

**Files:**
- Modify: `components/creator/recipe-form/Step1Basic.tsx`

- [ ] **Step 1: Add imports at top of file**

After the existing imports, add:
```ts
import { PREFERRED_MEAL_TYPES } from "@/lib/validations/recipe.schema";
```

- [ ] **Step 2: Add `preferred_meal_type` and `is_private` to form defaultValues**

In the `useForm` `defaultValues`, add:
```ts
preferred_meal_type: data.preferred_meal_type ?? "any",
```

- [ ] **Step 3: Extend the `watch` sync in the `useEffect`**

In the `subscription` callback, add to the `onChange` call:
```ts
preferred_meal_type: (values.preferred_meal_type as RecipeFormState["preferred_meal_type"]) ?? "any",
```

- [ ] **Step 4: Add the two new UI sections after the meal_types block and before difficulty**

```tsx
{/* Preferred meal time */}
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    Moment préféré
  </label>
  <div className="flex flex-wrap gap-2">
    {PREFERRED_MEAL_TYPES.map(({ value, label }) => {
      const selected = watch("preferred_meal_type") === value;
      return (
        <button
          key={value}
          type="button"
          onClick={() =>
            setValue("preferred_meal_type", value as any, {
              shouldValidate: true,
            })
          }
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selected
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-foreground hover:bg-secondary"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 5: Add `is_private` toggle — add to onChange sync in Step1**

In the `RecipeWizard`, `is_private` lives in `formState` and is toggled in **Step 6** (see Task 14). Step 1 does not need to handle it. Skip `is_private` here — it belongs to the publication step.

- [ ] **Step 6: Commit**

```bash
git add components/creator/recipe-form/Step1Basic.tsx
git commit -m "feat: add preferred_meal_type selector to Step1Basic"
```

---

## Task 14 — Extend Step6Tags

**Files:**
- Modify: `components/creator/recipe-form/Step6Tags.tsx`

- [ ] **Step 1: Fix tag table name and store IDs**

The current code queries `tags` (wrong) and stores tag names. Fix to query `tag` and store tag IDs.

Replace the `useEffect` that fetches tags:
```ts
const [availableTags, setAvailableTags] = useState<
  { id: string; name_fr: string }[]
>([]);

useEffect(() => {
  supabase
    .from("tag")                     // was "tags"
    .select("id, name_fr")
    .order("name_fr")
    .then(({ data }) => {
      if (data) setAvailableTags(data);
    });
}, [supabase]);
```

Replace `toggleTag`:
```ts
const toggleTag = (tagId: string) => {
  const current = data.tags;
  if (current.includes(tagId)) {
    onChange({ tags: current.filter((t) => t !== tagId) });
  } else if (current.length < 8) {
    onChange({ tags: [...current, tagId] });
  }
};
```

Replace tag rendering:
```tsx
{availableTags.map((tag) => {
  const selected = data.tags.includes(tag.id);   // was tag.name
  const disabled = !selected && data.tags.length >= 8;
  return (
    <button
      key={tag.id}
      type="button"
      onClick={() => toggleTag(tag.id)}
      disabled={disabled}
      className={...}
    >
      {tag.name_fr}
    </button>
  );
})}
```

- [ ] **Step 2: Add `is_private` toggle before `is_pork_free`**

```tsx
{/* Visibility */}
<label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
  <input
    type="checkbox"
    checked={data.is_private}
    onChange={(e) => onChange({ is_private: e.target.checked })}
    className="rounded border-input accent-primary w-4 h-4"
  />
  <div>
    <p className="text-sm font-medium text-foreground">Recette privée</p>
    <p className="text-xs text-muted-foreground">
      Visible uniquement par vos fans abonnés.
    </p>
  </div>
</label>
```

- [ ] **Step 3: Add allergen display section after `is_pork_free`**

```tsx
{data.allergen_tags.length > 0 && (
  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground">
      Allergènes détectés automatiquement
    </label>
    <div className="flex flex-wrap gap-2">
      {data.allergen_tags.map((slug) => (
        <span
          key={slug}
          className="px-2 py-1 rounded-full text-xs border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          {slug}
        </span>
      ))}
    </div>
    <p className="text-xs text-muted-foreground">
      Basés sur les ingrédients sélectionnés. Vérifiez avant publication.
    </p>
  </div>
)}
```

- [ ] **Step 4: Update the missing-fields checklist**

Replace the `missing` array construction:
```ts
const missing: string[] = [];
if (!data.title || data.title.length < 3) missing.push("Titre");
if (!data.region) missing.push("Région");
if (!data.meal_types.length) missing.push("Type de repas");
if (!data.difficulty) missing.push("Difficulté");
if (data.ingredients.filter((i) => !i.is_section_header).length < 3)
  missing.push("Ingrédients (min 3)");
if (data.ingredients.filter((i) => !i.is_section_header).some((i) => !i.ingredient_id))
  missing.push("Ingrédients non liés au catalogue");
if (data.steps.filter((s) => !s.is_section_header).length < 3)
  missing.push("Étapes (min 3)");
if (!data.cover_image_url) missing.push("Photo de couverture");
```

- [ ] **Step 5: Commit**

```bash
git add components/creator/recipe-form/Step6Tags.tsx
git commit -m "feat: extend Step6Tags with tag IDs, is_private, allergen display, and updated checklist"
```

---

## Task 15 — Rewrite RecipeWizard

**Files:**
- Rewrite: `components/creator/recipe-form/RecipeWizard.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
// components/creator/recipe-form/RecipeWizard.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { fetchMeasurementUnits } from "@/lib/queries/measurement-units";
import { fetchUnitConversions } from "@/lib/queries/ingredients";
import { fetchIngredientAllergens } from "@/lib/queries/allergens";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { UnitConversion } from "@/lib/queries/ingredients";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step5Data,
  Step6Data,
} from "@/lib/validations/recipe.schema";
import Step1Basic from "./Step1Basic";
import Step2Ingredients from "./Step2Ingredients";
import Step3Steps from "./Step3Steps";
import Step4Nutrition from "./Step4Nutrition";
import Step5Images from "./Step5Images";
import Step6Tags from "./Step6Tags";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecipeFormState {
  // Step 1
  title: string;
  description: string;
  region: string;
  meal_types: string[];
  preferred_meal_type: "any" | "breakfast" | "lunch" | "dinner" | "snack";
  difficulty: "easy" | "medium" | "hard" | "";
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  // Step 2
  ingredients: Step2Data["ingredients"];
  // Step 3
  steps: Step3Data["steps"];
  // Step 5
  cover_image_url: string;
  gallery_urls: string[];
  // Step 6
  tags: string[];
  is_pork_free: boolean;
  is_private: boolean;
  allergen_tags: string[];
}

const INITIAL_STATE: RecipeFormState = {
  title: "",
  description: "",
  region: "",
  meal_types: [],
  preferred_meal_type: "any",
  difficulty: "",
  prep_time_min: 30,
  cook_time_min: 0,
  servings: 4,
  ingredients: [],
  steps: [],
  cover_image_url: "",
  gallery_urls: [],
  tags: [],
  is_pork_free: false,
  is_private: false,
  allergen_tags: [],
};

const STEP_LABELS = [
  "Infos de base",
  "Ingrédients",
  "Étapes",
  "Nutrition",
  "Photos",
  "Publication",
];

interface RecipeWizardProps {
  recipeId?: string;
  initialData?: Partial<RecipeFormState>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeWizard({
  recipeId,
  initialData,
}: RecipeWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { creator } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<RecipeFormState>({
    ...INITIAL_STATE,
    ...initialData,
  });
  const [draftId, setDraftId] = useState<string | null>(recipeId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
  const isDirtyRef = useRef(false);

  // ── Fetch supporting data once on mount ───────────────────────────────────
  useEffect(() => {
    fetchMeasurementUnits().then(setUnits).catch(console.error);
    fetchUnitConversions().then(setUnitConversions).catch(console.error);
  }, []);

  // ── Save recipe row ────────────────────────────────────────────────────────
  const saveRecipeRow = useCallback(
    async (data: RecipeFormState): Promise<string | null> => {
      if (!creator) return null;

      const payload = {
        creator_id: creator.id,
        title: data.title || "Brouillon",
        description: data.description || null,
        region: data.region || null,
        difficulty: data.difficulty || null,
        prep_time_min: data.prep_time_min,
        cook_time_min: data.cook_time_min || null,
        servings: data.servings,
        cover_image_url: data.cover_image_url || null,
        is_pork_free: data.is_pork_free,
        is_private: data.is_private,
        meal_types: data.meal_types,
        preferred_meal_type: data.preferred_meal_type,
        is_published: false,
        language: "fr",
        draft_data: data,
        // slug auto-generated by trg_recipe_slug trigger — never sent
      };

      if (draftId) {
        await supabase.from("recipe").update(payload).eq("id", draftId);
        return draftId;
      } else {
        const { data: newRecipe, error } = await supabase
          .from("recipe")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (newRecipe) setDraftId(newRecipe.id);
        return newRecipe?.id ?? null;
      }
    },
    [creator, draftId, supabase]
  );

  // ── Sync recipe_ingredient ─────────────────────────────────────────────────
  const syncIngredients = useCallback(
    async (id: string, data: RecipeFormState) => {
      await supabase.from("recipe_ingredient").delete().eq("recipe_id", id);
      if (!data.ingredients.length) return;
      await supabase.from("recipe_ingredient").insert(
        data.ingredients.map((ing) => ({
          recipe_id: id,
          ingredient_id: ing.is_section_header ? null : ing.ingredient_id || null,
          quantity: ing.is_section_header ? null : ing.quantity,
          unit: ing.is_section_header ? null : ing.unit || null,
          is_optional: ing.is_optional,
          sort_order: ing.sort_order,
          is_section_header: ing.is_section_header,
          title: ing.is_section_header ? ing.title : null,
        }))
      );
    },
    [supabase]
  );

  // ── Sync recipe_step ───────────────────────────────────────────────────────
  const syncSteps = useCallback(
    async (id: string, data: RecipeFormState) => {
      await supabase.from("recipe_step").delete().eq("recipe_id", id);
      if (!data.steps.length) return;
      await supabase.from("recipe_step").insert(
        data.steps.map((step) => ({
          recipe_id: id,
          step_number: step.step_number,
          title: step.title || null,
          content: step.is_section_header ? null : step.content || null,
          image_url: step.image_url || null,
          timer_seconds: step.timer_seconds ?? null,
          sort_order: step.sort_order,
          is_section_header: step.is_section_header,
          ingredient_ids: step.ingredient_ids ?? [],
        }))
      );
    },
    [supabase]
  );

  // ── Update recipe_macro ────────────────────────────────────────────────────
  const updateMacros = useCallback(
    async (id: string, data: RecipeFormState) => {
      const { computeMacros } = await import("@/lib/utils/macro-calculator");
      const macros = computeMacros(data.ingredients, unitConversions, data.servings);
      const totalG = macros.total_weight_g * data.servings;
      await supabase
        .from("recipe_macro")
        .update({
          calories: macros.calories * data.servings,
          protein_g: macros.protein_g * data.servings,
          carbs_g: macros.carbs_g * data.servings,
          fat_g: macros.fat_g * data.servings,
          fiber_g: 0,
          total_weight_g: totalG,
          calories_per_100g: totalG > 0 ? (macros.calories * data.servings * 100) / totalG : null,
          protein_per_100g: totalG > 0 ? (macros.protein_g * data.servings * 100) / totalG : null,
          carbs_per_100g: totalG > 0 ? (macros.carbs_g * data.servings * 100) / totalG : null,
          fat_per_100g: totalG > 0 ? (macros.fat_g * data.servings * 100) / totalG : null,
        })
        .eq("recipe_id", id);
    },
    [supabase, unitConversions]
  );

  // ── Main save/sync ─────────────────────────────────────────────────────────
  const saveDraft = useCallback(
    async (data: RecipeFormState, syncStep?: number) => {
      setIsSaving(true);
      try {
        const id = await saveRecipeRow(data);
        if (!id) return;

        if (syncStep === 2) await syncIngredients(id, data);
        if (syncStep === 3) await syncSteps(id, data);
        if (syncStep === 4) await updateMacros(id, data);

        // Sync gallery images (always on each save)
        if (data.gallery_urls.length > 0) {
          await supabase.from("recipe_image").delete().eq("recipe_id", id);
          await supabase.from("recipe_image").insert(
            data.gallery_urls.map((url, i) => ({
              recipe_id: id,
              url,
              sort_order: i,
            }))
          );
        }

        setLastSaved(new Date());
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [saveRecipeRow, syncIngredients, syncSteps, updateMacros, supabase]
  );

  // ── Auto-save every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) saveDraft(formState);
    }, 30000);
    return () => clearInterval(interval);
  }, [formState, saveDraft]);

  // ── Form update ────────────────────────────────────────────────────────────
  const updateForm = useCallback((patch: Partial<RecipeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
    isDirtyRef.current = true;
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    await saveDraft(formState, currentStep);
    if (currentStep < 6) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    try {
      await saveDraft(formState);
      const id = draftId;
      if (!id) return;

      if (publish) {
        // Compute allergen_tags from ingredient catalog
        const ingredientIds = formState.ingredients
          .filter((i) => !i.is_section_header && i.ingredient_id)
          .map((i) => i.ingredient_id!);
        const allergenSlugs = await fetchIngredientAllergens(ingredientIds);

        // Write recipe_tag junction (tag IDs)
        await supabase.from("recipe_tag").delete().eq("recipe_id", id);
        if (formState.tags.length > 0) {
          await supabase.from("recipe_tag").insert(
            formState.tags.map((tag_id) => ({ recipe_id: id, tag_id }))
          );
        }

        // Publish + set allergen_tags
        // translate_recipe trigger fires automatically on UPDATE — no manual invoke
        await supabase
          .from("recipe")
          .update({
            is_published: true,
            allergen_tags: allergenSlugs,
          })
          .eq("id", id);

        updateForm({ allergen_tags: allergenSlugs });
      } else {
        await supabase
          .from("recipe")
          .update({ is_published: false })
          .eq("id", id);
      }

      router.push("/dashboard/recipes");
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Autosave label ─────────────────────────────────────────────────────────
  const savedLabel = (() => {
    if (isSaving) return "Sauvegarde...";
    if (!lastSaved) return "";
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    return s < 60 ? `Sauvegardé il y a ${s}s` : `Sauvegardé il y a ${Math.round(s / 60)}min`;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <WizardProgress currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Basic data={formState} onChange={updateForm} />
        )}
        {currentStep === 2 && (
          <Step2Ingredients
            data={formState}
            onChange={updateForm}
            units={units}
          />
        )}
        {currentStep === 3 && (
          <Step3Steps
            data={formState}
            onChange={updateForm}
            draftId={draftId}
          />
        )}
        {currentStep === 4 && (
          <Step4Nutrition
            data={formState}
            unitConversions={unitConversions}
          />
        )}
        {currentStep === 5 && (
          <Step5Images
            data={formState}
            onChange={updateForm}
            draftId={draftId}
          />
        )}
        {currentStep === 6 && (
          <Step6Tags
            data={formState}
            onChange={updateForm}
            onSaveDraft={() => handlePublish(false)}
            onPublish={() => handlePublish(true)}
            isPublishing={isPublishing}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
        >
          ← Précédent
        </button>
        <span className="text-xs text-muted-foreground">{savedLabel}</span>
        {currentStep < 6 && (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── WizardProgress ───────────────────────────────────────────────────────────

function WizardProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (s: number) => void;
}) {
  return (
    <div>
      <div className="hidden sm:flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <button
              key={step}
              onClick={() => onStepClick(step)}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors truncate ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {step}. {label}
            </button>
          );
        })}
      </div>
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Étape {currentStep} — {STEP_LABELS[currentStep - 1]}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStep}/6
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors in RecipeWizard.tsx.

- [ ] **Step 3: Commit**

```bash
git add components/creator/recipe-form/RecipeWizard.tsx
git commit -m "feat: rewrite RecipeWizard with hybrid save strategy and new DB schema alignment"
```

---

## Task 16 — Fix edit page queries

**Files:**
- Modify: `app/[locale]/(creator)/dashboard/recipes/[id]/edit/page.tsx`

- [ ] **Step 1: Replace the Supabase query and mapping**

Replace everything inside `async function loadRecipe()`:

```ts
async function loadRecipe() {
  const { data, error: err } = await supabase
    .from("recipe")
    .select(`
      id, title, description, region, meal_types, preferred_meal_type,
      difficulty, prep_time_min, cook_time_min, servings,
      cover_image_url, is_pork_free, is_private, allergen_tags, draft_data,
      recipe_ingredient (
        id, ingredient_id, quantity, unit, is_optional, sort_order,
        is_section_header, title,
        ingredient:ingredient_id ( name_fr, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
      ),
      recipe_step (
        id, step_number, title, content, image_url, timer_seconds,
        sort_order, is_section_header, ingredient_ids
      ),
      recipe_macro ( calories, protein_g, carbs_g, fat_g, fiber_g, total_weight_g ),
      recipe_tag ( tag_id ),
      recipe_image ( url, sort_order )
    `)
    .eq("id", id)
    .single();

  if (err || !data) {
    setError("Recette introuvable ou accès refusé.");
    setLoading(false);
    return;
  }

  const mapped: Partial<RecipeFormState> = {
    title: data.title ?? "",
    description: (data as any).description ?? "",
    region: data.region ?? "",
    meal_types: (data.meal_types as string[]) ?? [],
    preferred_meal_type:
      ((data as any).preferred_meal_type as RecipeFormState["preferred_meal_type"]) ?? "any",
    difficulty:
      (data.difficulty as RecipeFormState["difficulty"]) ?? "",
    prep_time_min: data.prep_time_min ?? 30,
    cook_time_min: data.cook_time_min ?? 0,
    servings: data.servings ?? 4,
    is_pork_free: (data as any).is_pork_free ?? false,
    is_private: (data as any).is_private ?? false,
    allergen_tags: ((data as any).allergen_tags as string[]) ?? [],
    cover_image_url: data.cover_image_url ?? "",
    gallery_urls: ((data as any).recipe_image ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((img: any) => img.url),
    tags:
      ((data as any).recipe_tag ?? []).map((rt: any) => rt.tag_id) ?? [],
    ingredients: ((data as any).recipe_ingredient ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((ing: any) => ({
        id: ing.id,
        ingredient_id: ing.ingredient_id ?? "",
        name: ing.ingredient?.name_fr ?? "",
        quantity: ing.quantity ?? 1,
        unit: ing.unit ?? "g",
        is_optional: ing.is_optional ?? false,
        sort_order: ing.sort_order ?? 0,
        is_section_header: ing.is_section_header ?? false,
        title: ing.title ?? undefined,
        calories_per_100g: ing.ingredient?.calories_per_100g ?? null,
        protein_per_100g: ing.ingredient?.protein_per_100g ?? null,
        carbs_per_100g: ing.ingredient?.carbs_per_100g ?? null,
        fat_per_100g: ing.ingredient?.fat_per_100g ?? null,
      })),
    steps: ((data as any).recipe_step ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((step: any) => ({
        id: step.id,
        step_number: step.step_number ?? 0,
        title: step.title ?? undefined,
        content: step.content ?? "",
        image_url: step.image_url ?? undefined,
        timer_seconds: step.timer_seconds ?? undefined,
        sort_order: step.sort_order ?? 0,
        is_section_header: step.is_section_header ?? false,
        ingredient_ids: step.ingredient_ids ?? [],
      })),
  };

  setInitialData(mapped);
  setLoading(false);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(creator)/dashboard/recipes/[id]/edit/page.tsx"
git commit -m "fix: update edit page query to match new DB schema and RecipeFormState"
```

---

## Task 17 — SQL pgTAP tests

**Files:**
- Create: `supabase/tests/recipe_wizard.test.sql`

pgTAP is built into Supabase. Run with: `supabase test db`

- [ ] **Step 1: Write the test file**

```sql
-- supabase/tests/recipe_wizard.test.sql
BEGIN;
SELECT plan(12);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@akeli.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES ('00000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001', 'Test Creator');

INSERT INTO public.food_region (code, name_fr, name_en)
VALUES ('WAF', 'Afrique de l''Ouest', 'West Africa');

INSERT INTO public.measurement_unit (code, name_fr, name_en)
VALUES ('g', 'grammes', 'grams'), ('kg', 'kilogrammes', 'kilograms');

INSERT INTO public.ingredient_category (code, name_fr, name_en)
VALUES ('GRAIN', 'Céréales', 'Grains');

INSERT INTO public.ingredient (id, name, name_fr, status, calories_per_100g,
  protein_per_100g, carbs_per_100g, fat_per_100g, category)
VALUES ('00000000-0000-0000-0000-000000000003', 'Riz', 'Riz', 'validated',
        130, 2.7, 28.0, 0.3, 'GRAIN');

INSERT INTO public.tag (id, name, name_fr)
VALUES ('00000000-0000-0000-0000-000000000004', 'africain', 'Africain');

-- ── Test 1: slug auto-generated on INSERT ─────────────────────────────────────

INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000002',
        'Jollof Rice Test', 'easy', 30, 4);

SELECT ok(
  (SELECT slug IS NOT NULL FROM public.recipe
   WHERE id = '00000000-0000-0000-0000-000000000010'),
  'slug auto-generated on recipe INSERT'
);

-- ── Test 2: recipe_macro auto-created on INSERT ───────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM public.recipe_macro
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_macro row created automatically after recipe INSERT'
);

-- ── Test 3: recipe_macro UPDATE succeeds ──────────────────────────────────────

UPDATE public.recipe_macro
SET calories = 520, protein_g = 10.8
WHERE recipe_id = '00000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT calories::int FROM public.recipe_macro
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  520,
  'recipe_macro UPDATE persists correctly'
);

-- ── Test 4: recipe_ingredient with valid unit FK accepted ─────────────────────

INSERT INTO public.recipe_ingredient
  (recipe_id, ingredient_id, quantity, unit, sort_order)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000003', 200, 'g', 0);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_ingredient
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_ingredient with valid unit FK inserts successfully'
);

-- ── Test 5: recipe_ingredient with invalid unit FK rejected ───────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe_ingredient
    (recipe_id, ingredient_id, quantity, unit, sort_order)
   VALUES ('00000000-0000-0000-0000-000000000010',
           '00000000-0000-0000-0000-000000000003', 100, 'invalid_unit', 1)$$,
  '23503',
  NULL,
  'recipe_ingredient with unknown unit code raises FK violation'
);

-- ── Test 6: section header row (ingredient_id null) accepted ──────────────────

INSERT INTO public.recipe_ingredient
  (recipe_id, ingredient_id, quantity, unit, sort_order, is_section_header, title)
VALUES ('00000000-0000-0000-0000-000000000010',
        NULL, NULL, NULL, 1, TRUE, 'Pour la sauce');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_ingredient
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = TRUE),
  1,
  'section header row with null ingredient_id/quantity/unit inserts successfully'
);

-- ── Test 7: recipe_step with section header accepted ──────────────────────────

INSERT INTO public.recipe_step
  (recipe_id, step_number, content, sort_order, is_section_header, title)
VALUES ('00000000-0000-0000-0000-000000000010', 0, NULL, 0, TRUE, 'Préparation');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_step
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = TRUE),
  1,
  'recipe_step section header with null content inserts successfully'
);

-- ── Test 8: recipe_step with ingredient_ids array accepted ────────────────────

INSERT INTO public.recipe_step
  (recipe_id, step_number, content, sort_order, is_section_header, ingredient_ids)
VALUES ('00000000-0000-0000-0000-000000000010', 1, 'Faire cuire le riz.', 1, FALSE,
        ARRAY['00000000-0000-0000-0000-000000000003']::uuid[]);

SELECT is(
  (SELECT array_length(ingredient_ids, 1)
   FROM public.recipe_step
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'
     AND is_section_header = FALSE),
  1,
  'recipe_step ingredient_ids array stored correctly'
);

-- ── Test 9: recipe difficulty constraint ──────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings)
    VALUES ('00000000-0000-0000-0000-000000000011',
            '00000000-0000-0000-0000-000000000002',
            'Bad Recipe', 'super_easy', 10, 2)$$,
  '23514',
  NULL,
  'recipe with invalid difficulty value raises check constraint'
);

-- ── Test 10: recipe preferred_meal_type constraint ────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe (id, creator_id, title, difficulty, prep_time_min, servings,
      preferred_meal_type)
    VALUES ('00000000-0000-0000-0000-000000000012',
            '00000000-0000-0000-0000-000000000002',
            'Bad Meal Type', 'easy', 10, 2, 'brunch')$$,
  '23514',
  NULL,
  'recipe with invalid preferred_meal_type raises check constraint'
);

-- ── Test 11: recipe_tag FK enforced ──────────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO public.recipe_tag (recipe_id, tag_id)
    VALUES ('00000000-0000-0000-0000-000000000010',
            '99999999-9999-9999-9999-999999999999')$$,
  '23503',
  NULL,
  'recipe_tag with unknown tag_id raises FK violation'
);

-- ── Test 12: recipe_tag valid insert accepted ─────────────────────────────────

INSERT INTO public.recipe_tag (recipe_id, tag_id)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000004');

SELECT is(
  (SELECT count(*)::int FROM public.recipe_tag
   WHERE recipe_id = '00000000-0000-0000-0000-000000000010'),
  1,
  'recipe_tag with valid tag_id inserts successfully'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2: Run the tests**

```bash
supabase test db
```
Expected: 12 tests, all passing.

If `supabase` CLI is not installed locally:
```bash
npm i -g supabase
supabase link --project-ref <ref-from-supabase/.temp/project-ref>
supabase test db
```

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/recipe_wizard.test.sql
git commit -m "test: add pgTAP SQL tests for recipe wizard DB constraints and triggers"
```

---

## Task 18 — Full build verification

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```
Expected: macro-calculator tests all pass.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Run SQL tests**

```bash
supabase test db
```
Expected: 12/12 tests passing.

- [ ] **Step 5: Manual smoke test — ingredient search**

Start dev server (`npm run dev`), navigate to `/dashboard/recipes/new`, go to Step 2.
- Type at least 2 characters in the ingredient search → dropdown appears with results
- Select an ingredient → `ingredient_id` populated, unit dropdown shows DB units
- Click "Suivant" → check Supabase dashboard: `recipe_ingredient` rows created

- [ ] **Step 6: Manual smoke test — step enrichment**

Go to Step 3. Add a step, expand it, set a timer (5 min), add a photo, link an ingredient.
Click "Suivant" → check Supabase: `recipe_step` row has `timer_seconds = 300`, `image_url` set, `ingredient_ids` array populated.

- [ ] **Step 7: Manual smoke test — publish**

Complete all 6 steps and click Publish.
- Check `recipe.is_published = true`
- Check `recipe_translation` rows exist (trigger fired)
- Check `recipe_tag` rows match selected tags
- Check `recipe.allergen_tags` populated if ingredients have allergens

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "chore: recipe wizard full rewrite — all tasks complete"
```
