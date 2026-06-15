import { createClient } from "@/lib/supabase/client";

export async function fetchIngredientAllergens(
  ingredientIds: string[]
): Promise<string[]> {
  if (!ingredientIds.length) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredient_allergen")
    .select("allergen:allergen_id(slug)")
    .in("ingredient_id", ingredientIds);
  if (error) throw error;
  const slugs = new Set(
    (data ?? []).map((row: any) => row.allergen?.slug).filter(Boolean)
  );
  return Array.from(slugs);
}
