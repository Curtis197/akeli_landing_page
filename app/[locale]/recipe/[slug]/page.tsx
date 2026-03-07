"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  region: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  tags: string[];
  is_pork_free: boolean;
  meal_types: string[];
  creator_id: string;
  creator: {
    name: string | null;
    profil_url: string | null;
    heritage_region: string | null;
  } | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const t = useTranslations("recipe");
  const tCreators = useTranslations("creators");
  const params = useParams();
  const slug = String(params.slug);
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("recipe")
      .select(`
        id, slug, title, description, cover_image_url, region, difficulty,
        prep_time_min, cook_time_min, servings, calories, protein_g, carbs_g,
        fat_g, fiber_g, tags, is_pork_free, meal_types, creator_id,
        creator:creator_id(name, profil_url, heritage_region)
      `)
      .eq("slug", slug)
      .eq("is_published", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          const c = Array.isArray(data.creator) ? data.creator[0] : data.creator;
          setRecipe({
            ...data,
            tags: data.tags ?? [],
            meal_types: data.meal_types ?? [],
            creator: c ?? null,
          } as RecipeDetail);
        }
        setLoading(false);
      });
  }, [slug, supabase]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <div className="h-72 rounded-2xl bg-secondary animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 rounded bg-secondary animate-pulse" />
            <div className="h-4 w-full rounded bg-secondary animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-secondary animate-pulse" />
          </div>
        </main>
      </>
    );
  }

  if (notFound || !recipe) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-4xl">😕</p>
          <h1 className="text-xl font-bold text-foreground">{t("notFound")}</h1>
          <Link href="/recipes" className="text-sm text-primary hover:underline">
            {t("backToCatalog")}
          </Link>
        </main>
      </>
    );
  }

  const totalMin = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const timeLabel =
    totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? `${totalMin % 60}min` : ""}`
      : totalMin > 0
      ? `${totalMin} min`
      : null;

  const creatorInitials = (recipe.creator?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasMacros =
    recipe.calories != null ||
    recipe.protein_g != null ||
    recipe.carbs_g != null ||
    recipe.fat_g != null;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Cover */}
        {recipe.cover_image_url ? (
          <img
            src={recipe.cover_image_url}
            alt={recipe.title}
            className="w-full h-72 object-cover rounded-2xl"
          />
        ) : (
          <div className="w-full h-72 rounded-2xl bg-secondary flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground flex-1">{recipe.title}</h1>
            {recipe.is_pork_free && (
              <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                {t("porkFree")}
              </span>
            )}
          </div>

          {/* Creator link */}
          {recipe.creator && (
            <Link
              href={`/creator/${recipe.creator_id}`}
              className="inline-flex items-center gap-2.5 group"
            >
              {recipe.creator.profil_url ? (
                <img
                  src={recipe.creator.profil_url}
                  alt={recipe.creator.name ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {creatorInitials}
                </div>
              )}
              <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                {t("by")} <strong>{recipe.creator.name ?? tCreators("defaultName")}</strong>
                {recipe.creator.heritage_region && ` · ${recipe.creator.heritage_region}`}
              </span>
            </Link>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {recipe.difficulty && (
              <MetaChip icon="📊" label={DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty} />
            )}
            {timeLabel && <MetaChip icon="⏱" label={timeLabel} />}
            {recipe.servings && <MetaChip icon="👥" label={`${recipe.servings} portion${recipe.servings > 1 ? "s" : ""}`} />}
            {recipe.region && <MetaChip icon="🌍" label={recipe.region} />}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-foreground leading-relaxed">{recipe.description}</p>
          )}
        </div>

        {/* Macros */}
        {hasMacros && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">{t("nutritionTitle")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recipe.calories != null && (
                <MacroCard label={t("calories")} value={`${recipe.calories} kcal`} />
              )}
              {recipe.protein_g != null && (
                <MacroCard label={t("proteins")} value={`${recipe.protein_g} g`} />
              )}
              {recipe.carbs_g != null && (
                <MacroCard label={t("carbs")} value={`${recipe.carbs_g} g`} />
              )}
              {recipe.fat_g != null && (
                <MacroCard label={t("fats")} value={`${recipe.fat_g} g`} />
              )}
            </div>
          </section>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* App-only CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center space-y-5">
          <div className="text-4xl">📱</div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{t("appOnlyTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("appOnlySubtitle")}</p>
          </div>
          <a
            href="#"
            className="inline-block px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("downloadApp")}
          </a>
          <p className="text-xs text-muted-foreground">{t("platforms")}</p>
        </section>

        {/* Back */}
        <div className="flex items-center gap-4 text-sm">
          <Link href="/recipes" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("backToCatalog")}
          </Link>
          {recipe.creator && (
            <Link
              href={`/creator/${recipe.creator_id}`}
              className="text-primary hover:underline"
            >
              {t("viewAllFrom")} {recipe.creator.name?.split(" ")[0] ?? tCreators("defaultName")} →
            </Link>
          )}
        </div>
      </main>
    </>
  );
}

// ─── MetaChip ─────────────────────────────────────────────────────────────────

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ─── MacroCard ────────────────────────────────────────────────────────────────

function MacroCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
