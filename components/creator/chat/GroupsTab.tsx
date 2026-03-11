"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getConversations, ConversationListItem } from "@/lib/queries/chat";
import { ConversationList } from "./ConversationList";

interface GroupsTabProps {
  userId: string;
}

export default function GroupsTab({ userId }: GroupsTabProps) {
  const t = useTranslations("chat");
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [sort, setSort] = useState<"activity" | "name">("activity");

  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations", "groups", userId],
    queryFn: () => getConversations(supabase, userId, "creator_group"),
    enabled: !!userId,
  });

  // Check if any item has community_group data (to show public/private chips)
  const hasCommunityGroupData = data.some((c) => c.community_group != null);

  const filtered = useMemo(() => {
    let list = [...data];
    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.name ?? "").toLowerCase().includes(q));
    }
    // Filter by public/private
    if (filter !== "all" && hasCommunityGroupData) {
      const isPublic = filter === "public";
      list = list.filter((c) => c.community_group == null || c.community_group.is_public === isPublic);
    }
    // Sort
    if (sort === "activity") {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else {
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }
    return list;
  }, [data, search, filter, sort, hasCommunityGroupData]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("groups.search")}
        className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Filter chips + sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["all", ...(hasCommunityGroupData ? ["public", "private"] : [])] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {f === "all" ? t("groups.filterAll") : f === "public" ? t("groups.filterPublic") : t("groups.filterPrivate")}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="activity">{t("groups.sortActivity")}</option>
          <option value="name">{t("groups.sortName")}</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-2xl mb-2">👥</p>
          <p className="text-sm text-muted-foreground">{t("groups.empty")}</p>
        </div>
      ) : (
        <ConversationList conversations={filtered} />
      )}
    </div>
  );
}
