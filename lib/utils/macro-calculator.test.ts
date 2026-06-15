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
