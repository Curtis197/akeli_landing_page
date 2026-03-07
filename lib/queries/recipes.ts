import { createClient } from "@/lib/supabase/client";

export const recipeKeys = {
  all: ["recipes"] as const,
  list: (filters?: Record<string, string>) =>
    [...recipeKeys.all, "list", filters] as const,
  detail: (slug: string) =>
    [...recipeKeys.all, "detail", slug] as const,
  byCreator: (creatorId: string) =>
    [...recipeKeys.all, "creator", creatorId] as const,
};

export async function fetchPublicRecipes(filters?: { region?: string }) {
  const supabase = createClient();
  let query = supabase
    .from("recipe")
    .select(
      "id, slug, title, cover_image_url, difficulty, prep_time, cook_time, region, creator:creator_id(name, username, avatar_url)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (filters?.region) query = query.eq("region", filters.region);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecipeBySlug(slug: string) {
  const supabase = createClient();
  // Public teasing view — no ingredients or steps
  const { data, error } = await supabase
    .from("recipe")
    .select(
      "id, slug, title, cover_image_url, description, difficulty, prep_time, cook_time, calories, portions, tags, region, creator:creator_id(name, username, avatar_url)"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) throw error;
  return data;
}
