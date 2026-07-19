// app/[locale]/blog/BlogCatalogClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";

interface BlogPostCard {
  id: string;
  slug: string | null;
  cover_image_url: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number;
  creator_id: string;
  creator_name: string | null;
  creator_avatar_url: string | null;
  title: string;
  excerpt: string | null;
  reading_time_min: number | null;
}

type SortOption = "newest" | "popular";

const CATEGORIES = ["recette", "culture", "technique", "ingredients", "parcours", "actualite"] as const;

export default function BlogCatalogClient() {
  const t = useTranslations("blog");
  const supabase = createClient();

  const [posts, setPosts] = useState<BlogPostCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    Promise.resolve(
      supabase
        .from("blog_post")
        .select(`
          id, slug, cover_image_url, category, published_at, view_count, creator_id,
          creator:creator_id ( display_name, profile_image_url ),
          blog_post_translation ( title, excerpt, reading_time_min )
        `)
        .eq("is_published", true)
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
    )
      .then(({ data }) => {
        const mapped: BlogPostCard[] = (data ?? []).map((post: any) => {
          const translation = (post.blog_post_translation ?? [])[0];
          const creator = post.creator;
          return {
            id: post.id,
            slug: post.slug,
            cover_image_url: post.cover_image_url,
            category: post.category,
            published_at: post.published_at,
            view_count: post.view_count ?? 0,
            creator_id: post.creator_id,
            creator_name: creator?.display_name ?? null,
            creator_avatar_url: creator?.profile_image_url ?? null,
            title: translation?.title ?? "",
            excerpt: translation?.excerpt ?? null,
            reading_time_min: translation?.reading_time_min ?? null,
          };
        });
        setPosts(mapped);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filtered = posts
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !categoryFilter || p.category === categoryFilter)
    .slice()
    .sort((a, b) => {
      if (sort === "popular") return b.view_count - a.view_count;
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    });

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("globalFeedTitle")}</h1>
        <p className="text-muted-foreground mb-8">{t("globalFeedSubtitle")}</p>

        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`categories.${cat}` as any)}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="popular">{t("sortPopular")}</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">{t("noPosts")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => {
              const postHref = post.slug ? `/creator/${post.creator_id}/blog/${post.slug}` : null;

              const cardBody = (
                <>
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover_image_url} alt={post.title} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-secondary flex items-center justify-center text-3xl">📝</div>
                  )}
                  <div className="p-4">
                    {post.category && (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2">
                        {t(`categories.${post.category}` as any)}
                      </span>
                    )}
                    <h2 className="font-semibold text-foreground line-clamp-2">{post.title}</h2>
                    {post.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
                    {post.reading_time_min != null && (
                      <p className="text-xs text-muted-foreground mt-2">{t("minRead", { min: post.reading_time_min })}</p>
                    )}
                  </div>
                </>
              );

              return (
                <div key={post.id} className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                  {postHref ? <Link href={postHref}>{cardBody}</Link> : cardBody}
                  <Link
                    href={`/creator/${post.creator_id}`}
                    className="flex items-center gap-2 px-4 py-3 border-t border-border hover:bg-secondary/30 transition-colors"
                  >
                    {post.creator_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.creator_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-secondary" />
                    )}
                    <span className="text-sm text-muted-foreground">{post.creator_name}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
