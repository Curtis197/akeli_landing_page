"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  sender_id: string | null;
  sent_at: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = String(params.id);
  const supabase = createClient();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<string | null>(null);
  const [otherCreatorId, setOtherCreatorId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myUserId = user?.id ?? null;

  // ── Load history ────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_message")
      .select("id, content, sender_id, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (error) console.error("[chat] loadMessages error:", error);
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [conversationId, supabase]);

  useEffect(() => {
    // Load conversation metadata
    supabase
      .from("conversation")
      .select("name, type, closed_at")
      .eq("id", conversationId)
      .single()
      .then(async ({ data }) => {
        const convType = (data as any)?.type ?? null;
        setConversationTitle(data?.name ?? null);
        setConversationType(convType);
        setIsClosed(!!(data as any)?.closed_at);

        // For private conversations, find the other participant via conversation_request
        // (RLS hides other people's conversation_participant rows)
        if (convType === "private" && myUserId) {
          const { data: request, error: requestErr } = await supabase
            .from("conversation_request")
            .select("requester_id, recipient_id")
            .eq("conversation_id", conversationId)
            .maybeSingle();

          console.log("[chat:detail] conversation_request:", request, "error:", requestErr);

          const otherId =
            request?.requester_id === myUserId
              ? request?.recipient_id
              : request?.requester_id;

          console.log("[chat:detail] myUserId:", myUserId, "otherId:", otherId);

          if (otherId) {
            // Try creator first
            const { data: creator, error: creatorErr } = await supabase
              .from("creator")
              .select("id, display_name")
              .eq("user_id", otherId)
              .maybeSingle();
            console.log("[chat:detail] creator lookup:", creator, "error:", creatorErr);
            setOtherCreatorId(creator?.id ?? null);
            if (creator?.display_name) {
              console.log("[chat:detail] using creator display_name:", creator.display_name);
              setConversationTitle(creator.display_name);
            } else {
              // Fallback to user_profile (fan from mobile app)
              const { data: profile, error: profileErr } = await supabase
                .from("user_profile")
                .select("first_name, last_name, username")
                .eq("id", otherId)
                .maybeSingle();
              console.log("[chat:detail] user_profile fallback:", profile, "error:", profileErr);
              if (profile) {
                const name =
                  [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                  profile.username;
                console.log("[chat:detail] using user_profile name:", name);
                if (name) setConversationTitle(name);
              }
            }
          }
        }
      });

    loadMessages();
  }, [conversationId, loadMessages, myUserId, supabase]);

  // ── Supabase Realtime ───────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates (optimistic vs server)
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, myUserId, supabase]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────────

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !myUserId || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      content: text,
      sender_id: myUserId,
      sent_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("chat_message").insert({
      content: text,
      sender_id: myUserId,
      conversation_id: conversationId,
    });

    if (error) {
      console.error("[chat] sendMessage error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    }
    setSending(false);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border shrink-0">
        <button
          onClick={() => {
            const backPath = conversationType === "creator_group" ? "/chat?tab=groups"
              : conversationType === "private" ? "/chat?tab=direct"
              : "/chat";
            router.push(backPath as any);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          aria-label="Retour"
        >
          ←
        </button>
        {conversationType === "private" && otherCreatorId ? (
          <Link
            href={`/dashboard/creators/${otherCreatorId}` as any}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
              👤
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {conversationTitle ?? `Conversation #${conversationId.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">Direct</p>
            </div>
          </Link>
        ) : conversationType === "creator_group" ? (
          <Link
            href={("/chat/groups/" + conversationId) as any}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
              💬
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {conversationTitle ?? `Conversation #${conversationId.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">Groupe</p>
            </div>
          </Link>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {conversationTitle ?? `Conversation #${conversationId.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {conversationType === "support" ? "Support" : "Conversation"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Aucun message. Commence la conversation !</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === myUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="shrink-0 px-4 py-2.5 rounded-xl border border-destructive/40 bg-destructive/5 text-sm text-destructive font-medium text-center">
          Cette conversation est terminée — lecture seule.
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-end gap-3 pt-4 border-t border-border shrink-0"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e as unknown as React.FormEvent);
            }
          }}
          disabled={isClosed}
          placeholder={isClosed ? "Conversation terminée" : "Tape ton message…"}
          rows={1}
          className="flex-1 px-4 py-3 rounded-2xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none max-h-32 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "2.75rem" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || isClosed}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40"
          aria-label="Envoyer"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const timeLabel = new Date(message.sent_at ?? Date.now()).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] space-y-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary text-foreground rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">{timeLabel}</span>
      </div>
    </div>
  );
}
