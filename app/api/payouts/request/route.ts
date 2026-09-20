import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/tracking/supabase-admin";
import { exceedsAvailableBalance } from "@/lib/payments/available-balance";
import { getRequestEligibility } from "@/lib/payments/request-eligibility";
import { parsePayoutRequestAmount } from "@/lib/payments/parse-request-amount";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawAmount =
    typeof body?.amount === "string" ? body.amount : typeof body?.amount === "number" ? String(body.amount) : "";
  const amount = parsePayoutRequestAmount(rawAmount);

  if (amount === null) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  // getSupabaseAdmin() is typed with an empty schema, which collapses row types to `never`;
  // match the untyped-client idiom used by api/groups/create.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error("[api/payouts/request] admin init failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: creator, error: creatorError } = await admin
    .from("creator")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError) {
    console.error("[api/payouts/request] creator lookup failed:", creatorError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!creator) {
    return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
  }

  const [identityResult, openResult, balanceResult] = await Promise.all([
    admin.from("creator_payout_identity").select("status").eq("creator_id", creator.id).maybeSingle(),
    admin
      .from("payout")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .in("status", ["pending", "processing"]),
    admin.from("creator_balance").select("available_balance").eq("creator_id", creator.id).maybeSingle(),
  ]);

  const lookupError = identityResult.error ?? openResult.error ?? balanceResult.error;
  if (lookupError) {
    console.error("[api/payouts/request] eligibility lookup failed:", lookupError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // A creator with no creator_balance row has nothing available, so it counts as zero.
  const availableBalance = Number(balanceResult.data?.available_balance ?? 0);

  const eligibility = getRequestEligibility({
    identityStatus: (identityResult.data?.status as "submitted" | "verified" | undefined) ?? null,
    hasOpenPayout: (openResult.count ?? 0) > 0,
    availableBalance,
  });

  if (eligibility !== "eligible") {
    return NextResponse.json({ error: eligibility }, { status: 409 });
  }

  if (exceedsAvailableBalance(amount, availableBalance)) {
    return NextResponse.json({ error: "insufficient_balance" }, { status: 409 });
  }

  const { data: payout, error: insertError } = await admin
    .from("payout")
    .insert({ creator_id: creator.id, amount, status: "pending" })
    .select("id")
    .single();

  if (insertError || !payout) {
    console.error("[api/payouts/request] insert failed:", insertError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  console.log("[payout-request] created", { creatorId: creator.id, payoutId: payout.id, amount });

  return NextResponse.json({ ok: true, payoutId: payout.id }, { status: 201 });
}
