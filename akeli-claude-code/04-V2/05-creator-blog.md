# 05 — Creator Blog Posts

> **Status:** V2 feature spec — 2026-06-25
> **Author:** Curtis — Founder Akeli

---

## 1. Vision

Creators on Akeli are not just recipe publishers — they are storytellers, cultural guides, and culinary educators. Blog posts give them a long-form surface to share:

- The story behind a recipe (family history, regional origin, diaspora adaptation)
- Ingredient guides (where to buy fonio in Paris, what to substitute for uziza leaves)
- Cooking technique deep-dives (how to get the perfect jollof char)
- Cultural context (why this dish is eaten at funerals, at celebrations, on Sunday)
- Personal journey posts (how I learned to cook my grandmother's ndolé)

For the platform, blog posts serve three purposes:

1. **SEO surface** — rich long-form content indexed by Google, driving organic discovery
2. **Subscription value** — tier-gated posts give fans a reason to subscribe
3. **Recipe context** — posts link to and embed recipes, driving consumption

---

## 2. Post Structure

### Content model

```
Title           — plain text, required
Slug            — auto-generated from title, editable, unique per creator
Excerpt         — 1–3 sentences shown in feed previews, auto-generated or manual
Cover image     — required for published posts
Body            — rich text (TipTap JSON format)
Tags            — free-form array
Category        — one of: Recette · Culture · Technique · Ingrédients · Parcours · Actualité
Status          — draft | published | archived
Tier required   — null (public) | tier_1 | tier_2 | tier_3
Published at    — timestamp
Reading time    — computed from word count (~200 words/min)
Recipe embeds   — array of recipe IDs embedded inline in the body
SEO title       — optional override of title for <meta>
SEO description — optional override of excerpt for <meta>
```

### Body content types (TipTap nodes)

| Node | Description |
|---|---|
| Paragraph | Standard text |
| Heading (H2, H3) | Section headers |
| Bold / Italic / Underline | Inline formatting |
| Blockquote | Highlighted quotes or tips |
| Unordered / Ordered list | Steps, ingredients, tips |
| Image | Single image with caption |
| Image gallery | 2–4 images side by side |
| Recipe embed | Inline recipe card (image + title + macros + link) |
| Video embed | YouTube / TikTok URL → embedded player |
| Divider | Section separator |

---

## 3. Database Schema

```sql
CREATE TABLE creator_post (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID REFERENCES creator(id) NOT NULL,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL,
  excerpt             TEXT,
  cover_image_url     TEXT,
  content             JSONB NOT NULL,          -- TipTap JSON
  content_text        TEXT,                    -- plain text extraction for search/SEO
  category            TEXT,
  tags                TEXT[] DEFAULT '{}',
  status              TEXT DEFAULT 'draft',    -- 'draft'|'published'|'archived'
  tier_required       TEXT,                    -- null = public, 'tier_1'|'tier_2'|'tier_3'
  published_at        TIMESTAMPTZ,
  reading_time_min    INTEGER,                 -- computed on publish
  view_count          INTEGER DEFAULT 0,
  like_count          INTEGER DEFAULT 0,
  recipe_embeds       UUID[] DEFAULT '{}',     -- recipe IDs embedded in body
  seo_title           TEXT,
  seo_description     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, slug)
);

CREATE INDEX creator_post_creator_id_idx    ON creator_post(creator_id);
CREATE INDEX creator_post_status_idx        ON creator_post(status);
CREATE INDEX creator_post_published_at_idx  ON creator_post(published_at DESC);

-- View count increment (called from API route, not client-side)
CREATE OR REPLACE FUNCTION increment_post_view(post_id UUID)
RETURNS void AS $$
  UPDATE creator_post SET view_count = view_count + 1 WHERE id = post_id;
$$ LANGUAGE sql;
```

**RLS policies:**
- Public can read posts where `status = 'published'` AND (`tier_required IS NULL` OR fan subscription verified)
- Creator can read/write their own posts regardless of status

---

## 4. Routes

### Creator space (authenticated)

```
/(creator)/posts                    — Post list: drafts + published + archived
/(creator)/posts/new                — New post editor
/(creator)/posts/[id]/edit          — Edit existing post
/(creator)/posts/[id]/preview       — Preview before publishing (full public view)
```

### Public surface

```
/creator/[username]/blog            — Creator's published blog feed
/creator/[username]/blog/[slug]     — Individual post page
/blog                               — Platform-wide blog discovery (all creators)
```

---

## 5. Creator Editor (`/posts/new` and `/posts/[id]/edit`)

### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Posts          [Save draft]  [Preview]  [Publish ▾]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Cover image ────────────────────────────────   │
│  [Drop image or click to upload]                 │
│                                                  │
│  Title ──────────────────────────────────────   │
│  │ Voici pourquoi le Ndolé est une recette...   │
│                                                  │
│  Excerpt (optional) ─────────────────────────   │
│  │ Auto-generated from first 160 chars          │
│                                                  │
├────────── Toolbar ───────────────────────────── │
│  B  I  U  │  H2  H3  │  " │  — │  Image  📎   │
├─────────────────────────────────────────────────┤
│                                                  │
│  Body (TipTap editor) ───────────────────────   │
│                                                  │
│  [Type or paste your story...]                   │
│                                                  │
│  [+ Embed recipe]  ← opens recipe picker        │
│                                                  │
├─────────────────────────────────────────────────┤
│  SETTINGS (right sidebar)                        │
│  Category      [Recette ▾]                       │
│  Tags          [+ add tag]                       │
│  Access        ◉ Public  ○ Tier 1  ○ Tier 2     │
│  Slug          /ma-recette-de-ndole              │
│  SEO title     (override)                        │
│  SEO desc      (override)                        │
└─────────────────────────────────────────────────┘
```

### Recipe embed flow

Clicking `[+ Embed recipe]` opens a slide-over:
- Search creator's catalog
- Select a recipe → inserts an inline recipe card into the body at cursor position
- Card shows: cover image · title · cook time · difficulty · macros summary · "View recipe" button

### Publish flow

`[Publish ▾]` dropdown:
- **Publish now** — sets `status = published`, `published_at = now()`
- **Schedule** — date/time picker → sets `published_at` in the future (Supabase Cron fires the status update)
- **Tier gate** — select which tier is required before publishing

### Autosave

Draft auto-saves every 30 seconds on keystroke pause. Status bar shows "Saved" / "Saving..." / "Unsaved changes".

---

## 6. Public Display

### Creator blog feed — `/creator/[username]/blog`

```
Creator profile header (avatar, bio, follow/subscribe)

Blog posts grid:
  ┌──────────────────────┐  ┌──────────────────────┐
  │  [cover image]       │  │  [cover image]       │
  │  Category tag        │  │  🔒 Tier 2           │
  │  Title               │  │  Title               │
  │  Excerpt...          │  │  Excerpt...          │
  │  5 min read · Jun 24 │  │  8 min read · Jun 22 │
  └──────────────────────┘  └──────────────────────┘

Gated post shows: blurred cover + lock icon + "Subscribe to [Tier name] to read"
```

### Individual post — `/creator/[username]/blog/[slug]`

```
Cover image (full-width hero)
Category · Reading time · Date

H1 Title
Excerpt (large text)

─── Body ───────────────────────────────────────
Paragraphs, headings, images, blockquotes...

  ┌── Recipe card embed ─────────────────────┐
  │  [image]  Poulet DG                       │
  │           ⏱ 60 min  ★ 4.8  💪 42g prot  │
  │           [View full recipe →]            │
  └───────────────────────────────────────────┘

More paragraphs...
────────────────────────────────────────────────

Author card: avatar · name · bio · [Follow] [Subscribe]

Related recipes: 3 recipe cards from embeds or creator's catalog
Related posts:   2 posts in same category
```

### Gated content handling

If `tier_required` is set and user is NOT a subscriber at that tier:

```
[First 20% of body visible with fade-out gradient]

┌────────────────────────────────────────────┐
│  🔒  This post is for [Tier name] members  │
│                                             │
│  Subscribe from €X/month to continue       │
│  [Subscribe to [Creator] →]               │
└────────────────────────────────────────────┘
```

### Platform-wide blog — `/blog`

Discovery feed for all creators:
- Filter by category, language, dietary tag
- Featured posts (editorial selection or top-performing)
- "New from creators you follow"
- Search by keyword

---

## 7. SEO

Each published post generates a Next.js `generateMetadata` with:
```typescript
{
  title: post.seo_title ?? post.title,
  description: post.seo_description ?? post.excerpt,
  openGraph: {
    title, description,
    images: [post.cover_image_url],
    type: 'article',
    publishedTime: post.published_at,
    authors: [creator.display_name]
  },
  alternates: {
    canonical: `/creator/${creator.username}/blog/${post.slug}`
  }
}
```

`content_text` (plain-text extraction of the body) is indexed for full-text search via Supabase `tsvector`.

---

## 8. Integration with Existing Systems

### Fan Tier gating

`tier_required` maps directly to the creator tier system (V2 Fan Mode):
- `null` → public, any visitor
- `tier_1` → subscriber at tier 1 or higher
- `tier_2` → subscriber at tier 2 or higher
- `tier_3` → top tier subscribers only

Access check happens server-side in the page component via `checkFanSubscription(user_id, creator_id, tier_required)`.

### Recipe embeds → consumption funnel

Each recipe card embedded in a post has a "View full recipe" CTA.
On click → routes to `/recipe/[slug]` (public teasing page) → download app CTA.

Recipe embeds tracked as `recipe_impression` events, attributed to `source: 'blog_post'`.

### Analytics engine

New SQL functions to add (v1.4):

```sql
get_post_stats(creator_id, period_days)
  Returns: total_posts, published, drafts, total_views,
           avg_views_per_post, top_post_by_views

get_post_engagement(post_id, creator_id)
  Returns: views, likes, avg_read_time_pct, recipe_embed_clicks,
           conversion_to_subscription
```

Blog data feeds into existing analytics:
- `session-strategy-synthesis` can include post performance in creator action plan
- `content-calendar-optimizer` can schedule blog posts alongside recipe publications

### i18n

Posts are written in one language (creator's choice). No auto-translation in V2.
Creator can create separate posts per language manually.
Post language stored as `language: 'fr'|'en'|...` column (add to schema).

---

## 9. Creator Space — Post List (`/posts`)

```
[+ New post]                                [Filter: All · Drafts · Published]

Title                    Status      Views    Date
─────────────────────────────────────────────────────
Pourquoi le ndolé...     ● Published  1,240   Jun 24
Guide des épices...      ○ Draft      —       Jun 22
Mon premier supper...    ● Published    387   Jun 18  🔒 Tier 1
L'histoire du koki       ● Published    820   Jun 10
Ingrédients introuvables ○ Draft      —       Jun 5
```

Row actions: Edit · Preview · Archive · Duplicate · Copy link

---

## 10. Build Priorities

| Priority | Feature | Notes |
|---|---|---|
| P1 | DB schema + RLS | Foundation |
| P1 | Post editor (TipTap) + draft/publish | Core creator flow |
| P1 | Public post page + creator blog feed | Public surface |
| P2 | Recipe embed component | High conversion value |
| P2 | Tier gating | Required for subscription value |
| P2 | SEO + generateMetadata | Long-term organic growth |
| P3 | Scheduled publishing | Nice to have |
| P3 | Platform-wide `/blog` discovery | After creator adoption |
| P3 | Analytics (post stats) | Phase 3 analytics build |

---

## 11. Open Questions

- Should posts support comments? (adds moderation complexity)
- Should creators be able to cross-post to Substack/Medium via API?
- Minimum word count before "Publish" is enabled?
- Should the platform share ad revenue on high-traffic public posts (long-term)?
- Draft collaboration — can a creator's assistant/editor draft a post?

---

*Document created: 2026-06-25*
*Author: Curtis — Founder Akeli*
*Version: 1.0 — Creator Blog Posts V2*
