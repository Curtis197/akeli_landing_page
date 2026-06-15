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
    fiber_g: 0,
    total_weight_g: Math.round(totalWeight / s),
    missing_data_count: missing,
  };
}
