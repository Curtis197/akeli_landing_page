"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  name: string | null;
  type: string | null;
  community_group_id: string | null;
  updated_at: string | null;
  created_by: string | null;
  closed_at: string | null;
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
  const router = useRouter();
  const { user } = useAuthStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from("conversation")
        .select("id, name, type, community_group_id, updated_at, created_by, closed_at")
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

  async function closeGroup() {
    if (closing) return;
    setClosing(true);
    const { error } = await supabase
      .from("conversation")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (!error) {
      setConversation((prev) => prev ? { ...prev, closed_at: new Date().toISOString() } : prev);
      router.push("/chat?tab=groups" as any);
    }
    setClosing(false);
  }

  async function deleteGroup() {
    if (deleting) return;
    setDeleting(true);
    try {
      // Delete child records first in case FK lacks CASCADE
      await supabase.from("chat_message").delete().eq("conversation_id", conversationId);
      await supabase.from("conversation_participant").delete().eq("conversation_id", conversationId);
      const { error } = await supabase.from("conversation").delete().eq("id", conversationId);
      if (error) throw error;
      if (conversation?.community_group_id) {
        await supabase.from("community_group").delete().eq("id", conversation.community_group_id);
      }
      router.push("/chat?tab=groups" as any);
    } catch (err) {
      console.error("Delete group failed:", err);
      alert("La suppression a échoué. Veuillez réessayer.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
  const isAdmin = user?.id === conversation.created_by;
  const isClosed = !!conversation.closed_at;
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

      {/* Closed banner */}
      {isClosed && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive font-medium">
          Ce groupe a été fermé. La conversation est en lecture seule.
        </div>
      )}

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={`/chat/${conversationId}` as any}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Ouvrir la conversation
        </Link>
        {isAdmin && !isClosed && (
          <button
            onClick={closeGroup}
            disabled={closing}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {closing ? "Fermeture…" : "Fermer le groupe"}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-destructive/60 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            Supprimer le groupe
          </button>
        )}
      </div>

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

      {/* Delete group confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmDelete(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Supprimer le groupe ?</h2>
              <p className="text-sm text-muted-foreground">
                Tous les messages et membres seront définitivement supprimés. Cette action est irréversible.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteGroup}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </>
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
