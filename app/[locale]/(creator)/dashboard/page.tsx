"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  revenue_current_month: number;
  revenue_last_month: number;
  consumptions_current_month: number;
  fan_count: number;
  recipe_count_published: number;
  top_recipes: TopRecipe[];
  monthly_history: MonthlyRevenue[];
}

interface TopRecipe {
  id: string;
  title: string;
  cover_image_url: string | null;
  consumptions: number;
  revenue: number;
}

interface MonthlyRevenue {
  month: string;
  fan_revenue: number;
  consumption_revenue: number;
}

const EMPTY_STATS: DashboardStats = {
  revenue_current_month: 0,
  revenue_last_month: 0,
  consumptions_current_month: 0,
  fan_count: 0,
  recipe_count_published: 0,
  top_recipes: [],
  monthly_history: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient();
  const { creator } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const isAdvanced = (creator?.recipe_count ?? 0) >= 10;
  const fanTarget = 30;
  const fanCurrent = Math.min(creator?.recipe_count ?? 0, fanTarget);

  useEffect(() => {
    if (!creator) return;
    setLoading(true);
    supabase
      .from("creator_dashboard_stats")
      .select("*")
      .eq("creator_id", creator.id)
      .single()
      .then(({ data }) => {
        if (data) setStats(data as DashboardStats);
        setLoading(false);
      }, () => setLoading(false));
  }, [creator, supabase]);

  async function fetchAiInsight() {
    if (!creator) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const { data } = await supabase.functions.invoke("explain-creator-stats", {
        body: { creator_id: creator.id },
      });
      setAiInsight(data?.insight ?? "Aucune analyse disponible pour le moment.");
    } catch {
      setAiInsight("Impossible de charger l'analyse. Réessaie dans quelques instants.");
    } finally {
      setAiLoading(false);
    }
  }

  const firstName = creator?.display_name?.split(" ")[0] ?? "toi";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {firstName} 👋
        </h1>
        <button
          onClick={() => {
            setAiPanelOpen(true);
            if (!aiInsight) fetchAiInsight();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          💬 Explique-moi mes stats
        </button>
      </div>

      {/* Stats */}
      {isAdvanced ? (
        <AdvancedStats stats={stats} loading={loading} />
      ) : (
        <SimpleStats stats={stats} loading={loading} />
      )}

      {/* Top recettes */}
      <TopRecipes
        recipes={stats.top_recipes}
        loading={loading}
        limit={isAdvanced ? 5 : 3}
      />

      {/* Progression Mode Fan */}
      {fanCurrent < fanTarget && (
        <FanModeProgress current={fanCurrent} target={fanTarget} />
      )}

      {/* Graphique revenus (avancé seulement) */}
      {isAdvanced && stats.monthly_history.length > 0 && (
        <RevenueChart history={stats.monthly_history} />
      )}

      {/* Panneau IA */}
      {aiPanelOpen && (
        <AiInsightPanel
          insight={aiInsight}
          loading={aiLoading}
          onClose={() => setAiPanelOpen(false)}
          onRefresh={fetchAiInsight}
        />
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      {value && <p className="text-2xl font-bold text-foreground">{value}</p>}
    </div>
  );
}

// ─── SimpleStats ──────────────────────────────────────────────────────────────

function SimpleStats({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Revenus ce mois" value={`${stats.revenue_current_month.toFixed(2)} €`} loading={loading} />
      <StatCard label="Consommations" value={String(stats.consumptions_current_month)} loading={loading} />
      <StatCard label="Recettes publiées" value={String(stats.recipe_count_published)} loading={loading} />
    </div>
  );
}

// ─── AdvancedStats ────────────────────────────────────────────────────────────

function AdvancedStats({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  const diff = stats.revenue_current_month - stats.revenue_last_month;
  const diffLabel = diff >= 0 ? `+${diff.toFixed(2)} € vs mois précédent` : `${diff.toFixed(2)} € vs mois précédent`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Revenus ce mois" value={`${stats.revenue_current_month.toFixed(2)} €`} loading={loading} />
        <StatCard label="Mois précédent" value={`${stats.revenue_last_month.toFixed(2)} €`} loading={loading} />
        <StatCard label="Consommations" value={String(stats.consumptions_current_month)} loading={loading} />
        <StatCard label="Fans actifs" value={String(stats.fan_count)} loading={loading} />
      </div>
      {!loading && (
        <p className="text-xs text-muted-foreground pl-1">{diffLabel}</p>
      )}
    </div>
  );
}

// ─── TopRecipes ───────────────────────────────────────────────────────────────

function TopRecipes({
  recipes,
  loading,
  limit,
}: {
  recipes: TopRecipe[];
  loading: boolean;
  limit: number;
}) {
  const displayed = recipes.slice(0, limit);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Top {limit} recettes
        </h2>
        <Link href="/dashboard/recipes" className="text-sm text-primary hover:underline">
          Voir toutes →
        </Link>
      </div>

      {!loading && displayed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune recette publiée pour l'instant.</p>
          <Link
            href="/dashboard/recipes/new"
            className="mt-3 inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Créer ma première recette
          </Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {displayed.map((recipe, i) => (
            <li
              key={recipe.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
            >
              <span className="w-5 text-sm font-bold text-muted-foreground text-center shrink-0">
                {i + 1}.
              </span>
              {recipe.cover_image_url ? (
                <img
                  src={recipe.cover_image_url}
                  alt={recipe.title}
                  className="w-12 h-12 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-secondary shrink-0 flex items-center justify-center text-lg">
                  🍽️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{recipe.title}</p>
                <p className="text-xs text-muted-foreground">{recipe.consumptions} consommations</p>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0">
                {recipe.revenue.toFixed(2)} €
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─── FanModeProgress ──────────────────────────────────────────────────────────

function FanModeProgress({ current, target }: { current: number; target: number }) {
  const remaining = target - current;
  const pct = Math.round((current / target) * 100);

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Mode Fan</h2>
        <span className="text-xs text-muted-foreground">{current}/{target} recettes</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Il te manque{" "}
        <strong className="text-foreground">
          {remaining} recette{remaining > 1 ? "s" : ""}
        </strong>{" "}
        pour activer le Mode Fan.
      </p>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href="/dashboard/recipes/new"
        className="inline-block text-sm text-primary font-medium hover:underline"
      >
        → Créer une recette
      </Link>
    </section>
  );
}

// ─── RevenueChart ─────────────────────────────────────────────────────────────

function RevenueChart({ history }: { history: MonthlyRevenue[] }) {
  const maxTotal = Math.max(
    ...history.map((m) => m.fan_revenue + m.consumption_revenue),
    1
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Évolution des revenus (6 derniers mois)
      </h2>
      <div className="flex items-end gap-3 h-36">
        {history.slice(-6).map((m) => {
          const total = m.fan_revenue + m.consumption_revenue;
          const totalPct = (total / maxTotal) * 100;
          const fanPct = total > 0 ? (m.fan_revenue / total) * 100 : 0;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t overflow-hidden flex flex-col justify-end"
                style={{ height: `${totalPct}%`, minHeight: 4 }}
              >
                <div className="w-full bg-primary/50" style={{ height: `${fanPct}%` }} />
                <div className="w-full bg-primary" style={{ height: `${100 - fanPct}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {m.month.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Consommations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/50 inline-block" /> Fans
        </span>
      </div>
    </section>
  );
}

// ─── AiInsightPanel ───────────────────────────────────────────────────────────

function AiInsightPanel({
  insight,
  loading,
  onClose,
  onRefresh,
}: {
  insight: string | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Analyse de tes performances
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {insight ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{insight}</p>
          ): null}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
          >
            🔄 Régénérer l'analyse
          </button>
        </div>
      </div>
    </>
  );
}
