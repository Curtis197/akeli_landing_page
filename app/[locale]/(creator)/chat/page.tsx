"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRouter } from "@/lib/i18n/navigation";
import { getConversations } from "@/lib/queries/chat";
import { ConversationList } from "@/components/creator/chat/ConversationList";
import GroupsTab from "@/components/creator/chat/GroupsTab";
import { DirectTab } from "@/components/creator/chat/DirectTab";
import NewConversationModal from "@/components/creator/chat/NewConversationModal";
import CreatorSearchModal from "@/components/creator/chat/CreatorSearchModal";
import CreateGroupModal from "@/components/creator/chat/CreateGroupModal";

export default function ChatPage() {
  const t = useTranslations("chat");
  const { user } = useAuthStore();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") ?? "all") as "all" | "groups" | "direct";

  const [newConvOpen, setNewConvOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  function switchTab(tab: string) {
    router.push(("/chat?tab=" + tab) as any, { scroll: false } as any);
  }

  const tabLabels: Record<"all" | "groups" | "direct", string> = {
    all: t("tabs.all" as any),
    groups: t("tabs.groups" as any),
    direct: t("tabs.direct" as any),
  };

  const { data: allConvs = [], isLoading: allLoading } = useQuery({
    queryKey: ["conversations", "all", user?.id],
    queryFn: () => getConversations(supabase, user!.id),
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <button
          onClick={() => setNewConvOpen(true)}
          aria-label={t("newConversation" as any)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl hover:bg-primary/90 transition-colors"
        >
          +
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-4">
        {(["all", "groups", "direct"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "all" && (
        <div>
          {allLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allConvs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <p className="text-3xl">💬</p>
              <p className="font-semibold text-foreground">{t("noConversations")}</p>
              <p className="text-sm text-muted-foreground">{t("noConversationsHint")}</p>
            </div>
          ) : (
            <ConversationList conversations={allConvs} />
          )}
        </div>
      )}

      {activeTab === "groups" && user?.id && <GroupsTab userId={user.id} />}
      {activeTab === "direct" && user?.id && (
        <DirectTab
          userId={user.id}
          onNewConversation={() => {
            setNewConvOpen(false);
            setDirectOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onSelectDirect={() => {
          setNewConvOpen(false);
          setDirectOpen(true);
        }}
        onSelectGroup={() => {
          setNewConvOpen(false);
          setGroupOpen(true);
        }}
      />
      <CreatorSearchModal
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        currentUserId={user?.id ?? ""}
      />
      <CreateGroupModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
