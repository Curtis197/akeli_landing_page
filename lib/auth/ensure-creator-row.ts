import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Every account created on this site is meant to become a creator (see
 * /become-creator + /auth/signup copy) — but only the OAuth flow reliably
 * passes through /auth/callback, where this used to live inline. Email/
 * password signup skips that route whenever email confirmation is off
 * (an immediate session), so this is also called directly from the signup
 * page for that branch.
 */
export async function ensureCreatorRow(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("creator")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return;

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  await supabase.from("creator").insert({
    user_id: user.id,
    display_name: displayName,
  });
}
