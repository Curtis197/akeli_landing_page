# Creator Blog — Design Spec

**Date:** 2026-06-20
**Status:** Approved for implementation

---

## Overview

Creators on Akeli can publish blog posts alongside their recipes — long-form content such as stories, technique guides, cultural context, or community updates. Blog posts are a second content type built on the same identity infrastructure (Akeli users + visitor fans) established by the visitor fan mode.

---

## Scope

**In scope:**
- Database schema: 4 new tables, triggers, RLS, newsletter RPC extension
- Slug generation at publish time (application layer, not DB trigger)
- Dual-identity interactions (likes, comments) for Akeli users and verified visitors
- Newsletter integration: blog post publish triggers `send-creator-newsletter` (extended)
- Visibility-aware fan email RPC

**Out of scope (UI deferred):**
- Blog post editor (rich text / block editor frontend)
- Public blog feed on creator profile page
- Creator dashboard blog management UI
- Comment moderation tools
- Blog post search / discovery

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Visibility | Per-post: `public`, `followers`, `fans` | Flexible gating, creator controls reach |
| Content format | Rich text blocks (JSONB) | Supports embedded recipe cards, images, quotes |
| Multilingual | `blog_post_translation` table | Clean separation of shared metadata vs. locale content |
| Comments | One level of replies via `parent_id` | Enables discussion without recursive query complexity |
| Newsletter | Same system as recipes, visibility-aware | Reuses `send-creator-newsletter` + new `get_creator_fan_emails` RPC |
| Interactions | Dual identity: Akeli users + verified visitors | Consistent with visitor fan mode architecture |
| Slug generation | Application layer at publish time | Cross-table slug (reads FR title from translation) can't use simple row trigger |

---

## Schema

### `blog_post`

Shared metadata for a post. Language-independent.

```sql
CREATE TABLE IF NOT EXISTS public.blog_post (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id       uuid REFERENCES public.creator(id) ON DELETE CASCADE,
  slug             text UNIQUE,
  visibility       text DEFAULT 'public'
                     CHECK (visibility IN ('public', 'followers', 'fans')),
  cover_image_url  text,
  is_published     boolean DEFAULT false,
  published_at     timestamptz,
  like_count       integer DEFAULT 0,
  comment_count    integer DEFAULT 0,   -- root comments only, not replies
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TRIGGER trg_blog_post_updated_at
  BEFORE UPDATE ON public.blog_post
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### `blog_post_translation`

Locale-specific title and rich text content. One row per locale per post.

```sql
CREATE TABLE IF NOT EXISTS public.blog_post_translation (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid REFERENCES public.blog_post(id) ON DELETE CASCADE,
  locale       text NOT NULL,
  title        text NOT NULL,
  content_json jsonb NOT NULL,          -- rich text block array
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (post_id, locale)
);

CREATE TRIGGER trg_blog_post_translation_updated_at
  BEFORE UPDATE ON public.blog_post_translation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

**`content_json` block structure (example):**
```json
[
  { "type": "heading", "level": 2, "text": "Introduction" },
  { "type": "paragraph", "text": "..." },
  { "type": "image", "url": "https://...", "caption": "..." },
  { "type": "recipe_embed", "recipe_id": "uuid" },
  { "type": "quote", "text": "...", "author": "..." }
]
```

Block types are open — the frontend block editor defines valid types. The DB stores whatever JSON the editor produces.

### `blog_post_like`

One like per user/visitor per post. Exactly one of `user_id` or `visitor_id` must be set.

```sql
CREATE TABLE IF NOT EXISTS public.blog_post_like (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES public.blog_post(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.user_profile(id) ON DELETE CASCADE,
  visitor_id  uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT chk_like_single_identity CHECK (
    (user_id IS NOT NULL AND visitor_id IS NULL) OR
    (user_id IS NULL AND visitor_id IS NOT NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (post_id, user_id),
  UNIQUE NULLS NOT DISTINCT (post_id, visitor_id)
);
```

### `blog_comment`

One level of replies via nullable `parent_id`. Exactly one of `user_id` or `visitor_id` must be set.

```sql
CREATE TABLE IF NOT EXISTS public.blog_comment (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES public.blog_post(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.blog_comment(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.user_profile(id) ON DELETE CASCADE,
  visitor_id  uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT chk_comment_single_identity CHECK (
    (user_id IS NOT NULL AND visitor_id IS NULL) OR
    (user_id IS NULL AND visitor_id IS NOT NULL)
  )
);

CREATE TRIGGER trg_blog_comment_updated_at
  BEFORE UPDATE ON public.blog_comment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

**One-level reply enforcement:** enforced at application layer when inserting a reply — verify that the target `parent_id` row has `parent_id IS NULL`. PostgreSQL CHECK constraints cannot use subqueries.

---

## Triggers

### `update_blog_like_count`

Keeps `blog_post.like_count` in sync without COUNT queries.

```sql
CREATE OR REPLACE FUNCTION public.update_blog_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_post SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_post SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_blog_like_count
  AFTER INSERT OR DELETE ON public.blog_post_like
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_like_count();
```

### `update_blog_comment_count`

Counts root comments only (not replies) on `blog_post.comment_count`.

```sql
CREATE OR REPLACE FUNCTION public.update_blog_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE public.blog_post SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE public.blog_post SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_blog_comment_count
  AFTER INSERT OR DELETE ON public.blog_comment
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_comment_count();
```

---

## RLS Policies

```sql
-- blog_post
ALTER TABLE public.blog_post ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own posts"
  ON public.blog_post FOR ALL
  USING (creator_id IN (
    SELECT id FROM public.creator WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone reads published public posts"
  ON public.blog_post FOR SELECT
  USING (is_published = true AND visibility = 'public');

-- blog_post_translation
ALTER TABLE public.blog_post_translation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own translations"
  ON public.blog_post_translation FOR ALL
  USING (post_id IN (
    SELECT bp.id FROM public.blog_post bp
    JOIN public.creator c ON c.id = bp.creator_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Public reads published public translations"
  ON public.blog_post_translation FOR SELECT
  USING (post_id IN (
    SELECT id FROM public.blog_post
    WHERE is_published = true AND visibility = 'public'
  ));

-- blog_post_like
ALTER TABLE public.blog_post_like ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akeli users manage own likes"
  ON public.blog_post_like FOR ALL
  USING (user_id = auth.uid());
-- Visitor likes: service role only (via Edge Function)

-- blog_comment
ALTER TABLE public.blog_comment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akeli users manage own comments"
  ON public.blog_comment FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Anyone reads comments on public posts"
  ON public.blog_comment FOR SELECT
  USING (post_id IN (
    SELECT id FROM public.blog_post
    WHERE is_published = true AND visibility = 'public'
  ));
-- Visitor comments: service role only (via Edge Function)
```

**Followers/fans visibility** (`followers`, `fans`) is enforced at the application query level — the Next.js Server Component or Edge Function checks the reader's follow/subscription status before fetching the post. RLS handles `public` reads and creator self-access only.

---

## Visibility Enforcement (Application Layer)

| `visibility` | Reader access check |
|---|---|
| `public` | None — RLS allows it |
| `followers` | Akeli user: `creator_follow` active row exists. Visitor: `visitor_creator_follow` active + email_verified row exists |
| `fans` | Akeli user: `fan_subscription` status = 'active'. Visitor: `visitor_fan_subscription` status = 'active' |

Creators always bypass visibility checks for their own posts.

---

## Slug Generation (Application Layer)

At publish time, the Server Action or Edge Function that sets `is_published = true` also:

1. Reads the FR translation title (`blog_post_translation` WHERE `locale = 'fr'`, fallback to first available locale)
2. Slugifies: lowercase → remove accents (`unaccent`) → replace non-alphanumeric with `-` → trim → append 6-char post id suffix
3. Writes `slug` + `published_at = now()` + `is_published = true` to `blog_post` in one UPDATE

```typescript
// Slug generation (replicates recipe pattern)
function slugify(title: string, id: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + id.slice(0, 6);
}
```

---

## Newsletter Integration

### New RPC: `get_creator_fan_emails`

Used when `visibility = 'fans'` — returns only paying fans (visitor + Akeli).

```sql
CREATE OR REPLACE FUNCTION public.get_creator_fan_emails(p_creator_id uuid)
RETURNS TABLE(email text, locale text, first_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Visitor paying fans
  RETURN QUERY
  SELECT v.email, v.locale, v.first_name
  FROM public.visitor_fan_subscription vfs
  JOIN public.visitor v ON v.id = vfs.visitor_id
  WHERE vfs.creator_id = p_creator_id
    AND vfs.status = 'active'
    AND v.email_verified = true;

  -- Akeli paying fans
  RETURN QUERY
  SELECT au.email::text, up.locale, up.first_name
  FROM public.fan_subscription fs
  JOIN public.user_profile up ON up.id = fs.user_id
  JOIN auth.users au ON au.id = fs.user_id
  WHERE fs.creator_id = p_creator_id
    AND fs.status = 'active';
END;
$$;
ALTER FUNCTION public.get_creator_fan_emails(uuid) OWNER TO postgres;
```

### Extension to `send-creator-newsletter`

The existing Edge Function receives DB webhook payloads. Add routing by `payload.table`:

```typescript
const isRecipe = payload.table === 'recipe';
const isBlogPost = payload.table === 'blog_post';

// Transition check for blog posts
const wasLive = old_record?.is_published;
const isNowLive = record?.is_published;
if (!isBlogPost || wasLive || !isNowLive) { /* skip or handle recipe */ }

// Fetch recipients based on visibility
const rpc = record.visibility === 'fans'
  ? 'get_creator_fan_emails'
  : 'get_creator_newsletter_emails';

const { data: recipients } = await supabase.rpc(rpc, {
  p_creator_id: record.creator_id,
});

// Fetch FR title for email subject
const { data: translation } = await supabase
  .from('blog_post_translation')
  .select('title')
  .eq('post_id', record.id)
  .eq('locale', 'fr')
  .single();
```

A second DB webhook must be configured in Supabase Dashboard:
- Table: `public.blog_post`
- Event: `UPDATE`
- Function: `send-creator-newsletter` (same function, extended)

---

## Schema Summary

| Table | Purpose |
|---|---|
| `blog_post` | Shared post metadata — visibility, slug, cover, counts |
| `blog_post_translation` | Locale content — title + rich text blocks (JSONB) |
| `blog_post_like` | Likes — dual identity (Akeli user OR visitor) |
| `blog_comment` | Comments + replies — dual identity, one level deep |

New RPCs:
- `get_creator_fan_emails(creator_id)` — paying fans only, for fans-only newsletter

Extended:
- `send-creator-newsletter` Edge Function — handles both `recipe` and `blog_post` webhooks

---

## Open Questions (deferred to UI spec)

- What block types does the rich text editor support? (paragraph, heading, image, recipe_embed, quote, video, divider…)
- Is there a reading-time estimate displayed to readers? If so, computed client-side or stored?
- Can creators schedule posts (future `published_at`)? Not in scope now.
- Are blog posts included in the public `/recipes` catalogue, or do they live on a separate `/blog` route?
