import { describe, it, expect } from "vitest";
import { step2Schema, step3Schema } from "@/lib/validations/recipe.schema";

const baseStep = {
  id: "s1",
  step_number: 1,
  content: "Faire chauffer l'huile dans une poêle.",
  sort_order: 0,
  is_section_header: false,
  ingredient_ids: [],
};

const makeSteps = (overrides: Partial<typeof baseStep>[]) =>
  overrides.map((o, i) => ({ ...baseStep, id: `s${i}`, sort_order: i, ...o }));

describe("step3Schema", () => {
  it("accepts three valid non-section steps", () => {
    const result = step3Schema.safeParse({
      steps: makeSteps([{}, {}, {}]),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a section header with a title", () => {
    const result = step3Schema.safeParse({
      steps: makeSteps([
        { is_section_header: true, title: "Préparation", content: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a section header with no title", () => {
    const result = step3Schema.safeParse({
      steps: makeSteps([
        { is_section_header: true, title: undefined, content: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a section header with a blank/whitespace-only title", () => {
    const result = step3Schema.safeParse({
      steps: makeSteps([
        { is_section_header: true, title: "   ", content: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(false);
  });

  it("still rejects fewer than 3 non-section steps", () => {
    const result = step3Schema.safeParse({
      steps: makeSteps([{}, {}]),
    });
    expect(result.success).toBe(false);
  });
});

const baseIngredient = {
  id: "i1",
  ingredient_id: "cat-1",
  sort_order: 0,
  is_section_header: false,
};

const makeIngredients = (overrides: Partial<typeof baseIngredient>[]) =>
  overrides.map((o, i) => ({ ...baseIngredient, id: `i${i}`, sort_order: i, ...o }));

describe("step2Schema", () => {
  it("accepts three valid non-section ingredients", () => {
    const result = step2Schema.safeParse({
      ingredients: makeIngredients([{}, {}, {}]),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a section header with a title", () => {
    const result = step2Schema.safeParse({
      ingredients: makeIngredients([
        { is_section_header: true, title: "Marinade", ingredient_id: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a section header with no title", () => {
    const result = step2Schema.safeParse({
      ingredients: makeIngredients([
        { is_section_header: true, title: undefined, ingredient_id: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a section header with a blank/whitespace-only title", () => {
    const result = step2Schema.safeParse({
      ingredients: makeIngredients([
        { is_section_header: true, title: "   ", ingredient_id: undefined },
        {},
        {},
        {},
      ]),
    });
    expect(result.success).toBe(false);
  });

  it("still rejects fewer than 3 non-section ingredients", () => {
    const result = step2Schema.safeParse({
      ingredients: makeIngredients([{}, {}]),
    });
    expect(result.success).toBe(false);
  });
});
