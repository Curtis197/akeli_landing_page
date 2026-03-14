import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCreatorBalance(supabase: SupabaseClient, creatorId: string) {
  const { data, error } = await supabase
    .from("creator_balance")
    .select("available_balance, pending_balance, lifetime_earnings, last_payout_at")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (error) throw error;
  return data ?? {
    available_balance: 0,
    pending_balance: 0,
    lifetime_earnings: 0,
    last_payout_at: null,
  };
}

export async function getPayoutHistory(
  supabase: SupabaseClient,
  creatorId: string,
  page: number = 0,
  pageSize: number = 12
) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("payout")
    .select("id, amount, status, stripe_payout_id, requested_at, completed_at", { count: "exact" })
    .eq("creator_id", creatorId)
    .order("requested_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}
