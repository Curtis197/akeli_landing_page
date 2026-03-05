"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipeFormState } from "./RecipeWizard";

interface Step4Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  draftId: string | null;
}

interface MacroField {
  key: keyof Pick<RecipeFormState, "calories" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g">;
  label: string;
  unit: string;
}

const MACRO_FIELDS: MacroField[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protéines", unit: "g" },
  { key: "carbs_g", label: "Glucides", unit: "g" },
  { key: "fat_g", label: "Lipides", unit: "g" },
  { key: "fiber_g", label: "Fibres", unit: "g" },
];

export default function Step4Nutrition({ data, onChange, draftId }: Step4Props) {
  const supabase = createClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const handleAutoCalc = async () => {
    if (!draftId) {
      setCalcError("Sauvegarde d'abord la recette avant de calculer les macros.");
      return;
    }
    setIsCalculating(true);
    setCalcError(null);
    try {
      const { data: result, error } = await supabase.rpc("calculate_recipe_macros", {
        p_recipe_id: draftId,
      });
      if (error) throw error;
      if (result) {
        onChange({
          calories: result.calories ?? undefined,
          protein_g: result.protein_g ?? undefined,
          carbs_g: result.carbs_g ?? undefined,
          fat_g: result.fat_g ?? undefined,
          fiber_g: result.fiber_g ?? undefined,
          macros_skipped: false,
        });
      }
    } catch {
      setCalcError("Calcul impossible. Renseigne les valeurs manuellement.");
      setManualMode(true);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSkip = () => {
    onChange({
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      fiber_g: undefined,
      macros_skipped: true,
    });
  };

  const hasValues = MACRO_FIELDS.some((f) => data[f.key] !== undefined);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Informations nutritionnelles</h2>
      <p className="text-sm text-muted-foreground">
        Ces informations sont optionnelles mais aident les utilisateurs à suivre leur alimentation.
      </p>

      {/* Auto-calc button */}
      {!manualMode && (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <p className="text-sm font-medium text-foreground">Calcul automatique</p>
          <p className="text-xs text-muted-foreground">
            Nous calculons les macros à partir de tes ingrédients.
          </p>
          <button
            type="button"
            onClick={handleAutoCalc}
            disabled={isCalculating}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isCalculating ? "Calcul en cours..." : "Calculer automatiquement"}
          </button>
          {calcError && (
            <p className="text-xs text-destructive">{calcError}</p>
          )}
        </div>
      )}

      {/* Macro inputs */}
      {(manualMode || hasValues) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {manualMode ? "Saisie manuelle" : "Valeurs calculées"}
            </p>
            {!manualMode && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-xs text-primary hover:underline"
              >
                Modifier manuellement
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MACRO_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {label}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step={key === "calories" ? 1 : 0.1}
                    value={data[key] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      onChange({ [key]: val, macros_skipped: false });
                    }}
                    readOnly={!manualMode}
                    placeholder="—"
                    className={`w-full px-2 py-1.5 rounded-lg border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                      manualMode ? "bg-background" : "bg-secondary cursor-default"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual mode toggle if no auto calc tried */}
      {!manualMode && !hasValues && (
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-sm text-primary hover:underline"
        >
          Saisir manuellement
        </button>
      )}

      {/* Skip */}
      <div className="border-t border-border pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.macros_skipped}
            onChange={(e) => {
              if (e.target.checked) {
                handleSkip();
              } else {
                onChange({ macros_skipped: false });
              }
            }}
            className="mt-0.5 rounded border-input accent-primary"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Passer cette étape</p>
            <p className="text-xs text-muted-foreground">
              Les informations nutritionnelles ne seront pas affichées pour cette recette.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
