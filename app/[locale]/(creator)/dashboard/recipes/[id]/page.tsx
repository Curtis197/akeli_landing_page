"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { getRecipePerformance, RecipePerformance } from "@/lib/queries/recipe-performance";
import { formatEuro } from "@/lib/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string;
  title?: string;
  is_section_header?: boolean;
  quantity?: number | null;
  unit?: string | null;
  is_optional: boolean;
  sort_order: number;
}

interface RawIngredientRow {
  id: string;
  sort_order: number;
  is_section_header: boolean;
  title: string | null;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
  ingredient: { name_fr: string | null; name: string | null } | null;
}

interface Step {
  step_number: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  timer_seconds: number | null;
}

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
  tags: string[];
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ingredients: Ingredient[];
  steps: Step[];
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  // Fetch recipe — runs only when id changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("recipe")
        .select(
          "id, slug, title, description, cover_image_url, region, difficulty, " +
          "prep_time_min, cook_time_min, servings, is_published, is_pork_free, " +
          "created_at, updated_at, draft_data, " +
          "food_region:region ( name_fr ), " +
          "recipe_macro ( calories, protein_g, carbs_g, fat_g, fiber_g ), " +
          "recipe_tag ( tag ( name ) ), " +
          "recipe_step ( step_number, title, content, image_url, timer_seconds, is_section_header ), " +
          "recipe_ingredient ( id, sort_order, is_section_header, title, quantity, unit, is_optional, ingredient ( name_fr, name ) )"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const raw = data as any;
      const macro = Array.isArray(raw.recipe_macro) ? raw.recipe_macro[0] : raw.recipe_macro;

      // Use recipe_ingredient table (new FK-based system); fall back to draft_data for old recipes
      const dbIngredients: RawIngredientRow[] = raw.recipe_ingredient ?? [];
      let ingredients: Ingredient[];
      if (dbIngredients.length > 0) {
        ingredients = [...dbIngredients]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => ({
            name: row.ingredient?.name_fr ?? row.ingredient?.name ?? "",
            title: row.title ?? undefined,
            is_section_header: row.is_section_header,
            quantity: row.quantity,
            unit: row.unit,
            is_optional: row.is_optional,
            sort_order: row.sort_order,
          }));
      } else {
        // Legacy: read from draft_data
        ingredients = ((raw.draft_data as any)?.ingredients ?? [])
          .sort((a: Ingredient, b: Ingredient) => a.sort_order - b.sort_order);
      }

      setRecipe({
        ...raw,
        region: raw.food_region?.name_fr ?? raw.region,
        tags: (raw.recipe_tag ?? []).map((t: { tag: { name: string } | null }) => t.tag?.name).filter(Boolean),
        calories: macro?.calories ?? null,
        protein_g: macro?.protein_g ?? null,
        carbs_g: macro?.carbs_g ?? null,
        fat_g: macro?.fat_g ?? null,
        fiber_g: macro?.fiber_g ?? null,
        ingredients,
        steps: [...(raw.recipe_step ?? [])].sort((a: Step, b: Step) => a.step_number - b.step_number),
      });
      setLoading(false);
    }

    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch performance stats separately — runs when creator is ready
  useEffect(() => {
    if (!creator?.id || !id) return;
    getRecipePerformance(supabase, creator.id)
      .then((perf) => setPerformance(perf.find((p) => p.recipe_id === id) ?? null))
      .catch((e) => console.error("[recipe-detail] performance error:", e));
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

  async function deleteRecipe() {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("recipe").delete().eq("id", id);
    if (!error) {
      router.push("/dashboard/recipes" as any);
    } else {
      console.error("[recipe-detail] delete error:", error);
      setDeleting(false);
      setConfirmDelete(false);
    }
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
        <button
          onClick={() => setConfirmDelete(true)}
          className="px-4 py-2 rounded-xl border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          Supprimer
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmDelete(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Supprimer la recette ?</h2>
              <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
                  Annuler
                </button>
                <button onClick={deleteRecipe} disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            Ingrédients
            {recipe.servings !== null && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                — {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {recipe.ingredients.map((ing, i) => {
              if (ing.is_section_header) {
                return (
                  <li key={i} className="px-4 py-2 bg-primary/5 border-t border-b border-primary/15 first:border-t-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{ing.title || "—"}</p>
                  </li>
                );
              }
              return (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 bg-card text-sm">
                  <span className={ing.is_optional ? "text-muted-foreground" : "text-foreground"}>
                    {ing.name || "—"}
                    {ing.is_optional && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide">(optionnel)</span>
                    )}
                  </span>
                  {(ing.quantity != null || ing.unit) && (
                    <span className="text-muted-foreground shrink-0 ml-4">
                      {ing.quantity != null ? ing.quantity : ""}{ing.unit ? ` ${ing.unit}` : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Préparation</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={step.step_number} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-1.5">
                  {step.title && (
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  )}
                  {step.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
                  )}
                  {step.timer_seconds && step.timer_seconds > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      ⏱ {step.timer_seconds >= 60
                        ? `${Math.floor(step.timer_seconds / 60)} min${step.timer_seconds % 60 > 0 ? ` ${step.timer_seconds % 60} s` : ""}`
                        : `${step.timer_seconds} s`}
                    </span>
                  )}
                  {step.image_url && (
                    <img
                      src={step.image_url}
                      alt={step.title ?? `Étape ${step.step_number}`}
                      className="mt-2 w-full max-w-sm rounded-xl object-cover"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
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
      {recipe.tags.length > 0 && (
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
