"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id: string;
  resume: string | null;
  created_at: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const supabase = createClient();
  const { creator } = useAuthStore();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creator?.user_id) {
      setLoading(false);
      return;
    }
    loadConversations();
  }, [creator]);

  async function loadConversations() {
    if (!creator?.user_id) return;
    setLoading(true);
    try {
      // Get conversations where the creator is a participant
      const { data: participations } = await supabase
        .from("conversation_participant")
        .select("conversation_id")
        .eq("user_id", creator.user_id);

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

      const { data: convs } = await supabase
        .from("conversation")
        .select("id, resume, created_at")
        .in("id", convIds)
        .order("created_at", { ascending: false });

      if (!convs) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each conversation, get last message
      const enriched = await Promise.all(
        convs.map(async (c) => {
          const { data: messages } = await supabase
            .from("chat_message")
            .select("content, created_at, read_by, user_id")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const last = messages?.[0] ?? null;

          // Count unread: messages not sent by creator and not in read_by
          const { count } = await supabase
            .from("chat_message")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("user_id", creator.user_id ?? 0)
            .not("read_by", "cs", `{${creator.user_id}}`);

          return {
            id: String(c.id),
            resume: c.resume ?? null,
            created_at: c.created_at,
            lastMessage: last?.content ?? null,
            lastMessageAt: last?.created_at ?? null,
            unreadCount: count ?? 0,
          } satisfies ConversationItem;
        })
      );

      setConversations(enriched);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Messages</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <ConversationRow key={c.id} conv={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: ConversationItem }) {
  const timeLabel = conv.lastMessageAt
    ? formatTime(conv.lastMessageAt)
    : formatTime(conv.created_at);

  return (
    <li>
      <Link
        href={`/dashboard/chat/${conv.id}`}
        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
      >
        {/* Avatar placeholder */}
        <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
          👤
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground truncate">
            {conv.resume ?? `Conversation #${conv.id.slice(0, 8)}`}
          </p>
          {conv.lastMessage && (
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
          {conv.unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
      <p className="text-3xl">💬</p>
      <p className="font-semibold text-foreground">Aucune conversation</p>
      <p className="text-sm text-muted-foreground">
        Tes fans pourront te contacter depuis l'application mobile.
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  } else {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  }
}
