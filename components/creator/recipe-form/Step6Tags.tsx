"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipeFormState } from "./RecipeWizard";

interface Step6Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

export default function Step6Tags({
  data,
  onChange,
  onSaveDraft,
  onPublish,
  isPublishing,
}: Step6Props) {
  const supabase = createClient();
  const [availableTags, setAvailableTags] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    supabase
      .from("tag")
      .select("id, name_fr, name")
      .order("name_fr")
      .then(({ data, error }) => {
        if (error) console.error("[Step6Tags] tag fetch error", error);
        if (data) setAvailableTags(data.map((t: { id: string; name_fr: string; name: string }) => ({
          id: t.id,
          label: t.name_fr ?? t.name,
        })));
      });
  }, [supabase]);

  const toggleTag = (id: string) => {
    const current = data.tags;
    if (current.includes(id)) {
      onChange({ tags: current.filter((t) => t !== id) });
    } else if (current.length < 8) {
      onChange({ tags: [...current, id] });
    }
  };

  // Quick validation summary
  const missing: string[] = [];
  if (!data.title || data.title.length < 3) missing.push("Titre");
  if (!data.region) missing.push("Région");
  if (!data.meal_types.length) missing.push("Type de repas");
  if (!data.difficulty) missing.push("Difficulté");
  if (data.ingredients.length < 3) missing.push("Ingrédients (min 3)");
  if (data.steps.length < 3) missing.push("Étapes (min 3)");
  if (!data.cover_image_url) missing.push("Photo de couverture");

  const canPublish = missing.length === 0;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Tags & Publication</h2>

      {/* Tags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Tags</label>
          <span className="text-xs text-muted-foreground">{data.tags.length}/8</span>
        </div>

        {availableTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableTags.map(({ id, label }) => {
              const selected = data.tags.includes(id);
              const disabled = !selected && data.tags.length >= 8;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTag(id)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : disabled
                      ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chargement des tags...</p>
        )}
      </div>

      {/* Pork free */}
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
        <input
          type="checkbox"
          checked={data.is_pork_free}
          onChange={(e) => onChange({ is_pork_free: e.target.checked })}
          className="rounded border-input accent-primary w-4 h-4"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Sans porc</p>
          <p className="text-xs text-muted-foreground">
            Cette recette ne contient aucun produit à base de porc.
          </p>
        </div>
      </label>

      {/* Recipe preview card */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-3 bg-secondary/30 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Aperçu de la recette
          </p>
        </div>
        <div className="p-4 space-y-2">
          {data.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.cover_image_url}
              alt="Couverture"
              className="w-full aspect-video object-cover rounded-lg mb-3"
            />
          )}
          <h3 className="font-semibold text-foreground">
            {data.title || <span className="text-muted-foreground italic">Sans titre</span>}
          </h3>
          {data.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
            {data.difficulty && (
              <span className="px-2 py-0.5 rounded-full bg-secondary border border-border capitalize">
                {data.difficulty === "easy" ? "Facile" : data.difficulty === "medium" ? "Moyen" : "Difficile"}
              </span>
            )}
            {data.prep_time_min > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">
                ⏱ {data.prep_time_min} min
              </span>
            )}
            {data.servings > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">
                🍽 {data.servings} pers.
              </span>
            )}
            {data.is_pork_free && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Sans porc
              </span>
            )}
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {data.tags.map((tagId) => {
                const label = availableTags.find((t) => t.id === tagId)?.label ?? tagId;
                return (
                  <span key={tagId} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    #{label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Validation errors */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">
            Complète ces éléments avant de publier :
          </p>
          <ul className="space-y-1">
            {missing.map((m) => (
              <li key={m} className="text-xs text-destructive flex items-center gap-1.5">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isPublishing}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          💾 Sauvegarder le brouillon
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? "Publication..." : "🚀 Publier la recette"}
        </button>
      </div>
    </div>
  );
}
