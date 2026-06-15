import { useTranslations } from "next-intl";

export function useFormatTime() {
  const t = useTranslations("chat");
  return function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return t("yesterday");
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: "short" });
    } else {
      return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
    }
  };
}
