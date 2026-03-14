"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step1Schema, MEAL_TYPES, DIFFICULTY_OPTIONS } from "@/lib/validations/recipe.schema";
import type { Step1Data } from "@/lib/validations/recipe.schema";
import type { RecipeFormState } from "./RecipeWizard";
import { createClient } from "@/lib/supabase/client";

interface Step1Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
}

export default function Step1Basic({ data, onChange }: Step1Props) {
  const [regions, setRegions] = useState<{ code: string; name_fr: string }[]>([]);

  const {
    register,
    watch,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: data.title,
      description: data.description,
      region: data.region,
      meal_types: data.meal_types,
      difficulty: data.difficulty as Step1Data["difficulty"] | undefined,
      prep_time_min: data.prep_time_min,
      cook_time_min: data.cook_time_min,
      servings: data.servings,
    },
    mode: "onChange",
  });

  const title = watch("title") ?? "";
  const description = watch("description") ?? "";

  // Fetch regions from Supabase — run once on mount only
  useEffect(() => {
    createClient()
      .from("food_region")
      .select("code, name_fr")
      .order("name_fr")
      .then(({ data, error }) => {
        if (error) console.error("Failed to load regions:", error);
        else if (data) setRegions(data);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form changes up to parent
  useEffect(() => {
    const subscription = watch((values) => {
      onChange({
        title: values.title ?? "",
        description: values.description ?? "",
        region: values.region ?? "",
        meal_types: (values.meal_types as string[]) ?? [],
        difficulty: (values.difficulty as RecipeFormState["difficulty"]) ?? "",
        prep_time_min: values.prep_time_min ?? 30,
        cook_time_min: values.cook_time_min ?? 0,
        servings: values.servings ?? 4,
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const toggleMealType = (value: string) => {
    const current = watch("meal_types") ?? [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setValue("meal_types", updated, { shouldValidate: true });
    trigger("meal_types");
  };

  const selectedMealTypes = watch("meal_types") ?? [];
  const selectedDifficulty = watch("difficulty");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Infos de base</h2>

      {/* Title */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-foreground">
            Titre de la recette <span className="text-destructive">*</span>
          </label>
          <span className="text-xs text-muted-foreground">{title.length}/80</span>
        </div>
        <input
          {...register("title")}
          type="text"
          maxLength={80}
          placeholder="Ex : Poulet DG camerounais"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-foreground">Description</label>
          <span className="text-xs text-muted-foreground">{description.length}/300</span>
        </div>
        <textarea
          {...register("description")}
          maxLength={300}
          rows={3}
          placeholder="Décris ta recette en quelques mots..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Region */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">
          Région culinaire <span className="text-destructive">*</span>
        </label>
        <select
          {...register("region")}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sélectionner une région</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_fr}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="text-xs text-destructive">{errors.region.message}</p>
        )}
      </div>

      {/* Meal types */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Type de repas <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(({ value, label }) => {
            const selected = selectedMealTypes.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleMealType(value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-secondary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {errors.meal_types && (
          <p className="text-xs text-destructive">{errors.meal_types.message}</p>
        )}
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Difficulté <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-3">
          {DIFFICULTY_OPTIONS.map(({ value, label }) => {
            const selected = selectedDifficulty === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setValue("difficulty", value, { shouldValidate: true });
                  trigger("difficulty");
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-secondary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {errors.difficulty && (
          <p className="text-xs text-destructive">{errors.difficulty.message}</p>
        )}
      </div>

      {/* Times + Servings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Temps de préparation <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              {...register("prep_time_min", { valueAsNumber: true })}
              type="number"
              min={1}
              max={480}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
          </div>
          {errors.prep_time_min && (
            <p className="text-xs text-destructive">{errors.prep_time_min.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Temps de cuisson</label>
          <div className="flex items-center gap-2">
            <input
              {...register("cook_time_min", { valueAsNumber: true })}
              type="number"
              min={0}
              max={480}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
          </div>
          {errors.cook_time_min && (
            <p className="text-xs text-destructive">{errors.cook_time_min.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Portions <span className="text-destructive">*</span>
          </label>
          <input
            {...register("servings", { valueAsNumber: true })}
            type="number"
            min={1}
            max={50}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.servings && (
            <p className="text-xs text-destructive">{errors.servings.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
