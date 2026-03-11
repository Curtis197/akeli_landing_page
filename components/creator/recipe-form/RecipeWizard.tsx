"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  Step1Data, Step2Data, Step3Data, Step4Data, Step5Data, Step6Data,
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
  difficulty: "easy" | "medium" | "hard" | "";
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  // Step 2
  ingredients: Step2Data["ingredients"];
  // Step 3
  steps: Step3Data["steps"];
  // Step 4
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  macros_skipped: boolean;
  // Step 5
  cover_image_url: string;
  gallery_urls: string[];
  // Step 6
  tags: string[];
  is_pork_free: boolean;
}

const INITIAL_STATE: RecipeFormState = {
  title: "",
  description: "",
  region: "",
  meal_types: [],
  difficulty: "",
  prep_time_min: 30,
  cook_time_min: 0,
  servings: 4,
  ingredients: [],
  steps: [],
  macros_skipped: false,
  cover_image_url: "",
  gallery_urls: [],
  tags: [],
  is_pork_free: false,
};

const STEP_LABELS = [
  "Infos de base",
  "Ingrédients",
  "Étapes",
  "Nutrition",
  "Photos",
  "Publication",
];

// ─── Component ────────────────────────────────────────────────────────────────

interface RecipeWizardProps {
  recipeId?: string;           // If editing an existing recipe
  initialData?: Partial<RecipeFormState>;
}

export default function RecipeWizard({ recipeId, initialData }: RecipeWizardProps) {
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
  const isDirtyRef = useRef(false);

  // ── Auto-save every 30s ────────────────────────────────────────────────────
  const saveDraft = useCallback(async (data: RecipeFormState) => {
    if (!creator) return;
    setIsSaving(true);
    try {
      // Only columns that exist on the recipe table
      const instructions = data.steps.map((s, i) => `${i + 1}. ${s.content}`).join("\n") || "";
      const recipePayload = {
        creator_id: creator.id,
        title: data.title || "Brouillon",
        description: data.description || null,
        instructions,
        region: data.region || null,
        difficulty: data.difficulty || null,
        prep_time_min: data.prep_time_min,
        cook_time_min: data.cook_time_min || null,
        servings: data.servings,
        cover_image_url: data.cover_image_url || null,
        is_pork_free: data.is_pork_free,
        is_published: false,
        language: "fr",
        draft_data: data,
      };

      let id = draftId;
      if (id) {
        await supabase.from("recipe").update(recipePayload).eq("id", id);
      } else {
        const { data: newRecipe, error } = await supabase
          .from("recipe")
          .insert(recipePayload)
          .select("id")
          .single();
        if (error) throw error;
        if (newRecipe) { id = newRecipe.id; setDraftId(newRecipe.id); }
      }

      // Sync gallery images to recipe_image table
      if (id && data.gallery_urls.length > 0) {
        await supabase.from("recipe_image").delete().eq("recipe_id", id);
        await supabase.from("recipe_image").insert(
          data.gallery_urls.map((url, i) => ({ recipe_id: id, url, sort_order: i }))
        );
      }

      setLastSaved(new Date());
      isDirtyRef.current = false;
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [creator, draftId, supabase]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) saveDraft(formState);
    }, 30000);
    return () => clearInterval(interval);
  }, [formState, saveDraft]);

  // ── Update form state ──────────────────────────────────────────────────────
  const updateForm = useCallback((patch: Partial<RecipeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
    isDirtyRef.current = true;
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 6) setCurrentStep(step);
  };

  const handleNext = async () => {
    await saveDraft(formState);
    goToStep(currentStep + 1);
  };

  const handlePrev = () => goToStep(currentStep - 1);

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    try {
      await saveDraft(formState);
      const id = draftId;
      if (!id) return;

      if (publish) {
        // Write related tables before publishing
        // Tags: replace all
        await supabase.from("recipe_tag").delete().eq("recipe_id", id);
        if (formState.tags.length > 0) {
          await supabase.from("recipe_tag").insert(
            formState.tags.map((tag_id) => ({ recipe_id: id, tag_id }))
          );
        }
        // Macros
        if (!formState.macros_skipped && formState.calories) {
          await supabase.from("recipe_macro").upsert({
            recipe_id: id,
            calories: formState.calories ?? null,
            protein_g: formState.protein_g ?? null,
            carbs_g: formState.carbs_g ?? null,
            fat_g: formState.fat_g ?? null,
            fiber_g: formState.fiber_g ?? null,
          }, { onConflict: "recipe_id" });
        }
        // Ingredients (only ones linked to the ingredient catalog)
        await supabase.from("recipe_ingredient").delete().eq("recipe_id", id);
        const linked = formState.ingredients.filter((ing) => ing.ingredient_id);
        if (linked.length > 0) {
          await supabase.from("recipe_ingredient").insert(
            linked.map((ing) => ({
              recipe_id: id,
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit,
              is_optional: ing.is_optional ?? false,
              sort_order: ing.sort_order,
            }))
          );
        }
      }

      await supabase.from("recipe").update({ is_published: publish }).eq("id", id);

      if (publish) {
        // Fire-and-forget translation
        supabase.functions.invoke("translate-recipe", { body: { recipe_id: id } });
      }

      router.push("/dashboard/recipes");
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Auto-save indicator ────────────────────────────────────────────────────
  const savedLabel = (() => {
    if (isSaving) return "Sauvegarde...";
    if (!lastSaved) return "";
    const seconds = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 60) return `Sauvegardé il y a ${seconds}s`;
    return `Sauvegardé il y a ${Math.round(seconds / 60)}min`;
  })();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <WizardProgress currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content */}
      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Basic data={formState} onChange={updateForm} />
        )}
        {currentStep === 2 && (
          <Step2Ingredients data={formState} onChange={updateForm} />
        )}
        {currentStep === 3 && (
          <Step3Steps data={formState} onChange={updateForm} />
        )}
        {currentStep === 4 && (
          <Step4Nutrition data={formState} onChange={updateForm} draftId={draftId} />
        )}
        {currentStep === 5 && (
          <Step5Images data={formState} onChange={updateForm} draftId={draftId} />
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

      {/* Bottom navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>

        <span className="text-xs text-muted-foreground">{savedLabel}</span>

        {currentStep < 6 ? (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Suivant →
          </button>
        ) : null}
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
  onStepClick: (step: number) => void;
}) {
  return (
    <div>
      {/* Desktop tabs */}
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

      {/* Mobile progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Étape {currentStep} — {STEP_LABELS[currentStep - 1]}
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
