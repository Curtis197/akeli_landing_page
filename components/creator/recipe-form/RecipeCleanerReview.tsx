// components/creator/recipe-form/RecipeCleanerReview.tsx
"use client";

import { useEffect, useState } from "react";
import { previewRecipeClean, applyRecipeClean } from "@/lib/edge-functions";
import type { PreviewRecipeCleanResult } from "@/lib/edge-functions";
import { resolveCleanedSteps } from "@/lib/utils/recipe-cleaner-resolve";
import type { StepItem } from "@/lib/validations/recipe.schema";

interface RecipeCleanerReviewProps {
  recipeId: string;
  currentTitle: string;
  currentDescription: string;
  currentSteps: StepItem[];
  onApplied: (result: { title: string; description: string; steps: StepItem[] }) => void;
  onClose: () => void;
}

export default function RecipeCleanerReview({
  recipeId,
  currentTitle,
  currentDescription,
  currentSteps,
  onApplied,
  onClose,
}: RecipeCleanerReviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRecipeCleanResult | null>(null);

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
    previewRecipeClean(recipeId)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        // Corrections default accepted; insertions (new content the creator didn't
        // write) default rejected — the creator opts in explicitly to anything new.
        setAcceptedStepProposalIds(new Set(result.step_proposals.map((p) => p.step_id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Erreur lors de l'analyse IA");
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

  const hasNoSuggestions =
    !!preview &&
    !preview.title_suggestion &&
    !preview.description_suggestion &&
    preview.step_proposals.length === 0 &&
    preview.new_step_suggestions.length === 0;

  const handleApply = async () => {
    if (!preview) return;
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
        currentSteps,
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
        return;
      }

      onApplied({ title: finalTitle, description: finalDescription, steps: finalSteps });
      onClose();
    } catch (err: any) {
      setApplyError(err?.message ?? "Échec de l'application des corrections");
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

        {!loading && !error && preview && !hasNoSuggestions && (
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
              const original = currentSteps.find((s) => s.id === proposal.step_id);
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

        {!loading && !error && preview && !hasNoSuggestions && (
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
