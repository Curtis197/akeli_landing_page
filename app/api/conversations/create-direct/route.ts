import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/tracking/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { target_user_id } = body;
  if (!target_user_id) {
    return NextResponse.json({ error: "Missing target_user_id" }, { status: 400 });
  }
  if (target_user_id === user.id) {
    return NextResponse.json({ error: "Cannot start a conversation with yourself" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error("[api/conversations/create-direct] admin init failed:", e);
    return NextResponse.json({ error: "Server configuration error: missing service key" }, { status: 500 });
  }

  // Check if a direct conversation already exists between the two users
  const [resA, resB] = await Promise.all([
    admin.from("conversation_participant").select("conversation_id").eq("user_id", user.id),
    admin.from("conversation_participant").select("conversation_id").eq("user_id", target_user_id),
  ]);
  if (resA.error) {
    console.error("[api/conversations/create-direct] participant lookup A:", resA.error);
    return NextResponse.json({ error: "Failed to check existing conversations" }, { status: 500 });
  }
  if (resB.error) {
    console.error("[api/conversations/create-direct] participant lookup B:", resB.error);
    return NextResponse.json({ error: "Failed to check existing conversations" }, { status: 500 });
  }

  const setA = new Set((resA.data ?? []).map((r: { conversation_id: string }) => r.conversation_id));
  const intersection = (resB.data ?? [])
    .map((r: { conversation_id: string }) => r.conversation_id)
    .filter((id: string) => setA.has(id));

  if (intersection.length > 0) {
    const { data: existing, error: existingError } = await admin
      .from("conversation")
      .select("id")
      .in("id", intersection)
      .eq("type", "private")
      .limit(1);
    if (!existingError && existing && existing.length > 0) {
      return NextResponse.json({ conversation_id: existing[0].id });
    }
  }

  // Create the conversation
  const { data: conv, error: convError } = await admin
    .from("conversation")
    .insert({ type: "private", created_by: user.id })
    .select("id")
    .single();

  if (convError || !conv) {
    console.error("[api/conversations/create-direct] conversation insert:", convError);
    return NextResponse.json({ error: "Failed to create conversation", detail: convError?.message }, { status: 500 });
  }

  // Add both participants
  const { error: partError } = await admin
    .from("conversation_participant")
    .insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: target_user_id },
    ]);

  if (partError) {
    console.error("[api/conversations/create-direct] participant insert:", partError);
    await admin.from("conversation").delete().eq("id", conv.id);
    return NextResponse.json({ error: "Failed to add participants", detail: partError?.message }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: conv.id });
}
