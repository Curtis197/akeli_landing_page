import type { SupabaseClient } from "@supabase/supabase-js";

export type SortKey = "revenue_this_month" | "consumptions_this_month" | "total_revenue";

export interface RecipePerformance {
  recipe_id: string;
  creator_id: string;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string;
  total_consumptions: number;
  unique_users: number;
  total_revenue: number;
  consumptions_this_month: number;
  revenue_this_month: number;
  consumptions_last_month: number;
  trend: number;
}

export async function getRecipePerformance(
  supabase: SupabaseClient,
  creatorId: string,
  sortBy: SortKey = "revenue_this_month"
): Promise<RecipePerformance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("recipe_performance_summary")
    .select(
      "recipe_id, creator_id, title, cover_image_url, is_published, published_at, " +
      "total_consumptions, unique_users, total_revenue, consumptions_this_month, " +
      "revenue_this_month, consumptions_last_month"
    )
    .eq("creator_id", creatorId)
    .order(sortBy, { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    total_consumptions: Number(r.total_consumptions ?? 0),
    unique_users: Number(r.unique_users ?? 0),
    total_revenue: Number(r.total_revenue ?? 0),
    consumptions_this_month: Number(r.consumptions_this_month ?? 0),
    revenue_this_month: Number(r.revenue_this_month ?? 0),
    consumptions_last_month: Number(r.consumptions_last_month ?? 0),
    trend:
      Number(r.consumptions_last_month ?? 0) > 0
        ? Math.round(
            ((Number(r.consumptions_this_month ?? 0) - Number(r.consumptions_last_month ?? 0)) /
              Number(r.consumptions_last_month ?? 0)) *
              100
          )
        : Number(r.consumptions_this_month ?? 0) > 0
        ? 100
        : 0,
  }));
}
