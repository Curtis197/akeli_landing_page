"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { getRecipePerformance, RecipePerformance } from "@/lib/queries/recipe-performance";
import { formatEuro } from "@/lib/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  region: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  is_published: boolean;
  is_pork_free: boolean | null;
  tags: string[] | null;
  meal_types: string[] | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const supabase = createClient();
  const { creator } = useAuthStore();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [performance, setPerformance] = useState<RecipePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("recipe")
        .select(
          "id, slug, title, description, cover_image_url, region, difficulty, " +
          "prep_time_min, cook_time_min, servings, is_published, is_pork_free, " +
          "tags, meal_types, calories, protein_g, carbs_g, fat_g, fiber_g, created_at, updated_at"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRecipe(data as Recipe);

      // Load performance stats if creator is available
      if (creator?.id) {
        try {
          const perf = await getRecipePerformance(supabase, creator.id);
          const found = perf.find((p) => p.recipe_id === id) ?? null;
          setPerformance(found);
        } catch (e) {
          console.error("[recipe-detail] performance error:", e);
        }
      }

      setLoading(false);
    }

    load();
  }, [id, creator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle publish ─────────────────────────────────────────────────────────

  async function togglePublish() {
    if (!recipe || publishing) return;
    setPublishing(true);

    const newValue = !recipe.is_published;

    const { error } = await supabase
      .from("recipe")
      .update({ is_published: newValue })
      .eq("id", id);

    if (error) {
      console.error("[recipe-detail] toggle publish error:", error);
      setPublishing(false);
      return;
    }

    setRecipe((prev) => prev ? { ...prev, is_published: newValue } : prev);

    // Trigger translation when publishing
    if (newValue) {
      supabase.functions
        .invoke("translate-recipe", { body: { recipe_id: id } })
        .catch((e) => console.error("[recipe-detail] translate-recipe error:", e));
    }

    setPublishing(false);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold text-foreground">Recette introuvable</p>
        <Link
          href="/dashboard/recipes"
          className="text-sm text-primary hover:underline"
        >
          ← Mes recettes
        </Link>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalTime =
    (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);

  const hasMacros =
    recipe.calories !== null ||
    recipe.protein_g !== null ||
    recipe.carbs_g !== null ||
    recipe.fat_g !== null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Mes recettes
      </Link>

      {/* Cover image */}
      {recipe.cover_image_url ? (
        <img
          src={recipe.cover_image_url}
          alt={recipe.title}
          className="w-full h-64 object-cover rounded-2xl"
        />
      ) : (
        <div className="w-full h-64 rounded-2xl bg-secondary flex items-center justify-center text-6xl">
          🍽️
        </div>
      )}

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{recipe.title}</h1>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              recipe.is_published
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {recipe.is_published ? "Publiée" : "Brouillon"}
          </span>
          {recipe.is_pork_free && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Sans porc
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={`/dashboard/recipes/${id}/edit` as any}
          className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Éditer
        </Link>
        <button
          onClick={togglePublish}
          disabled={publishing}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {publishing
            ? "En cours…"
            : recipe.is_published
            ? "Dépublier"
            : "Publier"}
        </button>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2">
        {recipe.difficulty && (
          <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
            {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
          </span>
        )}
        {totalTime > 0 && (
          <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
            ⏱ {totalTime} min
          </span>
        )}
        {recipe.servings !== null && (
          <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
            🍽 {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
          </span>
        )}
        {recipe.region && (
          <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
            📍 {recipe.region}
          </span>
        )}
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="text-muted-foreground leading-relaxed">{recipe.description}</p>
      )}

      {/* Performance stats — only when published */}
      {recipe.is_published && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Consommations ce mois"
              value={String(performance?.consumptions_this_month ?? 0)}
            />
            <StatCard
              label="Revenus ce mois"
              value={formatEuro(performance?.revenue_this_month ?? 0)}
            />
            <StatCard
              label="Total consommations"
              value={String(performance?.total_consumptions ?? 0)}
            />
            <StatCard
              label="Revenus totaux"
              value={formatEuro(performance?.total_revenue ?? 0)}
            />
          </div>
        </div>
      )}

      {/* Macros */}
      {hasMacros && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Valeurs nutritionnelles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recipe.calories !== null && (
              <StatCard label="Calories" value={`${recipe.calories} kcal`} />
            )}
            {recipe.protein_g !== null && (
              <StatCard label="Protéines" value={`${recipe.protein_g} g`} />
            )}
            {recipe.carbs_g !== null && (
              <StatCard label="Glucides" value={`${recipe.carbs_g} g`} />
            )}
            {recipe.fat_g !== null && (
              <StatCard label="Lipides" value={`${recipe.fat_g} g`} />
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
