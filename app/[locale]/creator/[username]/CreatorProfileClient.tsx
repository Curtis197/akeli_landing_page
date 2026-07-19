"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Instagram, Youtube, Globe } from "lucide-react";
import { fetchCreatorBlogFeed } from "@/lib/queries/blog-posts";
import type { BlogFeedPost } from "@/lib/queries/blog-posts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  website_url: string | null;
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

export default function CreatorProfileClient() {
  const t = useTranslations("creators");
  const tLanding = useTranslations("landing");
  const tRecipes = useTranslations("recipes");
  const params = useParams();
  const creatorId = String(params.username); // username = creator ID
  const supabase = createClient();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeTeaser[]>([]);
  const [posts, setPosts] = useState<BlogFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("creator")
        .select(
          "id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count, instagram_handle, tiktok_handle, youtube_handle, website_url"
        )
        .eq("id", creatorId)
        .single(),
      supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, region, difficulty, prep_time_min, cook_time_min, is_published")
        .eq("creator_id", creatorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      fetchCreatorBlogFeed(creatorId).catch(() => [] as BlogFeedPost[]),
    ])
      .then(([creatorRes, recipesRes, blogPosts]) => {
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
        setPosts(blogPosts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

            <SocialLinks creator={creator} />
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

        {/* ── Blog ── */}
        {posts.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("blogPreviewTitle", { name: creator.display_name?.split(" ")[0] ?? t("defaultName") })}
              </h2>
              <Link href={`/creator/${creatorId}/blog`} className="text-sm text-primary hover:underline shrink-0">
                {t("seeAllArticles")}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.slice(0, 3).map((post) => (
                <BlogPostCard key={post.id} post={post} creatorId={creatorId} />
              ))}
            </div>
          </section>
        )}

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

// ─── SocialLinks ──────────────────────────────────────────────────────────────

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function SocialLinks({ creator }: { creator: CreatorProfile }) {
  const links: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];

  if (creator.instagram_handle) {
    links.push({
      key: "instagram",
      href: `https://instagram.com/${creator.instagram_handle}`,
      label: "Instagram",
      icon: <Instagram className="w-4 h-4" />,
    });
  }
  if (creator.tiktok_handle) {
    links.push({
      key: "tiktok",
      href: `https://www.tiktok.com/@${creator.tiktok_handle}`,
      label: "TikTok",
      icon: <TikTokIcon className="w-4 h-4" />,
    });
  }
  if (creator.youtube_handle) {
    links.push({
      key: "youtube",
      href: `https://youtube.com/@${creator.youtube_handle}`,
      label: "YouTube",
      icon: <Youtube className="w-4 h-4" />,
    });
  }
  if (creator.website_url && isHttpUrl(creator.website_url)) {
    links.push({
      key: "website",
      href: creator.website_url,
      label: "Site web",
      icon: <Globe className="w-4 h-4" />,
    });
  }

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.75 2h2.5a4.75 4.75 0 0 0 4.75 4.75V9.5a7.22 7.22 0 0 1-4.75-1.79v6.94a5.65 5.65 0 1 1-5.65-5.65c.19 0 .38.01.56.04v2.55a3.1 3.1 0 1 0 2.19 2.96V2z" />
    </svg>
  );
}

// ─── BlogPostCard ─────────────────────────────────────────────────────────────

function BlogPostCard({ post, creatorId }: { post: BlogFeedPost; creatorId: string }) {
  const tBlog = useTranslations("blog");

  const card = (
    <>
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className={`w-full h-40 object-cover ${post.can_read ? "" : "blur-md"}`}
        />
      ) : (
        <div className="w-full h-40 bg-secondary flex items-center justify-center text-3xl">📝</div>
      )}
      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {post.category && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {tBlog(`categories.${post.category}` as any)}
            </span>
          )}
          {!post.can_read && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              🔒 {tBlog("gatedTitle")}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</p>
        {post.can_read && post.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
        )}
        {post.can_read && post.reading_time_min != null && (
          <p className="text-[10px] text-muted-foreground">{tBlog("minRead", { min: post.reading_time_min })}</p>
        )}
      </div>
    </>
  );

  return post.can_read && post.slug ? (
    <Link
      href={`/creator/${creatorId}/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      {card}
    </Link>
  ) : (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden opacity-90">{card}</div>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: RecipeTeaser }) {
  const tRecipes = useTranslations("recipes");
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
