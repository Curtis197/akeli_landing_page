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
    content: s.content,
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
      // Only the first resulting step keeps the original's photo/ingredient tags —
      // a split has no way to know which of the N new steps they belong to.
      const original = !step.is_section_header ? step : undefined;
      proposal.suggested.forEach((s, i) => {
        // Gemini is prompted to keep title/content mutually exclusive per
        // is_section_header, but its output isn't guaranteed to honor that.
        // Building a genuinely different object shape per branch (rather than one
        // object with conditional field values) makes a mixed result impossible
        // regardless of what Gemini returned.
        result.push(
          s.is_section_header
            ? {
                id: crypto.randomUUID(),
                step_number: 0,
                sort_order: 0,
                is_section_header: true,
                title: s.title ?? "",
              }
            : {
                id: crypto.randomUUID(),
                step_number: 0,
                sort_order: 0,
                is_section_header: false,
                content: s.content ?? "",
                image_url: i === 0 ? original?.image_url : undefined,
                timer_seconds: s.timer_seconds ?? undefined,
                ingredient_ids: i === 0 ? original?.ingredient_ids ?? [] : [],
              }
        );
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
