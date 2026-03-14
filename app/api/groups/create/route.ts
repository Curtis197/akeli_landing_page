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
  const { name, is_public } = body;
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;

  // Verify user is a creator
  const { data: creator, error: creatorError } = await admin
    .from("creator")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (creatorError || !creator) {
    console.error("[api/groups/create] creator check:", creatorError);
    return NextResponse.json({ error: "User is not a creator" }, { status: 403 });
  }

  // Insert community_group
  const { data: group, error: groupError } = await admin
    .from("community_group")
    .insert({ name, is_public: is_public ?? true, creator_id: user.id })
    .select("id")
    .single();

  if (groupError || !group) {
    console.error("[api/groups/create] community_group insert:", groupError);
    return NextResponse.json({ error: "Failed to create group", detail: groupError?.message }, { status: 500 });
  }

  // Insert conversation
  const { data: conv, error: convError } = await admin
    .from("conversation")
    .insert({ type: "creator_group", name, created_by: user.id, community_group_id: group.id })
    .select("id")
    .single();

  if (convError || !conv) {
    console.error("[api/groups/create] conversation insert:", convError);
    await admin.from("community_group").delete().eq("id", group.id);
    return NextResponse.json({ error: "Failed to create conversation", detail: convError?.message }, { status: 500 });
  }

  // Insert participant (non-fatal)
  const { error: partError } = await admin
    .from("conversation_participant")
    .insert({ conversation_id: conv.id, user_id: user.id });

  if (partError) {
    console.error("[api/groups/create] participant insert:", partError);
  }

  return NextResponse.json({ conversation_id: conv.id });
}
