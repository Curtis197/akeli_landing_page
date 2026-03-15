import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ConversationListItem {
  id: string;
  name: string | null;
  type: "private" | "creator_group" | "support";
  updated_at: string;
  unread: boolean;
  community_group?: { cover_url: string | null; is_public: boolean } | null;
}

export interface CreatorSearchItem {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  profile_image_url: string | null;
  fan_count: number;
}

type Supabase = SupabaseClient<Database>;

export async function getConversations(
  supabase: Supabase,
  userId: string,
  type?: "private" | "creator_group" | "support"
): Promise<ConversationListItem[]> {
  console.log("[getConversations] userId:", userId, "type:", type ?? "all");
  const t1 = setTimeout(() => console.error("[getConversations] conversation_participant query TIMED OUT"), 5000);
  const { data: participations, error: partError } = await supabase
    .from("conversation_participant")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  clearTimeout(t1);

  console.log("[getConversations] participations:", participations?.length ?? 0, "error:", partError?.message);
  if (partError) throw partError;
  if (!participations || participations.length === 0) return [];

  const lastReadMap = new Map<string, string | null>();
  for (const part of participations) {
    lastReadMap.set(part.conversation_id, part.last_read_at ?? null);
  }

  const conversationIds = participations.map((part) => part.conversation_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let convQuery: any = supabase
    .from("conversation")
    .select("id, name, type, updated_at, community_group_id")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (type) {
    convQuery = convQuery.eq("type", type);
  }

  const { data: conversations, error: convError } = await convQuery;
  console.log("[getConversations] conversations:", conversations?.length ?? 0, "error:", convError?.message);
  if (convError) throw convError;
  if (!conversations || conversations.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupConvs = (conversations as any[]).filter(
    (c) => c.type === "creator_group" && c.community_group_id
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupIds: string[] = groupConvs.map((c: any) => c.community_group_id as string);

  const groupMap = new Map<string, { cover_url: string | null; is_public: boolean }>();
  if (groupIds.length > 0) {
    const { data: groups, error: groupError } = await supabase
      .from("community_group")
      .select("id, cover_url, is_public")
      .in("id", groupIds);
    if (groupError) throw groupError;
    for (const g of groups ?? []) {
      groupMap.set(g.id, { cover_url: g.cover_url ?? null, is_public: g.is_public ?? false });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (conversations as any[]).map((conv) => {
    const lastReadAt = lastReadMap.get(conv.id) ?? null;
    const updatedAt: string = conv.updated_at ?? new Date(0).toISOString();
    const unread = lastReadAt === null || lastReadAt < updatedAt;
    const item: ConversationListItem = {
      id: conv.id,
      name: conv.name ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: (conv.type as any) ?? "private",
      updated_at: updatedAt,
      unread,
    };
    if (conv.type === "creator_group" && conv.community_group_id) {
      item.community_group = groupMap.get(conv.community_group_id) ?? null;
    }
    return item;
  });
}

export async function getCreators(
  supabase: Supabase,
  search: string,
  sort: "name" | "fan_count" = "name"
): Promise<CreatorSearchItem[]> {
  const safeSearch = search.replace(/%/g, "\%").replace(/_/g, "\_");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("creator")
    .select("id, display_name, username, profile_image_url, fan_count, user_id")
    .limit(50);
  if (search.trim().length > 0) {
    query = query.or("display_name.ilike.%" + safeSearch + "%,username.ilike.%" + safeSearch + "%");
  }
  if (sort === "fan_count") {
    query = query.order("fan_count", { ascending: false });
  } else {
    query = query.order("display_name", { ascending: true });
  }
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((c: any) => ({
    id: c.id,
    user_id: c.user_id ?? "",
    display_name: c.display_name ?? null,
    username: c.username ?? null,
    profile_image_url: c.profile_image_url ?? null,
    fan_count: c.fan_count ?? 0,
  }));
}

export async function getExistingDirectConversation(
  supabase: Supabase,
  userIdA: string,
  userIdB: string
): Promise<string | null> {
  const [resA, resB] = await Promise.all([
    supabase.from("conversation_participant").select("conversation_id").eq("user_id", userIdA),
    supabase.from("conversation_participant").select("conversation_id").eq("user_id", userIdB),
  ]);
  if (resA.error) throw resA.error;
  if (resB.error) throw resB.error;
  const setA = new Set((resA.data ?? []).map((r) => r.conversation_id));
  const intersection = (resB.data ?? []).map((r) => r.conversation_id).filter((id) => setA.has(id));
  if (intersection.length === 0) return null;
  const { data, error } = await supabase
    .from("conversation")
    .select("id")
    .in("id", intersection)
    .eq("type", "private")
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].id : null;
}

export async function createDirectConversation(
  supabase: Supabase,
  currentUserId: string,
  targetUserId: string
): Promise<string> {
  const { data: conv, error: convError } = await supabase
    .from("conversation")
    .insert({ type: "private", created_by: currentUserId })
    .select("id")
    .single();
  if (convError) throw convError;
  const id = conv.id;
  const { error: part1Error } = await supabase
    .from("conversation_participant")
    .insert({ conversation_id: id, user_id: currentUserId });
  if (part1Error) throw part1Error;
  const { error: part2Error } = await supabase
    .from("conversation_participant")
    .insert({ conversation_id: id, user_id: targetUserId });
  if (part2Error) throw part2Error;
  return id;
}

export async function createGroup(
  _supabase: Supabase,
  name: string,
  isPublic: boolean,
): Promise<string> {
  const res = await fetch("/api/groups/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, is_public: isPublic }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  if (!data?.conversation_id) throw new Error("No conversation_id returned");
  return data.conversation_id as string;
}
