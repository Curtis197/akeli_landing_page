"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  read_by: string[];
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const myUserId = user?.id ?? null;

  // ── Load history ────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_message")
      .select("id, content, user_id, created_at, read_by")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [conversationId, supabase]);

  useEffect(() => {
    // Load conversation title
    supabase
      .from("conversation")
      .select("name, type")
      .eq("id", conversationId)
      .single()
      .then(({ data }) => {
        setConversationTitle(data?.name ?? null);
        setConversationType((data as any)?.type ?? null);
      });

    loadMessages();
  }, [conversationId, loadMessages, supabase]);

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
          // Mark as read if not sent by self
          if (myUserId && newMsg.user_id !== myUserId) {
            markAsRead(newMsg.id);
          }
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

  // ── Mark read ───────────────────────────────────────────────────────────────

  async function markAsRead(messageId: number) {
    if (!myUserId) return;
    // Append creator's user_id to read_by array
    await supabase.rpc("append_read_by", {
      message_id: messageId,
      reader_user_id: myUserId,
    });
  }

  // Mark all incoming messages as read on load
  useEffect(() => {
    if (!myUserId || messages.length === 0) return;
    messages
      .filter((m) => m.user_id !== myUserId && !m.read_by?.includes(myUserId))
      .forEach((m) => markAsRead(m.id));
  }, [messages, myUserId]);

  // ── Send message ─────────────────────────────────────────────────────────────

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !myUserId || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimistic: Message = {
      id: Date.now(), // temp id
      content: text,
      user_id: myUserId,
      created_at: new Date().toISOString(),
      read_by: [myUserId],
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await supabase.from("chat_message").insert({
        content: text,
        user_id: myUserId,
        conversation_id: conversationId,
        received: false,
        read_by: [myUserId],
      });
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
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
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {conversationTitle ?? `Conversation #${conversationId.slice(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {conversationType === "creator_group" ? "Groupe"
              : conversationType === "private" ? "Direct"
              : conversationType === "support" ? "Support"
              : "Conversation"}
          </p>
        </div>
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
              isOwn={msg.user_id === myUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

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
          placeholder="Tape ton message…"
          rows={1}
          className="flex-1 px-4 py-3 rounded-2xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none max-h-32 overflow-y-auto"
          style={{ minHeight: "2.75rem" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
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
  const timeLabel = new Date(message.created_at).toLocaleTimeString("fr-FR", {
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
