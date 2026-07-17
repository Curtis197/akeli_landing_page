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
  initialIsPublished?: boolean;
  initialUnpublishRequestedAt?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeWizard({
  recipeId,
  initialData,
  initialIsPublished,
  initialUnpublishRequestedAt,
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
  const [titleConflict, setTitleConflict] = useState(false);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
  const isDirtyRef = useRef(false);
  // Fixed at load: reflects the live row's publication state at mount time. The
  // publish/unpublish actions navigate away afterward, so it never needs updating in place.
  const [isLivePublished] = useState<boolean>(initialIsPublished ?? false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Fetch supporting data once on mount ───────────────────────────────────
  useEffect(() => {
    fetchMeasurementUnits().then(setUnits).catch(console.error);
    fetchUnitConversions().then(setUnitConversions).catch(console.error);
  }, []);

  // ── Save recipe row ────────────────────────────────────────────────────────
  const saveRecipeRow = useCallback(
    async (data: RecipeFormState): Promise<string | null> => {
      if (!creator) return null;

      // Published recipes: work-in-progress goes to draft_data ONLY — the live row
      // must not change until Publish (handlePublish materializes it explicitly).
      if (draftId && isLivePublished) {
        const { error } = await supabase
          .from("recipe")
          .update({ draft_data: data })
          .eq("id", draftId);
        if (error) throw error;
        return draftId;
      }

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
        language: "fr",
        draft_data: data,
      };

      if (draftId) {
        const { error } = await supabase.from("recipe").update(payload).eq("id", draftId);
        if (error) throw error;
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
    [creator, draftId, isLivePublished, supabase]
  );

  // ── Sync recipe_ingredient ─────────────────────────────────────────────────
  const syncIngredients = useCallback(
    async (id: string, data: RecipeFormState) => {
      const { error: delError } = await supabase.from("recipe_ingredient").delete().eq("recipe_id", id);
      if (delError) throw delError;
      if (!data.ingredients.length) return;
      const { error: insError } = await supabase.from("recipe_ingredient").insert(
        data.ingredients.map((ing) => ({
          recipe_id: id,
          ingredient_id: ing.is_section_header ? null : ing.ingredient_id || null,
          quantity: ing.is_section_header ? null : ing.quantity,
          unit: ing.is_section_header ? null : ing.unit || null,
          is_optional: ing.is_optional,
          sort_order: ing.sort_order,
          is_section_header: ing.is_section_header,
          title: ing.is_section_header ? ing.title : null,
          swappable_ingredient_ids: ing.is_section_header ? [] : (ing.swappable_ingredients?.map(s => s.id) || []),
        }))
      );
      if (insError) throw insError;
    },
    [supabase]
  );

  // ── Sync recipe_step ───────────────────────────────────────────────────────
  const syncSteps = useCallback(
    async (id: string, data: RecipeFormState) => {
      if (!data.steps.length) return;
      const { error } = await supabase.rpc("replace_recipe_steps", {
        p_recipe_id: id,
        p_steps: data.steps.map((step) => ({
          step_number: step.step_number,
          sort_order: step.sort_order,
          title: step.title || null,
          content: step.is_section_header ? null : step.content || null,
          image_url: step.image_url || null,
          timer_seconds: step.timer_seconds ?? null,
          is_section_header: step.is_section_header,
          ingredient_ids: step.ingredient_ids ?? [],
        })),
      });
      if (error) throw error;
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
      const { error } = await supabase
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
      if (error) throw error;
    },
    [supabase, unitConversions]
  );

  // ── Main save/sync ─────────────────────────────────────────────────────────
  const saveDraft = useCallback(
    async (data: RecipeFormState, syncStep?: number): Promise<string | null> => {
      setIsSaving(true);
      try {
        const id = await saveRecipeRow(data);
        if (!id) return null;

        if (!isLivePublished) {
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
        }

        setLastSaved(new Date());
        isDirtyRef.current = false;
        return id;
      } catch (err) {
        console.error("Save failed:", err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [saveRecipeRow, syncIngredients, syncSteps, updateMacros, isLivePublished, supabase]
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

  const handleTitleConflict = useCallback((isDup: boolean) => setTitleConflict(isDup), []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (currentStep === 1 && titleConflict) return;
    await saveDraft(formState, currentStep);
    if (currentStep < 6) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleStepClick = async (target: number) => {
    if (target === currentStep) return;
    if (currentStep === 1 && titleConflict) return;
    await saveDraft(formState, currentStep);
    setCurrentStep(target);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const id = await saveRecipeRow(formState);
      if (!id) return;

      if (publish) {
        // Materialize draft → live tables. Any failure below aborts before
        // is_published flips, so a partial publish never goes live silently.
        const { error: rowError } = await supabase
          .from("recipe")
          .update({
            title: formState.title,
            description: formState.description || null,
            region: formState.region || null,
            difficulty: formState.difficulty || null,
            prep_time_min: formState.prep_time_min,
            cook_time_min: formState.cook_time_min || null,
            servings: formState.servings,
            cover_image_url: formState.cover_image_url || null,
            is_pork_free: formState.is_pork_free,
            is_private: formState.is_private,
            meal_types: formState.meal_types,
            preferred_meal_type: formState.preferred_meal_type,
          })
          .eq("id", id);
        if (rowError) throw rowError;

        await syncIngredients(id, formState);
        await syncSteps(id, formState);
        await updateMacros(id, formState);

        if (formState.gallery_urls.length > 0) {
          const { error: delError } = await supabase.from("recipe_image").delete().eq("recipe_id", id);
          if (delError) throw delError;
          const { error: imgError } = await supabase.from("recipe_image").insert(
            formState.gallery_urls.map((url, i) => ({ recipe_id: id, url, sort_order: i }))
          );
          if (imgError) throw imgError;
        }

        const ingredientIds = formState.ingredients
          .filter((i) => !i.is_section_header && i.ingredient_id)
          .map((i) => i.ingredient_id!);
        const allergenSlugs = await fetchIngredientAllergens(ingredientIds);

        const { error: tagDelError } = await supabase.from("recipe_tag").delete().eq("recipe_id", id);
        if (tagDelError) throw tagDelError;
        if (formState.tags.length > 0) {
          const { error: tagError } = await supabase.from("recipe_tag").insert(
            formState.tags.map((tag_id) => ({ recipe_id: id, tag_id }))
          );
          if (tagError) throw tagError;
        }

        // translate_recipe trigger fires automatically on the publish transition
        const { error: pubError } = await supabase
          .from("recipe")
          .update({
            is_published: true,
            unpublish_requested_at: null,
            allergen_tags: allergenSlugs,
            show_on_website: formState.show_on_website,
          })
          .eq("id", id);
        if (pubError) throw pubError;

        updateForm({ allergen_tags: allergenSlugs });
      }
      // publish === false: saveRecipeRow above already persisted the draft (draft_data
      // for a live-published recipe, or the full row for a never-published one).
      // Publication state is never changed by this branch anymore.

      router.push("/dashboard/recipes");
    } catch (err) {
      console.error("Publish failed:", err);
      setPublishError(
        "La publication a échoué — aucune donnée n'a été perdue. Réessayez ou contactez le support."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Unpublish (deferred, effective Monday) ─────────────────────────────────
  const handleRequestUnpublish = async () => {
    if (!draftId) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const { error } = await supabase
        .from("recipe")
        .update({ unpublish_requested_at: new Date().toISOString() })
        .eq("id", draftId);
      if (error) throw error;
      router.push("/dashboard/recipes");
    } catch (err) {
      console.error("Unpublish request failed:", err);
      setPublishError("La demande de retrait a échoué. Réessayez.");
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
      <WizardProgress currentStep={currentStep} onStepClick={handleStepClick} />

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Basic
            data={formState}
            onChange={updateForm}
            creatorId={creator?.id}
            draftId={draftId}
            onDuplicateTitle={handleTitleConflict}
          />
        )}
        {currentStep === 2 && (
          <Step2Ingredients
            data={formState}
            onChange={updateForm}
            units={units}
            unitConversions={unitConversions}
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
            onUnpublish={handleRequestUnpublish}
            isPublished={isLivePublished}
            pendingUnpublish={!!initialUnpublishRequestedAt}
            isPublishing={isPublishing}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        {publishError && (
          <p className="text-sm text-red-600 mr-4">{publishError}</p>
        )}
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
            disabled={currentStep === 1 && titleConflict}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
