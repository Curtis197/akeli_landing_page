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
  const { data: participations, error: partError } = await supabase
    .from("conversation_participant")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
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

  // For private conversations, look up the other participant's creator display_name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const privateConvIds = (conversations as any[])
    .filter((c) => c.type === "private")
    .map((c) => c.id as string);

  const privateNameMap = new Map<string, string>();
  if (privateConvIds.length > 0) {
    console.log("[chat:getConversations] private conv ids:", privateConvIds);

    // RLS only exposes your own conversation_participant row, so we use
    // conversation_request which stores both requester_id and recipient_id.
    const { data: requests, error: requestsError } = await supabase
      .from("conversation_request")
      .select("conversation_id, requester_id, recipient_id")
      .in("conversation_id", privateConvIds);

    console.log("[chat:getConversations] conversation_request rows:", requests, "error:", requestsError);

    if (requests && requests.length > 0) {
      // The "other" user is whichever side is not the current user
      const otherPairs: { convId: string; otherUserId: string }[] = [];
      for (const r of requests) {
        if (!r.conversation_id) continue;
        const other = r.requester_id === userId ? r.recipient_id : r.requester_id;
        if (other) otherPairs.push({ convId: r.conversation_id, otherUserId: other });
      }

      console.log("[chat:getConversations] other user pairs:", otherPairs);

      const otherUserIds = [...new Set(otherPairs.map((p) => p.otherUserId))];

      // First try creator table
      const { data: creators, error: creatorsError } = await supabase
        .from("creator")
        .select("user_id, display_name")
        .in("user_id", otherUserIds);

      console.log("[chat:getConversations] creators found:", creators, "error:", creatorsError);

      const nameByUserId = new Map<string, string>();
      for (const c of creators ?? []) {
        if (c.user_id) nameByUserId.set(c.user_id, c.display_name);
      }

      // Fallback to user_profile for non-creators (fans from mobile app)
      const missingIds = otherUserIds.filter((id) => !nameByUserId.has(id));
      console.log("[chat:getConversations] missing from creator (trying user_profile):", missingIds);

      if (missingIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profile")
          .select("id, first_name, last_name, username")
          .in("id", missingIds);
        console.log("[chat:getConversations] user_profile fallback:", profiles, "error:", profilesError);
        for (const p of profiles ?? []) {
          const name =
            [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username;
          if (name) nameByUserId.set(p.id, name);
        }
      }

      for (const { convId, otherUserId } of otherPairs) {
        const name = nameByUserId.get(otherUserId);
        console.log(`[chat:getConversations] conv ${convId} → user ${otherUserId} → name: ${name ?? "(not found)"}`);
        if (name) privateNameMap.set(convId, name);
      }
    }
  }
  console.log("[chat:getConversations] final privateNameMap:", Object.fromEntries(privateNameMap));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (conversations as any[]).map((conv) => {
    const lastReadAt = lastReadMap.get(conv.id) ?? null;
    const updatedAt: string = conv.updated_at ?? new Date(0).toISOString();
    const unread = lastReadAt === null || lastReadAt < updatedAt;
    const item: ConversationListItem = {
      id: conv.id,
      name: conv.type === "private"
        ? (privateNameMap.get(conv.id) ?? conv.name ?? null)
        : (conv.name ?? null),
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
  sort: "name" | "fan_count" = "name",
  excludeUserId?: string
): Promise<CreatorSearchItem[]> {
  const safeSearch = search.replace(/%/g, "\%").replace(/_/g, "\_");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("creator")
    .select("id, display_name, username, profile_image_url, fan_count, user_id")
    .limit(50);
  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }
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
  _supabase: Supabase,
  _currentUserId: string,
  targetUserId: string
): Promise<string> {
  const res = await fetch("/api/conversations/create-direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  if (!data?.conversation_id) throw new Error("No conversation_id returned");
  return data.conversation_id as string;
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
