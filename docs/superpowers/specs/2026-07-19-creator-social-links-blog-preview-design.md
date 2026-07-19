# Creator Social Links + Blog Preview on Public Profile — Design

## Overview

Two additions to the public creator profile page (`/creator/[username]`):

1. Creators can display links to their social media (Instagram, TikTok, YouTube, personal website).
2. The profile shows the creator's latest blog articles below their recipes, when they have any published.

Both features reuse existing data and existing query/RPC logic. No database migration and no Supabase schema changes are needed.

## Feature 1 — Social media links

### Data

The `creator` table already has unused columns: `instagram_handle`, `tiktok_handle`, `youtube_handle`, `website_url` (present since the initial migration, confirmed in `lib/supabase/database.types.ts` and `supabase/migrations/20260318000000_init.sql`). The Zustand `CreatorProfile` type (`lib/stores/authStore.ts`) and the `AuthProvider` fetch (`components/providers.tsx`, `select=*`) already carry these fields — they're just not exposed in any UI yet.

Handles are stored bare (no `@`, no full URL) — e.g. `instagram_handle: "chef_amina"`, not `"@chef_amina"` or `"https://instagram.com/chef_amina"`. `website_url` is a full URL string.

### Creator edit form (`app/[locale]/(creator)/profile/page.tsx`)

New "Réseaux sociaux" section, positioned after "Spécialités":
- 4 text inputs: Instagram, TikTok, YouTube (handle, no `@` prefix shown/required in the input — a leading `@` is stripped on save if the user types one), and Site web (URL).
- Normalization on save: for the three handle fields, strip a leading `@` and, if a full platform URL was pasted, extract the trailing handle segment. For `website_url`, trim whitespace; if non-empty, validate it parses as a URL (accept without a scheme by prepending `https://` when missing) — show an inline error and block save on an invalid value, same pattern as other field validation in this form.
- On submit, added to the existing `supabase.from("creator").update({...})` payload alongside `display_name`, `bio`, etc., and to `setCreator(data)` afterward (already returns `select("*")`, so no query change needed there).
- This file has no `useTranslations` calls anywhere (pre-existing, deliberate convention — confirmed by reading the file) and hardcodes French strings directly. The new labels follow that same convention; no i18n keys are added for this form.

### Public profile display (`CreatorProfileClient.tsx`)

- The Supabase `select` for the `creator` row adds `instagram_handle, tiktok_handle, youtube_handle, website_url`.
- Below the bio/specialties block in the profile header, a row of icon links renders — one per field that is non-empty:
  - Instagram → `https://instagram.com/{handle}`, lucide `Instagram` icon
  - TikTok → `https://www.tiktok.com/@{handle}`, a small inline SVG (lucide has no TikTok mark)
  - YouTube → `https://youtube.com/@{handle}`, lucide `Youtube` icon
  - Website → the stored `website_url` as-is, lucide `Globe` icon
- Each link opens in a new tab (`target="_blank" rel="noopener noreferrer"`), rendered as a small icon-only button consistent with the existing card/badge styling on this page (rounded, border, muted-foreground color, hover state).
- If none of the four fields are set, the row doesn't render at all.

## Feature 2 — Latest blog articles under recipes

### Data

Reuses `fetchCreatorBlogFeed(creatorId)` from `lib/queries/blog-posts.ts`, which calls the `get_creator_blog_feed` RPC — already used by the existing `/creator/[username]/blog` feed page. Confirmed via the current RPC definition (`supabase/migrations/20260718130000_dedupe_blog_reader_translation_join.sql`) that results are already ordered `published_at DESC` and gating (`can_read`) is resolved server-side per-viewer. No RPC or query changes needed — the profile page slices the first 3 results client-side.

### Public profile page (`CreatorProfileClient.tsx`)

- `fetchCreatorBlogFeed(creatorId)` is called alongside the existing creator/recipes fetch (extends the current `Promise.all`).
- A new "Blog" section renders after the Recipes section, **only if `posts.length > 0`**.
- Shows the first 3 posts (already newest-first) as cards, reusing the same visual treatment as `components/public/blog/BlogFeedClient.tsx`: cover image (blurred if `!can_read`), category badge, 🔒 gated badge when `!can_read`, title, excerpt + reading time only when `can_read`. Card links to `/creator/[id]/blog/[slug]` when readable and has a slug; otherwise renders as a non-link card (matching the feed page's existing behavior).
- A "See all articles" link/button below the cards points to the existing `/creator/[username]/blog` page. Only rendered alongside the cards (i.e., also gated on `posts.length > 0`).

### i18n

New keys under the existing `creators` namespace in both `messages/fr.json` and `messages/en.json` (this file already uses `useTranslations("creators")`, unlike the profile edit form):
- `creators.blogPreviewTitle` — fr: `"Articles de {name}"` (mirrors `blog.feedTitle` wording), en: `"Articles by {name}"`
- `creators.seeAllArticles` — fr: `"Voir tous les articles →"`, en: `"See all articles →"`

Card internals reuse existing keys already present in the `blog` namespace: `blog.gatedTitle`, `blog.categories.*`, `blog.minRead` — no duplication.

## Non-goals

- No new social platforms beyond the 4 existing columns (Facebook/X excluded — would require a planned migration).
- No schema or migration changes.
- No changes to `get_creator_blog_feed`, the `/creator/[username]/blog` feed page, or the individual post reader page.
- No changes to the creator dashboard's own blog editor.

## Files touched

- `app/[locale]/(creator)/profile/page.tsx` — add social links form section + save logic
- `app/[locale]/creator/[username]/CreatorProfileClient.tsx` — select new columns, render social icon row, add blog preview section
- `messages/fr.json`, `messages/en.json` — 2 new keys under `creators`
