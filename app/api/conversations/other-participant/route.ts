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

  let admin: ReturnType<typeof getSupabaseAdmin>;
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

  const allowedIds = new Set((myParts ?? []).map((p: { conversation_id: string }) => p.conversation_id));
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

  if (!otherParts || otherParts.length === 0) {
    return NextResponse.json({});
  }

  const otherUserIds = [
    ...new Set(otherParts.map((p: { user_id: string }) => p.user_id).filter(Boolean)),
  ] as string[];

  // Look up names: creator table first, then user_profile as fallback
  const { data: creators } = await admin
    .from("creator")
    .select("user_id, display_name")
    .in("user_id", otherUserIds);

  console.log("[api/other-participant] creators:", creators);

  const nameByUserId = new Map<string, string>();
  for (const c of creators ?? []) {
    if (c.user_id) nameByUserId.set(c.user_id, c.display_name);
  }

  const missingIds = otherUserIds.filter((id) => !nameByUserId.has(id));
  if (missingIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profile")
      .select("id, first_name, last_name, username")
      .in("id", missingIds);

    console.log("[api/other-participant] user_profile fallback:", profiles);

    for (const p of profiles ?? []) {
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username;
      if (name) nameByUserId.set(p.id, name);
    }
  }

  // Build result map: conversation_id → { user_id, name }
  const result: Record<string, { user_id: string; name: string }> = {};
  for (const part of otherParts) {
    const name = nameByUserId.get(part.user_id);
    if (name) {
      result[part.conversation_id] = { user_id: part.user_id, name };
    }
  }

  console.log("[api/other-participant] result:", result);
  return NextResponse.json(result);
}
