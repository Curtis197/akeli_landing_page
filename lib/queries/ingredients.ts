import { createClient } from "@/lib/supabase/client";

export type IngredientResult = {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar?: string | null;
  category: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  default_metric_unit: string | null;
  default_us_unit: string | null;
  hide_in_metric: boolean | null;
};

export type UnitConversion = {
  unit: string;
  ingredient_id: string | null;
  grams_equivalent: number;
};

export async function searchIngredients(
  query: string,
  isMetricUser: boolean = true
): Promise<IngredientResult[]> {
  if (query.trim().length < 2) return [];
  const supabase = createClient();
  const q = query.trim();
  let supabaseQuery = supabase
    .from("ingredient")
    .select(
      "id, name_fr, name_en, name_ar, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_metric_unit, default_us_unit, hide_in_metric"
    )
    .eq("status", "validated")
    .or(`name_fr.ilike.%${q}%,name_en.ilike.%${q}%,name_ar.ilike.%${q}%`);

  if (isMetricUser) {
    supabaseQuery = supabaseQuery.eq("hide_in_metric", false);
  }

  const { data, error } = await supabaseQuery.limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnitConversions(): Promise<UnitConversion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("unit_conversion")
    .select("unit, ingredient_id, grams_equivalent");
  if (error) throw error;
  return data ?? [];
}

export async function submitIngredient(params: {
  name: string;
  name_fr: string;
  name_en: string;
  category_hint: string;
  notes: string;
  submitted_by: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ingredient_submission").insert({
    name: params.name,
    name_fr: params.name_fr,
    name_en: params.name_en,
    category_hint: params.category_hint || null,
    notes: params.notes || null,
    submitted_by: params.submitted_by,
    status: "pending",
  });
  if (error) throw error;
}
