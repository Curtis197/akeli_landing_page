"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FanStats {
  fan_count: number;
  revenue_current_month: number;
  revenue_last_month: number;
  monthly_history: MonthlyRevenue[];
}

interface MonthlyRevenue {
  month: string;
  fan_revenue: number;
  consumption_revenue: number;
}

interface FanRow {
  id: string;
  user_id: string | null;
  subscribed_at: string | null;
  status: string | null;
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const FAN_MODE_THRESHOLD = 30;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FanModePage() {
  const t = useTranslations("fanMode");
  const supabase = createClient();
  const { creator } = useAuthStore();

  const recipeCount = creator?.recipe_count ?? 0;
  const isUnlocked = recipeCount >= FAN_MODE_THRESHOLD;
  const remaining = FAN_MODE_THRESHOLD - recipeCount;
  const pct = Math.min(Math.round((recipeCount / FAN_MODE_THRESHOLD) * 100), 100);

  const [stats, setStats] = useState<FanStats | null>(null);
  const [fans, setFans] = useState<FanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creator || !isUnlocked) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("creator_dashboard_stats")
        .select("fan_count, revenue_current_month, revenue_last_month, monthly_history")
        .eq("creator_id", creator.id)
        .single(),
      supabase
        .from("fan_subscription")
        .select("id, user_id, subscribed_at, status, user_profile:user_id(first_name, last_name, username, avatar_url)")
        .eq("creator_id", creator.id)
        .order("subscribed_at", { ascending: false }),
    ]).then(([statsRes, fansRes]) => {
      if (statsRes.data) setStats(statsRes.data as FanStats);
      if (fansRes.data) setFans(fansRes.data as unknown as FanRow[]);
      setLoading(false);
    });
  }, [creator, isUnlocked, supabase]);

  if (!isUnlocked) {
    return <LockedState recipeCount={recipeCount} remaining={remaining} pct={pct} t={t} />;
  }

  return <UnlockedState stats={stats} fans={fans} loading={loading} t={t} />;
}

// ─── LockedState ──────────────────────────────────────────────────────────────

function LockedState({
  recipeCount,
  remaining,
  pct,
  t,
}: {
  recipeCount: number;
  remaining: number;
  pct: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const tNav = useTranslations("nav");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">{tNav("fanMode")}</h1>

      <div className="rounded-xl border border-border bg-card p-8 space-y-6 max-w-xl">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-3xl mx-auto">
          ⭐
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">{t("lockedTitle")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("lockedDescription", { count: FAN_MODE_THRESHOLD })}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">{t("progress")}</span>
            <span className="text-muted-foreground">
              {recipeCount} / {FAN_MODE_THRESHOLD} {t("recipesPublished")}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("remaining", { count: remaining })}
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2">
          {([0, 1, 2, 3] as const).map((i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary mt-0.5 shrink-0">✓</span>
              {t(`benefits.${i}`)}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard/recipes/new"
          className="block w-full text-center px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("createRecipe")}
        </Link>
      </div>
    </div>
  );
}

// ─── UnlockedState ────────────────────────────────────────────────────────────

function UnlockedState({
  stats,
  fans,
  loading,
  t,
}: {
  stats: FanStats | null;
  fans: FanRow[];
  loading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const tNav = useTranslations("nav");
  const diff = stats
    ? stats.revenue_current_month - stats.revenue_last_month
    : 0;
  const diffLabel =
    diff >= 0
      ? `+${diff.toFixed(2)} € ${t("vsPrevMonth")}`
      : `${diff.toFixed(2)} € ${t("vsPrevMonth")}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{tNav("fanMode")}</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
          {t("active")}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t("activeFans")}
          value={loading ? null : String(stats?.fan_count ?? 0)}
        />
        <StatCard
          label={t("revenueThisMonth")}
          value={loading ? null : `${(stats?.revenue_current_month ?? 0).toFixed(2)} €`}
          sub={!loading ? diffLabel : undefined}
        />
        <StatCard
          label={t("revenueLastMonth")}
          value={loading ? null : `${(stats?.revenue_last_month ?? 0).toFixed(2)} €`}
        />
      </div>

      {/* Monthly chart */}
      {!loading && stats && stats.monthly_history.length > 0 && (
        <FanRevenueChart history={stats.monthly_history} />
      )}

      {/* Fan list */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t("fanList")}</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("noFans")}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("fanName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("subscribedAt")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fans.map((fan) => {
                  const profile = fan.user_profile;
                  const name = profile
                    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                      profile.username ||
                      (fan.user_id?.slice(0, 8) ?? "—")
                    : (fan.user_id?.slice(0, 8) ?? "—");
                  const avatar = profile?.avatar_url;
                  return (
                    <tr key={fan.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm shrink-0 overflow-hidden">
                            {avatar ? (
                              <img src={avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>👤</span>
                            )}
                          </div>
                          <span className="font-medium text-foreground">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fan.subscribed_at
                          ? new Date(fan.subscribed_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FanStatusBadge status={fan.status ?? ""} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | null;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      {value && <p className="text-2xl font-bold text-foreground">{value}</p>}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── FanRevenueChart ──────────────────────────────────────────────────────────

function FanRevenueChart({ history }: { history: MonthlyRevenue[] }) {
  const t = useTranslations("fanMode");
  const maxVal = Math.max(...history.map((m) => m.fan_revenue), 1);
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">{t("chart")}</h2>
      <div className="flex items-end gap-3 h-32">
        {history.slice(-6).map((m) => {
          const pct = (m.fan_revenue / maxVal) * 100;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary rounded-t"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${m.fan_revenue.toFixed(2)} €`}
              />
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {(m.month ?? "").slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── FanStatusBadge ───────────────────────────────────────────────────────────

function FanStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    active: {
      label: "Actif",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    cancelled: {
      label: "Annulé",
      className: "bg-secondary text-muted-foreground",
    },
    past_due: {
      label: "Impayé",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };
  const cfg = configs[status] ?? {
    label: status || "—",
    className: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
