"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface PayoutRow {
  id: string;
  stripe_payout_id: string | null;
  total_earnings: number;
  period_start: string;
  period_end: string;
  status: string;
}

const FAN_MODE_THRESHOLD = 30;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FanModePage() {
  const supabase = createClient();
  const { creator } = useAuthStore();

  const recipeCount = creator?.recipe_count ?? 0;
  const isUnlocked = recipeCount >= FAN_MODE_THRESHOLD;
  const remaining = FAN_MODE_THRESHOLD - recipeCount;
  const pct = Math.min(Math.round((recipeCount / FAN_MODE_THRESHOLD) * 100), 100);

  const [stats, setStats] = useState<FanStats | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
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
        .from("creator_payout")
        .select("id, stripe_payout_id, total_earnings, period_start, period_end, status")
        .eq("creator_id", creator.id)
        .order("period_start", { ascending: false })
        .limit(12),
    ]).then(([statsRes, payoutsRes]) => {
      if (statsRes.data) setStats(statsRes.data as FanStats);
      if (payoutsRes.data) setPayouts(payoutsRes.data as PayoutRow[]);
      setLoading(false);
    });
  }, [creator, isUnlocked, supabase]);

  if (!isUnlocked) {
    return <LockedState recipeCount={recipeCount} remaining={remaining} pct={pct} />;
  }

  return <UnlockedState stats={stats} payouts={payouts} loading={loading} />;
}

// ─── LockedState ──────────────────────────────────────────────────────────────

function LockedState({
  recipeCount,
  remaining,
  pct,
}: {
  recipeCount: number;
  remaining: number;
  pct: number;
}) {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Mode Fan</h1>

      <div className="rounded-xl border border-border bg-card p-8 space-y-6 max-w-xl">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-3xl mx-auto">
          ⭐
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Débloque le Mode Fan</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le Mode Fan te permet d'activer un abonnement mensuel pour tes fans les plus fidèles.
            Génère des revenus récurrents en publiant au moins{" "}
            <strong className="text-foreground">{FAN_MODE_THRESHOLD} recettes</strong>.
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Progression</span>
            <span className="text-muted-foreground">
              {recipeCount} / {FAN_MODE_THRESHOLD} recettes publiées
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {remaining} recette{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} avant le déblocage.
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2">
          {[
            "Abonnement mensuel pour tes fans à partir de 3 €/mois",
            "Revenus récurrents et prévisibles",
            "Badge « Mode Fan » sur ton profil public",
            "Accès à des statistiques fans avancées",
          ].map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary mt-0.5 shrink-0">✓</span>
              {benefit}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard/recipes/new"
          className="block w-full text-center px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Créer une recette
        </Link>
      </div>
    </div>
  );
}

// ─── UnlockedState ────────────────────────────────────────────────────────────

function UnlockedState({
  stats,
  payouts,
  loading,
}: {
  stats: FanStats | null;
  payouts: PayoutRow[];
  loading: boolean;
}) {
  const diff = stats
    ? stats.revenue_current_month - stats.revenue_last_month
    : 0;
  const diffLabel =
    diff >= 0
      ? `+${diff.toFixed(2)} € vs mois précédent`
      : `${diff.toFixed(2)} € vs mois précédent`;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Mode Fan</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
          Actif ⭐
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Fans actifs"
          value={loading ? null : String(stats?.fan_count ?? 0)}
        />
        <StatCard
          label="Revenus fans ce mois"
          value={loading ? null : `${(stats?.revenue_current_month ?? 0).toFixed(2)} €`}
          sub={!loading ? diffLabel : undefined}
        />
        <StatCard
          label="Revenus fans mois précédent"
          value={loading ? null : `${(stats?.revenue_last_month ?? 0).toFixed(2)} €`}
        />
      </div>

      {/* Monthly chart */}
      {!loading && stats && stats.monthly_history.length > 0 && (
        <FanRevenueChart history={stats.monthly_history} />
      )}

      {/* Payouts */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Historique des paiements</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré pour le moment.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Période
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground">
                      {formatPeriod(p.period_start, p.period_end)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {p.total_earnings.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PayoutBadge status={p.status} />
                    </td>
                  </tr>
                ))}
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
      {value === null ? (
        <div className="h-8 w-24 rounded bg-secondary animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{value}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── FanRevenueChart ──────────────────────────────────────────────────────────

function FanRevenueChart({ history }: { history: MonthlyRevenue[] }) {
  const maxVal = Math.max(...history.map((m) => m.fan_revenue), 1);
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Revenus fans — 6 derniers mois
      </h2>
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
                {m.month.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── PayoutBadge ──────────────────────────────────────────────────────────────

function PayoutBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    paid: {
      label: "Payé",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    pending: {
      label: "En attente",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    failed: {
      label: "Échoué",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };
  const cfg = configs[status] ?? {
    label: status,
    className: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} → ${fmt(end)}`;
}
