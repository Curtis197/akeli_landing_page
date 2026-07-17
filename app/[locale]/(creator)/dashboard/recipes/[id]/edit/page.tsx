"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import RecipeWizard from "@/components/creator/recipe-form/RecipeWizard";
import type { RecipeFormState } from "@/components/creator/recipe-form/RecipeWizard";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const supabase = createClient();

  const [initialData, setInitialData] = useState<Partial<RecipeFormState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pubState, setPubState] = useState<{ isPublished: boolean; unpublishRequestedAt: string | null }>({
    isPublished: false,
    unpublishRequestedAt: null,
  });

  useEffect(() => {
    if (!id) return;

    async function loadRecipe() {
      const { data, error: err } = await supabase
        .from("recipe")
        .select(`
          id, title, description, region, meal_types, preferred_meal_type,
          difficulty, prep_time_min, cook_time_min, servings,
          cover_image_url, is_pork_free, is_private, show_on_website, allergen_tags,
          is_published, unpublish_requested_at, draft_data,
          recipe_ingredient (
            id, ingredient_id, quantity, unit, is_optional, sort_order,
            is_section_header, title, swappable_ingredient_ids,
            ingredient:ingredient_id ( name_fr, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g )
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

      setPubState({
        isPublished: (data as any).is_published ?? false,
        unpublishRequestedAt: (data as any).unpublish_requested_at ?? null,
      });

      // A saved draft holds the full RecipeFormState (RecipeWizard stores it verbatim).
      // Prefer it over live tables so in-progress edits survive a page reload.
      if ((data as any).draft_data && typeof (data as any).draft_data === "object") {
        setInitialData((data as any).draft_data as Partial<RecipeFormState>);
        setLoading(false);
        return;
      }

      const allSwappableIds = new Set<string>();
      (data as any).recipe_ingredient?.forEach((ing: any) => {
        if (ing.swappable_ingredient_ids) {
          ing.swappable_ingredient_ids.forEach((id: string) => allSwappableIds.add(id));
        }
      });
      
      const nameKey = `name_${locale}` as "name_fr" | "name_en";

      let swappableNamesMap: Record<string, string> = {};
      if (allSwappableIds.size > 0) {
        const { data: swapData } = await supabase
          .from("ingredient")
          .select("id, name_fr, name_en")
          .in("id", Array.from(allSwappableIds));

        if (swapData) {
          swappableNamesMap = swapData.reduce((acc: any, curr: any) => {
            acc[curr.id] = curr[nameKey] ?? curr.name_fr;
            return acc;
          }, {});
        }
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
            name: ing.ingredient?.[nameKey] ?? ing.ingredient?.name_fr ?? "",
            quantity: ing.quantity,
            unit: ing.unit,
            is_optional: ing.is_optional ?? false,
            sort_order: ing.sort_order,
            is_section_header: ing.is_section_header ?? false,
            title: ing.title ?? undefined,
            calories_per_100g: ing.ingredient?.calories_per_100g ?? null,
            protein_per_100g: ing.ingredient?.protein_per_100g ?? null,
            carbs_per_100g: ing.ingredient?.carbs_per_100g ?? null,
            fat_per_100g: ing.ingredient?.fat_per_100g ?? null,
            swappable_ingredients: (ing.swappable_ingredient_ids ?? []).map((swapId: string) => ({
              id: swapId,
              name: swappableNamesMap[swapId] ?? "Inconnu",
            })),
          })),
        steps: ((data as any).recipe_step ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            id: s.id,
            step_number: s.step_number ?? 1,
            title: s.title ?? undefined,
            content: s.content,
            image_url: s.image_url ?? undefined,
            timer_seconds: s.timer_seconds ?? undefined,
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
  }, [id, locale, supabase]);

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
      <RecipeWizard
        recipeId={id}
        initialData={initialData}
        initialIsPublished={pubState.isPublished}
        initialUnpublishRequestedAt={pubState.unpublishRequestedAt}
      />
    </main>
  );
}
