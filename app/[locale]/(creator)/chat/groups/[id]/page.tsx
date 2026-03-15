"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  name: string | null;
  type: string | null;
  community_group_id: string | null;
  updated_at: string | null;
}

interface CommunityGroup {
  id: string;
  name: string | null;
  description: string | null;
  cover_url: string | null;
  is_public: boolean | null;
  member_count: number | null;
  created_at: string | null;
}

interface Creator {
  id: string;
  display_name: string | null;
  username: string | null;
  profile_image_url: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const params = useParams();
  const conversationId = String(params.id);
  const supabase = createClient();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from("conversation")
        .select("id, name, type, community_group_id, updated_at")
        .eq("id", conversationId)
        .single();

      if (convError || !convData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setConversation(convData as Conversation);

      // 2. Fetch community group
      if (convData.community_group_id) {
        const { data: groupData } = await supabase
          .from("community_group")
          .select("id, name, description, cover_url, is_public, member_count, created_at")
          .eq("id", convData.community_group_id)
          .single();

        if (groupData) {
          setGroup(groupData as CommunityGroup);
        }
      }

      // 3. Fetch members
      const { data: participants } = await supabase
        .from("conversation_participant")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (participants && participants.length > 0) {
        const userIds = participants.map((p: { user_id: string }) => p.user_id);

        const { data: creatorsData } = await supabase
          .from("creator")
          .select("id, display_name, username, profile_image_url")
          .in("user_id", userIds);

        if (creatorsData) {
          setMembers(creatorsData as Creator[]);
        }
      }

      setLoading(false);
    }

    load();
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back skeleton */}
        <div className="h-5 w-24 bg-secondary rounded animate-pulse" />
        {/* Cover skeleton */}
        <div className="h-48 rounded-2xl bg-secondary animate-pulse" />
        {/* Title skeleton */}
        <div className="h-7 w-48 bg-secondary rounded animate-pulse" />
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-secondary rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
        </div>
        {/* Members skeleton */}
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold text-foreground">Groupe introuvable</p>
        <Link
          href={"/chat?tab=groups" as any}
          className="text-sm text-primary hover:underline"
        >
          ← Messages
        </Link>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const groupName = group?.name ?? conversation.name ?? `Groupe #${conversationId.slice(0, 8)}`;
  const isPublic = group?.is_public ?? true;
  const memberCount = group?.member_count ?? members.length;
  const createdAt = group?.created_at
    ? new Date(group.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={"/chat?tab=groups" as any}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Messages
      </Link>

      {/* Cover */}
      {group?.cover_url ? (
        <img
          src={group.cover_url}
          alt={groupName}
          className="w-full h-48 object-cover rounded-2xl"
        />
      ) : (
        <div className="w-full h-48 rounded-2xl bg-secondary flex items-center justify-center text-5xl">
          💬
        </div>
      )}

      {/* Name + badge */}
      <div className="flex items-start gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground flex-1">{groupName}</h1>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
            isPublic
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {isPublic ? "Public" : "Privé"}
        </span>
      </div>

      {/* Description */}
      {group?.description && (
        <p className="text-muted-foreground leading-relaxed">{group.description}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-foreground font-semibold">{memberCount}</span>
          membre{memberCount !== 1 ? "s" : ""}
        </div>
        {createdAt && (
          <div className="text-sm text-muted-foreground">
            Créé le <span className="text-foreground">{createdAt}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/chat/${conversationId}` as any}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Ouvrir la conversation
      </Link>

      {/* Members */}
      {members.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            Membres ({members.length})
          </h2>
          <div className="flex flex-col gap-3">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: { id: string; display_name: string | null; username: string | null; profile_image_url: string | null } }) {
  const initials = (member.display_name ?? member.username ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const inner = (
    <div className="flex items-center gap-3">
      {member.profile_image_url ? (
        <img
          src={member.profile_image_url}
          alt={member.display_name ?? member.username ?? ""}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.display_name ?? member.username ?? "Créateur"}
        </p>
        {member.username && (
          <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
        )}
      </div>
    </div>
  );

  if (member.username) {
    return (
      <Link
        href={`/creator/${member.username}` as any}
        className="hover:opacity-80 transition-opacity"
      >
        {inner}
      </Link>
    );
  }

  return <div>{inner}</div>;
}
