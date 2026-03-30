"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
}

interface RecipeTeaser {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  region: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  is_published: boolean;
}

const FAN_MODE_THRESHOLD = 30;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorProfilePage() {
  const t = useTranslations("creators");
  const tLanding = useTranslations("landing");
  const tRecipes = useTranslations("recipes");
  const params = useParams();
  const creatorId = String(params.username); // username = creator ID
  const supabase = createClient();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeTeaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("creator")
        .select("id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count")
        .eq("id", creatorId)
        .single(),
      supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, region, difficulty, prep_time_min, cook_time_min, is_published")
        .eq("creator_id", creatorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
    ]).then(([creatorRes, recipesRes]) => {
      if (!creatorRes.data) {
        setNotFound(true);
      } else {
        setCreator({
          ...creatorRes.data,
          recipe_count: creatorRes.data.recipe_count ?? 0,
          specialties: creatorRes.data.specialties ?? [],
        });
      }
      if (recipesRes.data) setRecipes(recipesRes.data as RecipeTeaser[]);
      setLoading(false);
    });
  }, [creatorId, supabase]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
          <div className="h-40 rounded-2xl bg-secondary animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (notFound || !creator) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-4xl">😕</p>
          <h1 className="text-xl font-bold text-foreground">{t("notFoundCreator")}</h1>
          <Link href="/creators" className="text-sm text-primary hover:underline">
            {t("backToCatalog")}
          </Link>
        </main>
      </>
    );
  }

  const initials = (creator.display_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fanMode = creator.recipe_count >= FAN_MODE_THRESHOLD;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* ── Profile header ── */}
        <section className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          {creator.profile_image_url ? (
            <img
              src={creator.profile_image_url}
              alt={creator.display_name ?? ""}
              className="w-24 h-24 rounded-full object-cover border-4 border-border shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary border-4 border-border flex items-center justify-center text-2xl font-bold text-muted-foreground shrink-0">
              {initials}
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {creator.display_name ?? t("defaultName")}
                </h1>
                {fanMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    ⭐ {t("fanBadge")}
                  </span>
                )}
              </div>
              {creator.heritage_region && (
                <p className="text-sm text-muted-foreground">
                  📍 {creator.heritage_region}
                </p>
              )}
            </div>

            {creator.bio && (
              <p className="text-sm text-foreground leading-relaxed max-w-xl">
                {creator.bio}
              </p>
            )}

            {creator.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {creator.specialties.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{creator.recipe_count}</strong>{" "}
              {t("stats.recipesPublished", { count: creator.recipe_count })}
            </p>
          </div>
        </section>

        {/* ── Recipes ── */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-foreground">
            {t("recipesBy")} {creator.display_name?.split(" ")[0] ?? t("defaultName")}
          </h2>

          {recipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-sm text-muted-foreground">{t("noRecipes")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>

        {/* ── App CTA ── */}
        <section className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-base font-semibold text-foreground">{t("ctaTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("ctaSubtitle")}</p>
          <a
            href="#"
            className="inline-block px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {tLanding("hero.ctaDownload")}
          </a>
        </section>
      </main>
    </>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: RecipeTeaser }) {
  const totalMin = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const timeLabel =
    totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? `${totalMin % 60}` : ""}`
      : totalMin > 0
      ? `${totalMin} min`
      : null;

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
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-40 bg-secondary flex items-center justify-center text-4xl">
          🍽️
        </div>
      )}

      {/* Info */}
      <div className="p-4 space-y-2 flex-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {recipe.difficulty && (
            <span className="text-[10px] text-muted-foreground">
              {recipe.difficulty ? tRecipes(`difficulty.${recipe.difficulty}` as any) : recipe.difficulty}
            </span>
          )}
          {recipe.difficulty && timeLabel && (
            <span className="text-[10px] text-muted-foreground">·</span>
          )}
          {timeLabel && (
            <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
