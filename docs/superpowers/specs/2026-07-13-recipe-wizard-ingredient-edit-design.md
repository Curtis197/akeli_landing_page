# Recipe Wizard — Edit Added Ingredients In Place

**Date:** 2026-07-13
**Status:** Approved

## Problem

In Step 2 (Ingrédients) of the recipe wizard (`components/creator/recipe-form/Step2Ingredients.tsx`), once an ingredient row has been added to the list, a creator can only:

- adjust quantity
- toggle "optionnel"
- manage swap alternatives (⇄)
- reorder (drag or up/down)
- remove (✕)

To change *which* ingredient a row refers to, or its unit, the only option today is delete-and-re-add — which loses the row's position in the list and its swap alternatives. The unit field itself is not manually editable anywhere, even in the "add" panel: it's a read-only `<div>` auto-filled from the selected ingredient's `default_metric_unit` / `default_us_unit`.

Section headers are unaffected by this problem — they already support inline-editable titles via `SectionHeaderRow`.

## Goal

Let a creator click an already-added ingredient row and edit its ingredient selection, quantity, and unit in place, without losing its position or its swap alternatives. As part of the same change, make the unit field a real picker (currently it's never selectable, even when adding a new ingredient) restricted to units that have a valid gram-conversion for that ingredient, so Step 4's macro calculation keeps working.

## Non-goals

- Editing the underlying `ingredient` catalog entries (name translations, category, nutrition per 100g) — out of scope for this change.
- Editing section headers beyond their existing inline title edit.
- Confirmation dialogs for discarding unsaved edits — none of the surrounding UI has them (remove has none), so this feature doesn't introduce one either.

## Design

### Data flow

- `RecipeWizard.tsx` already fetches `unitConversions` via `fetchUnitConversions()` for Step 4. Pass it down as a new prop to `Step2Ingredients`.
- New helper in `Step2Ingredients.tsx`:

  ```ts
  function getValidUnitsForIngredient(
    ingredientId: string,
    units: MeasurementUnit[],
    conversions: UnitConversion[]
  ): MeasurementUnit[]
  ```

  Filters `units` down to codes present in `conversions` where `ingredient_id === ingredientId` (ingredient-specific override) or `ingredient_id === null` (generic unit, e.g. g/kg/ml/tbsp). If the result is empty (legacy ingredient with no conversion rows at all), fall back to a single-item list containing just the ingredient's current unit, so the dropdown is never empty/broken.

### State

- New state in `Step2Ingredients`: `editingId: string | null`.
- The existing `adding: boolean` state is kept. The inline panel (the block currently gated on `adding`) is now gated on `adding || editingId !== null`.
- Only one of `adding` / `editingId` is active at a time — opening one clears the other, and resets `draft`.

### Interaction

- New ✎ ("Modifier") icon button on each non-section row, both the desktop `SortableIngredientRow` and the mobile `<li>` variant, placed alongside the existing ⇄ (swap) and ✕ (remove) buttons.
- Clicking ✎ on a row:
  - sets `editingId` to that row's `id`
  - sets `adding = false`
  - populates `draft` from that row's current fields: `ingredient_id`, `name`, `quantity`, `unit`, `is_optional`, `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, and — importantly — `swappable_ingredients`, so they round-trip through the save unchanged unless the user explicitly touches them via the separate swap modal.
- Clicking ✎ on a different row while one is already being edited simply re-targets `editingId` and repopulates `draft` from the newly clicked row (no confirmation, no special-case merge).
- The inline panel's heading and submit button label switch based on mode:
  - Add: "Ajouter un ingrédient" / "Ajouter"
  - Edit: "Modifier l'ingrédient" / "Enregistrer"
- The panel's ingredient search (`IngredientSearch`) works the same in both modes — in edit mode the currently-selected ingredient is shown via the existing "✓ {draft.name}" line without forcing a re-search; the creator can optionally search again to swap the underlying ingredient entirely, which re-runs `handleIngredientSelect` and refreshes `draft.unit` / macro fields from the newly picked ingredient's defaults.
- The static unit `<div>` in the panel becomes a `<select>` sourced from `getValidUnitsForIngredient(draft.ingredient_id, units, unitConversions)`. This applies in **both** add and edit mode, since it's the same panel — this also closes the pre-existing gap where units were never manually pickable at all.
- Save (`handleAdd`, effectively renamed in behavior to handle both cases):
  - Validates the same as today: `draft.ingredient_id && draft.quantity && draft.unit`.
  - If `editingId` is set: replace that item in `ingredients` in place — keep its original `id` and `sort_order`, take everything else from `draft` (including the carried-over `swappable_ingredients`).
  - Otherwise: append as today.
  - Either way, reset `adding = false`, `editingId = null`, `draft = EMPTY_DRAFT()`.
- Cancel button in the panel does the same reset without saving, in both modes.

### Out of scope for row-level UI

No new modal is introduced. The existing "Alternatives" swap modal (triggered by ⇄) is unaffected by this change other than continuing to read/write `swappable_ingredients` on whichever row is targeted.

## Verification

Manual pass on the dev server (`npm run dev`), in the recipe wizard Step 2:

1. Add an ingredient, confirm it appears in the list.
2. Click ✎ on it, change only the quantity, save — confirm the row updates in place at the same position.
3. Click ✎ again, change the unit via the new dropdown, save — confirm it persists.
4. Click ✎ again, search for and select a **different** ingredient entirely, save — confirm the row now reflects the new ingredient, its default unit, and that previously-set swap alternatives (added beforehand via ⇄) are still present.
5. Advance to Step 4 (Nutrition) and confirm the macro totals reflect the edited row's final ingredient/quantity/unit.
6. Repeat steps 2–3 on the mobile layout (narrow viewport) to confirm the ✎ button and panel work there too.
