"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getConversations } from "@/lib/queries/chat";
import { ConversationList } from "./ConversationList";

interface DirectTabProps {
  userId: string;
  onNewConversation: () => void;
}

export default function DirectTab({ userId, onNewConversation }: DirectTabProps) {
  const t = useTranslations("chat");
  const supabase = createClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations", "direct", userId],
    queryFn: () => getConversations(supabase, userId, "private"),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
        <p className="text-3xl">💬</p>
        <p className="font-semibold text-foreground">{t("direct.empty")}</p>
        <p className="text-sm text-muted-foreground">{t("direct.emptyHint")}</p>
        <button
          onClick={onNewConversation}
          className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("direct.startConversation")}
        </button>
      </div>
    );
  }

  return <ConversationList conversations={data} />;
}
