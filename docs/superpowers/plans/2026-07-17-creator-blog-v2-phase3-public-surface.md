# Creator Blog V2 — Phase 3: Public Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make published blog posts readable by the public — a creator's blog feed and individual post pages, with SEO metadata and correct visibility gating.

**Architecture:** `blog/[slug]/page.tsx` is a genuine **Server Component** that fetches and renders content directly (per spec: "following the pattern used on static marketing pages... not the client-component pattern used by the recipe/creator-profile pages... a deliberate deviation, justified by SEO"). Visibility gating (`public`/`followers`/`fans`) is computed by two `SECURITY DEFINER` Postgres functions, not plain RLS — RLS alone can only hide or reveal an *entire row*, but the spec requires gated posts to still render as a "blurred cover, subscribe to read" teaser card, which means the client needs to see the post's metadata (title, cover) while being denied its body. A `SECURITY DEFINER` function computes a `can_read` boolean per row using the caller's `auth.uid()` and returns body content only when `can_read = true`.

**Tech Stack:** Next.js Server Components + `generateMetadata`, next-intl (this phase — unlike Phase 2's creator editor — is public-facing and uses real i18n, matching `recipes`/`creators`/`recipe`/`creator` pages' actual convention), Supabase RPC calls (both the cookie-aware server client and the browser client, calling the same two functions).

**Spec:** `docs/superpowers/specs/2026-07-17-creator-blog-v2-design.md` (Section: Public Surface)
**Builds on:** Phase 1 (`docs/superpowers/plans/2026-07-17-creator-blog-v2-phase1-schema-backend.md`), Phase 2 (`docs/superpowers/plans/2026-07-17-creator-blog-v2-phase2-creator-editor.md`)

## Global Constraints

- **This phase DOES use next-intl i18n** — the opposite convention from Phase 2. Confirmed by reading the actual current code: `app/[locale]/recipes/RecipesCatalogClient.tsx`, `app/[locale]/creator/[username]/CreatorProfileClient.tsx` all call `useTranslations(...)`. New namespace: `blog`, added to both `messages/fr.json` and `messages/en.json` (per CLAUDE.md's rule — every new key in both files).
- **Scope, per explicit user decision this session**: no likes/comments UI in this phase. Neither the Akeli-user nor the "visitor" (non-account) interaction Edge Functions from Phase 1 are wired into any UI here — there is currently zero frontend UI anywhere in this codebase for the visitor identity system (no signup/login form for it exists), so building visitor-facing interactions is out of scope until that's addressed separately. This phase is read-only: feed, post content, SEO, view-count tracking.
- **Visibility gating is computed by two `SECURITY DEFINER` SQL functions** (`get_creator_blog_feed`, `get_blog_post_for_reader` — Task 1), not by RLS alone. Phase 1's existing RLS policies (`supabase/migrations/20260620200000_create_blog_system.sql`) only grant SELECT on `blog_post` to the owning creator or to anyone reading a `public` post — a non-owning reader's plain `SELECT` never sees a `followers`/`fans` row at all, which makes it impossible to show that post as a locked teaser card (the spec's explicit requirement: "Gated posts show a blurred-cover 'Subscribe to read' card"). The two RPCs bypass RLS deliberately (that's what `SECURITY DEFINER` is for) and compute `can_read` themselves using `auth.uid()` joined against `creator_follow`/`fan_subscription`, returning post metadata always but body content (`content_json`) only when `can_read = true`. Only the Akeli-user identity is checked (`auth.uid()`) — there is no visitor-identity check, consistent with the no-visitor-UI constraint above; an anonymous or non-qualifying visitor simply always gets `can_read = false` for gated posts.
- **Server Component pattern for the post page** (Task 6): `app/[locale]/creator/[username]/blog/[slug]/page.tsx` renders content directly server-side using `@/lib/supabase/server`'s cookie-aware `createClient()` (confirmed safe to call from a Server Component — its `setAll` is wrapped in try/catch specifically for this). `generateMetadata` uses a separate plain `createClient` from `@supabase/supabase-js` with env vars directly (mirrors `app/[locale]/recipe/[slug]/page.tsx`'s pattern), since metadata generation doesn't need viewer-specific gating — a gated post's teaser metadata (title/cover/excerpt) is fine to expose in Open Graph tags regardless of the viewer, matching how real-world subscription content previews on social media.
- **The blog feed** (`blog/page.tsx`, Task 5) stays a Client Component (`"use client"`), matching the existing `recipes`/`creators` pattern — the spec's Server Component requirement is scoped explicitly to the `[slug]` post page for its stronger SEO value, not the listing page.
- **`username` route param is actually the creator's UUID**, not a slug (confirmed comment in `CreatorProfileClient.tsx:43`: `// username = creator ID`) — match this in the new blog routes too, for consistency with the existing creator-profile URL shape.
- **View tracking**: the already-built `POST /api/track/blog-view` (Phase 1) is called once per real page view via a tiny client-only `TrackPostView` component (renders `null`, fires on mount) — kept as a separate client island specifically so the Server Component's own render (including Next.js prefetching/revalidation) never double-counts a view, which a direct server-side RPC call inside the Server Component body would risk.
- **Recipe embeds link to `/recipe/[slug]`** (the existing public recipe teaser page), using `blog_post.recipe_embeds` (a `uuid[]` already computed at publish time by Phase 2) to batch-fetch embedded recipes' `slug`/`title`/`cover_image_url` once per post view — the block itself only stores `recipe_id`, not `slug`.
- **Markdown-lite inline formatting**: paragraph/quote block text may contain `**bold**`/`*italic*` (the editor's placeholder text tells creators to type it this way, per Phase 2's `BlockRenderer.tsx`) — the public read view must render it as real `<strong>`/`<em>`, not literal asterisks.
- **No Server Actions** — the `blog-view` POST is a Route Handler (already exists), not a Server Action.

---

## File Structure

```
supabase/migrations/
  20260717150000_add_blog_post_reader_rpcs.sql                    — Task 1
supabase/tests/
  blog_post_reader_rpcs.test.sql                                  — Task 1
messages/fr.json, messages/en.json                                — "blog" namespace — Task 2
lib/queries/
  blog-posts.ts                                                   — Task 3
lib/utils/
  render-inline-markdown.tsx                                      — Task 4
components/public/blog/
  PostBlockView.tsx                                                — Task 4
  BlogFeedClient.tsx                                               — Task 5
  TrackPostView.tsx                                                — Task 6
app/[locale]/creator/[username]/blog/
  page.tsx                                                         — Task 5
  [slug]/page.tsx                                                  — Task 6
```

---

### Task 1: Reader-facing RPCs for gated visibility

**Files:**
- Create: `supabase/migrations/20260717150000_add_blog_post_reader_rpcs.sql`
- Test: `supabase/tests/blog_post_reader_rpcs.test.sql`

**Interfaces:**
- Produces: `can_read_blog_post(p_post_creator_id uuid, p_visibility text) RETURNS boolean` — shared access-control predicate, called by both RPCs below so the follow/fan logic exists in exactly one place.
- Produces: `get_creator_blog_feed(p_creator_id uuid) RETURNS TABLE(id, slug, cover_image_url, category, published_at, visibility, can_read, title, excerpt, reading_time_min)`
- Produces: `get_blog_post_for_reader(p_creator_id uuid, p_slug text) RETURNS TABLE(id, slug, cover_image_url, category, tags, visibility, published_at, view_count, recipe_embeds, creator_id, creator_display_name, can_read, title, content_json, excerpt, seo_title, seo_description, reading_time_min)`

- [ ] **Step 1: Write the failing pgTAP test**

```sql
-- supabase/tests/blog_post_reader_rpcs.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(6);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES
  ('61000000-0000-0000-0000-000000000001', 'follower@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000002', 'stranger@blogrpc.test', now(), now(), 'authenticated', 'authenticated'),
  ('61000000-0000-0000-0000-000000000003', 'creator-user@blogrpc.test', now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id) VALUES
  ('61000000-0000-0000-0000-000000000001'),
  ('61000000-0000-0000-0000-000000000002'),
  ('61000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('61000000-0000-0000-0000-000000000010',
        '61000000-0000-0000-0000-000000000003', 'RPC Test Creator');

INSERT INTO public.creator_follow (user_id, creator_id, active)
VALUES ('61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000010', true);

INSERT INTO public.blog_post (id, creator_id, slug, visibility, is_published, published_at)
VALUES
  ('61000000-0000-0000-0000-000000000020', '61000000-0000-0000-0000-000000000010', 'public-post', 'public', true, now()),
  ('61000000-0000-0000-0000-000000000021', '61000000-0000-0000-0000-000000000010', 'followers-post', 'followers', true, now());

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json, excerpt, reading_time_min)
VALUES
  ('61000000-0000-0000-0000-000000000020', 'fr', 'Public Post', '[{"id":"b1","type":"paragraph","text":"hello"}]'::jsonb, 'excerpt', 2),
  ('61000000-0000-0000-0000-000000000021', 'fr', 'Followers Post', '[{"id":"b2","type":"paragraph","text":"secret"}]'::jsonb, 'excerpt', 2);

-- ── Test 1-2: feed RPC as a follower — both posts visible, can_read true for both ─

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  2,
  'Follower sees both posts in the feed RPC'
);

SELECT is(
  (SELECT bool_and(can_read) FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  true,
  'Follower has can_read=true on every post in the feed'
);

RESET ROLE;

-- ── Test 3-4: feed RPC as a stranger — both rows present, but can_read differs ────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010')),
  2,
  'Stranger still sees both posts (as teaser rows) in the feed RPC'
);

SELECT is(
  (SELECT can_read FROM get_creator_blog_feed('61000000-0000-0000-0000-000000000010') WHERE slug = 'followers-post'),
  false,
  'Stranger has can_read=false on the followers-only post'
);

RESET ROLE;

-- ── Test 5-6: detail RPC — content_json hidden vs shown based on can_read ─────────

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'followers-post')),
  NULL,
  'Stranger gets NULL content_json for a followers-only post'
);

SET LOCAL request.jwt.claim.sub = '61000000-0000-0000-0000-000000000001';

SELECT isnt(
  (SELECT content_json FROM get_blog_post_for_reader('61000000-0000-0000-0000-000000000010', 'followers-post')),
  NULL,
  'Follower gets real content_json for the same post'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `supabase test db supabase/tests/blog_post_reader_rpcs.test.sql`
Expected: FAIL — `function get_creator_blog_feed(uuid) does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260717150000_add_blog_post_reader_rpcs.sql

-- Phase 1's RLS only grants blog_post SELECT to the owning creator or to
-- anyone reading a 'public' post — a non-owning reader's query never returns
-- a 'followers'/'fans' row at all, which makes it impossible to show that
-- post as a "blurred cover, subscribe to read" teaser card (the spec's
-- explicit requirement for gated posts). These two SECURITY DEFINER
-- functions deliberately bypass RLS and compute a can_read flag themselves,
-- so metadata (title/cover) is always visible while body content
-- (content_json) is withheld unless the caller actually qualifies.
--
-- can_read_blog_post() is the shared access-control predicate both RPCs
-- call, so the follow/fan logic exists in exactly one place.

CREATE OR REPLACE FUNCTION public.can_read_blog_post(p_post_creator_id uuid, p_visibility text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_visibility = 'public'
    OR p_post_creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid())
    OR (p_visibility = 'followers' AND p_post_creator_id IN (
          SELECT creator_id FROM public.creator_follow WHERE user_id = auth.uid() AND active = true))
    OR (p_visibility = 'fans' AND p_post_creator_id IN (
          SELECT creator_id FROM public.fan_subscription WHERE user_id = auth.uid() AND status = 'active'));
$$;

GRANT EXECUTE ON FUNCTION public.can_read_blog_post(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_creator_blog_feed(p_creator_id uuid)
RETURNS TABLE (
  id uuid,
  slug text,
  cover_image_url text,
  category text,
  published_at timestamptz,
  visibility text,
  can_read boolean,
  title text,
  excerpt text,
  reading_time_min int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    bp.id,
    bp.slug,
    bp.cover_image_url,
    bp.category,
    bp.published_at,
    bp.visibility,
    public.can_read_blog_post(bp.creator_id, bp.visibility) AS can_read,
    bpt.title,
    bpt.excerpt,
    bpt.reading_time_min
  FROM public.blog_post bp
  JOIN public.blog_post_translation bpt ON bpt.post_id = bp.id
  WHERE bp.creator_id = p_creator_id
    AND bp.is_published = true
  ORDER BY bp.published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_blog_feed(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_blog_post_for_reader(p_creator_id uuid, p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  cover_image_url text,
  category text,
  tags text[],
  visibility text,
  published_at timestamptz,
  view_count int,
  recipe_embeds uuid[],
  creator_id uuid,
  creator_display_name text,
  can_read boolean,
  title text,
  content_json jsonb,
  excerpt text,
  seo_title text,
  seo_description text,
  reading_time_min int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH post AS (
    SELECT bp.*, c.display_name AS creator_display_name
    FROM public.blog_post bp
    JOIN public.creator c ON c.id = bp.creator_id
    WHERE bp.creator_id = p_creator_id
      AND bp.slug = p_slug
      AND bp.is_published = true
  ),
  access AS (
    SELECT public.can_read_blog_post(post.creator_id, post.visibility) AS can_read
    FROM post
  )
  SELECT
    post.id,
    post.slug,
    post.cover_image_url,
    post.category,
    post.tags,
    post.visibility,
    post.published_at,
    post.view_count,
    post.recipe_embeds,
    post.creator_id,
    post.creator_display_name,
    access.can_read,
    bpt.title,
    CASE WHEN access.can_read THEN bpt.content_json ELSE NULL END AS content_json,
    bpt.excerpt,
    bpt.seo_title,
    bpt.seo_description,
    bpt.reading_time_min
  FROM post
  CROSS JOIN access
  JOIN public.blog_post_translation bpt ON bpt.post_id = post.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_post_for_reader(uuid, text) TO anon, authenticated;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `supabase test db supabase/tests/blog_post_reader_rpcs.test.sql`
Expected: `1..6`, all 6 assertions `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260717150000_add_blog_post_reader_rpcs.sql supabase/tests/blog_post_reader_rpcs.test.sql
git commit -m "feat(blog): add SECURITY DEFINER RPCs computing per-reader post visibility"
```

---

### Task 2: `blog` i18n namespace

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: a `"blog"` top-level key in both message files, consumed by Tasks 5-6 via `useTranslations("blog")` / `getTranslations("blog")`.

- [ ] **Step 1: Add the `blog` key to `messages/fr.json`**

Add this as a new top-level key (alongside the existing `recipes`, `creators`, etc. keys — insert it anywhere at the top level, e.g. right after the `"recipe"` key):

```json
"blog": {
  "feedTitle": "Articles de {name}",
  "noPosts": "Aucun article pour le moment.",
  "readMore": "Lire l'article",
  "minRead": "{min} min de lecture",
  "publishedOn": "Publié le {date}",
  "byAuthor": "Par {name}",
  "viewRecipe": "Voir la recette complète",
  "backToBlog": "← Retour au blog",
  "postNotFound": "Article introuvable.",
  "gatedTitle": "Contenu réservé",
  "gatedFollowers": "Cet article est réservé aux abonnés de {name}.",
  "gatedFans": "Cet article est réservé aux fans de {name}.",
  "gatedCta": "Voir le profil de {name}",
  "categories": {
    "recette": "Recette",
    "culture": "Culture",
    "technique": "Technique",
    "ingredients": "Ingrédients",
    "parcours": "Parcours",
    "actualite": "Actualité"
  }
}
```

- [ ] **Step 2: Add the equivalent `blog` key to `messages/en.json`**

```json
"blog": {
  "feedTitle": "Posts by {name}",
  "noPosts": "No posts yet.",
  "readMore": "Read post",
  "minRead": "{min} min read",
  "publishedOn": "Published on {date}",
  "byAuthor": "By {name}",
  "viewRecipe": "View full recipe",
  "backToBlog": "← Back to blog",
  "postNotFound": "Post not found.",
  "gatedTitle": "Members-only content",
  "gatedFollowers": "This post is only available to {name}'s followers.",
  "gatedFans": "This post is only available to {name}'s fans.",
  "gatedCta": "View {name}'s profile",
  "categories": {
    "recette": "Recipe",
    "culture": "Culture",
    "technique": "Technique",
    "ingredients": "Ingredients",
    "parcours": "Journey",
    "actualite": "News"
  }
}
```

- [ ] **Step 3: Verify both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(blog): add blog i18n namespace (fr + en)"
```

---

### Task 3: Blog post query helpers

**Files:**
- Create: `lib/queries/blog-posts.ts`

**Interfaces:**
- Produces: `fetchCreatorBlogFeed(creatorId: string): Promise<BlogFeedPost[]>`, `BlogFeedPost` (exported type) — client-side, calls `get_creator_blog_feed`
- Produces: `fetchBlogPostForReaderServer(supabase: SupabaseClient, creatorId: string, slug: string): Promise<BlogPostDetail | null>`, `BlogPostDetail` (exported type) — takes an already-constructed Supabase client so it works with both the server (`@/lib/supabase/server`) and browser clients, calls `get_blog_post_for_reader`
- Produces: `fetchEmbeddedRecipes(supabase: SupabaseClient, recipeIds: string[]): Promise<EmbeddedRecipe[]>`, `EmbeddedRecipe` (exported type)

- [ ] **Step 1: Write `blog-posts.ts`**

```typescript
// lib/queries/blog-posts.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { PostBlock } from "@/lib/validations/post.schema";

export type BlogFeedPost = {
  id: string;
  slug: string | null;
  cover_image_url: string | null;
  category: string | null;
  published_at: string | null;
  visibility: "public" | "followers" | "fans";
  can_read: boolean;
  title: string;
  excerpt: string | null;
  reading_time_min: number | null;
};

export type BlogPostDetail = {
  id: string;
  slug: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  visibility: "public" | "followers" | "fans";
  published_at: string | null;
  view_count: number;
  recipe_embeds: string[];
  creator_id: string;
  creator_display_name: string | null;
  can_read: boolean;
  title: string;
  blocks: PostBlock[];
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_min: number | null;
};

export type EmbeddedRecipe = {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
};

// Called client-side by the feed (Task 5). can_read is computed per-row by
// the RPC using the caller's own auth.uid() — a non-qualifying or anonymous
// reader still gets every published post back, just with can_read=false on
// gated ones, so the feed can render them as locked teaser cards.
export async function fetchCreatorBlogFeed(creatorId: string): Promise<BlogFeedPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_creator_blog_feed", { p_creator_id: creatorId });
  if (error) throw error;
  return (data ?? []) as BlogFeedPost[];
}

// Accepts a pre-built client so the same helper works from the Server
// Component post page (cookie-aware @/lib/supabase/server client, so
// visibility reflects the actual logged-in viewer) without duplicating the
// RPC-shaping logic.
export async function fetchBlogPostForReaderServer(
  supabase: SupabaseClient,
  creatorId: string,
  slug: string
): Promise<BlogPostDetail | null> {
  const { data, error } = await supabase
    .rpc("get_blog_post_for_reader", { p_creator_id: creatorId, p_slug: slug })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    slug: row.slug,
    cover_image_url: row.cover_image_url,
    category: row.category,
    tags: row.tags ?? [],
    visibility: row.visibility,
    published_at: row.published_at,
    view_count: row.view_count ?? 0,
    recipe_embeds: row.recipe_embeds ?? [],
    creator_id: row.creator_id,
    creator_display_name: row.creator_display_name,
    can_read: row.can_read,
    title: row.title ?? "",
    blocks: (row.content_json ?? []) as PostBlock[],
    excerpt: row.excerpt,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    reading_time_min: row.reading_time_min,
  };
}

export async function fetchEmbeddedRecipes(supabase: SupabaseClient, recipeIds: string[]): Promise<EmbeddedRecipe[]> {
  if (recipeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("recipe")
    .select("id, slug, title, cover_image_url")
    .in("id", recipeIds)
    .eq("is_published", true);

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/blog-posts.ts
git commit -m "feat(blog): add public blog post query helpers backed by the reader RPCs"
```

---

### Task 4: Inline markdown rendering and read-only block view

**Files:**
- Create: `lib/utils/render-inline-markdown.tsx`
- Test: `lib/utils/render-inline-markdown.test.tsx`
- Create: `components/public/blog/PostBlockView.tsx`

**Interfaces:**
- Produces: `renderInlineMarkdown(text: string): React.ReactNode[]`
- Produces: `PostBlockView({ block, embeddedRecipes, viewRecipeLabel }: PostBlockViewProps)` — `embeddedRecipes: Map<string, EmbeddedRecipe>` (from Task 3). Pure presentational, no hooks — safe to render from either a Server Component (Task 6) or a Client Component.

- [ ] **Step 1: Write `render-inline-markdown.tsx` and its test**

```typescript
// lib/utils/render-inline-markdown.tsx
import type { ReactNode } from "react";

// Supports **bold** and *italic* only — matches exactly what the post editor's
// placeholder text tells creators to type (BlockRenderer.tsx's paragraph
// placeholder: "Écris ton paragraphe... (**gras**, *italique*)"). No nesting,
// no other markdown syntax.
export function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((t) => t !== "");
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
}
```

```typescript
// lib/utils/render-inline-markdown.test.tsx
import { describe, it, expect } from "vitest";
import { renderInlineMarkdown } from "@/lib/utils/render-inline-markdown";

function textOf(nodes: React.ReactNode[]): string {
  return nodes
    .map((n) => (typeof n === "string" ? n : (n as any).props.children))
    .join("");
}

describe("renderInlineMarkdown", () => {
  it("returns plain text unchanged when there is no markdown", () => {
    const result = renderInlineMarkdown("Hello world");
    expect(result).toEqual(["Hello world"]);
  });

  it("renders **bold** as a strong element", () => {
    const result = renderInlineMarkdown("This is **important** text");
    expect(result.length).toBe(3);
    expect((result[1] as any).type).toBe("strong");
    expect((result[1] as any).props.children).toBe("important");
  });

  it("renders *italic* as an em element", () => {
    const result = renderInlineMarkdown("This is *emphasized* text");
    expect((result[1] as any).type).toBe("em");
    expect((result[1] as any).props.children).toBe("emphasized");
  });

  it("handles multiple markers in one string", () => {
    const result = textOf(renderInlineMarkdown("**Bold** and *italic* together"));
    expect(result).toBe("Bold and italic together");
  });

  it("leaves an unterminated marker as literal text", () => {
    const result = renderInlineMarkdown("This has **no closing marker");
    expect(result).toEqual(["This has **no closing marker"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails, then passes**

Run: `npx vitest run lib/utils/render-inline-markdown.test.tsx`
Expected first: FAIL (`Cannot find module`). After creating the file above: 5 passed.

- [ ] **Step 3: Write `PostBlockView.tsx`**

```typescript
// components/public/blog/PostBlockView.tsx
import { Link } from "@/lib/i18n/navigation";
import { renderInlineMarkdown } from "@/lib/utils/render-inline-markdown";
import type { PostBlock } from "@/lib/validations/post.schema";
import type { EmbeddedRecipe } from "@/lib/queries/blog-posts";

interface PostBlockViewProps {
  block: PostBlock;
  embeddedRecipes: Map<string, EmbeddedRecipe>;
  viewRecipeLabel: string;
}

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return null;
}

export default function PostBlockView({ block, embeddedRecipes, viewRecipeLabel }: PostBlockViewProps) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-base leading-relaxed text-foreground mb-4">{renderInlineMarkdown(block.text)}</p>;

    case "heading": {
      const Tag = block.level === 2 ? "h2" : "h3";
      return <Tag className={block.level === 2 ? "text-2xl font-bold mt-8 mb-3 text-foreground" : "text-xl font-semibold mt-6 mb-2 text-foreground"}>{block.text}</Tag>;
    }

    case "quote":
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground">
          <p>{renderInlineMarkdown(block.text)}</p>
          {block.author && <cite className="block mt-1 text-sm not-italic">— {block.author}</cite>}
        </blockquote>
      );

    case "divider":
      return <hr className="my-8 border-border" />;

    case "image":
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.caption ?? ""} className="w-full rounded-xl" />
          {block.caption && <figcaption className="text-sm text-muted-foreground mt-2 text-center">{block.caption}</figcaption>}
        </figure>
      );

    case "image_gallery":
      return (
        <div className="grid grid-cols-2 gap-2 my-6">
          {block.urls.filter(Boolean).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
          ))}
        </div>
      );

    case "video_embed": {
      const embedUrl = youtubeEmbedUrl(block.url);
      if (!embedUrl) {
        return (
          <a href={block.url} target="_blank" rel="noopener noreferrer" className="block my-6 text-primary underline">
            {block.url}
          </a>
        );
      }
      return (
        <div className="aspect-video rounded-xl overflow-hidden my-6">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vidéo intégrée" />
        </div>
      );
    }

    case "recipe_embed": {
      const recipe = embeddedRecipes.get(block.recipe_id);
      if (!recipe || !recipe.slug) return null;
      return (
        <Link
          href={`/recipe/${recipe.slug}`}
          className="flex items-center gap-4 my-6 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors"
        >
          {recipe.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.cover_image_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-2xl">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{recipe.title}</p>
            <p className="text-sm text-primary mt-1">{viewRecipeLabel} →</p>
          </div>
        </Link>
      );
    }

    default:
      return null;
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/render-inline-markdown.tsx lib/utils/render-inline-markdown.test.tsx components/public/blog/PostBlockView.tsx
git commit -m "feat(blog): add inline markdown rendering and read-only block view"
```

---

### Task 5: Creator blog feed (with gated teaser cards)

**Files:**
- Create: `components/public/blog/BlogFeedClient.tsx`
- Create: `app/[locale]/creator/[username]/blog/page.tsx`

**Interfaces:**
- Consumes: `fetchCreatorBlogFeed` (Task 3)

- [ ] **Step 1: Write `BlogFeedClient.tsx`**

```typescript
// components/public/blog/BlogFeedClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchCreatorBlogFeed } from "@/lib/queries/blog-posts";
import type { BlogFeedPost } from "@/lib/queries/blog-posts";
import Navbar from "@/components/layout/Navbar";

export default function BlogFeedClient() {
  const t = useTranslations("blog");
  const params = useParams();
  const creatorId = String(params.username);

  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogFeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("creator").select("display_name").eq("id", creatorId).single(),
      fetchCreatorBlogFeed(creatorId),
    ]).then(([{ data: creator }, feedPosts]) => {
      setCreatorName(creator?.display_name ?? null);
      setPosts(feedPosts);
      setLoading(false);
    });
  }, [creatorId]);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t("feedTitle", { name: creatorName ?? "" })}
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">{t("noPosts")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((post) => {
              const card = (
                <>
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className={`w-full aspect-video object-cover ${post.can_read ? "" : "blur-md"}`}
                    />
                  ) : (
                    <div className="w-full aspect-video bg-secondary flex items-center justify-center text-3xl">📝</div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {post.category && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {t(`categories.${post.category}` as any)}
                        </span>
                      )}
                      {!post.can_read && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          🔒 {t("gatedTitle")}
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-foreground line-clamp-2">{post.title}</h2>
                    {post.can_read && post.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                    )}
                    {post.can_read && post.reading_time_min != null && (
                      <p className="text-xs text-muted-foreground mt-2">{t("minRead", { min: post.reading_time_min })}</p>
                    )}
                  </div>
                </>
              );

              return post.can_read ? (
                <Link
                  key={post.id}
                  href={`/creator/${creatorId}/blog/${post.slug}`}
                  className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {card}
                </Link>
              ) : (
                <div key={post.id} className="rounded-xl border border-border overflow-hidden opacity-90">
                  {card}
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

- [ ] **Step 2: Write `app/[locale]/creator/[username]/blog/page.tsx`**

```typescript
// app/[locale]/creator/[username]/blog/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import BlogFeedClient from "@/components/public/blog/BlogFeedClient";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: creatorId } = await params;

  const { data: creator } = await supabase()
    .from("creator")
    .select("display_name, bio")
    .eq("id", creatorId)
    .single();

  if (!creator) notFound();

  const title = `${creator.display_name ?? "Créateur"} — Blog`;

  return {
    title,
    description: creator.bio ?? undefined,
  };
}

export default function CreatorBlogFeedPage() {
  return <BlogFeedClient />;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/public/blog/BlogFeedClient.tsx "app/[locale]/creator/[username]/blog/page.tsx"
git commit -m "feat(blog): add creator blog feed page with gated teaser cards"
```

---

### Task 6: Individual post page (Server Component)

**Files:**
- Create: `components/public/blog/TrackPostView.tsx`
- Create: `app/[locale]/creator/[username]/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchBlogPostForReaderServer`, `fetchEmbeddedRecipes` (Task 3), `PostBlockView` (Task 4)

No React component-testing framework exists (established convention, Phase 2's Global Constraints) — verification for this task is `tsc` plus a required manual browser check, since this is the final integration point tying the whole public surface together, and the only task that exercises the gating RPCs end-to-end through real HTTP.

- [ ] **Step 1: Write `TrackPostView.tsx`**

A minimal client island whose only job is firing the view-count beacon once per real browser page load — kept separate from the Server Component so Next.js prefetching/revalidation of the page itself never triggers a view-count increment.

```typescript
// components/public/blog/TrackPostView.tsx
"use client";

import { useEffect, useRef } from "react";

export default function TrackPostView({ postId }: { postId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    fetch("/api/track/blog-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {});
  }, [postId]);

  return null;
}
```

- [ ] **Step 2: Write `app/[locale]/creator/[username]/blog/[slug]/page.tsx`**

```typescript
// app/[locale]/creator/[username]/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { fetchBlogPostForReaderServer, fetchEmbeddedRecipes } from "@/lib/queries/blog-posts";
import type { EmbeddedRecipe } from "@/lib/queries/blog-posts";
import PostBlockView from "@/components/public/blog/PostBlockView";
import TrackPostView from "@/components/public/blog/TrackPostView";
import Navbar from "@/components/layout/Navbar";

function metadataSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;

  // Teaser metadata (title/cover/excerpt) is fine to expose in Open Graph
  // regardless of gating — real-world subscription content previews the
  // same way when shared on social media. Full content_json is never
  // requested here.
  const { data: post } = await metadataSupabase()
    .from("blog_post")
    .select(`
      cover_image_url, published_at,
      blog_post_translation ( title, excerpt, seo_title, seo_description, locale )
    `)
    .eq("slug", slug)
    .eq("creator_id", username)
    .eq("is_published", true)
    .single();

  if (!post) notFound();

  const translation = ((post as any).blog_post_translation ?? [])[0];
  const title = translation?.seo_title || translation?.title || "Article";
  const description = translation?.seo_description || translation?.excerpt || undefined;
  const ogLocale = translation?.locale === "en" ? "en_US" : "fr_FR";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      locale: ogLocale,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
      publishedTime: (post as any).published_at ?? undefined,
    },
    alternates: {
      canonical: `/creator/${username}/blog/${slug}`,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const t = await getTranslations("blog");

  const supabase = await createServerClient();
  const post = await fetchBlogPostForReaderServer(supabase, username, slug);

  if (!post) notFound();

  let embeddedRecipes = new Map<string, EmbeddedRecipe>();
  if (post.can_read && post.recipe_embeds.length > 0) {
    const recipes = await fetchEmbeddedRecipes(supabase, post.recipe_embeds);
    embeddedRecipes = new Map(recipes.map((r) => [r.id, r]));
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link href={`/creator/${username}/blog`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("backToBlog")}
        </Link>

        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className={`w-full aspect-video object-cover rounded-xl mt-4 mb-6 ${post.can_read ? "" : "blur-md"}`}
          />
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
          {post.category && <span>{t(`categories.${post.category}` as any)}</span>}
          {post.can_read && post.reading_time_min != null && <span>· {t("minRead", { min: post.reading_time_min })}</span>}
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{post.title}</h1>

        {post.creator_display_name && (
          <p className="text-sm text-muted-foreground mb-8">{t("byAuthor", { name: post.creator_display_name })}</p>
        )}

        {post.can_read ? (
          <article>
            {post.blocks.map((block) => (
              <PostBlockView key={block.id} block={block} embeddedRecipes={embeddedRecipes} viewRecipeLabel={t("viewRecipe")} />
            ))}
          </article>
        ) : (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="font-medium text-foreground">
              {post.visibility === "fans"
                ? t("gatedFans", { name: post.creator_display_name ?? "" })
                : t("gatedFollowers", { name: post.creator_display_name ?? "" })}
            </p>
            <Link href={`/creator/${username}`} className="inline-block text-sm text-primary hover:underline">
              {t("gatedCta", { name: post.creator_display_name ?? "" })}
            </Link>
          </div>
        )}
      </main>

      {post.can_read && <TrackPostView postId={post.id} />}
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual browser verification (required — this is the full public read path)**

Run: `npm run dev`, then in a browser:
1. As a creator, publish a post through the Phase 2 wizard with a paragraph containing `**bold**` and `*italic*` text, a heading, a recipe_embed pointing at one of your own published recipes, and `visibility: public`.
2. Navigate (logged out, or in an incognito window) to `/fr/creator/{creatorId}/blog` — confirm the post appears in the feed grid with cover, category badge, excerpt, reading time.
3. Click through to the post — confirm the title, category, reading time, author name, cover image, and body all render correctly, `**bold**`/`*italic*` render as real formatting (not literal asterisks), and the recipe embed renders as a card that links to `/recipe/{slug}` and actually navigates there.
4. View page source (not just devtools — must be in the raw server-rendered HTML, confirming this is a true Server Component render, not client-hydrated) and confirm the post title/body text is present, and that the `<title>`/OG tags from `generateMetadata` are real, not defaults.
5. Reload the post page and confirm `blog_post.view_count` incremented (check via Supabase Studio) — confirms the `TrackPostView` beacon is firing exactly once per load, not on every server render.
6. Publish a second post with `visibility: followers`. Visit its feed card while logged out — confirm it renders as a locked/blurred teaser (title still visible, cover blurred, no excerpt/reading-time). Visit its direct post URL while logged out — confirm it renders the gated message (not a 404, not the full content). Log in as an Akeli user who follows that creator (insert a row into `creator_follow` if needed) and confirm the same post now renders in full, in both the feed and the detail page.

Expected: full public read flow works end-to-end, including real server-side gating via the Task 1 RPCs.

- [ ] **Step 5: Commit**

```bash
git add components/public/blog/TrackPostView.tsx "app/[locale]/creator/[username]/blog/[slug]/page.tsx"
git commit -m "feat(blog): add public post detail Server Component with SEO metadata and gating"
```

---

## After This Plan

Creator Blog V2 is now readable end-to-end: creators write and publish through Phase 2's wizard, readers discover and read through Phase 3's feed and post pages, with correct SEO metadata and RPC-enforced visibility gating (including locked teaser cards for `followers`/`fans` posts, matching the spec exactly). Deliberately still deferred: likes/comments UI (Phase 1's Edge Functions exist but are unused — blocked on a separate visitor-auth-UI decision), platform-wide `/blog` discovery across all creators, and scheduled publishing (the `scheduled_publish_at` column exists but no cron job flips it). Each is a small, well-scoped follow-up once prioritized, not a redesign.
