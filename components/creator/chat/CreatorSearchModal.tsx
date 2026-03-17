"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/navigation";
import {
  getCreators,
  getExistingDirectConversation,
  createDirectConversation,
  CreatorSearchItem,
} from "@/lib/queries/chat";

interface CreatorSearchModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function CreatorSearchModal({
  open,
  onClose,
  currentUserId,
}: CreatorSearchModalProps) {
  const t = useTranslations("chat");
  const supabase = createClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "fan_count">("name");
  const [navigating, setNavigating] = useState(false);

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creators", search, sort],
    queryFn: () => getCreators(supabase, search, sort, currentUserId),
    enabled: open,
  });

  async function handleCreatorClick(creator: CreatorSearchItem) {
    if (navigating) return;
    setNavigating(true);
    try {
      const existingId = await getExistingDirectConversation(
        supabase,
        currentUserId,
        creator.user_id
      );
      if (existingId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/chat/${existingId}` as any);
      } else {
        const newId = await createDirectConversation(
          supabase,
          currentUserId,
          creator.user_id
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/chat/${newId}` as any);
      }
      onClose();
    } catch (err) {
      console.error("Failed to open conversation:", err);
    } finally {
      setNavigating(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("direct.search")}
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            {(["name", "fan_count"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  sort === s
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {s === "name" ? t("direct.sortName") : t("direct.sortFollowers")}
              </button>
            ))}
          </div>
        </div>

        {/* Creator list */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : creators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun créateur trouvé
            </p>
          ) : (
            <ul>
              {creators.map((creator) => (
                <li key={creator.id}>
                  <button
                    onClick={() => handleCreatorClick(creator)}
                    disabled={navigating}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {creator.profile_image_url ? (
                        <img
                          src={creator.profile_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base">&#128100;</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {creator.display_name}
                      </p>
                      {creator.username && (
                        <p className="text-xs text-muted-foreground">
                          @{creator.username}
                        </p>
                      )}
                    </div>
                    {creator.fan_count > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {creator.fan_count} fans
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Navigation loading overlay */}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/70 rounded-2xl">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
