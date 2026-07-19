import { createClient } from "@/lib/supabase/client";

export type CreatorRecipeResult = {
  id: string;
  title: string;
  cover_image_url: string | null;
};

export async function searchCreatorRecipes(
  creatorId: string,
  query: string
): Promise<CreatorRecipeResult[]> {
  if (!creatorId || query.trim().length < 2) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe")
    .select("id, title, cover_image_url")
    .eq("creator_id", creatorId)
    .ilike("title", `%${query.trim()}%`)
    .order("title")
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
