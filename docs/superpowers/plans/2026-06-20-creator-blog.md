# Creator Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add creator blog infrastructure — 4 database tables, denormalized count triggers, RLS policies, a fan email RPC, and visibility-aware newsletter integration for blog post publishes.

**Architecture:** `blog_post` + `blog_post_translation` + `blog_post_like` + `blog_comment` extend the existing content model. Dual identity (Akeli users + verified visitors) on likes and comments mirrors the visitor fan mode. The existing `send-creator-newsletter` Edge Function is refactored to handle both recipe and blog post webhooks via a shared `sendNewsletter` helper, routing recipients through either `get_creator_newsletter_emails` or the new `get_creator_fan_emails` RPC based on post visibility.

**Tech Stack:** Supabase PostgreSQL 15, pgTAP (SQL tests), Deno/TypeScript Edge Functions (`https://esm.sh/` imports), Resend (already configured via `RESEND_API_KEY` secret)

## Global Constraints

- `UNIQUE NULLS NOT DISTINCT` requires PostgreSQL 15+ — Supabase runs PG15, safe to use
- Migration naming: `YYYYMMDDHHMMSS_description.sql` — next available: `20260620200000`
- Edge Function imports use `https://esm.sh/` — never `npm:`
- Response format: `{ data: ..., error: null }` success / `{ data: null, error: "..." }` failure
- Slug generation is application-layer only — no DB trigger for blog post slugs
- One-level reply depth enforced at application layer — not in DB
- `comment_count` on `blog_post` counts root comments only (`parent_id IS NULL`), not replies
- From address for all emails: `Akeli <no-reply@a-keli.com>`
- Followers/fans visibility enforced at application query level — RLS covers `public` reads only
- `like_count` floor is 0 — use `GREATEST(like_count - 1, 0)` in decrement trigger

---

### Task 1: Database Migration — Blog System

**Files:**
- Create: `supabase/migrations/20260620200000_create_blog_system.sql`
- Create: `supabase/tests/blog_system.test.sql`

**Interfaces:**
- Produces:
  - Table `public.blog_post(id, creator_id, slug, visibility, cover_image_url, is_published, published_at, like_count, comment_count, created_at, updated_at)`
  - Table `public.blog_post_translation(id, post_id, locale, title, content_json, created_at, updated_at)`
  - Table `public.blog_post_like(id, post_id, user_id, visitor_id, created_at)`
  - Table `public.blog_comment(id, post_id, parent_id, user_id, visitor_id, content, created_at, updated_at)`
  - RPC `public.get_creator_fan_emails(p_creator_id uuid) → TABLE(email text, locale text, first_name text)`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260620200000_create_blog_system.sql

-- ── blog_post ─────────────────────────────────────────────────────────────────

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
  comment_count    integer DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TRIGGER trg_blog_post_updated_at
  BEFORE UPDATE ON public.blog_post
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── blog_post_translation ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_post_translation (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid REFERENCES public.blog_post(id) ON DELETE CASCADE,
  locale       text NOT NULL,
  title        text NOT NULL,
  content_json jsonb NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (post_id, locale)
);

CREATE TRIGGER trg_blog_post_translation_updated_at
  BEFORE UPDATE ON public.blog_post_translation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── blog_post_like ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_post_like (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES public.blog_post(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.user_profile(id) ON DELETE CASCADE,
  visitor_id  uuid REFERENCES public.visitor(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT chk_like_single_identity CHECK (
    (user_id IS NOT NULL AND visitor_id IS NULL) OR
    (user_id IS NULL     AND visitor_id IS NOT NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (post_id, user_id),
  UNIQUE NULLS NOT DISTINCT (post_id, visitor_id)
);

-- ── blog_comment ──────────────────────────────────────────────────────────────

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
    (user_id IS NULL     AND visitor_id IS NOT NULL)
  )
);

CREATE TRIGGER trg_blog_comment_updated_at
  BEFORE UPDATE ON public.blog_comment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Count triggers ────────────────────────────────────────────────────────────

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
ALTER FUNCTION public.update_blog_like_count() OWNER TO postgres;

CREATE TRIGGER trg_blog_like_count
  AFTER INSERT OR DELETE ON public.blog_post_like
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_like_count();

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
ALTER FUNCTION public.update_blog_comment_count() OWNER TO postgres;

CREATE TRIGGER trg_blog_comment_count
  AFTER INSERT OR DELETE ON public.blog_comment
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_comment_count();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.blog_post ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own posts"
  ON public.blog_post FOR ALL
  USING (creator_id IN (
    SELECT id FROM public.creator WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone reads published public posts"
  ON public.blog_post FOR SELECT
  USING (is_published = true AND visibility = 'public');

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

ALTER TABLE public.blog_post_like ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akeli users manage own likes"
  ON public.blog_post_like FOR ALL
  USING (user_id = auth.uid());

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

-- ── get_creator_fan_emails RPC ────────────────────────────────────────────────
-- Returns active paying fans (visitors + Akeli users) for a creator.
-- Used by send-creator-newsletter when blog_post.visibility = 'fans'.

CREATE OR REPLACE FUNCTION public.get_creator_fan_emails(p_creator_id uuid)
RETURNS TABLE(email text, locale text, first_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verified visitor paying fans
  RETURN QUERY
  SELECT v.email, v.locale, v.first_name
  FROM public.visitor_fan_subscription vfs
  JOIN public.visitor v ON v.id = vfs.visitor_id
  WHERE vfs.creator_id = p_creator_id
    AND vfs.status = 'active'
    AND v.email_verified = true;

  -- Registered Akeli paying fans
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

- [ ] **Step 2: Write the SQL tests**

```sql
-- supabase/tests/blog_system.test.sql
BEGIN;
SELECT plan(13);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('20000000-0000-0000-0000-000000000001', 'creator@blog.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('20000000-0000-0000-0000-000000000001');

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001', 'Blog Creator');

INSERT INTO public.visitor (id, email, password_hash, email_verified, locale, first_name)
VALUES ('20000000-0000-0000-0000-000000000003',
        'fan@blog.test', '$2b$10$fakehash', true, 'fr', 'FanVisitor');

-- ── Test 1: blog_post INSERT succeeds ────────────────────────────────────────

INSERT INTO public.blog_post (id, creator_id, visibility)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000002', 'public');

SELECT ok(
  (SELECT count(*)::int FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010') = 1,
  'blog_post INSERT with valid visibility succeeds'
);

-- ── Test 2: invalid visibility rejected ──────────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post (creator_id, visibility)
     VALUES ('20000000-0000-0000-0000-000000000002', 'private') $$,
  '23514', NULL,
  'Invalid blog_post visibility is rejected'
);

-- ── Test 3: blog_post_translation UNIQUE (post_id, locale) ───────────────────

INSERT INTO public.blog_post_translation (post_id, locale, title, content_json)
VALUES ('20000000-0000-0000-0000-000000000010', 'fr', 'Mon Article', '[]');

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_translation (post_id, locale, title, content_json)
     VALUES ('20000000-0000-0000-0000-000000000010', 'fr', 'Duplicate FR', '[]') $$,
  '23505', NULL,
  'Duplicate (post_id, locale) on blog_post_translation is rejected'
);

-- ── Test 4: blog_post_like single identity — both null rejected ───────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010', NULL, NULL) $$,
  '23514', NULL,
  'blog_post_like with both identities null is rejected'
);

-- ── Test 5: blog_post_like single identity — both non-null rejected ───────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, user_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010',
             '20000000-0000-0000-0000-000000000001',
             '20000000-0000-0000-0000-000000000003') $$,
  '23514', NULL,
  'blog_post_like with both identities set is rejected'
);

-- ── Test 6: blog_post_like UNIQUE per visitor per post ────────────────────────

INSERT INTO public.blog_post_like (post_id, visitor_id)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003');

SELECT throws_ok(
  $$ INSERT INTO public.blog_post_like (post_id, visitor_id)
     VALUES ('20000000-0000-0000-0000-000000000010',
             '20000000-0000-0000-0000-000000000003') $$,
  '23505', NULL,
  'Duplicate visitor like on same post is rejected'
);

-- ── Test 7: like_count increments on like INSERT ──────────────────────────────

SELECT is(
  (SELECT like_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'like_count increments to 1 after visitor like INSERT'
);

-- ── Test 8: like_count decrements on like DELETE ──────────────────────────────

DELETE FROM public.blog_post_like
WHERE post_id = '20000000-0000-0000-0000-000000000010'
  AND visitor_id = '20000000-0000-0000-0000-000000000003';

SELECT is(
  (SELECT like_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'like_count decrements to 0 after like DELETE'
);

-- ── Test 9: blog_comment single identity constraint ───────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.blog_comment (post_id, user_id, visitor_id, content)
     VALUES ('20000000-0000-0000-0000-000000000010', NULL, NULL, 'Both null') $$,
  '23514', NULL,
  'blog_comment with both identities null is rejected'
);

-- ── Test 10: comment_count increments on root comment INSERT ─────────────────

INSERT INTO public.blog_comment (id, post_id, visitor_id, content)
VALUES ('20000000-0000-0000-0000-000000000020',
        '20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003',
        'Great post!');

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'comment_count increments to 1 after root comment INSERT'
);

-- ── Test 11: comment_count does NOT increment on reply INSERT ────────────────

INSERT INTO public.blog_comment (post_id, visitor_id, content, parent_id)
VALUES ('20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000003',
        'A reply!',
        '20000000-0000-0000-0000-000000000020');

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  1,
  'comment_count stays at 1 after reply INSERT (replies not counted)'
);

-- ── Test 12: comment_count decrements on root comment DELETE ─────────────────

DELETE FROM public.blog_comment
WHERE id = '20000000-0000-0000-0000-000000000020';

SELECT is(
  (SELECT comment_count FROM public.blog_post
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'comment_count decrements to 0 after root comment DELETE (cascade removes reply)'
);

-- ── Test 13: get_creator_fan_emails returns active verified visitor fans ──────

INSERT INTO public.visitor_fan_subscription (visitor_id, creator_id, status)
VALUES ('20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002',
        'active');

SELECT is(
  (SELECT count(*)::int FROM public.get_creator_fan_emails(
    '20000000-0000-0000-0000-000000000002')),
  1,
  'get_creator_fan_emails returns 1 active verified visitor fan'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 3: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 4: Run the SQL tests**

```bash
npx supabase test db
```

Expected: `1..13` followed by `ok 1` through `ok 13`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260620200000_create_blog_system.sql supabase/tests/blog_system.test.sql
git commit -m "feat(blog): add blog schema — 4 tables, count triggers, RLS, fan email RPC"
```

---

### Task 2: Extend send-creator-newsletter for Blog Posts

**Files:**
- Modify: `supabase/functions/send-creator-newsletter/index.ts` (full rewrite — shared helper extracted)

**Interfaces:**
- Consumes (from Task 1): `public.get_creator_fan_emails(p_creator_id uuid)` RPC
- Consumes (existing): `public.get_creator_newsletter_emails(p_creator_id uuid)` RPC
- Webhook payload shape:
  - Recipe: `{ table: "recipe", record: { id, creator_id, title, slug, cover_image_url, is_published, show_on_website }, old_record: { is_published, show_on_website } }`
  - Blog post: `{ table: "blog_post", record: { id, creator_id, slug, cover_image_url, is_published, visibility }, old_record: { is_published } }`

- [ ] **Step 1: Rewrite send-creator-newsletter**

```typescript
// supabase/functions/send-creator-newsletter/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recipient { email: string; locale: string; first_name: string | null; }

interface NewsletterPayload {
  creatorId: string;
  rpc: 'get_creator_newsletter_emails' | 'get_creator_fan_emails';
  subjectFr: string;
  subjectEn: string;
  title: string;
  coverUrl: string | null;
  linkUrl: string;
  type: 'recipe' | 'blog';
}

// ── Shared send helper ────────────────────────────────────────────────────────

async function sendNewsletter(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  { creatorId, rpc, subjectFr, subjectEn, title, coverUrl, linkUrl, type }: NewsletterPayload
): Promise<Response> {
  const { data: creator } = await supabase
    .from('creator')
    .select('display_name')
    .eq('id', creatorId)
    .single();

  const creatorName = creator?.display_name ?? 'Votre créateur';

  const { data: recipients } = await supabase.rpc(rpc, { p_creator_id: creatorId });

  if (!recipients || recipients.length === 0) {
    console.log(`[send-creator-newsletter] type=${type} creator=${creatorId} no recipients`);
    return new Response(JSON.stringify({ data: { sent: 0 }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const siteUrl = Deno.env.get('SITE_URL')!;
  let sent = 0;

  for (const recipient of recipients as Recipient[]) {
    const isFr = recipient.locale !== 'en';
    const firstName = recipient.first_name ? `, ${recipient.first_name}` : '';
    const subject = isFr
      ? `${subjectFr} de ${creatorName}`
      : `${subjectEn} from ${creatorName}`;
    const ctaLabel = isFr
      ? (type === 'recipe' ? 'Voir la recette' : "Lire l'article")
      : (type === 'recipe' ? 'View recipe' : 'Read post');

    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: recipient.email,
      subject,
      html: isFr
        ? `
          <h2>Bonjour${firstName} !</h2>
          <p><strong>${creatorName}</strong> vient de publier :</p>
          <h3>${title}</h3>
          ${coverUrl ? `<img src="${coverUrl}" alt="${title}" style="max-width:600px;width:100%" />` : ''}
          <p><a href="${linkUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">${ctaLabel}</a></p>
          <p style="color:#888;font-size:12px;margin-top:32px">Vous recevez cet email car vous suivez ${creatorName} sur Akeli.</p>
        `
        : `
          <h2>Hello${firstName}!</h2>
          <p><strong>${creatorName}</strong> just published:</p>
          <h3>${title}</h3>
          ${coverUrl ? `<img src="${coverUrl}" alt="${title}" style="max-width:600px;width:100%" />` : ''}
          <p><a href="${linkUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">${ctaLabel}</a></p>
          <p style="color:#888;font-size:12px;margin-top:32px">You receive this because you follow ${creatorName} on Akeli.</p>
        `,
    });
    sent++;
  }

  console.log(`[send-creator-newsletter] type=${type} creator=${creatorId} sent=${sent}`);
  return new Response(JSON.stringify({ data: { sent }, error: null }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { table, record, old_record } = payload;

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const siteUrl = Deno.env.get('SITE_URL')!;

    // ── Recipe ───────────────────────────────────────────────────────────────

    if (table === 'recipe') {
      const wasLive = old_record?.is_published && old_record?.show_on_website;
      const isNowLive = record?.is_published && record?.show_on_website;

      if (wasLive || !isNowLive) {
        return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return sendNewsletter(supabase, resend, {
        creatorId: record.creator_id,
        rpc: 'get_creator_newsletter_emails',
        subjectFr: '🍽️ Nouvelle recette',
        subjectEn: '🍽️ New recipe',
        title: record.title,
        coverUrl: record.cover_image_url ?? null,
        linkUrl: `${siteUrl}/recipe/${record.slug}`,
        type: 'recipe',
      });
    }

    // ── Blog post ─────────────────────────────────────────────────────────────

    if (table === 'blog_post') {
      const wasPublished = old_record?.is_published;
      const isNowPublished = record?.is_published;

      if (wasPublished || !isNowPublished) {
        return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch FR title — fallback to first available locale
      const { data: frTranslation } = await supabase
        .from('blog_post_translation')
        .select('title')
        .eq('post_id', record.id)
        .eq('locale', 'fr')
        .maybeSingle();

      let postTitle = frTranslation?.title;
      if (!postTitle) {
        const { data: anyTranslation } = await supabase
          .from('blog_post_translation')
          .select('title')
          .eq('post_id', record.id)
          .limit(1)
          .single();
        postTitle = anyTranslation?.title ?? 'Nouvel article';
      }

      const rpc = record.visibility === 'fans'
        ? 'get_creator_fan_emails'
        : 'get_creator_newsletter_emails';

      return sendNewsletter(supabase, resend, {
        creatorId: record.creator_id,
        rpc,
        subjectFr: '✍️ Nouvel article',
        subjectEn: '✍️ New post',
        title: postTitle,
        coverUrl: record.cover_image_url ?? null,
        linkUrl: `${siteUrl}/blog/${record.slug}`,
        type: 'blog',
      });
    }

    return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-creator-newsletter]', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy the updated function**

```bash
npx supabase functions deploy send-creator-newsletter
```

Expected: `Deployed send-creator-newsletter` with no errors.

- [ ] **Step 3: Configure the blog_post DB webhook in Supabase Dashboard**

In Supabase Dashboard → Database → Webhooks → Create webhook:
- Name: `on_blog_post_published_newsletter`
- Table: `public.blog_post`
- Events: `UPDATE`
- Type: Supabase Edge Functions
- Edge Function: `send-creator-newsletter`
- HTTP headers: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

The existing `on_recipe_published_newsletter` webhook remains unchanged.

- [ ] **Step 4: Test recipe webhook still works**

In Supabase Studio, update an existing published recipe row — toggle `show_on_website` off then back on to simulate a re-publish.

Check Edge Function logs in Supabase Dashboard → Edge Functions → `send-creator-newsletter` → Logs.

Expected log: `[send-creator-newsletter] type=recipe creator=<id> sent=<n>`

- [ ] **Step 5: Test blog post webhook**

In Supabase Studio:
1. Insert a blog post row for an existing creator with `is_published = false`
2. Insert a `blog_post_translation` row for that post with `locale = 'fr'` and a title
3. Make sure a visitor follows that creator (`visitor_creator_follow` with `active = true`)
4. Update the `blog_post` row: set `is_published = true`

Check Edge Function logs.

Expected log: `[send-creator-newsletter] type=blog creator=<id> sent=1`
Expected: newsletter email arrives at the follower's address with `✍️ Nouvel article de <creator>` subject.

- [ ] **Step 6: Test fans-only blog post**

In Supabase Studio:
1. Insert a blog post row with `visibility = 'fans'` and `is_published = false`
2. Insert a FR translation
3. Ensure a visitor has an active `visitor_fan_subscription` for that creator
4. Update `is_published = true`

Expected: email sent only to paying fans, not to free followers.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/send-creator-newsletter/
git commit -m "feat(blog): extend send-creator-newsletter to handle blog posts with visibility-aware routing"
```

---

## Self-Review Checklist

- [x] **4 tables** — `blog_post`, `blog_post_translation`, `blog_post_like`, `blog_comment` all present with correct FKs and constraints
- [x] **Dual identity** — `chk_like_single_identity` and `chk_comment_single_identity` enforce exactly one identity set
- [x] **`UNIQUE NULLS NOT DISTINCT`** — used on `blog_post_like` for per-user and per-visitor uniqueness (PG15 ✓)
- [x] **Count triggers** — `like_count` on INSERT/DELETE, `comment_count` on root-only INSERT/DELETE (`parent_id IS NULL` check present)
- [x] **`GREATEST(..., 0)`** — prevents like_count / comment_count going negative on spurious deletes
- [x] **RLS** — all 4 tables enabled; visitor writes on likes/comments are service-role-only (no visitor policy = Edge Function handles it)
- [x] **`get_creator_fan_emails`** — queries both `visitor_fan_subscription` + `fan_subscription`, filters `status = 'active'` and `email_verified = true`
- [x] **Newsletter routing** — `fans` visibility uses `get_creator_fan_emails`; `public`/`followers` use `get_creator_newsletter_emails`
- [x] **Title fallback** — fetches FR translation first, falls back to any locale, then hardcoded fallback string
- [x] **Transition check** — `wasPublished || !isNowPublished` prevents duplicate sends on subsequent UPDATE
- [x] **Recipe webhook unchanged** — existing `table === 'recipe'` branch preserved exactly, only extracted into shared helper
- [x] **13 SQL tests** — cover constraints, triggers, count logic, and RPC
