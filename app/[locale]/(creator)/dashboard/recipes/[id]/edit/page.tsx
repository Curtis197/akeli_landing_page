"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RecipeWizard from "@/components/creator/recipe-form/RecipeWizard";
import type { RecipeFormState } from "@/components/creator/recipe-form/RecipeWizard";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [initialData, setInitialData] = useState<Partial<RecipeFormState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadRecipe() {
      // draft_data stores the complete wizard form state — use it as the primary source
      const { data, error: err } = await supabase
        .from("recipe")
        .select("id, title, description, region, difficulty, prep_time_min, cook_time_min, servings, cover_image_url, is_pork_free, draft_data")
        .eq("id", id)
        .single();

      if (err || !data) {
        setError("Recette introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

      // If draft_data exists, it is the canonical form state
      if (data.draft_data) {
        const draft = data.draft_data as Partial<RecipeFormState>;
        // Sanitize ingredients: drop items saved in old free-text format (no ingredient.id/name)
        if (draft.ingredients) {
          draft.ingredients = draft.ingredients.filter((item) => {
            if (item.is_section_header) return true;
            return item.ingredient && typeof (item.ingredient as any).name === "string";
          });
        }
        setInitialData(draft);
        setLoading(false);
        return;
      }

      // Fallback: reconstruct from direct columns (for recipes without draft_data)
      const mapped: Partial<RecipeFormState> = {
        title: data.title ?? "",
        description: (data as any).description ?? "",
        region: data.region ?? "",
        meal_types: [],
        difficulty: (data.difficulty as RecipeFormState["difficulty"]) ?? "",
        prep_time_min: data.prep_time_min ?? 30,
        cook_time_min: data.cook_time_min ?? 0,
        servings: data.servings ?? 4,
        ingredients: [],
        steps: [],
        macros_skipped: true,
        cover_image_url: data.cover_image_url ?? "",
        gallery_urls: [],
        tags: [],
        is_pork_free: data.is_pork_free ?? false,
      };

      setInitialData(mapped);
      setLoading(false);
    }

    loadRecipe();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-foreground font-medium">{error ?? "Erreur inconnue"}</p>
        <a href="/dashboard/recipes" className="text-sm text-primary hover:underline">
          ← Retour à mes recettes
        </a>
      </div>
    );
  }

  return (
    <main className="py-6 px-4 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <a
          href="/dashboard/recipes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Mes recettes
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold text-foreground truncate">
          Éditer — {initialData.title || "Sans titre"}
        </h1>
      </div>
      <RecipeWizard recipeId={id} initialData={initialData} />
    </main>
  );
}
