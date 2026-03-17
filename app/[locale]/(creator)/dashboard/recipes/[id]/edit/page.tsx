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

      console.log("[EditRecipe] recipe row:", { id: data.id, has_draft_data: !!data.draft_data });

      // If draft_data exists, it is the canonical form state
      if (data.draft_data) {
        const draft = data.draft_data as Partial<RecipeFormState>;
        console.log("[EditRecipe] draft_data ingredients (raw):", draft.ingredients);
        // Sanitize ingredients: drop items saved in old free-text format (no ingredient.id/name)
        if (draft.ingredients) {
          const before = draft.ingredients.length;
          draft.ingredients = draft.ingredients.filter((item) => {
            if (item.is_section_header) return true;
            return item.ingredient && typeof (item.ingredient as any).name === "string";
          });
          console.log("[EditRecipe] draft_data ingredients after filter:", draft.ingredients.length, "/ was:", before);
        }
        setInitialData(draft);
        setLoading(false);
        return;
      }

      // Fallback: reconstruct from direct columns + related tables
      console.log("[EditRecipe] no draft_data — fetching recipe_ingredient + recipe_step");
      const [{ data: riRows, error: riErr }, { data: stepRows, error: stepErr }] = await Promise.all([
        supabase
          .from("recipe_ingredient")
          .select("id, ingredient_id, quantity, unit, is_optional, is_section_header, title, sort_order, ingredient(id, name, name_fr, name_en, status)")
          .eq("recipe_id", id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("recipe_step")
          .select("id, step_number, content, title, is_section_header")
          .eq("recipe_id", id)
          .order("step_number", { ascending: true }),
      ]);
      console.log("[EditRecipe] recipe_ingredient rows:", riRows, "error:", riErr);
      console.log("[EditRecipe] recipe_step rows:", stepRows, "error:", stepErr);

      const ingredients = (riRows ?? []).map((row: any) => {
        if (row.is_section_header) {
          return {
            id: row.id,
            type: "section_header" as const,
            is_section_header: true as const,
            title: row.title ?? "",
            sort_order: row.sort_order ?? 0,
          };
        }
        const ing = row.ingredient;
        return {
          id: row.id,
          type: "ingredient" as const,
          is_section_header: false as const,
          ingredient: {
            id: ing?.id ?? row.ingredient_id,
            name: ing?.name_fr ?? ing?.name ?? ing?.name_en ?? "Ingrédient",
            category: null,
            status: (ing?.status ?? "validated") as "validated" | "pending",
          },
          quantity: row.quantity ?? 0,
          unit: row.unit ?? "g",
          is_optional: row.is_optional ?? false,
          sort_order: row.sort_order ?? 0,
        };
      });

      const steps = (stepRows ?? []).map((row: any, i: number) => {
        if (row.is_section_header) {
          return { id: row.id, type: "section_header" as const, is_section_header: true as const, title: row.title ?? "", sort_order: i };
        }
        return { id: row.id, type: "step" as const, is_section_header: false as const, content: row.content ?? "", title: row.title ?? null, sort_order: i };
      });

      const mapped: Partial<RecipeFormState> = {
        title: data.title ?? "",
        description: (data as any).description ?? "",
        region: data.region ?? "",
        meal_types: [],
        difficulty: (data.difficulty as RecipeFormState["difficulty"]) ?? "",
        prep_time_min: data.prep_time_min ?? 30,
        cook_time_min: data.cook_time_min ?? 0,
        servings: data.servings ?? 4,
        ingredients,
        steps,
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
