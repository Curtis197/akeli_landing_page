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
