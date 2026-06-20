"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useRecipeSession } from "@/hooks/use-recipe-session";
import { formatQuantity } from "@/lib/utils/recipe-formatter";
import type { TrackingSource } from "@/lib/tracking/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientDetail {
  id: string;
  ingredient_id: string | null;
  name: string;
  is_section_header: boolean;
  title: string | null;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
  sort_order: number;
}

interface StepDetail {
  id: string;
  step_number: number;
  is_section_header: boolean;
  title: string | null;
  content: string | null;
  image_url: string | null;
  timer_seconds: number | null;
  sort_order: number;
  ingredient_ids: string[];
}

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
  show_on_website: boolean;
  ingredients: IngredientDetail[];
  steps: StepDetail[];
}

// ─── Session Tracker (invisible) ─────────────────────────────────────────────

function RecipeSessionTracker({ recipeId, source }: { recipeId: string; source: TrackingSource }) {
  useRecipeSession(recipeId, source);
  return null;
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const t = useTranslations("recipe");
  const tCreators = useTranslations("creators");
  const tRecipes = useTranslations("recipes");
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params.slug);
  const source: TrackingSource = (searchParams.get("from") as TrackingSource) ?? "feed";
  const supabase = createClient();

  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/app/akeli/id6478051787";
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.akeli.app";

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cookingStepIndex, setCookingStepIndex] = useState<number | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const { data: raw, error } = await supabase
        .from("recipe")
        .select(`
          id, slug, title, description, cover_image_url, region, difficulty,
          prep_time_min, cook_time_min, servings, is_pork_free, creator_id, language,
          show_on_website,
          food_region:region ( name_fr, name_en, name_ar ),
          recipe_macro ( calories, protein_g, carbs_g, fat_g, fiber_g ),
          recipe_tag ( tag ( name ) ),
          creator:creator_id ( display_name, profile_image_url, heritage_region ),
          recipe_ingredient (
            id, quantity, unit, is_optional, sort_order, is_section_header, title,
            ingredient:ingredient_id ( id, name_fr, name_en, name_ar ),
            recipe_ingredient_translation ( quantity, unit, title, locale )
          ),
          recipe_step (
            id, step_number, title, content, image_url, timer_seconds, sort_order, is_section_header, ingredient_ids,
            recipe_step_translation ( content, title, locale )
          )
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

      const mappedIngredients = (raw.recipe_ingredient ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((ing: any) => {
          const trans = ing.recipe_ingredient_translation?.find((t: any) => t.locale === locale);
          const ingName = ing.ingredient?.[nameKey] ?? ing.ingredient?.name_fr ?? "";
          return {
            id: ing.id,
            ingredient_id: ing.ingredient?.id ?? null,
            name: ingName,
            is_section_header: ing.is_section_header ?? false,
            title: trans?.title ?? ing.title ?? null,
            quantity: trans?.quantity ?? ing.quantity ?? null,
            unit: trans?.unit ?? ing.unit ?? null,
            is_optional: ing.is_optional ?? false,
            sort_order: ing.sort_order,
          };
        });

      const mappedSteps = (raw.recipe_step ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((s: any) => {
          const trans = s.recipe_step_translation?.find((t: any) => t.locale === locale);
          return {
            id: s.id,
            step_number: s.step_number ?? 1,
            is_section_header: s.is_section_header ?? false,
            title: trans?.title ?? s.title ?? null,
            content: trans?.content ?? s.content ?? null,
            image_url: s.image_url ?? null,
            timer_seconds: s.timer_seconds ?? null,
            sort_order: s.sort_order,
            ingredient_ids: s.ingredient_ids ?? [],
          };
        });

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
        show_on_website: raw.show_on_website ?? false,
        ingredients: mappedIngredients,
        steps: mappedSteps,
      });
      setLoading(false);
    }

    load();
  }, [slug, supabase, locale]);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // Render Fullscreen Cooking Mode
  if (cookingStepIndex !== null && recipe.steps.length > 0) {
    const currentStep = recipe.steps[cookingStepIndex];
    const stepIngredients = currentStep.is_section_header
      ? []
      : recipe.ingredients.filter((ing) => {
          if (ing.is_section_header) return false;
          const stepIngIds = currentStep.ingredient_ids || [];
          if (stepIngIds.length === 0) return true; // Fallback: show all if none mapped
          return ing.ingredient_id && stepIngIds.includes(ing.ingredient_id);
        });

    const isLastStep = cookingStepIndex === recipe.steps.length - 1;

    // Count how many non-header steps are in this section
    const getSectionStepCount = (headerIdx: number) => {
      let count = 0;
      for (let i = headerIdx + 1; i < recipe.steps.length; i++) {
        if (recipe.steps[i].is_section_header) break;
        count++;
      }
      return count;
    };

    return (
      <CookingModeView
        recipe={recipe}
        currentStep={currentStep}
        currentIndex={cookingStepIndex}
        totalSteps={recipe.steps.length}
        stepIngredients={stepIngredients}
        isLastStep={isLastStep}
        sectionStepCount={currentStep.is_section_header ? getSectionStepCount(cookingStepIndex) : 0}
        onClose={() => setCookingStepIndex(null)}
        onPrev={() => setCookingStepIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
        onNext={() => setCookingStepIndex((prev) => (prev !== null && prev < recipe.steps.length - 1 ? prev + 1 : prev))}
        onFinish={() => {
          setCookingStepIndex(null);
          setCheckedIngredients(new Set());
        }}
        checkedIngredients={checkedIngredients}
        onToggleIngredient={toggleIngredient}
      />
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
              <MetaChip icon="📊" label={recipe.difficulty ? tRecipes(`difficulty.${recipe.difficulty}` as any) : recipe.difficulty ?? ""} />
            )}
            {timeLabel && <MetaChip icon="⏱" label={timeLabel} />}
            {recipe.servings && <MetaChip icon="👥" label={t("servings", { count: recipe.servings })} />}
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

        {/* Full recipe view vs Teaser */}
        {recipe.show_on_website ? (
          <div className="space-y-8 pt-4 border-t border-border">
            {/* Start Cooking Button */}
            {recipe.steps.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setCookingStepIndex(0)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-semibold shadow-md hover:bg-primary/95 transition-all flex items-center justify-center gap-2"
                >
                  🍳 {t("startCooking")}
                </button>
              </div>
            )}

            {/* Ingredients */}
            {recipe.ingredients.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">{t("ingredients")}</h2>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-2">
                  {recipe.ingredients.map((ing) => {
                    if (ing.is_section_header) {
                      return (
                        <div key={ing.id} className="pt-4 pb-2 border-b border-border">
                          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                            {ing.title}
                          </h3>
                        </div>
                      );
                    }
                    const isChecked = checkedIngredients.has(ing.id);
                    return (
                      <label
                        key={ing.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleIngredient(ing.id)}
                            className="rounded border-input accent-primary w-4 h-4 cursor-pointer"
                          />
                          <span
                            className={`text-sm text-foreground transition-all duration-255 ${
                              isChecked ? "line-through text-muted-foreground opacity-60" : ""
                            }`}
                          >
                            {ing.name}
                            {ing.is_optional && (
                              <span className="text-xs text-muted-foreground ml-1.5 italic">
                                ({t("optional")})
                              </span>
                            )}
                          </span>
                        </div>
                        {ing.quantity && (
                          <span
                            className={`text-sm font-semibold text-amber-600 dark:text-amber-400 ${
                              isChecked ? "opacity-60" : ""
                            }`}
                          >
                            {formatQuantity(ing.quantity, ing.unit)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Steps */}
            {recipe.steps.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">{t("steps")}</h2>
                <div className="space-y-4">
                  {recipe.steps.map((step, idx) => {
                    if (step.is_section_header) {
                      return (
                        <div key={step.id} className="pt-4 pb-1">
                          <h3 className="font-bold text-foreground text-base tracking-wide border-l-4 border-primary pl-3">
                            {step.title}
                          </h3>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={step.id}
                        className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:shadow-sm transition-all"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {recipe.steps.filter((s, i) => !s.is_section_header && i <= idx).length}
                        </div>
                        <div className="space-y-2 flex-1">
                          {step.title && <h4 className="font-semibold text-foreground">{step.title}</h4>}
                          <p className="text-sm text-foreground/90 leading-relaxed leading-normal">{step.content}</p>
                          {step.timer_seconds && step.timer_seconds > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-xs font-semibold text-muted-foreground border border-border">
                              ⏱ {Math.floor(step.timer_seconds / 60)} min {step.timer_seconds % 60 > 0 ? `${step.timer_seconds % 60}s` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* App Promotion CTA at the bottom of the full recipe view */}
            <section className="rounded-2xl bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/10 p-6 sm:p-8 mt-10 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>✨</span> {t("appPromotionTitle")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("appPromotionSubtitle")}
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-foreground/10 hover:border-foreground/20 bg-background/50 hover:bg-background/80 text-foreground text-xs font-semibold shadow-sm transition-all text-center flex items-center justify-center gap-2"
                >
                   App Store
                </a>
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-foreground/10 hover:border-foreground/20 bg-background/50 hover:bg-background/80 text-foreground text-xs font-semibold shadow-sm transition-all text-center flex items-center justify-center gap-2"
                >
                  🤖 Google Play
                </a>
              </div>
            </section>
          </div>
        ) : (
          /* App-only CTA */
          <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center space-y-5">
            <div className="text-4xl">📱</div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">{t("appOnlyTitle")}</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("appOnlySubtitle")}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 max-w-md mx-auto">
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all text-center flex items-center justify-center gap-2 shadow-md"
              >
                 App Store
              </a>
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all text-center flex items-center justify-center gap-2 shadow-md"
              >
                🤖 Google Play
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{t("platforms")}</p>
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

        {/* Back */}
        <div className="flex items-center gap-4 text-sm pt-4 border-t border-border/40">
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

// ─── Cooking Timer Component ──────────────────────────────────────────────────

function CookingTimer({ seconds }: { seconds: number }) {
  const t = useTranslations("recipe");
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
    setActive(false);
  }, [seconds]);

  useEffect(() => {
    if (!active) return;
    if (timeLeft <= 0) {
      setActive(false);
      playBeep();
      alert(t("timerAlert"));
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, timeLeft, t]);

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio Context playback failed:", e);
    }
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-secondary/30 border border-border rounded-2xl max-w-xs mx-auto space-y-3 shrink-0">
      <div className="text-3xl font-mono font-bold text-foreground tracking-wider">{timeStr}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActive((a) => !a)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            active
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {active ? "Pause" : "Démarrer"}
        </button>
        <button
          onClick={() => {
            setActive(false);
            setTimeLeft(seconds);
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── Fullscreen Cooking Mode View ─────────────────────────────────────────────

interface CookingModeViewProps {
  recipe: RecipeDetail;
  currentStep: StepDetail;
  currentIndex: number;
  totalSteps: number;
  stepIngredients: IngredientDetail[];
  isLastStep: boolean;
  sectionStepCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  checkedIngredients: Set<string>;
  onToggleIngredient: (id: string) => void;
}

function CookingModeView({
  recipe,
  currentStep,
  currentIndex,
  totalSteps,
  stepIngredients,
  isLastStep,
  sectionStepCount,
  onClose,
  onPrev,
  onNext,
  onFinish,
  checkedIngredients,
  onToggleIngredient,
}: CookingModeViewProps) {
  const t = useTranslations("recipe");
  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;

  // Render a section divider slide
  if (currentStep.is_section_header) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("cookingMode")} · {recipe.title}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            ✕
          </button>
        </div>

        {/* Section slide content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl">
            📖
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            {currentStep.title}
          </h2>
          {sectionStepCount > 0 && (
            <p className="text-muted-foreground text-sm uppercase tracking-wide">
              {sectionStepCount} {sectionStepCount > 1 ? "étapes associées" : "étape associée"}
            </p>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between pt-6 border-t border-border shrink-0">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            ← Précédent
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onNext}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render a normal instruction step slide
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
      {/* Top Progress bar and Header */}
      <div className="space-y-4 shrink-0">
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm font-bold text-primary tracking-wide">
            Étape {currentIndex + 1} sur {totalSteps}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Quitter le mode cuisson"
          >
            ✕
          </button>
        </div>
        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main instruction & step-specific ingredients block */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch gap-8 py-10 max-w-5xl mx-auto w-full min-h-0">
        {/* Left column: Step Content & Timer */}
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {currentStep.title && (
            <h3 className="text-lg font-bold text-foreground/80 tracking-wide uppercase">
              {currentStep.title}
            </h3>
          )}
          <p className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed leading-normal">
            {currentStep.content}
          </p>

          {currentStep.timer_seconds && currentStep.timer_seconds > 0 && (
            <CookingTimer seconds={currentStep.timer_seconds} />
          )}
        </div>

        {/* Right column: Step ingredients list (if any) */}
        {stepIngredients.length > 0 && (
          <div className="w-full md:w-80 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8 shrink-0">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">
              Ingrédients nécessaires
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {stepIngredients.map((ing) => {
                const isChecked = checkedIngredients.has(ing.id);
                return (
                  <label
                    key={ing.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleIngredient(ing.id)}
                        className="rounded border-input accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span
                        className={`text-sm text-foreground transition-all duration-250 ${
                          isChecked ? "line-through text-muted-foreground opacity-60" : ""
                        }`}
                      >
                        {ing.name}
                        {ing.is_optional && (
                          <span className="text-xs text-muted-foreground ml-1 italic">
                            ({t("optional")})
                          </span>
                        )}
                      </span>
                    </div>
                    {ing.quantity && (
                      <span
                        className={`text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 ${
                          isChecked ? "opacity-60" : ""
                        }`}
                      >
                        {formatQuantity(ing.quantity, ing.unit)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation controls */}
      <div className="flex items-center justify-between pt-6 border-t border-border shrink-0">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          ← Précédent
        </button>

        <button
          onClick={isLastStep ? onFinish : onNext}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isLastStep
              ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10"
              : "bg-primary hover:bg-primary/95 text-primary-foreground"
          }`}
        >
          {isLastStep ? t("finishCooking") : "Suivant →"}
        </button>
      </div>
    </div>
  );
}
