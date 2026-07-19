# Creator Blog V2 — Design Spec

**Date:** 2026-07-17
**Status:** Approved for implementation
**Branch:** `feat/blog`

---

## Overview

Creators publish long-form posts (stories, technique guides, cultural context, community updates) alongside recipes. This spec reconciles and supersedes two earlier documents:

- `docs/superpowers/specs/2026-06-20-creator-blog-design.md` — approved and **implemented at the DB layer only** (`blog_post`, `blog_post_translation`, `blog_post_like`, `blog_comment`, RLS, triggers, newsletter integration — migrations `20260620200000_create_blog_system.sql`, `20260623120000_secure_newsletter_triggers.sql`). UI was explicitly out of scope.
- `akeli-claude-code/04-V2/05-creator-blog.md` — a later (2026-06-25) planning doc describing a structurally different, incompatible schema (`creator_post`, TipTap, tiered gating, no translation table). Written without reference to the schema above; not implemented.

**Decision:** extend the already-implemented June 20 schema (it already matches this codebase's established patterns — multi-locale via translation table, dual Akeli-user/visitor identity from Fan Mode) rather than adopt the June 25 `creator_post` model. This spec folds in the June 25 doc's product surface (categories, tags, SEO, view counts, reading time, recipe embeds, editor, routes) on top of the June 20 tables.

This is the design for a **full-scope build** (editor, public feed, post page, likes/comments, SEO), with three sub-features explicitly phased to P3 (see Phasing).

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Base schema | Extend June 20 tables, additive migration only | Already live, tested, RLS'd, newsletter-wired — no rollback risk |
| Editor | Custom lightweight block editor, not TipTap | Zero new dependency; reuses the `@dnd-kit` reorder pattern already proven on recipe steps (`StepCard.tsx`); faster to ship |
| Localization | Single locale per post, for now | Simpler creator UX (no dual FR/EN authoring). Constrained at the **application layer only** — `blog_post_translation` keeps its existing schema/RLS/newsletter wiring so multi-locale can be turned back on later without another migration |
| Draft/publish | `draft_data jsonb` on `blog_post`, transactional publish | Mirrors the pattern just shipped for recipes (`recipe.draft_data`) — editing a live post never mutates the live row until explicit Publish |
| Visibility gating | Keep `public`/`followers`/`fans` (single fan tier) | Matches the platform's actual subscription model (boolean-style fan status) — no tier_1/2/3 system exists and building one is out of scope here |
| Interactions (likes/comments) | One Edge Function per identity, mirroring `toggle-recipe-like` / `visitor-follow-creator` | Matches existing convention exactly — not one branching function |
| SEO | Post detail page is a Server Component with `generateMetadata` | Deliberate deviation from the recipe/creator-profile client-component pattern — needed since SEO is a stated purpose of this feature and none of the existing public pages support per-item OG tags |
| Route protection | No `proxy.ts` change needed | `/dashboard/posts` already falls under the existing `/dashboard` prefix in `CREATOR_PATHS` |

---

## Schema (additive migration)

### `blog_post` — new columns

```sql
ALTER TABLE public.blog_post
  ADD COLUMN category text CHECK (category IN ('recette','culture','technique','ingredients','parcours','actualite')),
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN view_count integer DEFAULT 0,
  ADD COLUMN recipe_embeds uuid[] DEFAULT '{}',
  ADD COLUMN draft_data jsonb,
  ADD COLUMN scheduled_publish_at timestamptz;
```

- `recipe_embeds`: computed at publish time by scanning the post's `content_json` for `recipe_embed` blocks and writing the resulting `recipe_id` list here — denormalized for embed-click / conversion analytics, not queried live from JSON.
- `draft_data`: staging area for edits to an **already-published** post. A brand-new (never-published) post edits its real columns directly (`is_published = false`), same as today.
- `scheduled_publish_at`: nullable, P3 — see Phasing.

### `blog_post_translation` — new columns

```sql
ALTER TABLE public.blog_post_translation
  ADD COLUMN excerpt text,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text,
  ADD COLUMN reading_time_min integer;
```

- `reading_time_min` computed once at publish time from word count (~200 wpm), not recomputed per read.
- **Single-locale constraint (application layer, not DB):** exactly one row per post for now. The `UNIQUE (post_id, locale)` constraint and multi-row capability stay as-is in the DB — nothing here blocks adding a second locale later.

`content_json` is unchanged — a flat array of typed blocks (`paragraph`, `heading`, `image`, `image_gallery`, `quote`, `recipe_embed`, `video_embed`, `divider`), written by the block editor.

No changes to `blog_post_like`, `blog_comment`, existing RLS policies, or existing triggers.

---

## Creator Space

### Routes

```
app/[locale]/(creator)/dashboard/posts/page.tsx           — list (drafts/published/archived)
app/[locale]/(creator)/dashboard/posts/new/page.tsx       — new post editor
app/[locale]/(creator)/dashboard/posts/[id]/edit/page.tsx — edit
```

Covered by the existing `/dashboard` prefix in `proxy.ts`'s `CREATOR_PATHS` — no route-protection change needed. No separate `/preview` route: preview renders the public post component inline as a client-side overlay from the edit page.

### Components (`components/creator/post-form/`, mirrors `recipe-form/`)

- `PostWizard.tsx` — stateful container (local `useState`, matches `RecipeWizard`'s pattern, not Zustand). Steps: Content → Cover & Settings → Publish.
- `BlockEditor.tsx` + one component per block type — list of blocks, reordered via `@dnd-kit` (already a dependency, already proven on `StepCard.tsx`).
- `RecipeEmbedPicker.tsx` — searches the creator's own catalog; reuses the search-modal pattern from `IngredientSearch.tsx`.
- Category select (6 fixed values) + tag chip input, styled like `Step6Tags.tsx`.
- Single language field (`fr`/`en`), defaulting to the creator's locale.

### Draft/publish/autosave

Identical mechanism to `RecipeWizard`: 30s autosave interval + save-on-navigate; for already-published posts, edits stage into `draft_data` and only materialize into the real columns on explicit Publish (transactional).

### Image upload

`lib/utils/upload-image.ts`'s `uploadImage()` currently hardcodes the `recipe-images` bucket. Generalize to `uploadImage(file, path, bucket = 'recipe-images')`, add a new `post-images` Storage bucket (RLS mirrors `recipe-images`: creator writes to own path, public reads published). Extract the duplicated dropzone JSX (`Step5Images.tsx` cover vs. gallery) into one shared `<ImageDropzone>` component used by both the recipe wizard and the new post editor's cover/gallery/inline-image blocks.

### i18n

New namespace `post_form` (snake_case), matching the `recipe_form` precedent as the nearest sibling feature.

### Data/mutations

Inline client Supabase calls in `"use client"` components — no Server Actions (none exist anywhere in this codebase today). Matches how `RecipeWizard` and the dashboard recipe list actually work, not the `lib/queries/` + `useQuery` pattern (which exists but is under-used in practice).

---

## Public Surface

### Routes

```
app/[locale]/creator/[username]/blog/page.tsx        — creator's published post feed
app/[locale]/creator/[username]/blog/[slug]/page.tsx — individual post (Server Component)
app/[locale]/blog/page.tsx                            — platform-wide discovery (P3)
```

### SEO

`blog/[slug]/page.tsx` is a **Server Component** with `generateMetadata` (OG tags, canonical URL, `article` type, `openGraph.locale` = the post's actual written language) — following the pattern used on static marketing pages (`become-creator`, `about`), not the client-component pattern used by the recipe/creator-profile pages. This is a deliberate deviation, justified by SEO being one of the three stated purposes of this feature.

### Visibility gating

`public` / `followers` / `fans`, enforced exactly as the original spec designed: RLS covers `public` reads and creator self-access; the Server Component checks `creator_follow` / `fan_subscription` (Akeli user) or `visitor_creator_follow` / `visitor_fan_subscription` (visitor) before rendering `followers`/`fans` posts. Gated posts show a blurred-cover "Subscribe to read" card otherwise. Creators always bypass the check for their own posts.

This is unrelated to the recipe "teasing" rule in CLAUDE.md (no full ingredients/steps on web) — that rule is recipe-specific. Once a blog post's visibility check passes, its full content renders on the web; that's the point of the surface.

### Locale display

A post displays as-authored regardless of the site visitor's active locale (no hiding a French post from an English-browsing visitor, no auto-translation), per the single-locale-for-now decision above.

### Likes/comments

New Edge Functions, one per identity (mirrors `toggle-recipe-like` / `visitor-follow-creator`):

- `toggle-blog-like` (Akeli user, Bearer token)
- `visitor-toggle-blog-like` (visitor JWT via `verifyVisitorJWT`, requires `email_verified`)
- `create-blog-comment` (Akeli user) — enforces one-level-reply (rejects if the target `parent_id` row itself has a non-null `parent_id`)
- `visitor-create-blog-comment` (visitor, requires `email_verified`)

### View count

New Route Handler `app/api/track/blog-view/route.ts`, mirroring `app/api/track/open/route.ts` — increments server-side via the `increment_post_view` RPC so it can't be trivially inflated client-side.

---

## Phasing (P3 — deferred, not cut)

- **Scheduled publishing** — `scheduled_publish_at` column exists (Section: Schema) but the Supabase Cron job that flips `is_published` when due is not built in this pass.
- **Platform-wide `/blog` discovery** — needs a critical mass of posts across creators first; the per-creator feed and post page ship first.
- **Post-performance analytics** (`get_post_stats`, `get_post_engagement`) — same phase as the rest of the analytics engine work, not this feature's core.

---

## Out of Scope

- Comment moderation tooling. Note: under the existing RLS, `blog_comment` can only be managed by its own author (`user_id = auth.uid()`) — a creator currently has **no** RLS path to delete an abusive comment on their own post. This is a real gap, but closing it (a new RLS policy or moderation Edge Function) is a separate, small follow-up, not bundled into this pass.
- Cross-posting to Substack/Medium
- Draft collaboration (multiple editors on one post)
- Tiered (tier_1/2/3) subscription gating — the platform has a single fan tier today; building a multi-tier subscription system is a separate, larger project
- Multi-locale authoring UI (deferred per the localization decision above; DB already supports it if revisited)

---

## Open Questions

- Minimum content length before "Publish" is enabled? (V2 doc raised this, still unresolved — recommend none for V1 of this feature, revisit if spam/low-effort posts become a problem)
- Ad revenue share on high-traffic public posts — long-term business question, not a build blocker
