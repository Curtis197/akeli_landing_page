# Global Blog Discovery Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single, site-wide `/blog` page that pools published public posts from every creator into one discoverable, filterable feed, plus a navbar link to it.

**Architecture:** Mirrors `/recipes` and `/creators` exactly — a thin Server Component wrapper (`page.tsx`, static `generateMetadata` via i18n) delegating to a `"use client"` component that fetches once, then filters/sorts client-side. No new RPC or migration — relies entirely on Phase 1's existing RLS policy that already lets anyone read `is_published=true AND visibility='public'` posts.

**Tech Stack:** Next.js App Router, next-intl, Supabase browser client, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-07-18-global-blog-discovery-design.md`
**Builds on:** Creator Blog V2 Phase 3 (`docs/superpowers/plans/2026-07-17-creator-blog-v2-phase3-public-surface.md`) — reuses its `blog` i18n namespace and category taxonomy.

## Global Constraints

- **Public posts only** — `is_published = true AND visibility = 'public'`. No gated-post teasers on this page (that's per-creator-feed territory). No new SQL, no new RPC.
- **No pagination** — fetch everything matching the filter in one query, filter/sort/search entirely client-side, matching `/recipes`' and `/creators`' established convention exactly.
- **No locale filter on the query** — posts display as-authored, matching the "no auto-translation, no hiding by viewer locale" rule already established for the per-creator feed and post page.
- **Guard against a null `slug`** — `blog_post.slug` has no `NOT NULL` constraint at the DB level (a known, previously-hit risk on this branch — see Phase 3's Task 5 fix). Any card linking to a post must check `post.slug` is truthy before rendering a clickable link; render a non-clickable card body otherwise.
- **The initial fetch's promise chain must include an error handler from the start** — an unhandled rejection leaving the loading skeleton stuck forever is a real bug Phase 3's Task 5 review had to fix after the fact on the per-creator feed. Don't repeat it here.
- **No React component-testing framework exists in this repo** — verification is `tsc --noEmit` plus a required manual browser check, matching every other public-surface task on this branch.
- Reuses the **already-existing** `blog` i18n namespace (`messages/fr.json`/`messages/en.json`) rather than a new namespace — new keys only, no restructuring.

---

## File Structure

```
messages/fr.json, messages/en.json      — new "blog" namespace keys + "nav.blog"   — Task 1
app/[locale]/blog/
  BlogCatalogClient.tsx                  — the feed, search, filters, sort         — Task 2
  page.tsx                               — Server wrapper + generateMetadata       — Task 2
components/layout/Navbar.tsx             — add one navLinks entry                  — Task 3
```

---

### Task 1: i18n keys for the global feed

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: 7 new keys inside the existing `"blog"` namespace (`globalFeedTitle`, `globalFeedSubtitle`, `searchPlaceholder`, `allCategories`, `sortNewest`, `sortPopular`, `noResults`) and 1 new key inside the existing `"nav"` namespace (`blog`), consumed by Task 2 and Task 3.

- [ ] **Step 1: Add the new keys to the `blog` namespace in `messages/fr.json`**

Find the existing `"blog": { ... }` object (added in Creator Blog V2 Phase 3) and add these 7 keys inside it, alongside the existing ones (`feedTitle`, `noPosts`, `minRead`, etc. — leave those untouched):

```json
"globalFeedTitle": "Le blog Akeli",
"globalFeedSubtitle": "Découvrez les derniers articles de nos créateurs",
"searchPlaceholder": "Rechercher un article...",
"allCategories": "Toutes les catégories",
"sortNewest": "Plus récents",
"sortPopular": "Plus vus",
"noResults": "Aucun article ne correspond à votre recherche."
```

- [ ] **Step 2: Add the equivalent keys to the `blog` namespace in `messages/en.json`**

```json
"globalFeedTitle": "The Akeli Blog",
"globalFeedSubtitle": "Discover the latest posts from our creators",
"searchPlaceholder": "Search for a post...",
"allCategories": "All categories",
"sortNewest": "Newest",
"sortPopular": "Most viewed",
"noResults": "No posts match your search."
```

- [ ] **Step 3: Add `nav.blog` to both files**

Find the existing `"nav": { ... }` object in `messages/fr.json` (it already has `creators`, `recipes`, `signup`, `about`, `dashboard`, `logout`, `login`, `register` — add alongside them):

```json
"blog": "Blog"
```

Same key, same value, in `messages/en.json`'s `"nav"` object (the word "Blog" is identical in both languages).

- [ ] **Step 4: Verify both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 5: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(blog): add i18n keys for the global blog discovery page"
```

---

### Task 2: Global blog feed page

**Files:**
- Create: `app/[locale]/blog/BlogCatalogClient.tsx`
- Create: `app/[locale]/blog/page.tsx`

**Interfaces:**
- Consumes: the `blog` i18n namespace's new keys (Task 1), the existing `blog.categories.*` and `blog.minRead`/`blog.noPosts` keys (already present from Phase 3), `@/lib/supabase/client`'s `createClient()`, `@/lib/i18n/navigation`'s `Link`, `@/components/layout/Navbar`.

- [ ] **Step 1: Write `BlogCatalogClient.tsx`**

```typescript
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
```

- [ ] **Step 2: Write `page.tsx`**

```typescript
// app/[locale]/blog/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BlogCatalogClient from "./BlogCatalogClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return { title: t("globalFeedTitle"), description: t("globalFeedSubtitle") };
}

export default function BlogPage() {
  return <BlogCatalogClient />;
}
```

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual browser verification (required)**

Run: `npm run dev`, then in a browser:
1. Navigate to `/fr/blog`. Confirm posts from at least two different creators appear in one grid (use the test data already seeded on this branch from Phase 3's own manual verification — `task-6-public-post` and any other public post — or publish a second public post under a different creator if only one exists).
2. Confirm each card shows cover, category badge, title, excerpt, reading time, and a creator byline (avatar + name) that's a separate clickable link to that creator's profile.
3. Type into the search box and confirm the grid narrows to titles containing the typed text, with no page reload.
4. Pick a category from the dropdown and confirm only matching posts remain; reset to "Toutes les catégories" and confirm the full set returns.
5. Switch the sort dropdown to "Plus vus" and confirm the order changes to descending `view_count` (check against Supabase Studio if the visual order isn't obviously verifiable); switch back to "Plus récents" and confirm newest-first order returns.
6. Click a post card (not the byline) and confirm it navigates to that post's real `/creator/{id}/blog/{slug}` page.
7. Confirm a `followers`-only post (e.g. `task-6-followers-post` from Phase 3's test data) does NOT appear anywhere in this global feed, logged out or logged in — this page must only ever show `visibility='public'` posts.

Expected: all 7 checks pass.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/blog/BlogCatalogClient.tsx" "app/[locale]/blog/page.tsx"
git commit -m "feat(blog): add global blog discovery page pooling public posts across creators"
```

---

### Task 3: Navbar link

**Files:**
- Modify: `components/layout/Navbar.tsx:53-58`

**Interfaces:**
- Consumes: `nav.blog` (Task 1).

- [ ] **Step 1: Add the new entry to `navLinks`**

In `components/layout/Navbar.tsx`, find:

```typescript
  const navLinks = [
    { href: "/creators", label: t("creators") },
    { href: "/recipes", label: t("recipes") },
    { href: "/become-creator", label: t("signup") },
    { href: "/about", label: t("about") },
  ];
```

Replace with:

```typescript
  const navLinks = [
    { href: "/creators", label: t("creators") },
    { href: "/recipes", label: t("recipes") },
    { href: "/blog", label: t("blog") },
    { href: "/become-creator", label: t("signup") },
    { href: "/about", label: t("about") },
  ];
```

This single array already feeds both the desktop nav (`components/layout/Navbar.tsx`'s desktop `<nav>` block) and the mobile menu — no other change needed.

- [ ] **Step 2: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual browser verification (required)**

Run: `npm run dev` (if not already running from Task 2), then in a browser:
1. Confirm a "Blog" link now appears in the desktop navbar between "Recettes" and the creator-signup link, on any public page.
2. Click it and confirm it navigates to `/fr/blog`.
3. Shrink the viewport to mobile width, open the hamburger menu, and confirm "Blog" appears there too, in the same position, and also navigates correctly.
4. Confirm the link's active-state styling (highlighted background) applies when already on `/blog`, matching how the other nav links highlight on their own routes.

Expected: all 4 checks pass.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat(blog): add Blog link to the global navbar"
```

---

## After This Plan

The blog feature is now discoverable platform-wide: `/blog` pools every creator's public posts into one searchable, filterable, sortable feed, linked from the navbar on every page. Still deferred, matching Phase 3's own scope: gated posts never appear here (by design — this is a discovery surface for new readers), no pagination (fine at current post volume), and no likes/comments UI (blocked on visitor-auth UI, unchanged from Phase 3's decision).
