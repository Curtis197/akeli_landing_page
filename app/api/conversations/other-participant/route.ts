import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/tracking/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/other-participant
 * Body: { conversation_ids: string[] }
 *
 * Returns a map of conversation_id → { user_id, name } for the other participant
 * in each private conversation. Uses the admin client to bypass RLS on
 * conversation_participant (which only exposes the caller's own row).
 */
export async function POST(request: NextRequest) {
  // Verify the caller is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { conversation_ids } = body as { conversation_ids: string[] };

  if (!Array.isArray(conversation_ids) || conversation_ids.length === 0) {
    return NextResponse.json({}, { status: 200 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error("[api/other-participant] admin init failed:", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Verify the caller is actually a participant in ALL requested conversations
  // (prevents fishing for other users' conversation data)
  const { data: myParts, error: myPartsError } = await admin
    .from("conversation_participant")
    .select("conversation_id")
    .eq("user_id", user.id)
    .in("conversation_id", conversation_ids);

  if (myPartsError) {
    return NextResponse.json({ error: "Failed to verify participation" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowedIds = new Set((myParts ?? []).map((p: any) => p.conversation_id as string));
  const safeIds = conversation_ids.filter((id) => allowedIds.has(id));

  if (safeIds.length === 0) {
    return NextResponse.json({});
  }

  // Fetch all participants in those conversations, excluding the caller
  const { data: otherParts, error: otherPartsError } = await admin
    .from("conversation_participant")
    .select("conversation_id, user_id")
    .in("conversation_id", safeIds)
    .neq("user_id", user.id);

  if (otherPartsError) {
    console.error("[api/other-participant] participant lookup:", otherPartsError);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  console.log("[api/other-participant] other participants found:", otherParts);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const otherPartsArr = (otherParts ?? []) as any[];

  if (otherPartsArr.length === 0) {
    return NextResponse.json({});
  }

  const otherUserIds = [
    ...new Set(otherPartsArr.map((p) => p.user_id as string).filter(Boolean)),
  ];

  // Look up names: creator table first, then user_profile as fallback
  const { data: creators } = await admin
    .from("creator")
    .select("user_id, display_name")
    .in("user_id", otherUserIds);

  console.log("[api/other-participant] creators:", creators);

  const nameByUserId = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (creators ?? []) as any[]) {
    if (c.user_id) nameByUserId.set(c.user_id as string, c.display_name as string);
  }

  const missingIds = otherUserIds.filter((id) => !nameByUserId.has(id));
  if (missingIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profile")
      .select("id, first_name, last_name, username")
      .in("id", missingIds);

    console.log("[api/other-participant] user_profile fallback:", profiles);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (profiles ?? []) as any[]) {
      const name =
        ([p.first_name, p.last_name] as (string | null)[]).filter(Boolean).join(" ") ||
        (p.username as string | null);
      if (name) nameByUserId.set(p.id as string, name);
    }
  }

  // Build result map: conversation_id → { user_id, name }
  const result: Record<string, { user_id: string; name: string }> = {};
  for (const part of otherPartsArr) {
    const name = nameByUserId.get(part.user_id as string);
    if (name) {
      result[part.conversation_id as string] = { user_id: part.user_id as string, name };
    }
  }

  console.log("[api/other-participant] result:", result);
  return NextResponse.json(result);
}
