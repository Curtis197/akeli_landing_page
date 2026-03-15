"use client";

import { Link } from "@/lib/i18n/navigation";
import { useFormatTime } from "@/lib/utils/formatTime";
import type { ConversationListItem } from "@/lib/queries/chat";

interface ConversationListProps {
  conversations: ConversationListItem[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const formatTime = useFormatTime();

  return (
    <ul className="space-y-2">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link
            href={"/chat/" + conv.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0 overflow-hidden">
              {conv.type === "creator_group" && conv.community_group?.cover_url ? (
                <img src={conv.community_group.cover_url} alt="" className="w-full h-full object-cover" />
              ) : conv.type === "creator_group" ? (
                <span>💬</span>
              ) : (
                <span>👤</span>
              )}
            </div>

            {/* Name + unread */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {conv.name ?? "Conversation #" + (conv.id ?? "").slice(0, 8)}
              </p>
            </div>

            {/* Right side: time + unread dot */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{formatTime(conv.updated_at)}</span>
              {conv.unread && (
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
