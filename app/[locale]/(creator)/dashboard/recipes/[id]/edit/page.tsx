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
      const { data, error: err } = await supabase
        .from("recipe")
        .select(`
          id, title, description, region, meal_types, difficulty,
          prep_time_min, cook_time_min, servings,
          cover_image_url, gallery_urls, is_pork_free,
          recipe_ingredient ( id, ingredient_id, name_fr, quantity, unit, is_optional, sort_order ),
          recipe_step ( id, content, sort_order ),
          recipe_macro ( calories, protein_g, carbs_g, fat_g, fiber_g, is_auto ),
          recipe_tag ( tag_id )
        `)
        .eq("id", id)
        .single();

      if (err || !data) {
        setError("Recette introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

      const macro = Array.isArray(data.recipe_macro)
        ? data.recipe_macro[0]
        : data.recipe_macro;

      const mapped: Partial<RecipeFormState> = {
        title: data.title ?? "",
        description: (data as any).description ?? "",
        region: data.region ?? "",
        meal_types: (data.meal_types as string[]) ?? [],
        difficulty: (data.difficulty as RecipeFormState["difficulty"]) ?? "",
        prep_time_min: data.prep_time_min ?? 30,
        cook_time_min: data.cook_time_min ?? 0,
        servings: data.servings ?? 4,
        ingredients: ((data as any).recipe_ingredient ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((ing: any) => ({
            id: ing.id,
            ingredient_id: ing.ingredient_id,
            name: ing.name_fr ?? "",
            quantity: ing.quantity,
            unit: ing.unit,
            is_optional: ing.is_optional ?? false,
            sort_order: ing.sort_order,
          })),
        steps: ((data as any).recipe_step ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            id: s.id,
            content: s.content,
            sort_order: s.sort_order,
          })),
        calories: macro?.calories ?? undefined,
        protein_g: macro?.protein_g ?? undefined,
        carbs_g: macro?.carbs_g ?? undefined,
        fat_g: macro?.fat_g ?? undefined,
        fiber_g: macro?.fiber_g ?? undefined,
        macros_skipped: !macro,
        cover_image_url: data.cover_image_url ?? "",
        gallery_urls: (data.gallery_urls as string[]) ?? [],
        tags: ((data as any).recipe_tag ?? []).map((t: any) => t.tag_id),
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
