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
          id, title, description, region, meal_types, preferred_meal_type,
          difficulty, prep_time_min, cook_time_min, servings,
          cover_image_url, is_pork_free, is_private, show_on_website, allergen_tags,
          recipe_ingredient (
            id, ingredient_id, quantity, unit, is_optional, sort_order,
            is_section_header, title,
            ingredient:ingredient_id ( name_fr, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
          ),
          recipe_step (
            id, step_number, title, content, image_url, timer_seconds,
            sort_order, is_section_header, ingredient_ids
          ),
          recipe_tag ( tag_id ),
          recipe_image ( url, sort_order )
        `)
        .eq("id", id)
        .single();

      if (err || !data) {
        setError("Recette introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

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
            is_section_header: ing.is_section_header ?? false,
            title: ing.title ?? undefined,
          })),
        steps: ((data as any).recipe_step ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            id: s.id,
            step_number: s.step_number ?? 1,
            content: s.content,
            sort_order: s.sort_order,
            is_section_header: s.is_section_header ?? false,
            ingredient_ids: s.ingredient_ids ?? [],
          })),
        cover_image_url: data.cover_image_url ?? "",
        gallery_urls: ((data as any).recipe_image ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((img: any) => img.url as string),
        tags: ((data as any).recipe_tag ?? []).map((t: any) => t.tag_id),
        is_pork_free: data.is_pork_free ?? false,
        is_private: (data as any).is_private ?? false,
        show_on_website: (data as any).show_on_website ?? false,
        allergen_tags: (data as any).allergen_tags ?? [],
        preferred_meal_type: ((data as any).preferred_meal_type as RecipeFormState["preferred_meal_type"]) ?? "any",
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
