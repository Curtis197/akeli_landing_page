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
