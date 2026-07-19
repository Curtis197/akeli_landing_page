// components/creator/recipe-form/StepCard.tsx
"use client";

import { useState, useRef } from "react";
import { uploadImage } from "@/lib/utils/upload-image";
import type { RecipeFormState } from "./RecipeWizard";

type StepItem = RecipeFormState["steps"][number];
type IngredientItem = RecipeFormState["ingredients"][number];

interface StepCardProps {
  step: StepItem;
  stepNumber: number;
  availableIngredients: IngredientItem[];
  draftId: string | null;
  onChange: (updated: StepItem) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function StepCard({
  step,
  stepNumber,
  availableIngredients,
  draftId,
  onChange,
  onRemove,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<StepItem>) =>
    onChange({ ...step, ...patch });

  const handleImageUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const id = draftId ?? crypto.randomUUID();
      const path = `step-images/${id}/${step.id}`;
      const url = await uploadImage(file, path);
      update({ image_url: url });
    } catch {
      setUploadError("Échec de l'upload. Réessaie.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
    }
  };

  const toggleIngredient = (ingredientId: string) => {
    const current = step.ingredient_ids ?? [];
    const updated = current.includes(ingredientId)
      ? current.filter((id) => id !== ingredientId)
      : [...current, ingredientId];
    update({ ingredient_ids: updated });
  };

  const timerMinutes = step.timer_seconds
    ? Math.round(step.timer_seconds / 60)
    : "";

  const nonSectionIngredients = availableIngredients.filter(
    (i) => !i.is_section_header
  );

  return (
    <li className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        {dragHandleProps ? (
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 hidden sm:block"
            aria-label="Réordonner"
          >
            ⠿
          </button>
        ) : (
          (onMoveUp || onMoveDown) && (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="p-0.5 text-muted-foreground disabled:opacity-50"
                aria-label="Remonter l'étape"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="p-0.5 text-muted-foreground disabled:opacity-50"
                aria-label="Descendre l'étape"
              >
                ▼
              </button>
            </div>
          )
        )}
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {stepNumber}
        </span>
        <p className="flex-1 text-sm text-foreground line-clamp-1">
          {step.content || (
            <span className="text-muted-foreground italic">
              Décris cette étape...
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary px-2 py-1 rounded hover:bg-primary/10 transition-colors"
        >
          {expanded ? "Réduire" : "Modifier"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          ✕
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-secondary/10">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-foreground">
              Titre (optionnel)
            </label>
            <input
              type="text"
              value={step.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Ex : Faire revenir les oignons"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-foreground">
              Instructions <span className="text-destructive">*</span>
            </label>
            <textarea
              value={step.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              rows={3}
              placeholder="Décris cette étape en détail..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Timer + Step image */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground">
                Minuteur (minutes, optionnel)
              </label>
              <input
                type="number"
                min={0}
                value={timerMinutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value, 10);
                  update({
                    timer_seconds: isNaN(mins) ? undefined : mins * 60,
                  });
                }}
                placeholder="Ex : 5"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-foreground">
                Photo de l'étape (optionnel)
              </label>
              <div className="mt-1">
                {step.image_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.image_url}
                      alt="Étape"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => update({ image_url: undefined })}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 text-destructive text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
                    >
                      {uploading ? "Envoi..." : "+ Photo"}
                    </button>
                  </>
                )}
                {uploadError && (
                  <p className="mt-1 text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Ingredients used in this step */}
          {nonSectionIngredients.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground">
                Ingrédients utilisés dans cette étape
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {nonSectionIngredients.map((ing) => {
                  const selected = step.ingredient_ids?.includes(
                    ing.ingredient_id ?? ""
                  );
                  return (
                    <button
                      key={ing.ingredient_id ?? ing.id}
                      type="button"
                      onClick={() => ing.ingredient_id && toggleIngredient(ing.ingredient_id)}
                      disabled={!ing.ingredient_id}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {ing.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
