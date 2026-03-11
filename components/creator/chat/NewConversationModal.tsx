"use client";

import { useTranslations } from "next-intl";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDirect: () => void;
  onSelectGroup: () => void;
}

export default function NewConversationModal({
  open,
  onClose,
  onSelectDirect,
  onSelectGroup,
}: NewConversationModalProps) {
  const t = useTranslations("chat");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl p-6 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">{t("newConversation")}</h2>
        <button
          onClick={onSelectDirect}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:bg-secondary/30 transition-colors text-left"
        >
          <span className="text-xl">👤</span>
          <div>
            <p className="text-sm font-medium text-foreground">{t("startDirect")}</p>
          </div>
        </button>
        <button
          onClick={onSelectGroup}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:bg-secondary/30 transition-colors text-left"
        >
          <span className="text-xl">👥</span>
          <div>
            <p className="text-sm font-medium text-foreground">{t("createGroup")}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
