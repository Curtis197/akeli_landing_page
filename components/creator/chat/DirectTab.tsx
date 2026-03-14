"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { getConversations } from "@/lib/queries/chat";
import { createClient } from "@/lib/supabase/client";
import { ConversationList } from "./ConversationList";



interface DirectTabProps {
  userId: string;
  onNewConversation: () => void;
}

export function DirectTab({ userId, onNewConversation }: DirectTabProps) {
  const t = useTranslations("chat");
  const supabase = createClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", "direct", userId],
    queryFn: () => getConversations(supabase, userId, "private"),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
        <h3 className="text-xl font-semibold tracking-tight">{t("direct.empty")}</h3>
        <p className="text-sm text-muted-foreground">{t("direct.emptyHint")}</p>
        <button onClick={onNewConversation} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">{t("direct.startConversation")}</button>
      </div>
    );
  }

  return <ConversationList conversations={conversations} />;
}