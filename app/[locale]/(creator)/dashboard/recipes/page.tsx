"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { getRecipePerformance, type SortKey, type RecipePerformance } from "@/lib/queries/recipe-performance";
import { formatEuro } from "@/lib/utils/format";

type StatusFilter = "all" | "published" | "draft";

interface Recipe {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  region: string | null;
  difficulty: string | null;
  created_at: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile", medium: "Moyen", hard: "Difficile",
};

export default function RecipesListPage() {
  const supabase = createClient();
  const router = useRouter();
  const { creator } = useAuthStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [performance, setPerformance] = useState<Map<string, RecipePerformance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [perfSortBy, setPerfSortBy] = useState<SortKey>("revenue_this_month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!creator) return;
    setLoading(true);
    try {
      const [{ data }, perfData] = await Promise.all([
        supabase
          .from("recipe")
          .select("id, slug, title, cover_image_url, is_published, region, difficulty, created_at")
          .eq("creator_id", creator.id)
          .order("created_at", { ascending: false }),
        getRecipePerformance(supabase, creator.id, perfSortBy),
      ]);
      if (data) setRecipes(data);
      const map = new Map<string, RecipePerformance>();
      for (const p of perfData) map.set(p.recipe_id, p);
      setPerformance(map);
    } finally {
      setLoading(false);
    }
  }, [creator, perfSortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function togglePublish(id: string, currentlyPublished: boolean) {
    setActionLoading(id);
    try {
      await supabase.from("recipe").update({ is_published: !currentlyPublished }).eq("id", id);
      if (!currentlyPublished) supabase.functions.invoke("translate-recipe", { body: { recipe_id: id } });
      setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, is_published: !currentlyPublished } : r));
    } finally { setActionLoading(null); }
  }

  async function duplicateRecipe(id: string) {
    setActionLoading(id);
    try {
      const { data: source } = await supabase.from("recipe").select("*").eq("id", id).single();
      if (!source) return;
      const { data: copy } = await supabase
        .from("recipe")
        .insert({ ...source, id: undefined, title: source.title + " (copie)", slug: null, is_published: false, created_at: undefined })
        .select("id").single();
      if (copy) router.push(("/dashboard/recipes/" + copy.id + "/edit") as any);
    } finally { setActionLoading(null); }
  }

  async function deleteRecipe(id: string) {
    setActionLoading(id);
    try {
      await supabase.from("recipe").delete().eq("id", id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } finally { setActionLoading(null); setConfirmDelete(null); }
  }

  async function fetchAiInsight() {
    if (!creator) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const { data } = await supabase.functions.invoke("explain-recipe-performance", { body: { creator_id: creator.id } });
      setAiInsight(data?.explanation ?? "Aucune analyse disponible.");
    } catch {
      setAiInsight("Impossible de charger l'analyse. Réessaie dans quelques instants.");
    } finally { setAiLoading(false); }
  }

  const displayed = recipes.filter((r) => {
    if (statusFilter === "published" && !r.is_published) return false;
    if (statusFilter === "draft" && r.is_published) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const publishedCount = recipes.filter((r) => r.is_published).length;
  const totalRevenue = Array.from(performance.values()).reduce((s, p) => s + p.revenue_this_month, 0);
  const totalConso = Array.from(performance.values()).reduce((s, p) => s + p.consumptions_this_month, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4" style={{ borderBottom: "2px solid var(--color-brand-dark)", paddingBottom: "1.25rem" }}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Espace Créateur</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Mes Recettes
          </h1>
        </div>
        <Link
          href="/dashboard/recipes/new"
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}
        >
          + Nouvelle recette
        </Link>
      </div>

      {/* Summary stats */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Recettes publiées", value: String(publishedCount) + " / " + String(recipes.length) },
            { label: "Consommations ce mois", value: String(totalConso) },
            { label: "Revenus ce mois", value: formatEuro(totalRevenue), amber: true },
          ].map(({ label, value, amber }) => (
            <div key={label} className="rounded-xl p-4 bg-card" style={{ border: "1px solid var(--color-border)" }}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: amber ? "var(--color-brand-amber)" : "inherit" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* AI Insight + filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => {
            const labels = { all: "Toutes", published: "Publiées", draft: "Brouillons" };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={"px-3 py-1.5 text-xs font-medium transition-colors " + (statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <select value={perfSortBy} onChange={(e) => setPerfSortBy(e.target.value as SortKey)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="revenue_this_month">Revenus ce mois</option>
          <option value="consumptions_this_month">Consommations ce mois</option>
          <option value="total_revenue">Revenus totaux</option>
        </select>
        <button onClick={fetchAiInsight} disabled={aiLoading || recipes.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ background: "var(--color-brand-forest)", color: "#fff" }}>
          {aiLoading
            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : "✨"}
          Analyser
        </button>
      </div>

      {/* AI Insight panel */}
      {aiInsight && (
        <div className="rounded-xl p-5 space-y-2" style={{ background: "var(--color-brand-cream)", border: "1px solid var(--color-brand-forest)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-brand-forest)" }}>
            ✨ Analyse IA
          </p>
          <p className="text-sm text-foreground leading-relaxed">{aiInsight}</p>
          <button onClick={() => setAiInsight(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Fermer
          </button>
        </div>
      )}

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <p className="text-4xl">🍳</p>
          <p className="font-semibold text-foreground">{recipes.length === 0 ? "Aucune recette pour le moment" : "Aucun résultat"}</p>
          {recipes.length === 0 && (
            <Link href="/dashboard/recipes/new"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}>
              + Créer ma première recette
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {displayed.map((recipe) => {
            const perf = performance.get(recipe.id);
            return (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                perf={perf}
                actionLoading={actionLoading === recipe.id}
                onEdit={() => router.push(("/dashboard/recipes/" + recipe.id + "/edit") as any)}
                onDuplicate={() => duplicateRecipe(recipe.id)}
                onTogglePublish={() => togglePublish(recipe.id, recipe.is_published)}
                onDelete={() => setConfirmDelete(recipe.id)}
              />
            );
          })}
        </ul>
      )}

      {confirmDelete && (
        <DeleteDialog
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteRecipe(confirmDelete)}
          loading={actionLoading === confirmDelete}
        />
      )}
    </div>
  );
}

function RecipeRow({ recipe, perf, actionLoading, onEdit, onDuplicate, onTogglePublish, onDelete }: {
  recipe: Recipe; perf?: RecipePerformance;
  actionLoading: boolean;
  onEdit: () => void; onDuplicate: () => void; onTogglePublish: () => void; onDelete: () => void;
}) {
  const trend = perf?.trend ?? 0;

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
      {recipe.cover_image_url
        ? <img src={recipe.cover_image_url} alt={recipe.title} className="w-full sm:w-20 h-32 sm:h-14 rounded-lg object-cover shrink-0" />
        : <div className="w-full sm:w-20 h-14 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-2xl">🍽️</div>
      }
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{recipe.title}</p>
          <span className={"px-2 py-0.5 rounded-full text-[10px] font-medium " + (recipe.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
            {recipe.is_published ? "Publiée" : "Brouillon"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {recipe.difficulty && <span>{DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}</span>}
          {perf && (
            <>
              <span>•</span>
              <span>{perf.consumptions_this_month} consommation{perf.consumptions_this_month !== 1 ? "s" : ""} ce mois</span>
              <span>•</span>
              <span className="font-semibold" style={{ color: "var(--color-brand-amber)" }}>
                {formatEuro(perf.revenue_this_month)} ce mois
              </span>
              {trend !== 0 && (
                <>
                  <span>•</span>
                  <span className={trend > 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                    {trend > 0 ? "↑ +" : "↓ "}{trend}%
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        <ActionBtn onClick={onEdit} disabled={actionLoading} label="Éditer" />
        <ActionBtn onClick={onDuplicate} disabled={actionLoading} label="Dupliquer" />
        <ActionBtn onClick={onTogglePublish} disabled={actionLoading}
          label={recipe.is_published ? "Dépublier" : "Publier"}
          variant={recipe.is_published ? "danger" : "primary"} />
        <ActionBtn onClick={onDelete} disabled={actionLoading || (perf?.total_consumptions ?? 0) > 0}
          label="Supprimer" variant="ghost"
          title={(perf?.total_consumptions ?? 0) > 0 ? "Impossible : recette déjà consommée" : undefined} />
      </div>
    </li>
  );
}

function ActionBtn({ onClick, disabled, label, variant = "default", title }: {
  onClick: () => void; disabled: boolean; label: string;
  variant?: "default" | "primary" | "danger" | "ghost"; title?: string;
}) {
  const styles: Record<string, string> = {
    default: "border border-border text-foreground hover:bg-secondary",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    danger: "border border-destructive text-destructive hover:bg-destructive/10",
    ghost: "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed " + styles[variant]}>
      {label}
    </button>
  );
}

function DeleteDialog({ onCancel, onConfirm, loading }: {
  onCancel: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Supprimer la recette ?</h2>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <div className="flex items-center gap-3 justify-end">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
              Annuler
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
              {loading ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
