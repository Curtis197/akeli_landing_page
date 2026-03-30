"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useRecipeSession } from "@/hooks/use-recipe-session";
import type { TrackingSource } from "@/lib/tracking/types";

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
  language: string | null;
  is_auto_translation: boolean | null;
  creator_id: string;
  creator: {
    display_name: string | null;
    profile_image_url: string | null;
    heritage_region: string | null;
  } | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

// ─── Session Tracker (invisible) ─────────────────────────────────────────────

function RecipeSessionTracker({ recipeId, source }: { recipeId: string; source: TrackingSource }) {
  useRecipeSession(recipeId, source);
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const t = useTranslations("recipe");
  const tCreators = useTranslations("creators");
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params.slug);
  const source: TrackingSource = (searchParams.get("from") as TrackingSource) ?? "feed";
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: raw, error } = await supabase
        .from("recipe")
        .select(`
          id, slug, title, description, cover_image_url, region, difficulty,
          prep_time_min, cook_time_min, servings, is_pork_free, creator_id, language,
          food_region:region ( name_fr, name_en, name_ar ),
          recipe_macro ( calories, protein_g, carbs_g, fat_g, fiber_g ),
          recipe_tag ( tag ( name ) ),
          creator:creator_id ( display_name, profile_image_url, heritage_region )
        `)
        .eq("slug", slug)
        .eq("is_published", true)
        .single() as any;

      if (error || !raw) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch translation for the current locale. Returns null if the recipe's
      // source language IS the current locale (no translation row needed).
      const { data: translation } = await supabase
        .from("recipe_translation")
        .select("title, description, is_auto")
        .eq("recipe_id", raw.id)
        .eq("locale", locale)
        .maybeSingle();

      const nameKey = `name_${locale}` as "name_fr" | "name_en" | "name_ar";
      const fr = raw.food_region as any;
      const macro = Array.isArray(raw.recipe_macro) ? raw.recipe_macro[0] : raw.recipe_macro;
      const c = Array.isArray(raw.creator) ? raw.creator[0] : raw.creator;

      setRecipe({
        ...raw,
        title: translation?.title ?? raw.title,
        description: translation?.description ?? raw.description,
        region: fr?.[nameKey] ?? fr?.name_fr ?? raw.region,
        language: raw.language ?? null,
        is_auto_translation: translation ? (translation.is_auto ?? null) : null,
        tags: (raw.recipe_tag ?? []).map((t: any) => t.tag?.name).filter(Boolean),
        calories: macro?.calories ?? null,
        protein_g: macro?.protein_g ?? null,
        carbs_g: macro?.carbs_g ?? null,
        fat_g: macro?.fat_g ?? null,
        fiber_g: macro?.fiber_g ?? null,
        creator: c ?? null,
      });
      setLoading(false);
    }

    load();
  }, [slug, supabase, locale]);

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

  const creatorInitials = (recipe.creator?.display_name ?? "?")
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

  // Show auto-translation badge when the content is AI-translated
  // (i.e. current locale ≠ source language AND translation row is auto-generated)
  const showAutoTranslationBadge =
    recipe.is_auto_translation === true && locale !== recipe.language;

  return (
    <>
      <Navbar />
      <RecipeSessionTracker recipeId={recipe.id} source={source} />
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
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {recipe.is_pork_free && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                  {t("porkFree")}
                </span>
              )}
              {showAutoTranslationBadge && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border" title="Machine-translated">
                  🤖 Auto
                </span>
              )}
            </div>
          </div>

          {/* Creator link */}
          {recipe.creator && (
            <Link
              href={`/creator/${recipe.creator_id}`}
              className="inline-flex items-center gap-2.5 group"
            >
              {recipe.creator.profile_image_url ? (
                <img
                  src={recipe.creator.profile_image_url}
                  alt={recipe.creator.display_name ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {creatorInitials}
                </div>
              )}
              <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                {t("by")} <strong>{recipe.creator.display_name ?? tCreators("defaultName")}</strong>
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
              {t("viewAllFrom")} {recipe.creator.display_name?.split(" ")[0] ?? tCreators("defaultName")} →
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
