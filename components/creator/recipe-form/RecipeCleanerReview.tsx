// components/creator/recipe-form/RecipeCleanerReview.tsx
"use client";

import { useEffect, useState } from "react";
import { previewRecipeClean, applyRecipeClean } from "@/lib/edge-functions";
import type { PreviewRecipeCleanResult } from "@/lib/edge-functions";
import { createClient } from "@/lib/supabase/client";
import { resolveCleanedSteps } from "@/lib/utils/recipe-cleaner-resolve";
import type { StepItem } from "@/lib/validations/recipe.schema";

// The edge function answers with a categorized error code, not a display string.
// Map the known codes to French; anything unmapped falls through as-is.
const ERROR_MESSAGES: Record<string, string> = {
  rate_limit_exceeded: "Tu as atteint la limite quotidienne d'analyses IA. Réessaie demain.",
  gemini_failed: "Le service IA est temporairement indisponible. Réessaie dans quelques instants.",
  invalid_ai_output: "L'IA a renvoyé une réponse invalide. Réessaie.",
  db_failed: "Échec de l'enregistrement. Réessaie.",
  invalid_mode: "Erreur interne. Réessaie.",
  Unauthorized: "Session expirée. Reconnecte-toi.",
  "Creator account not found": "Compte créateur introuvable.",
  "Recipe not found": "Recette introuvable.",
};

function toFrenchError(message: string | undefined): string {
  if (!message) return "Une erreur est survenue.";
  return ERROR_MESSAGES[message] ?? message;
}

interface RecipeCleanerReviewProps {
  recipeId: string;
  currentTitle: string;
  currentDescription: string;
  onApplied: (result: { title: string; description: string; steps: StepItem[] }) => void;
  onClose: () => void;
}

export default function RecipeCleanerReview({
  recipeId,
  currentTitle,
  currentDescription,
  onApplied,
  onClose,
}: RecipeCleanerReviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRecipeCleanResult | null>(null);
  // The steps as they exist in the DB right now — the same rows preview read, so its
  // step_id/after_step_id references actually resolve. The wizard's in-memory steps
  // can't be used here: replace_recipe_steps regenerates every step id on each save,
  // so the ids held in React state are already stale by the time preview runs.
  const [dbSteps, setDbSteps] = useState<StepItem[] | null>(null);

  const [acceptTitle, setAcceptTitle] = useState(true);
  const [acceptDescription, setAcceptDescription] = useState(true);
  const [acceptedStepProposalIds, setAcceptedStepProposalIds] = useState<Set<string>>(new Set());
  const [acceptedNewStepIndexes, setAcceptedNewStepIndexes] = useState<Set<number>>(new Set());

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    Promise.all([
      previewRecipeClean(recipeId),
      supabase
        .from("recipe_step")
        .select(
          "id, step_number, sort_order, title, content, image_url, timer_seconds, is_section_header, ingredient_ids"
        )
        .eq("recipe_id", recipeId)
        .order("sort_order", { ascending: true }),
    ])
      .then(([previewResult, stepsResult]) => {
        if (cancelled) return;
        if (stepsResult.error) throw stepsResult.error;
        setPreview(previewResult);
        setDbSteps(
          (stepsResult.data ?? []).map((s) => ({
            id: s.id,
            step_number: s.step_number,
            sort_order: s.sort_order,
            title: s.title ?? undefined,
            content: s.content ?? undefined,
            image_url: s.image_url ?? undefined,
            timer_seconds: s.timer_seconds ?? undefined,
            is_section_header: s.is_section_header,
            ingredient_ids: s.ingredient_ids ?? [],
          }))
        );
        // Corrections default accepted; insertions (new content the creator didn't
        // write) default rejected — the creator opts in explicitly to anything new.
        setAcceptedStepProposalIds(new Set(previewResult.step_proposals.map((p) => p.step_id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toFrenchError(err?.message));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const toggleStepProposal = (stepId: string) => {
    setAcceptedStepProposalIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const toggleNewStep = (index: number) => {
    setAcceptedNewStepIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // An evaluation-only result (e.g. just an ordering note) is still a finding —
  // it must not be swallowed by the "rien à corriger" branch.
  const hasEvaluationNotes =
    !!preview && !!(preview.evaluation.ordering_issues || preview.evaluation.general_observations);

  const hasNoSuggestions =
    !!preview &&
    !preview.title_suggestion &&
    !preview.description_suggestion &&
    preview.step_proposals.length === 0 &&
    preview.new_step_suggestions.length === 0 &&
    !hasEvaluationNotes;

  const handleApply = async () => {
    if (!preview || !dbSteps) return;
    setApplying(true);
    setApplyError(null);
    try {
      const finalTitle =
        acceptTitle && preview.title_suggestion ? preview.title_suggestion.suggested : currentTitle;
      const finalDescription =
        acceptDescription && preview.description_suggestion
          ? preview.description_suggestion.suggested
          : currentDescription;
      const finalSteps = resolveCleanedSteps(
        dbSteps,
        preview.step_proposals,
        preview.new_step_suggestions,
        { acceptedStepProposalIds, acceptedNewStepIndexes }
      );

      const result = await applyRecipeClean(recipeId, {
        title: finalTitle,
        description: finalDescription || null,
        steps: finalSteps.map((s) => ({
          step_number: s.step_number,
          sort_order: s.sort_order,
          title: s.title ?? null,
          content: s.content ?? null,
          image_url: s.image_url ?? null,
          timer_seconds: s.timer_seconds ?? null,
          is_section_header: s.is_section_header,
          ingredient_ids: s.ingredient_ids ?? [],
        })),
      });

      if (result.title_description_error) {
        setApplyError(
          "Les étapes ont été mises à jour, mais le titre/description n'a pas pu être sauvegardé. Réessaie."
        );
        // Steps already persisted server-side (that's what this partial-failure response
        // means) — sync them into the wizard's local state so a later save from stale
        // in-memory steps can't silently overwrite/revert what was just saved. Title and
        // description did NOT persist, so report the original unchanged values for those,
        // not finalTitle/finalDescription. Keep the modal open (no onClose()) so the
        // creator can retry — re-applying is idempotent on the steps side.
        onApplied({ title: currentTitle, description: currentDescription, steps: finalSteps });
        return;
      }

      onApplied({ title: finalTitle, description: finalDescription, steps: finalSteps });
      onClose();
    } catch (err: any) {
      setApplyError(toFrenchError(err?.message));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            ✨ Standardiser avec l&apos;IA
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Analyse de la recette en cours...</p>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={onClose} className="text-sm text-primary underline">
              Fermer
            </button>
          </div>
        )}

        {!loading && !error && preview && hasNoSuggestions && (
          <p className="text-sm text-muted-foreground">
            Rien à corriger — ta recette est déjà bien standardisée !
          </p>
        )}

        {!loading && !error && preview && dbSteps && !hasNoSuggestions && (
          <div className="space-y-4">
            {preview.title_suggestion && (
              <SuggestionCard
                label="Titre"
                original={currentTitle}
                suggested={preview.title_suggestion.suggested}
                reason={preview.title_suggestion.reason}
                accepted={acceptTitle}
                onToggle={() => setAcceptTitle((v) => !v)}
              />
            )}

            {preview.description_suggestion && (
              <SuggestionCard
                label="Description"
                original={currentDescription}
                suggested={preview.description_suggestion.suggested}
                reason={preview.description_suggestion.reason}
                accepted={acceptDescription}
                onToggle={() => setAcceptDescription((v) => !v)}
              />
            )}

            {preview.step_proposals.map((proposal) => {
              const original = dbSteps.find((s) => s.id === proposal.step_id);
              return (
                <SuggestionCard
                  key={proposal.step_id}
                  label={proposal.change_type === "split" ? "Étape (à diviser)" : "Étape"}
                  original={original?.content ?? ""}
                  suggested={proposal.suggested.map((s) => s.content).filter(Boolean).join(" / ")}
                  reason={proposal.reason}
                  accepted={acceptedStepProposalIds.has(proposal.step_id)}
                  onToggle={() => toggleStepProposal(proposal.step_id)}
                />
              );
            })}

            {preview.new_step_suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={`new-${index}`}
                label="+ Nouvelle étape"
                original={null}
                suggested={suggestion.content}
                reason={suggestion.reason}
                accepted={acceptedNewStepIndexes.has(index)}
                onToggle={() => toggleNewStep(index)}
              />
            ))}

            {(preview.evaluation.ordering_issues || preview.evaluation.general_observations) && (
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Observations de l&apos;IA</p>
                {preview.evaluation.ordering_issues && (
                  <p className="text-xs text-muted-foreground">
                    Ordre des étapes : {preview.evaluation.ordering_issues}
                  </p>
                )}
                {preview.evaluation.general_observations && (
                  <p className="text-xs text-muted-foreground">
                    {preview.evaluation.general_observations}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {applyError && <p className="text-sm text-destructive">{applyError}</p>}

        {!loading && !error && preview && dbSteps && !hasNoSuggestions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {applying ? "Application..." : "Appliquer la sélection"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  label,
  original,
  suggested,
  reason,
  accepted,
  onToggle,
}: {
  label: string;
  original: string | null;
  suggested: string;
  reason: string | null;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {original !== null && (
            <p className="text-sm text-muted-foreground line-through">{original}</p>
          )}
          <p className="text-sm text-foreground">{suggested}</p>
          {reason && <p className="text-xs text-muted-foreground italic">{reason}</p>}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-foreground shrink-0">
          <input
            type="checkbox"
            checked={accepted}
            onChange={onToggle}
            className="rounded border-input"
          />
          Accepter
        </label>
      </div>
    </div>
  );
}
