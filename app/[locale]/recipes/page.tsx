"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeCard {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  region: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  creator_name: string | null;
  creator_profil_url: string | null;
  creator_id: string;
}

type SortOption = "newest" | "popular";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const tLanding = useTranslations("landing");
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    supabase
      .from("recipe")
      .select(`
        id, slug, title, cover_image_url, region, difficulty,
        prep_time_min, cook_time_min, creator_id,
        creator:creator_id(name, profil_url)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setRecipes(
            data.map((r) => {
              const c = Array.isArray(r.creator) ? r.creator[0] : r.creator;
              return {
                id: r.id,
                slug: r.slug,
                title: r.title,
                cover_image_url: r.cover_image_url,
                region: r.region,
                difficulty: r.difficulty,
                prep_time_min: r.prep_time_min,
                cook_time_min: r.cook_time_min,
                creator_id: r.creator_id,
                creator_name: c?.name ?? null,
                creator_profil_url: c?.profil_url ?? null,
              };
            })
          );
        }
        setLoading(false);
      });
  }, [supabase]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const allRegions = Array.from(
    new Set(recipes.map((r) => r.region).filter(Boolean) as string[])
  ).sort();

  const displayed = recipes
    .filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (regionFilter && r.region !== regionFilter) return false;
      if (difficultyFilter && r.difficulty !== difficultyFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // For now, newest = default order from DB; popular could use a future metric
      return 0;
    });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-52"
          />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t("allRegions")}</option>
            {allRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t("allDifficulties")}</option>
            <option value="easy">{t("difficulty.easy")}</option>
            <option value="medium">{t("difficulty.medium")}</option>
            <option value="hard">{t("difficulty.hard")}</option>
          </select>
          {(search || regionFilter || difficultyFilter) && (
            <button
              onClick={() => { setSearch(""); setRegionFilter(""); setDifficultyFilter(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tCommon("reset")}
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {t("count", { count: displayed.length })}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-3">
            <p className="text-4xl">🍽️</p>
            <p className="font-semibold text-foreground">{t("notFound")}</p>
            <p className="text-sm text-muted-foreground">{tCommon("tryOtherFilters")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayed.map((recipe) => (
              <RecipeCardComponent key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {/* App CTA banner */}
        {!loading && displayed.length > 0 && (
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-foreground">{t("ctaTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("ctaSubtitle")}</p>
            </div>
            <a
              href="#"
              className="shrink-0 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {tLanding("hero.ctaDownload")}
            </a>
          </div>
        )}
      </main>
    </>
  );
}

// ─── RecipeCardComponent ──────────────────────────────────────────────────────

function RecipeCardComponent({ recipe }: { recipe: RecipeCard }) {
  const totalMin = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const timeLabel =
    totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? `${totalMin % 60}min` : ""}`
      : totalMin > 0
      ? `${totalMin} min`
      : null;

  const creatorInitials = (recipe.creator_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={recipe.slug ? `/recipe/${recipe.slug}` : "#"}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      {/* Cover */}
      {recipe.cover_image_url ? (
        <img
          src={recipe.cover_image_url}
          alt={recipe.title}
          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-44 bg-secondary flex items-center justify-center text-4xl">
          🍽️
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.title}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {recipe.difficulty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
              {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
            </span>
          )}
          {timeLabel && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
              ⏱ {timeLabel}
            </span>
          )}
          {recipe.region && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
              {recipe.region}
            </span>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
          {recipe.creator_profil_url ? (
            <img
              src={recipe.creator_profil_url}
              alt={recipe.creator_name ?? ""}
              className="w-6 h-6 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
              {creatorInitials}
            </div>
          )}
          <Link
            href={`/creator/${recipe.creator_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-primary transition-colors truncate"
          >
            {recipe.creator_name ?? tCommon("defaultCreator")}
          </Link>
        </div>
      </div>
    </Link>
  );
}
