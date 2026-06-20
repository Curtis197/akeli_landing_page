// components/creator/recipe-form/RecipeWizard.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { fetchMeasurementUnits } from "@/lib/queries/measurement-units";
import { fetchUnitConversions } from "@/lib/queries/ingredients";
import { fetchIngredientAllergens } from "@/lib/queries/allergens";
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { UnitConversion } from "@/lib/queries/ingredients";
import type {
  Step2Data,
  Step3Data,
} from "@/lib/validations/recipe.schema";
import Step1Basic from "./Step1Basic";
import Step2Ingredients from "./Step2Ingredients";
import Step3Steps from "./Step3Steps";
import Step4Nutrition from "./Step4Nutrition";
import Step5Images from "./Step5Images";
import Step6Tags from "./Step6Tags";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecipeFormState {
  // Step 1
  title: string;
  description: string;
  region: string;
  meal_types: string[];
  preferred_meal_type: "any" | "breakfast" | "lunch" | "dinner" | "snack";
  difficulty: "easy" | "medium" | "hard" | "";
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  // Step 2
  ingredients: Step2Data["ingredients"];
  // Step 3
  steps: Step3Data["steps"];
  // Step 5
  cover_image_url: string;
  gallery_urls: string[];
  // Step 6
  tags: string[];
  is_pork_free: boolean;
  is_private: boolean;
  show_on_website: boolean;
  allergen_tags: string[];
}

const INITIAL_STATE: RecipeFormState = {
  title: "",
  description: "",
  region: "",
  meal_types: [],
  preferred_meal_type: "any",
  difficulty: "",
  prep_time_min: 30,
  cook_time_min: 0,
  servings: 4,
  ingredients: [],
  steps: [],
  cover_image_url: "",
  gallery_urls: [],
  tags: [],
  is_pork_free: false,
  is_private: false,
  show_on_website: false,
  allergen_tags: [],
};

const STEP_LABELS = [
  "Infos de base",
  "Ingrédients",
  "Étapes",
  "Nutrition",
  "Photos",
  "Publication",
];

interface RecipeWizardProps {
  recipeId?: string;
  initialData?: Partial<RecipeFormState>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeWizard({
  recipeId,
  initialData,
}: RecipeWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { creator } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<RecipeFormState>({
    ...INITIAL_STATE,
    ...initialData,
  });
  const [draftId, setDraftId] = useState<string | null>(recipeId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
  const isDirtyRef = useRef(false);

  // ── Fetch supporting data once on mount ───────────────────────────────────
  useEffect(() => {
    fetchMeasurementUnits().then(setUnits).catch(console.error);
    fetchUnitConversions().then(setUnitConversions).catch(console.error);
  }, []);

  // ── Save recipe row ────────────────────────────────────────────────────────
  const saveRecipeRow = useCallback(
    async (data: RecipeFormState): Promise<string | null> => {
      if (!creator) return null;

      const payload = {
        creator_id: creator.id,
        title: data.title || "Brouillon",
        description: data.description || null,
        region: data.region || null,
        difficulty: data.difficulty || null,
        prep_time_min: data.prep_time_min,
        cook_time_min: data.cook_time_min || null,
        servings: data.servings,
        cover_image_url: data.cover_image_url || null,
        is_pork_free: data.is_pork_free,
        is_private: data.is_private,
        show_on_website: data.show_on_website,
        meal_types: data.meal_types,
        preferred_meal_type: data.preferred_meal_type,
        is_published: false,
        language: "fr",
        draft_data: data,
      };

      if (draftId) {
        await supabase.from("recipe").update(payload).eq("id", draftId);
        return draftId;
      } else {
        const { data: newRecipe, error } = await supabase
          .from("recipe")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (newRecipe) setDraftId(newRecipe.id);
        return newRecipe?.id ?? null;
      }
    },
    [creator, draftId, supabase]
  );

  // ── Sync recipe_ingredient ─────────────────────────────────────────────────
  const syncIngredients = useCallback(
    async (id: string, data: RecipeFormState) => {
      await supabase.from("recipe_ingredient").delete().eq("recipe_id", id);
      if (!data.ingredients.length) return;
      await supabase.from("recipe_ingredient").insert(
        data.ingredients.map((ing) => ({
          recipe_id: id,
          ingredient_id: ing.is_section_header ? null : ing.ingredient_id || null,
          quantity: ing.is_section_header ? null : ing.quantity,
          unit: ing.is_section_header ? null : ing.unit || null,
          is_optional: ing.is_optional,
          sort_order: ing.sort_order,
          is_section_header: ing.is_section_header,
          title: ing.is_section_header ? ing.title : null,
        }))
      );
    },
    [supabase]
  );

  // ── Sync recipe_step ───────────────────────────────────────────────────────
  const syncSteps = useCallback(
    async (id: string, data: RecipeFormState) => {
      await supabase.from("recipe_step").delete().eq("recipe_id", id);
      if (!data.steps.length) return;
      await supabase.from("recipe_step").insert(
        data.steps.map((step) => ({
          recipe_id: id,
          step_number: step.step_number,
          title: step.title || null,
          content: step.is_section_header ? null : step.content || null,
          image_url: step.image_url || null,
          timer_seconds: step.timer_seconds ?? null,
          sort_order: step.sort_order,
          is_section_header: step.is_section_header,
          ingredient_ids: step.ingredient_ids ?? [],
        }))
      );
    },
    [supabase]
  );

  // ── Update recipe_macro ────────────────────────────────────────────────────
  const updateMacros = useCallback(
    async (id: string, data: RecipeFormState) => {
      const { computeMacros } = await import("@/lib/utils/macro-calculator");
      const ingredientsForMacro = data.ingredients
        .filter((i) => i.is_section_header || !!i.ingredient_id)
        .map((i) => ({
          ingredient_id: i.ingredient_id ?? "",
          quantity: i.quantity ?? 0,
          unit: i.unit ?? "",
          is_section_header: i.is_section_header,
          calories_per_100g: i.calories_per_100g,
          protein_per_100g: i.protein_per_100g,
          carbs_per_100g: i.carbs_per_100g,
          fat_per_100g: i.fat_per_100g,
        }));
      const macros = computeMacros(ingredientsForMacro, unitConversions, data.servings);
      const totalG = macros.total_weight_g * data.servings;
      await supabase
        .from("recipe_macro")
        .update({
          calories: macros.calories * data.servings,
          protein_g: macros.protein_g * data.servings,
          carbs_g: macros.carbs_g * data.servings,
          fat_g: macros.fat_g * data.servings,
          fiber_g: 0,
          total_weight_g: totalG,
          calories_per_100g: totalG > 0 ? (macros.calories * data.servings * 100) / totalG : null,
          protein_per_100g: totalG > 0 ? (macros.protein_g * data.servings * 100) / totalG : null,
          carbs_per_100g: totalG > 0 ? (macros.carbs_g * data.servings * 100) / totalG : null,
          fat_per_100g: totalG > 0 ? (macros.fat_g * data.servings * 100) / totalG : null,
        })
        .eq("recipe_id", id);
    },
    [supabase, unitConversions]
  );

  // ── Main save/sync ─────────────────────────────────────────────────────────
  const saveDraft = useCallback(
    async (data: RecipeFormState, syncStep?: number) => {
      setIsSaving(true);
      try {
        const id = await saveRecipeRow(data);
        if (!id) return;

        if (syncStep === 2) await syncIngredients(id, data);
        if (syncStep === 3) await syncSteps(id, data);
        if (syncStep === 4) await updateMacros(id, data);

        if (data.gallery_urls.length > 0) {
          await supabase.from("recipe_image").delete().eq("recipe_id", id);
          await supabase.from("recipe_image").insert(
            data.gallery_urls.map((url, i) => ({
              recipe_id: id,
              url,
              sort_order: i,
            }))
          );
        }

        setLastSaved(new Date());
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [saveRecipeRow, syncIngredients, syncSteps, updateMacros, supabase]
  );

  // ── Auto-save every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) saveDraft(formState);
    }, 30000);
    return () => clearInterval(interval);
  }, [formState, saveDraft]);

  // ── Form update ────────────────────────────────────────────────────────────
  const updateForm = useCallback((patch: Partial<RecipeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
    isDirtyRef.current = true;
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    await saveDraft(formState, currentStep);
    if (currentStep < 6) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    try {
      await saveDraft(formState);
      const id = draftId;
      if (!id) return;

      if (publish) {
        const ingredientIds = formState.ingredients
          .filter((i) => !i.is_section_header && i.ingredient_id)
          .map((i) => i.ingredient_id!);
        const allergenSlugs = await fetchIngredientAllergens(ingredientIds);

        await supabase.from("recipe_tag").delete().eq("recipe_id", id);
        if (formState.tags.length > 0) {
          await supabase.from("recipe_tag").insert(
            formState.tags.map((tag_id) => ({ recipe_id: id, tag_id }))
          );
        }

        // translate_recipe trigger fires automatically on UPDATE — no manual invoke
        await supabase
          .from("recipe")
          .update({
            is_published: true,
            allergen_tags: allergenSlugs,
            show_on_website: formState.show_on_website,
          })
          .eq("id", id);

        updateForm({ allergen_tags: allergenSlugs });
      } else {
        await supabase
          .from("recipe")
          .update({ is_published: false })
          .eq("id", id);
      }

      router.push("/dashboard/recipes");
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Autosave label ─────────────────────────────────────────────────────────
  const savedLabel = (() => {
    if (isSaving) return "Sauvegarde...";
    if (!lastSaved) return "";
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    return s < 60
      ? `Sauvé il y a ${s}s`
      : `Sauvé il y a ${Math.round(s / 60)}min`;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <WizardProgress currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Basic data={formState} onChange={updateForm} />
        )}
        {currentStep === 2 && (
          <Step2Ingredients
            data={formState}
            onChange={updateForm}
            units={units}
          />
        )}
        {currentStep === 3 && (
          <Step3Steps
            data={formState}
            onChange={updateForm}
            draftId={draftId}
          />
        )}
        {currentStep === 4 && (
          <Step4Nutrition
            data={formState}
            unitConversions={unitConversions}
          />
        )}
        {currentStep === 5 && (
          <Step5Images
            data={formState}
            onChange={updateForm}
            draftId={draftId}
          />
        )}
        {currentStep === 6 && (
          <Step6Tags
            data={formState}
            onChange={updateForm}
            onSaveDraft={() => handlePublish(false)}
            onPublish={() => handlePublish(true)}
            isPublishing={isPublishing}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <span className="text-xs text-muted-foreground">{savedLabel}</span>
        {currentStep < 6 && (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Suivant {"→"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── WizardProgress ───────────────────────────────────────────────────────────

function WizardProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (s: number) => void;
}) {
  return (
    <div>
      <div className="hidden sm:flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <button
              key={step}
              onClick={() => onStepClick(step)}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors truncate ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {step}. {label}
            </button>
          );
        })}
      </div>
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {"É"}tape {currentStep} {"—"} {STEP_LABELS[currentStep - 1]}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStep}/6
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
