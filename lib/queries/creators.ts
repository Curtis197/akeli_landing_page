import { createClient } from "@/lib/supabase/client";

export const creatorKeys = {
  all: ["creators"] as const,
  list: (filters?: Record<string, string>) =>
    [...creatorKeys.all, "list", filters] as const,
  detail: (username: string) =>
    [...creatorKeys.all, "detail", username] as const,
};

export async function fetchCreators(filters?: { region?: string; specialty?: string }) {
  const supabase = createClient();
  let query = supabase
    .from("creator")
    .select("id, name, username, bio, avatar_url, region, specialty, recipe_count, fan_mode_enabled")
    .order("name");

  if (filters?.region) query = query.eq("region", filters.region);
  if (filters?.specialty) query = query.eq("specialty", filters.specialty);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCreatorByUsername(username: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("creator")
    .select("*")
    .eq("username", username)
    .single();
  if (error) throw error;
  return data;
}
