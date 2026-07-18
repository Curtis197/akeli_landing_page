# Global Blog Discovery Page — Design

## Overview

Creator Blog V2's Phase 3 plan explicitly deferred "platform-wide `/blog` discovery" ("needs a critical mass of posts across creators first; the per-creator feed and post page ship first" — Phasing section). That per-creator surface is now live. This spec covers the deferred piece: a single, site-wide `/blog` page that pools published posts from every creator into one discoverable feed, plus a navbar entry linking to it.

## Scope

**In scope:** a new `/[locale]/blog` route showing a unified, filterable grid of public posts across all creators; a new "Blog" link in the global navbar.

**Out of scope (unchanged from Phase 3):** likes/comments UI, gated (`followers`/`fans`) post visibility on this page, pagination, any changes to the per-creator feed or post pages.

## Content & Gating

The page shows **public posts only** — `blog_post.is_published = true AND blog_post.visibility = 'public'`. This is a discovery surface for readers who, by definition, aren't subscribed to any creator yet, so there's nothing to gate here. No `SECURITY DEFINER` RPC is needed: this relies entirely on Phase 1's existing RLS policy ("Anyone reads published public posts"), the same one that already makes public posts work on the per-creator feed. `followers`/`fans` posts remain discoverable only through their own creator's feed, exactly as today.

## Architecture

Mirrors `/recipes` and `/creators` exactly — the established pattern for every catalog/listing page on this site:

- `app/[locale]/blog/page.tsx` — thin Server Component wrapper. `generateMetadata` returns a static title/description sourced from i18n (no DB call), matching `app/[locale]/recipes/page.tsx`'s pattern exactly.
- `app/[locale]/blog/BlogCatalogClient.tsx` — `"use client"` component doing the actual data fetch, filtering, and rendering.

This intentionally does **not** get the Server Component SEO treatment that Phase 3 gave the individual post page — that deviation was justified there because a single post is a shareable, indexable unit worth real per-post OG tags; a catalog/listing page's SEO value is lower and every other listing page on this site (`/recipes`, `/creators`) already uses this same static-metadata-plus-client-component shape.

## Data Flow

One fetch on mount, via the browser Supabase client:

```
supabase.from("blog_post")
  .select(`
    id, slug, cover_image_url, category, published_at, view_count, creator_id,
    creator:creator_id ( display_name, profile_image_url ),
    blog_post_translation ( title, excerpt, reading_time_min )
  `)
  .eq("is_published", true)
  .eq("visibility", "public")
  .order("published_at", { ascending: false })
```

No locale filter (matches the plan's established "posts display as-authored" rule — already true of the per-creator feed and post page). No pagination or `LIMIT` — matches `/recipes`' and `/creators`' current fetch-everything-then-filter-client-side approach, appropriate at this site's current scale.

Search, category filter, and sort are all applied **client-side** against the already-fetched array, exactly mirroring `RecipesCatalogClient.tsx`'s existing `search`/`regionFilter`/`sort` state pattern — no server-side query params, no new fetch per filter change.

The initial `Promise`/fetch chain must include a `.catch()` from the start (a real bug Phase 3's Task 5 review caught and had to fix after the fact — an unhandled rejection there left the loading skeleton stuck forever). This spec bakes that in as a requirement, not an afterthought.

## Card Content

Each card shows: cover image, category badge, title, excerpt, reading time — the same fields as the per-creator feed's cards — **plus a creator byline** (small avatar + display name, linking to `/creator/[creator_id]`), since which creator wrote a post is essential context here in a way it isn't on their own feed. Clicking anywhere else on the card links to `/creator/[creator_id]/blog/[slug]`.

## Controls

- **Search box** — filters the already-fetched posts by title (case-insensitive substring match), same UX as `/recipes`' search box.
- **Category filter** — a dropdown over the 6 existing categories (`recette`, `culture`, `technique`, `ingredients`, `parcours`, `actualite`), same taxonomy already used by the editor and the per-creator feed.
- **Sort toggle** — "Newest" (default, `published_at desc`) vs. "Most viewed" (`view_count desc`), mirroring `/recipes`' `SortOption` (`"newest" | "popular"`).

## Navbar

One new entry added to the existing `navLinks` array in `components/layout/Navbar.tsx:53-58`. Because desktop and mobile menus both render off this single array, no duplicate work is needed — the link appears in both automatically. New i18n key: `nav.blog`.

## i18n

New keys added to the **already-existing** `blog` namespace (`messages/fr.json` / `messages/en.json`, established in Phase 3) rather than a new namespace, since this is the same feature domain:

- `globalFeedTitle` — page `<h1>` (e.g. "Le blog Akeli")
- `globalFeedSubtitle` — page subtitle/description, also used as `generateMetadata`'s description
- `searchPlaceholder`
- `allCategories` — the "no filter" option label in the category dropdown
- `sortNewest`, `sortPopular`
- `noResults` — empty state after filtering (distinct from `noPosts`, which is the zero-posts-at-all case already in the namespace)

Plus one new key in the existing `nav` namespace: `nav.blog`.

## Error Handling

- Loading skeleton while the initial fetch is in flight (matches `/recipes`/`/creators`).
- Empty state: zero posts fetched at all → `noPosts` message; posts exist but the current search/filter combination matches none → `noResults` message.
- Fetch failure → `.catch()` stops the loading state and falls through to the empty state, exactly matching the fix already applied to the per-creator feed's equivalent code path.

## Testing

No React component-testing framework exists in this repo (established, repo-wide convention — every test here covers a plain utility or Route Handler). Verification is `tsc --noEmit` plus a required manual browser check exercising: the unified feed loading with posts from multiple creators, each control (search, category, sort) actually filtering/sorting correctly, the creator byline linking to the right profile, a card linking to the right post, and the navbar link appearing and routing correctly on both desktop and mobile.

## Out of Scope / Deferred (unchanged from Phase 3's own deferred list)

- Gated posts on this page (would require a new `SECURITY DEFINER` RPC computing `can_read` across all creators — real future work if this page's engagement ever calls for it, but not needed for a first version).
- Pagination (matches the rest of the site's current scale).
- Any change to likes/comments UI, still fully deferred pending visitor-auth UI.
