import type { StepItem } from "@/lib/validations/recipe.schema";
import type { RecipeCleanStepProposal, RecipeCleanNewStepSuggestion } from "@/lib/edge-functions";

export interface ResolveDecisions {
  acceptedStepProposalIds: Set<string>;
  acceptedNewStepIndexes: Set<number>;
}

export function resolveCleanedSteps(
  currentSteps: StepItem[],
  stepProposals: RecipeCleanStepProposal[],
  newStepSuggestions: RecipeCleanNewStepSuggestion[],
  decisions: ResolveDecisions
): StepItem[] {
  const proposalByStepId = new Map(stepProposals.map((p) => [p.step_id, p]));

  const newStepsAfter = new Map<string | null, RecipeCleanNewStepSuggestion[]>();
  newStepSuggestions.forEach((suggestion, index) => {
    if (!decisions.acceptedNewStepIndexes.has(index)) return;
    const key = suggestion.after_step_id;
    const list = newStepsAfter.get(key) ?? [];
    list.push(suggestion);
    newStepsAfter.set(key, list);
  });

  const newStepFromSuggestion = (s: RecipeCleanNewStepSuggestion): StepItem => ({
    id: crypto.randomUUID(),
    step_number: 0,
    sort_order: 0,
    title: undefined,
    content: s.content,
    image_url: undefined,
    timer_seconds: undefined,
    is_section_header: false,
    ingredient_ids: [],
  });

  const result: StepItem[] = [];

  for (const suggestion of newStepsAfter.get(null) ?? []) {
    result.push(newStepFromSuggestion(suggestion));
  }

  for (const step of currentSteps) {
    const proposal = proposalByStepId.get(step.id);
    if (proposal && decisions.acceptedStepProposalIds.has(step.id)) {
      proposal.suggested.forEach((s, i) => {
        result.push({
          id: crypto.randomUUID(),
          step_number: 0,
          sort_order: 0,
          title: s.title ?? undefined,
          content: s.content ?? undefined,
          // Only the first resulting step keeps the original's photo/ingredient tags —
          // a split has no way to know which of the N new steps the photo belongs to.
          image_url: i === 0 ? step.image_url : undefined,
          timer_seconds: s.timer_seconds ?? undefined,
          is_section_header: s.is_section_header,
          ingredient_ids: i === 0 ? step.ingredient_ids : [],
        });
      });
    } else {
      result.push(step);
    }

    for (const suggestion of newStepsAfter.get(step.id) ?? []) {
      result.push(newStepFromSuggestion(suggestion));
    }
  }

  // Renumber, mirroring Step3Steps.tsx's updateSteps.
  let stepNum = 0;
  return result.map((s, i) => {
    if (!s.is_section_header) stepNum++;
    return { ...s, sort_order: i, step_number: s.is_section_header ? 0 : stepNum };
  });
}
