// components/creator/recipe-form/Step4Nutrition.tsx
"use client";

import { useMemo } from "react";
import { computeMacros } from "@/lib/utils/macro-calculator";
import type { RecipeFormState } from "./RecipeWizard";
import type { UnitConversion } from "@/lib/queries/ingredients";

interface Step4Props {
  data: RecipeFormState;
  unitConversions: UnitConversion[];
}

export default function Step4Nutrition({ data, unitConversions }: Step4Props) {
  const macros = useMemo(
    () => computeMacros(data.ingredients, unitConversions, data.servings),
    [data.ingredients, unitConversions, data.servings]
  );

  const rows = [
    { label: "Calories", value: macros.calories, unit: "kcal", max: 800 },
    { label: "Protéines", value: macros.protein_g, unit: "g", max: 50 },
    { label: "Glucides", value: macros.carbs_g, unit: "g", max: 100 },
    { label: "Lipides", value: macros.fat_g, unit: "g", max: 60 },
    { label: "Fibres", value: macros.fiber_g, unit: "g", max: 20 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Nutrition</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculées automatiquement à partir du catalogue d'ingrédients — par
          portion ({data.servings} pers.)
        </p>
      </div>

      {macros.missing_data_count > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠ {macros.missing_data_count} ingrédient
            {macros.missing_data_count > 1 ? "s" : ""} sans données
            nutritionnelles — valeurs approximatives.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/10">
        {rows.map(({ label, value, unit, max }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              <span className="text-sm text-foreground font-semibold">
                {value} {unit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Poids total estimé par portion
          </span>
          <span className="text-xs font-medium text-foreground">
            {macros.total_weight_g} g
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Les fibres ne sont pas encore disponibles dans notre catalogue
        d'ingrédients. Elles seront calculées dans une prochaine version.
      </p>
    </div>
  );
}
