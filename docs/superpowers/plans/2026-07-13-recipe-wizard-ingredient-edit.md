# Recipe Wizard — Edit Added Ingredients In Place — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a creator click an already-added ingredient row in Step 2 of the recipe wizard and edit its ingredient selection, quantity, and unit in place, instead of having to delete and re-add it.

**Architecture:** Extract the two pieces of new pure logic (valid-unit filtering, in-place list replacement) into a small, independently-tested utility module, then wire an `editingId` state and a real unit `<select>` into the existing `Step2Ingredients` add/edit panel, reusing it for both add and edit modes. `RecipeWizard` gains one new prop pass-through (`unitConversions`, already fetched there for Step 4).

**Tech Stack:** Next.js App Router, TypeScript, React 19 client components, Zod (`lib/validations/recipe.schema.ts` for the `IngredientItem` type), Vitest (`environment: 'node'`, no DOM/testing-library in this repo — component-level changes are verified manually via the dev server, matching the existing convention where only `lib/utils/*.ts` pure logic has automated tests).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-13-recipe-wizard-ingredient-edit-design.md`
- No confirmation dialogs for cancel/switch-row-mid-edit (matches existing UI, e.g. remove has none).
- Section headers are out of scope — untouched by this change.
- No new modal — reuse the existing inline add/edit panel in `Step2Ingredients.tsx`.
- Editing the `ingredient` catalog itself (names, nutrition) is out of scope.
- This repo has no component-test harness (`vitest.config.ts` sets `environment: 'node'`, no `@testing-library/react`/jsdom installed) — do not add one for this task. Only the new pure-logic module gets automated tests; the UI wiring is verified manually per the spec's verification section.

---

### Task 1: Pure logic — valid-unit filtering and in-place list replacement

**Files:**
- Create: `lib/utils/ingredient-edit.ts`
- Test: `lib/utils/ingredient-edit.test.ts`

**Interfaces:**
- Consumes: `MeasurementUnit` from `lib/queries/measurement-units.ts` (`{ code: string; name_fr: string; name_en: string }`), `UnitConversion` from `lib/queries/ingredients.ts` (`{ unit: string; ingredient_id: string | null; grams_equivalent: number }`), `IngredientItem` from `lib/validations/recipe.schema.ts` (existing Zod-inferred type — already has `id`, `ingredient_id?`, `name?`, `quantity?`, `unit?`, `is_optional`, `sort_order`, `is_section_header`, `title?`, `swappable_ingredients`, `calories_per_100g?`, `protein_per_100g?`, `carbs_per_100g?`, `fat_per_100g?`).
- Produces: `getValidUnitsForIngredient(ingredientId: string, units: MeasurementUnit[], conversions: UnitConversion[]): MeasurementUnit[]` and `replaceIngredientInList(ingredients: IngredientItem[], editingId: string, draft: IngredientItem): IngredientItem[]` — both consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `lib/utils/ingredient-edit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getValidUnitsForIngredient, replaceIngredientInList } from "./ingredient-edit";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { UnitConversion } from "@/lib/queries/ingredients";
import type { IngredientItem } from "@/lib/validations/recipe.schema";

const units: MeasurementUnit[] = [
  { code: "g", name_fr: "grammes", name_en: "grams" },
  { code: "kg", name_fr: "kilogrammes", name_en: "kilograms" },
  { code: "ml", name_fr: "millilitres", name_en: "milliliters" },
  { code: "piece", name_fr: "pièce", name_en: "piece" },
  { code: "cup", name_fr: "tasse", name_en: "cup" },
];

const conversions: UnitConversion[] = [
  { unit: "g", ingredient_id: null, grams_equivalent: 1 },
  { unit: "kg", ingredient_id: null, grams_equivalent: 1000 },
  { unit: "ml", ingredient_id: null, grams_equivalent: 1 },
  { unit: "piece", ingredient_id: "egg-id", grams_equivalent: 55 },
];

describe("getValidUnitsForIngredient", () => {
  it("includes generic units available to every ingredient", () => {
    const codes = getValidUnitsForIngredient("egg-id", units, conversions).map((u) => u.code);
    expect(codes).toContain("g");
    expect(codes).toContain("kg");
    expect(codes).toContain("ml");
  });

  it("includes ingredient-specific units", () => {
    const codes = getValidUnitsForIngredient("egg-id", units, conversions).map((u) => u.code);
    expect(codes).toContain("piece");
  });

  it("excludes ingredient-specific units belonging to a different ingredient", () => {
    const codes = getValidUnitsForIngredient("flour-id", units, conversions).map((u) => u.code);
    expect(codes).not.toContain("piece");
  });

  it("excludes units with no matching conversion at all", () => {
    const codes = getValidUnitsForIngredient("flour-id", units, conversions).map((u) => u.code);
    expect(codes).not.toContain("cup");
  });

  it("returns an empty array when nothing matches", () => {
    const result = getValidUnitsForIngredient(
      "mystery-id",
      [{ code: "cup", name_fr: "tasse", name_en: "cup" }],
      conversions
    );
    expect(result).toEqual([]);
  });
});

describe("replaceIngredientInList", () => {
  const base: IngredientItem[] = [
    {
      id: "a",
      ingredient_id: "tomato-id",
      name: "Tomate",
      quantity: 2,
      unit: "piece",
      is_optional: false,
      sort_order: 0,
      is_section_header: false,
      swappable_ingredients: [{ id: "cherry-tomato-id", name: "Tomate cerise" }],
      calories_per_100g: 18,
      protein_per_100g: 0.9,
      carbs_per_100g: 3.9,
      fat_per_100g: 0.2,
    },
    {
      id: "b",
      ingredient_id: "onion-id",
      name: "Oignon",
      quantity: 1,
      unit: "piece",
      is_optional: false,
      sort_order: 1,
      is_section_header: false,
      swappable_ingredients: [],
      calories_per_100g: 40,
      protein_per_100g: 1.1,
      carbs_per_100g: 9.3,
      fat_per_100g: 0.1,
    },
  ];

  it("replaces the matching item's fields while keeping its id and sort_order", () => {
    const draft: IngredientItem = {
      id: "a",
      ingredient_id: "tomato-id",
      name: "Tomate",
      quantity: 5,
      unit: "kg",
      is_optional: true,
      sort_order: 999,
      is_section_header: false,
      swappable_ingredients: [{ id: "cherry-tomato-id", name: "Tomate cerise" }],
      calories_per_100g: 18,
      protein_per_100g: 0.9,
      carbs_per_100g: 3.9,
      fat_per_100g: 0.2,
    };

    const result = replaceIngredientInList(base, "a", draft);

    expect(result[0]).toEqual({ ...draft, id: "a", sort_order: 0 });
  });

  it("leaves other items untouched", () => {
    const draft = { ...base[0], quantity: 5 };
    const result = replaceIngredientInList(base, "a", draft);
    expect(result[1]).toEqual(base[1]);
  });

  it("returns the list unchanged when editingId matches nothing", () => {
    const draft = { ...base[0], quantity: 5 };
    const result = replaceIngredientInList(base, "does-not-exist", draft);
    expect(result).toEqual(base);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/utils/ingredient-edit.test.ts`
Expected: FAIL — `Cannot find module './ingredient-edit'` (the module doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `lib/utils/ingredient-edit.ts`:

```ts
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { UnitConversion } from "@/lib/queries/ingredients";
import type { IngredientItem } from "@/lib/validations/recipe.schema";

export function getValidUnitsForIngredient(
  ingredientId: string,
  units: MeasurementUnit[],
  conversions: UnitConversion[]
): MeasurementUnit[] {
  const validCodes = new Set(
    conversions
      .filter((c) => c.ingredient_id === ingredientId || c.ingredient_id === null)
      .map((c) => c.unit)
  );
  return units.filter((u) => validCodes.has(u.code));
}

export function replaceIngredientInList(
  ingredients: IngredientItem[],
  editingId: string,
  draft: IngredientItem
): IngredientItem[] {
  return ingredients.map((item) =>
    item.id === editingId ? { ...draft, id: editingId, sort_order: item.sort_order } : item
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/utils/ingredient-edit.test.ts`
Expected: PASS — 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/ingredient-edit.ts lib/utils/ingredient-edit.test.ts
git commit -m "feat: add pure helpers for in-place ingredient editing"
```

---

### Task 2: Wire in-place editing into the Step 2 wizard UI

**Files:**
- Modify: `components/creator/recipe-form/RecipeWizard.tsx:373-379`
- Modify: `components/creator/recipe-form/Step2Ingredients.tsx`

**Interfaces:**
- Consumes: `getValidUnitsForIngredient`, `replaceIngredientInList` from `lib/utils/ingredient-edit.ts` (Task 1). `unitConversions: UnitConversion[]` state already present in `RecipeWizard.tsx:108` (`const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);`), populated at `RecipeWizard.tsx:114` via `fetchUnitConversions()`.
- Produces: no new exports — this is the leaf UI consumer.

- [ ] **Step 1: Pass `unitConversions` down from `RecipeWizard`**

In `components/creator/recipe-form/RecipeWizard.tsx`, find:

```tsx
        {currentStep === 2 && (
          <Step2Ingredients
            data={formState}
            onChange={updateForm}
            units={units}
          />
        )}
```

Replace with:

```tsx
        {currentStep === 2 && (
          <Step2Ingredients
            data={formState}
            onChange={updateForm}
            units={units}
            unitConversions={unitConversions}
          />
        )}
```

- [ ] **Step 2: Accept the new prop and import the helpers in `Step2Ingredients.tsx`**

Find the top imports:

```tsx
import type { RecipeFormState } from "./RecipeWizard";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { IngredientResult } from "@/lib/queries/ingredients";
import IngredientSearch from "./IngredientSearch";
import IngredientSubmitModal from "./IngredientSubmitModal";
import SectionHeaderRow from "./SectionHeaderRow";
```

Replace with:

```tsx
import type { RecipeFormState } from "./RecipeWizard";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { IngredientResult, UnitConversion } from "@/lib/queries/ingredients";
import IngredientSearch from "./IngredientSearch";
import IngredientSubmitModal from "./IngredientSubmitModal";
import SectionHeaderRow from "./SectionHeaderRow";
import { getValidUnitsForIngredient, replaceIngredientInList } from "@/lib/utils/ingredient-edit";
```

Find the props interface:

```tsx
interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  units: MeasurementUnit[];
}
```

Replace with:

```tsx
interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  units: MeasurementUnit[];
  unitConversions: UnitConversion[];
}
```

Find the component signature:

```tsx
export default function Step2Ingredients({
  data,
  onChange,
  units,
}: Step2Props) {
```

Replace with:

```tsx
export default function Step2Ingredients({
  data,
  onChange,
  units,
  unitConversions,
}: Step2Props) {
```

- [ ] **Step 3: Add `editingId` state and a `startEdit` handler**

Find:

```tsx
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [submitModalQuery, setSubmitModalQuery] = useState<string | null>(null);
  const [swappingForId, setSwappingForId] = useState<string | null>(null);
  const [isMetricUser, setIsMetricUser] = useState(true);
  const dndId = useId();
```

Replace with:

```tsx
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [submitModalQuery, setSubmitModalQuery] = useState<string | null>(null);
  const [swappingForId, setSwappingForId] = useState<string | null>(null);
  const [isMetricUser, setIsMetricUser] = useState(true);
  const dndId = useId();
```

Find the `handleAdd` function:

```tsx
  const handleAdd = () => {
    if (!draft.ingredient_id || !draft.quantity || !draft.unit) return;
    updateIngredients([
      ...ingredients,
      { ...draft, sort_order: ingredients.length },
    ]);
    setDraft(EMPTY_DRAFT());
    setAdding(false);
  };
```

Replace with (renamed to `handleSave` since it now covers both add and edit, plus a new `startEdit`):

```tsx
  const handleSave = () => {
    if (!draft.ingredient_id || !draft.quantity || !draft.unit) return;
    if (editingId) {
      updateIngredients(
        replaceIngredientInList(ingredients, editingId, { ...draft, sort_order: 0 })
      );
    } else {
      updateIngredients([
        ...ingredients,
        { ...draft, sort_order: ingredients.length },
      ]);
    }
    setDraft(EMPTY_DRAFT());
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (ingredient: IngredientItem) => {
    setAdding(false);
    setEditingId(ingredient.id);
    setDraft({
      id: ingredient.id,
      ingredient_id: ingredient.ingredient_id ?? "",
      name: ingredient.name ?? "",
      quantity: ingredient.quantity ?? 1,
      unit: ingredient.unit ?? "g",
      is_optional: ingredient.is_optional,
      is_section_header: false,
      calories_per_100g: ingredient.calories_per_100g ?? null,
      protein_per_100g: ingredient.protein_per_100g ?? null,
      carbs_per_100g: ingredient.carbs_per_100g ?? null,
      fat_per_100g: ingredient.fat_per_100g ?? null,
      swappable_ingredients: ingredient.swappable_ingredients ?? [],
    });
  };
```

(Note: `replaceIngredientInList` overwrites `sort_order` with the original item's value internally, so the placeholder `sort_order: 0` passed here is discarded; `updateIngredients` renumbers everything again afterward regardless — same as the existing add path.)

- [ ] **Step 4: Compute the unit dropdown options**

Find (inside the component body, right before the JSX return):

```tsx
  const nonSectionCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = nonSectionCount < 3;

  const draggableIds = ingredients.map((i) => i.id);
```

Replace with:

```tsx
  const nonSectionCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = nonSectionCount < 3;

  const draggableIds = ingredients.map((i) => i.id);

  const validUnits = getValidUnitsForIngredient(draft.ingredient_id, units, unitConversions);
  const unitOptions = validUnits.length > 0 ? validUnits : units.filter((u) => u.code === draft.unit);
```

- [ ] **Step 5: Replace the static unit label with a real `<select>` in the panel**

Find:

```tsx
                <div>
                  <div className="w-full px-3 py-2 bg-background/50 text-sm text-muted-foreground font-medium flex items-center h-full">
                    {units.find((u) => u.code === draft.unit)?.name_fr ?? draft.unit}
                  </div>
                </div>
```

Replace with:

```tsx
                <div>
                  <select
                    value={draft.unit}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, unit: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {unitOptions.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name_fr}
                      </option>
                    ))}
                  </select>
                </div>
```

- [ ] **Step 6: Switch the panel's heading, save button, and visibility condition between add/edit modes**

Find:

```tsx
      {/* Add ingredient form */}
      {adding ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Ajouter un ingrédient
          </h3>
```

Replace with:

```tsx
      {/* Add / edit ingredient form */}
      {adding || editingId ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {editingId ? "Modifier l'ingrédient" : "Ajouter un ingrédient"}
          </h3>
```

Find the save/cancel buttons:

```tsx
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
```

Replace with:

```tsx
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.ingredient_id || !draft.quantity || !draft.unit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setEditingId(null);
                setDraft(EMPTY_DRAFT());
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
```

- [ ] **Step 7: Add the ✎ edit button to the desktop row**

Find the `SortableIngredientRow` props (both the type and the destructure):

```tsx
function SortableIngredientRow({
  ingredient,
  units,
  onRemove,
  onQuantityChange,
  onUnitChange,
  onOptionalChange,
  onSwapClick,
}: {
  ingredient: IngredientItem;
  units: MeasurementUnit[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, q: number) => void;
  onUnitChange: (id: string, u: string) => void;
  onOptionalChange: (id: string, v: boolean) => void;
  onSwapClick: (id: string) => void;
}) {
```

Replace with:

```tsx
function SortableIngredientRow({
  ingredient,
  units,
  onRemove,
  onQuantityChange,
  onUnitChange,
  onOptionalChange,
  onSwapClick,
  onEditClick,
}: {
  ingredient: IngredientItem;
  units: MeasurementUnit[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, q: number) => void;
  onUnitChange: (id: string, u: string) => void;
  onOptionalChange: (id: string, v: boolean) => void;
  onSwapClick: (id: string) => void;
  onEditClick: (ingredient: IngredientItem) => void;
}) {
```

Find the swap/remove buttons at the end of the row:

```tsx
      <button
        type="button"
        onClick={() => onSwapClick(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-primary relative"
        title="Alternatives"
      >
        ⇄
        {ingredient.swappable_ingredients?.length ? (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
            {ingredient.swappable_ingredients.length}
          </span>
        ) : null}
      </button>
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

Replace with:

```tsx
      <button
        type="button"
        onClick={() => onSwapClick(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-primary relative"
        title="Alternatives"
      >
        ⇄
        {ingredient.swappable_ingredients?.length ? (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
            {ingredient.swappable_ingredients.length}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onEditClick(ingredient)}
        className="p-1 text-muted-foreground hover:text-primary"
        title="Modifier"
        aria-label="Modifier l'ingrédient"
      >
        ✎
      </button>
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

Now find where `SortableIngredientRow` is instantiated and pass the new prop:

```tsx
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
                        onSwapClick={setSwappingForId}
                      />
```

Replace with:

```tsx
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
                        onSwapClick={setSwappingForId}
                        onEditClick={startEdit}
                      />
```

- [ ] **Step 8: Add the ✎ edit button to the mobile row**

Find:

```tsx
                  <button
                    type="button"
                    onClick={() => setSwappingForId(ing.id)}
                    className="p-1 text-muted-foreground hover:text-primary relative"
                    title="Alternatives"
                  >
                    ⇄
                    {ing.swappable_ingredients?.length ? (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
                        {ing.swappable_ingredients.length}
                      </span>
                    ) : null}
                  </button>
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
```

Replace with:

```tsx
                  <button
                    type="button"
                    onClick={() => setSwappingForId(ing.id)}
                    className="p-1 text-muted-foreground hover:text-primary relative"
                    title="Alternatives"
                  >
                    ⇄
                    {ing.swappable_ingredients?.length ? (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
                        {ing.swappable_ingredients.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(ing)}
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Modifier"
                    aria-label="Modifier l'ingrédient"
                  >
                    ✎
                  </button>
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
```

- [ ] **Step 9: Hide the "+ Ajouter" / "+ Section" trigger row while editing**

Find:

```tsx
      {/* Add / edit ingredient form */}
      {adding || editingId ? (
```

Confirm the matching `else` branch (the trigger buttons block, unchanged in content) is:

```tsx
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
```

No change needed here — the `adding || editingId` condition from Step 6 already governs this `else` branch, so the trigger buttons are automatically hidden while a row is being edited.

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by `Step2Ingredients.tsx` or `RecipeWizard.tsx`.

- [ ] **Step 11: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the 8 new ones from Task 1.

- [ ] **Step 12: Manual verification on the dev server**

Run: `npm run dev`, then in the browser, navigate to `/dashboard/recipes/new` (creator auth required) and go to Step 2:

1. Add an ingredient (e.g. search "tomate", pick it, quantity 2) — confirm it appears in the list.
2. Click ✎ on it, change only the quantity to 5, click "Enregistrer" — confirm the row updates in place at the same position in the list.
3. Click ✎ again, change the unit via the new dropdown, save — confirm the new unit persists and displays correctly.
4. Click ⇄ on the row first and add a swap alternative, then click ✎, search for and select a **different** ingredient entirely, save — confirm the row now shows the new ingredient and its default unit, and that the swap alternative added earlier is still present (check via ⇄ again).
5. Advance to Step 4 (Nutrition) and confirm the macro totals reflect the edited row's final ingredient/quantity/unit.
6. Resize the browser to a narrow/mobile viewport, repeat steps 2–3 there to confirm the ✎ button and panel work in the mobile layout too.
7. Confirm clicking "+ Ajouter un ingrédient" while a row is mid-edit is not possible (the trigger buttons are hidden), and that clicking "Annuler" while editing discards the in-progress edit and restores the trigger buttons.

- [ ] **Step 13: Commit**

```bash
git add components/creator/recipe-form/RecipeWizard.tsx components/creator/recipe-form/Step2Ingredients.tsx
git commit -m "feat: allow editing an already-added ingredient in place in the recipe wizard"
```

---

## Self-Review Notes

- **Spec coverage:** Data flow (unitConversions prop) → Task 2 Step 1–2. Valid-units helper → Task 1. State/interaction (editingId, panel mode switch, save branching, carried-over swappable_ingredients) → Task 2 Steps 3, 6. Unit picker in both modes → Task 2 Steps 4–5 (applies to the shared panel, so both add and edit get it). Row-level ✎ buttons, desktop + mobile → Task 2 Steps 7–8. No new modal, section headers untouched → not modified anywhere in this plan. Verification checklist → Task 2 Step 12, mirrors the spec's verification section exactly.
- **Placeholder scan:** none found.
- **Type consistency:** `getValidUnitsForIngredient` and `replaceIngredientInList` signatures match between Task 1's implementation and Task 2's call sites. `startEdit` and `handleSave` names are used consistently wherever referenced (row instantiation, mobile `onClick`, panel buttons).
