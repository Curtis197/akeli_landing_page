"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  region: string | null;
  difficulty: string | null;
  created_at: string;
  consumptions: number;
  revenue: number;
}

type StatusFilter = "all" | "published" | "draft";
type SortOption = "newest" | "most_consumed";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipesListPage() {
  const supabase = createClient();
  const router = useRouter();
  const { creator } = useAuthStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    if (!creator) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, is_published, region, difficulty, created_at")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false });

      if (data) {
        // Attach placeholder stats (consumptions/revenue from separate query if needed)
        setRecipes(
          data.map((r) => ({
            ...r,
            consumptions: 0,
            revenue: 0,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [creator, supabase]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const displayed = recipes
    .filter((r) => {
      if (statusFilter === "published" && !r.is_published) return false;
      if (statusFilter === "draft" && r.is_published) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "most_consumed") return b.consumptions - a.consumptions;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function togglePublish(id: string, currentlyPublished: boolean) {
    setActionLoading(id);
    try {
      await supabase
        .from("recipe")
        .update({ is_published: !currentlyPublished })
        .eq("id", id);

      if (!currentlyPublished) {
        // Trigger async translation
        supabase.functions.invoke("translate-recipe", { body: { recipe_id: id } });
      }

      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_published: !currentlyPublished } : r))
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function duplicateRecipe(id: string) {
    setActionLoading(id);
    try {
      const { data: source } = await supabase
        .from("recipe")
        .select("*")
        .eq("id", id)
        .single();

      if (!source) return;

      const { data: copy } = await supabase
        .from("recipe")
        .insert({
          ...source,
          id: undefined,
          title: `${source.title} (copie)`,
          slug: null,
          is_published: false,
          created_at: undefined,
        })
        .select("id")
        .single();

      if (copy) router.push(`/dashboard/recipes/${copy.id}/edit`);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteRecipe(id: string) {
    setActionLoading(id);
    try {
      await supabase.from("recipe").delete().eq("id", id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mes recettes</h1>
        <Link
          href="/dashboard/recipes/new"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nouvelle recette
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => {
            const labels = { all: "Toutes", published: "Publiées", draft: "Brouillons" };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="newest">Plus récentes</option>
          <option value="most_consumed">Plus consommées</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState hasRecipes={recipes.length > 0} />
      ) : (
        <ul className="space-y-3">
          {displayed.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              actionLoading={actionLoading === recipe.id}
              onEdit={() => router.push(`/dashboard/recipes/${recipe.id}/edit`)}
              onDuplicate={() => duplicateRecipe(recipe.id)}
              onTogglePublish={() => togglePublish(recipe.id, recipe.is_published)}
              onDelete={() => setConfirmDelete(recipe.id)}
            />
          ))}
        </ul>
      )}

      {/* Delete confirmation dialog */}
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

// ─── RecipeRow ────────────────────────────────────────────────────────────────

function RecipeRow({
  recipe,
  actionLoading,
  onEdit,
  onDuplicate,
  onTogglePublish,
  onDelete,
}: {
  recipe: Recipe;
  actionLoading: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const publishedDate = new Date(recipe.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
      {/* Cover */}
      {recipe.cover_image_url ? (
        <img
          src={recipe.cover_image_url}
          alt={recipe.title}
          className="w-full sm:w-20 h-32 sm:h-14 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-full sm:w-20 h-14 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-2xl">
          🍽️
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{recipe.title}</p>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              recipe.is_published
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {recipe.is_published ? "Publiée" : "Brouillon"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {recipe.difficulty ? DIFFICULTY_LABELS[recipe.difficulty] : "—"}
          {" · "}Créée le {publishedDate}
          {" · "}{recipe.consumptions} consommation{recipe.consumptions !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        <ActionButton onClick={onEdit} disabled={actionLoading} label="Éditer" />
        <ActionButton onClick={onDuplicate} disabled={actionLoading} label="Dupliquer" />
        <ActionButton
          onClick={onTogglePublish}
          disabled={actionLoading}
          label={recipe.is_published ? "Dépublier" : "Publier"}
          variant={recipe.is_published ? "danger" : "primary"}
        />
        <ActionButton
          onClick={onDelete}
          disabled={actionLoading || recipe.consumptions > 0}
          label="Supprimer"
          variant="ghost"
          title={recipe.consumptions > 0 ? "Impossible : recette déjà consommée" : undefined}
        />
      </div>
    </li>
  );
}

function ActionButton({
  onClick,
  disabled,
  label,
  variant = "default",
  title,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  variant?: "default" | "primary" | "danger" | "ghost";
  title?: string;
}) {
  const base = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    default: "border border-border text-foreground hover:bg-secondary",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    danger: "border border-destructive text-destructive hover:bg-destructive/10",
    ghost: "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
  };

  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles[variant]}`}>
      {label}
    </button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ hasRecipes }: { hasRecipes: boolean }) {
  if (hasRecipes) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground text-sm">Aucune recette ne correspond aux filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-4">
      <p className="text-4xl">🍳</p>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Aucune recette pour le moment</p>
        <p className="text-sm text-muted-foreground">
          Commence par créer ta première recette et partage ton savoir culinaire.
        </p>
      </div>
      <Link
        href="/dashboard/recipes/new"
        className="inline-block px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        + Créer ma première recette
      </Link>
    </div>
  );
}

// ─── DeleteDialog ─────────────────────────────────────────────────────────────

function DeleteDialog({
  onCancel,
  onConfirm,
  loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Supprimer la recette ?</h2>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. La recette sera définitivement supprimée.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
