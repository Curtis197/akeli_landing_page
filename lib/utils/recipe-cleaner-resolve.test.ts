import { describe, it, expect } from "vitest";
import { resolveCleanedSteps } from "./recipe-cleaner-resolve";
import type { RecipeCleanStepProposal, RecipeCleanNewStepSuggestion } from "@/lib/edge-functions";
import type { StepItem } from "@/lib/validations/recipe.schema";

const baseSteps: StepItem[] = [
  { id: "s1", step_number: 1, content: "Laver et couper les légumes.", sort_order: 0, is_section_header: false, ingredient_ids: [] },
  { id: "s2", step_number: 2, content: "Faire chauffer l'huile.", sort_order: 1, is_section_header: false, ingredient_ids: [] },
  { id: "s3", step_number: 3, content: "Ajouter le poulet.", sort_order: 2, is_section_header: false, ingredient_ids: [] },
];

describe("resolveCleanedSteps", () => {
  it("returns the original steps unchanged when nothing is accepted", () => {
    const proposals: RecipeCleanStepProposal[] = [
      { step_id: "s1", change_type: "reworded", suggested: [{ title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false }], reason: "typo" },
    ];
    const result = resolveCleanedSteps(baseSteps, proposals, [], {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toEqual(baseSteps);
  });

  it("replaces a step's content when its proposal is accepted, carrying over its photo", () => {
    const stepsWithPhoto: StepItem[] = [
      { ...baseSteps[0], image_url: "https://example.com/s1.jpg" },
      baseSteps[1],
      baseSteps[2],
    ];
    const proposals: RecipeCleanStepProposal[] = [
      { step_id: "s1", change_type: "reworded", suggested: [{ title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false }], reason: "typo" },
    ];
    const result = resolveCleanedSteps(stepsWithPhoto, proposals, [], {
      acceptedStepProposalIds: new Set(["s1"]),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(3);
    expect(result[0].content).toBe("Laver les légumes.");
    expect(result[0].id).not.toBe("s1");
    expect(result[0].image_url).toBe("https://example.com/s1.jpg");
  });

  it("splits one step into two when a split proposal is accepted, keeping the photo on the first", () => {
    const stepsWithPhoto: StepItem[] = [
      { ...baseSteps[0], image_url: "https://example.com/s1.jpg", ingredient_ids: ["ing1", "ing2"] },
      baseSteps[1],
      baseSteps[2],
    ];
    const proposals: RecipeCleanStepProposal[] = [
      {
        step_id: "s1",
        change_type: "split",
        suggested: [
          { title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false },
          { title: null, content: "Couper les légumes en dés.", timer_seconds: null, is_section_header: false },
        ],
        reason: "compound step",
      },
    ];
    const result = resolveCleanedSteps(stepsWithPhoto, proposals, [], {
      acceptedStepProposalIds: new Set(["s1"]),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.step_number)).toEqual([1, 2, 3, 4]);
    expect(result[0].content).toBe("Laver les légumes.");
    expect(result[0].image_url).toBe("https://example.com/s1.jpg");
    expect(result[0].ingredient_ids).toEqual(["ing1", "ing2"]);
    expect(result[1].content).toBe("Couper les légumes en dés.");
    expect(result[1].image_url).toBeUndefined();
    expect(result[1].ingredient_ids).toEqual([]);
  });

  it("inserts an accepted new-step suggestion after the given step", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: "s2", content: "Ajouter le piment.", reason: "ingredient piment never used" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set([0]),
    });

    expect(result).toHaveLength(4);
    expect(result[2].content).toBe("Ajouter le piment.");
    expect(result.map((s) => s.step_number)).toEqual([1, 2, 3, 4]);
  });

  it("inserts an accepted new-step suggestion at the start when after_step_id is null", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: null, content: "Préchauffer le four.", reason: "missing prep step" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set([0]),
    });

    expect(result[0].content).toBe("Préchauffer le four.");
    expect(result).toHaveLength(4);
  });

  it("ignores rejected new-step suggestions", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: "s1", content: "Ajouter le piment.", reason: "ingredient piment never used" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(3);
  });
});
