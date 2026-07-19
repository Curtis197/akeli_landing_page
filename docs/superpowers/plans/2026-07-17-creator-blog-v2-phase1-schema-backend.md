# Creator Blog V2 — Phase 1: Schema & Backend Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the backend foundation for the creator blog feature — additive schema, image storage, and interaction (like/comment/view) Edge Functions — so Phase 2 (creator editor) and Phase 3 (public surface) have a working backend to build against.

**Architecture:** Additive-only migration on the existing, live `blog_post`/`blog_post_translation`/`blog_post_like`/`blog_comment` tables (no rollback, no data migration). New `post-images` Storage bucket. Four new Edge Functions (one per identity per action, mirroring `toggle-recipe-like`/`visitor-follow-creator`). One new Route Handler for view-count tracking, mirroring `app/api/track/open/route.ts`.

**Tech Stack:** Supabase Postgres (pgTAP tests), Supabase Edge Functions (Deno), Next.js Route Handlers, vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-creator-blog-v2-design.md`

## Global Constraints

- No Server Actions exist anywhere in this codebase — mutations are inline client Supabase calls in `"use client"` components, or Route Handlers under `app/api/*/route.ts`. Do not introduce `"use server"` files.
- Service-role access from Next.js server code goes through `getSupabaseAdmin()` in `lib/tracking/supabase-admin.ts`, which already prefers `SUPABASE_SECRET_KEY` over the legacy `SUPABASE_SERVICE_ROLE_KEY`. Never hardcode a key.
- Edge Functions in this codebase have zero existing unit-test precedent (no Deno test files exist for any of the ~30 functions). Verification is a scripted call against a running local function via `supabase functions serve`, matching the established convention in `supabase/tests/verify_newsletter.js` — not a new Deno test framework.
- pgTAP tests run via `supabase test db` against the local stack; wrap fixtures in `BEGIN ... ROLLBACK` exactly like `supabase/tests/blog_system.test.sql`.
- `blog_post.category` is constrained to exactly these values: `'recette'`, `'culture'`, `'technique'`, `'ingredients'`, `'parcours'`, `'actualite'`.
- `blog_post_translation` stays constrained to one row per post at the **application layer** in later phases — this phase's migration does not add a DB constraint for it (per spec: reversible later without another migration).
- Local Supabase stack is already running (`supabase status` confirms Studio/REST/Functions ports on `127.0.0.1:54321-54324`); Edge Functions runtime may need to be started explicitly per task.

---

### Task 1: Extend `blog_post` / `blog_post_translation` schema + `increment_post_view` RPC

**Files:**
- Create: `supabase/migrations/20260717120000_extend_blog_system.sql`
- Test: `supabase/tests/blog_system_v2.test.sql`

**Interfaces:**
- Produces: `blog_post.category text`, `blog_post.tags text[]`, `blog_post.view_count integer`, `blog_post.recipe_embeds uuid[]`, `blog_post.draft_data jsonb`, `blog_post.scheduled_publish_at timestamptz`
- Produces: `blog_post_translation.excerpt text`, `blog_post_translation.seo_title text`, `blog_post_translation.seo_description text`, `blog_post_translation.reading_time_min integer`
- Produces: `public.increment_post_view(p_post_id uuid) RETURNS void`

- [ ] **Step 1: Write the failing pgTAP test**

```sql
-- supabase/tests/blog_system_v2.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(8);

-- ── Fixtures ───────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
VALUES ('30000000-0000-0000-0000-000000000001', 'creator2@blog.test',
        now(), now(), 'authenticated', 'authenticated');

INSERT INTO public.user_profile (id)
VALUES ('30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.creator (id, user_id, display_name)
VALUES ('30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001', 'Blog Creator V2');

INSERT INTO public.blog_post (id, creator_id, visibility)
VALUES ('30000000-0000-0000-0000-000000000010',
        '30000000-0000-0000-0000-000000000002', 'public');

-- ── Test 1: valid category accepted ───────────────────────────────────────────

UPDATE public.blog_post SET category = 'technique'
WHERE id = '30000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT category FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  'technique',
  'Valid category is accepted'
);

-- ── Test 2: invalid category rejected ─────────────────────────────────────────

SELECT throws_ok(
  $$ UPDATE public.blog_post SET category = 'not-a-category'
     WHERE id = '30000000-0000-0000-0000-000000000010' $$,
  '23514', NULL,
  'Invalid blog_post category is rejected'
);

-- ── Test 3: tags/view_count/recipe_embeds defaults ────────────────────────────

SELECT is(
  (SELECT tags FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  '{}'::text[],
  'tags defaults to empty array'
);

SELECT is(
  (SELECT view_count FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  0,
  'view_count defaults to 0'
);

SELECT is(
  (SELECT recipe_embeds FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  '{}'::uuid[],
  'recipe_embeds defaults to empty array'
);

-- ── Test 4: draft_data stores arbitrary JSONB ─────────────────────────────────

UPDATE public.blog_post
SET draft_data = '{"title": "draft"}'::jsonb,
    scheduled_publish_at = now() + interval '1 day'
WHERE id = '30000000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT draft_data ->> 'title' FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  'draft',
  'draft_data stores arbitrary JSONB'
);

-- ── Test 5: blog_post_translation new columns accept values ──────────────────

INSERT INTO public.blog_post_translation
  (post_id, locale, title, content_json, excerpt, seo_title, seo_description, reading_time_min)
VALUES
  ('30000000-0000-0000-0000-000000000010', 'fr', 'Mon Article V2', '[]',
   'Un extrait', 'Titre SEO', 'Description SEO', 4);

SELECT is(
  (SELECT reading_time_min FROM public.blog_post_translation
   WHERE post_id = '30000000-0000-0000-0000-000000000010' AND locale = 'fr'),
  4,
  'reading_time_min stores computed value'
);

-- ── Test 6: increment_post_view increments view_count ─────────────────────────

SELECT public.increment_post_view('30000000-0000-0000-0000-000000000010');

SELECT is(
  (SELECT view_count FROM public.blog_post WHERE id = '30000000-0000-0000-0000-000000000010'),
  1,
  'increment_post_view increments view_count by 1'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `supabase test db supabase/tests/blog_system_v2.test.sql`
Expected: FAIL — `column "category" of relation "blog_post" does not exist` (or similar, for whichever assertion runs first against the missing columns/function).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260717120000_extend_blog_system.sql

ALTER TABLE public.blog_post
  ADD COLUMN category text
    CHECK (category IN ('recette','culture','technique','ingredients','parcours','actualite')),
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN view_count integer DEFAULT 0,
  ADD COLUMN recipe_embeds uuid[] DEFAULT '{}',
  ADD COLUMN draft_data jsonb,
  ADD COLUMN scheduled_publish_at timestamptz;

ALTER TABLE public.blog_post_translation
  ADD COLUMN excerpt text,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text,
  ADD COLUMN reading_time_min integer;

CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_post SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;
ALTER FUNCTION public.increment_post_view(uuid) OWNER TO postgres;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `supabase test db supabase/tests/blog_system_v2.test.sql`
Expected: `1..8`, all 8 assertions `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260717120000_extend_blog_system.sql supabase/tests/blog_system_v2.test.sql
git commit -m "feat(blog): extend blog_post/blog_post_translation schema, add increment_post_view RPC"
```

---

### Task 2: `post-images` Storage bucket + RLS

**Files:**
- Create: `supabase/migrations/20260717130000_create_post_images_bucket.sql`
- Test: `supabase/tests/post_images_bucket.test.sql`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `post-images` bucket (public read); RLS policies `Creators upload their own post images`, `Creators update their own post images`, `Creators delete their own post images`, `Anyone reads post images` on `storage.objects`

- [ ] **Step 1: Write the failing pgTAP test**

```sql
-- supabase/tests/post_images_bucket.test.sql
BEGIN;
SET search_path = public, extensions;
SELECT plan(4);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'post-images'),
  true,
  'post-images bucket exists and is public'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Creators upload their own post images'),
  1,
  'creator upload policy exists on storage.objects'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Creators delete their own post images'),
  1,
  'creator delete policy exists on storage.objects'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname = 'Anyone reads post images'),
  1,
  'public read policy exists on storage.objects'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `supabase test db supabase/tests/post_images_bucket.test.sql`
Expected: FAIL — first assertion returns `NULL` (bucket doesn't exist), not `true`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260717130000_create_post_images_bucket.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Creators upload their own post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators update their own post images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id FROM public.blog_post bp
      JOIN public.creator c ON c.id = bp.creator_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone reads post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `supabase test db supabase/tests/post_images_bucket.test.sql`
Expected: `1..4`, all 4 assertions `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260717130000_create_post_images_bucket.sql supabase/tests/post_images_bucket.test.sql
git commit -m "feat(blog): add post-images storage bucket with creator-scoped RLS"
```

---

### Task 3: Generalize `uploadImage()` to accept a target bucket

**Files:**
- Modify: `lib/utils/upload-image.ts:10-32`
- Test: `lib/utils/upload-image.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `uploadImage(file: File, storagePath: string, bucket?: string): Promise<string>` — `bucket` defaults to `"recipe-images"`, so all existing callers (`Step5Images.tsx`, `StepCard.tsx`) keep working unmodified

- [ ] **Step 1: Write the failing test**

```typescript
// lib/utils/upload-image.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { uploadMock, getPublicUrlMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrlMock = vi.fn().mockReturnValue({
    data: { publicUrl: "https://example.test/img.jpg" },
  });
  const fromMock = vi.fn().mockReturnValue({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
  });
  return { uploadMock, getPublicUrlMock, fromMock };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: fromMock } }),
}));

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

import { uploadImage } from "@/lib/utils/upload-image";

function makeFile(type: string) {
  return new File(["data"], "photo", { type });
}

describe("uploadImage", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockClear();
    getPublicUrlMock.mockClear();
  });

  it("uploads to the recipe-images bucket by default", async () => {
    await uploadImage(makeFile("image/jpeg"), "abc/cover.webp");
    expect(fromMock).toHaveBeenCalledWith("recipe-images");
  });

  it("uploads to a caller-specified bucket", async () => {
    await uploadImage(makeFile("image/jpeg"), "abc/cover.webp", "post-images");
    expect(fromMock).toHaveBeenCalledWith("post-images");
  });

  it("normalizes the extension based on file type", async () => {
    await uploadImage(makeFile("image/png"), "abc/cover.webp", "post-images");
    expect(uploadMock).toHaveBeenCalledWith(
      "abc/cover.png",
      expect.anything(),
      { upsert: true, contentType: "image/png" }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/upload-image.test.ts`
Expected: FAIL on the second test (`uploads to a caller-specified bucket`) — `fromMock` was called with `"recipe-images"` regardless of the third argument, since it doesn't exist yet.

- [ ] **Step 3: Update the implementation**

```typescript
// lib/utils/upload-image.ts
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function uploadImage(
  file: File,
  storagePath: string,
  bucket: string = "recipe-images"
): Promise<string> {
  const supabase = createClient();
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const ext = file.type === "image/png" ? "png" : "jpg";
  const finalPath = storagePath.endsWith(".webp")
    ? storagePath.replace(/.webp$/, "." + ext)
    : storagePath + "." + ext;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(finalPath, compressed, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(finalPath);

  return data.publicUrl;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/upload-image.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/upload-image.ts lib/utils/upload-image.test.ts
git commit -m "feat(blog): generalize uploadImage to accept a target storage bucket"
```

---

### Task 4: Edge Function `toggle-blog-like` (Akeli user)

**Files:**
- Create: `supabase/functions/toggle-blog-like/index.ts`
- Test: `supabase/tests/verify_toggle_blog_like.js`

**Interfaces:**
- Consumes: `blog_post_like` table (Task 1's migration doesn't touch it; it already exists)
- Produces: `POST /functions/v1/toggle-blog-like` — body `{ post_id: uuid }`, Bearer = Supabase user JWT, response `{ data: { liked: boolean }, error: null }`

This mirrors `supabase/functions/toggle-recipe-like/index.ts` exactly, retargeted at `blog_post_like`/`post_id`. Edge Functions have no unit-test precedent in this codebase (see Global Constraints) — verification is a scripted call against the local Functions runtime.

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/toggle-blog-like/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const { post_id } = await req.json();
    if (!post_id) return new Response(JSON.stringify({
      data: null,
      error: 'Missing post_id'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const { data: existing } = await supabase.from('blog_post_like').select('id').eq('user_id', user.id).eq('post_id', post_id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from('blog_post_like').delete().eq('id', existing.id);
      if (error) throw error;
      return new Response(JSON.stringify({
        data: { liked: false },
        error: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const { error } = await supabase.from('blog_post_like').insert({
        user_id: user.id,
        post_id
      });
      if (error) throw error;
      return new Response(JSON.stringify({
        data: { liked: true },
        error: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('[toggle-blog-like] Error:', err);
    return new Response(JSON.stringify({
      data: null,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

- [ ] **Step 2: Write the verification script**

```javascript
// supabase/tests/verify_toggle_blog_like.js
// Run against the local stack.
// Usage: TEST_USER_JWT=<jwt> node supabase/tests/verify_toggle_blog_like.js <post_id>
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const POST_ID = process.argv[2];

async function toggle() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/toggle-blog-like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_USER_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: POST_ID }),
  });
  const body = await res.json();
  console.log('Status:', res.status, 'Body:', body);
  return body;
}

async function run() {
  if (!TEST_USER_JWT || !POST_ID) {
    console.error('Usage: TEST_USER_JWT=<jwt> node verify_toggle_blog_like.js <post_id>');
    process.exit(1);
  }
  console.log('=== First call (expect liked: true) ===');
  const first = await toggle();
  if (first.data?.liked !== true) throw new Error('Expected liked: true on first call');

  console.log('=== Second call (expect liked: false) ===');
  const second = await toggle();
  if (second.data?.liked !== false) throw new Error('Expected liked: false on second call');

  console.log('PASS: toggle-blog-like correctly toggles like state');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Start the local Functions runtime and run the verification script**

Run (background terminal): `supabase functions serve toggle-blog-like --no-verify-jwt`
Run: `TEST_USER_JWT=<a real user JWT from local auth> node supabase/tests/verify_toggle_blog_like.js <an existing blog_post id from the local db>`
Expected: `PASS: toggle-blog-like correctly toggles like state`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/toggle-blog-like/index.ts supabase/tests/verify_toggle_blog_like.js
git commit -m "feat(blog): add toggle-blog-like Edge Function for Akeli users"
```

---

### Task 5: Edge Function `visitor-toggle-blog-like` (verified visitor)

**Files:**
- Create: `supabase/functions/visitor-toggle-blog-like/index.ts`
- Test: `supabase/tests/verify_visitor_toggle_blog_like.js`
- Modify: `package.json` (add `jose` as a dev dependency for the Node-side verification script)

**Interfaces:**
- Consumes: `verifyVisitorJWT(req)` from `supabase/functions/_shared/visitor-auth.ts`
- Produces: `POST /functions/v1/visitor-toggle-blog-like` — body `{ post_id: uuid }`, Bearer = visitor JWT, response `{ data: { liked: boolean }, error: null }`

Mirrors `supabase/functions/visitor-follow-creator/index.ts`'s auth/verification shape, retargeted at `blog_post_like`.

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/visitor-toggle-blog-like/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ data: null, error: 'post_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitorRow, error: visitorError } = await supabase
      .from('visitor')
      .select('email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (visitorError || !visitorRow) {
      return new Response(JSON.stringify({ data: null, error: 'Visitor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitorRow.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before liking' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('blog_post_like')
      .select('id')
      .eq('visitor_id', visitor.visitor_id)
      .eq('post_id', post_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('blog_post_like').delete().eq('id', existing.id);
      if (error) throw error;
      return new Response(JSON.stringify({ data: { liked: false }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const { error } = await supabase.from('blog_post_like').insert({
        visitor_id: visitor.visitor_id,
        post_id,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ data: { liked: true }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[visitor-toggle-blog-like] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Add `jose` as a dev dependency for the verification script**

Run: `npm install --save-dev jose`

- [ ] **Step 3: Write the verification script**

```javascript
// supabase/tests/verify_visitor_toggle_blog_like.js
// Usage: VISITOR_JWT_SECRET=<same secret the local Edge Functions runtime uses> \
//        node supabase/tests/verify_visitor_toggle_blog_like.js <post_id> <visitor_id>
const { SignJWT } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SECRET = process.env.VISITOR_JWT_SECRET;
const POST_ID = process.argv[2];
const VISITOR_ID = process.argv[3];

async function signToken() {
  const secret = new TextEncoder().encode(SECRET);
  return new SignJWT({ visitor_id: VISITOR_ID, email: 'verify@blog.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function toggle(token) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/visitor-toggle-blog-like`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: POST_ID }),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!SECRET || !POST_ID || !VISITOR_ID) {
    console.error('Usage: VISITOR_JWT_SECRET=<secret> node verify_visitor_toggle_blog_like.js <post_id> <visitor_id>');
    process.exit(1);
  }
  const token = await signToken();

  console.log('=== First call (expect liked: true) ===');
  const first = await toggle(token);
  console.log(first);
  if (first.body.data?.liked !== true) throw new Error('Expected liked: true on first call');

  console.log('=== Second call (expect liked: false) ===');
  const second = await toggle(token);
  console.log(second);
  if (second.body.data?.liked !== false) throw new Error('Expected liked: false on second call');

  console.log('PASS: visitor-toggle-blog-like correctly toggles like state for a verified visitor');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

**Note:** the visitor used in the verification run must have `email_verified = true` in the local `visitor` table (insert one directly via Studio or SQL if none exists) — otherwise the function correctly returns 403, which would look like a failure but is actually the auth gate working as designed.

- [ ] **Step 4: Start the local Functions runtime and run the verification script**

Run (background terminal): `supabase functions serve visitor-toggle-blog-like --no-verify-jwt`
Run: `VISITOR_JWT_SECRET=<local VISITOR_JWT_SECRET value> node supabase/tests/verify_visitor_toggle_blog_like.js <post_id> <verified visitor_id>`
Expected: `PASS: visitor-toggle-blog-like correctly toggles like state for a verified visitor`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/visitor-toggle-blog-like/index.ts supabase/tests/verify_visitor_toggle_blog_like.js package.json package-lock.json
git commit -m "feat(blog): add visitor-toggle-blog-like Edge Function for verified visitors"
```

---

### Task 6: Edge Function `create-blog-comment` (Akeli user, one-level-reply enforcement)

**Files:**
- Create: `supabase/functions/create-blog-comment/index.ts`
- Test: `supabase/tests/verify_create_blog_comment.js`

**Interfaces:**
- Produces: `POST /functions/v1/create-blog-comment` — body `{ post_id: uuid, content: string, parent_id?: uuid }`, Bearer = Supabase user JWT, response `{ data: { id, post_id, user_id, content, parent_id, created_at }, error: null }`
- Enforces: a `parent_id` may only point at a root comment (`parent_id IS NULL`) — replying to a reply is rejected with 400, per spec's one-level-deep rule

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/create-blog-comment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const { post_id, content, parent_id } = await req.json();
    if (!post_id || !content || !content.trim()) {
      return new Response(JSON.stringify({ data: null, error: 'post_id and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('blog_comment')
        .select('parent_id')
        .eq('id', parent_id)
        .single();
      if (parentError || !parent) {
        return new Response(JSON.stringify({ data: null, error: 'Parent comment not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (parent.parent_id !== null) {
        return new Response(JSON.stringify({ data: null, error: 'Replies can only be one level deep' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { data, error } = await supabase
      .from('blog_comment')
      .insert({ post_id, user_id: user.id, content: content.trim(), parent_id: parent_id ?? null })
      .select('id, post_id, user_id, content, parent_id, created_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ data, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[create-blog-comment] Error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

- [ ] **Step 2: Write the verification script**

```javascript
// supabase/tests/verify_create_blog_comment.js
// Usage: TEST_USER_JWT=<jwt> node supabase/tests/verify_create_blog_comment.js <post_id>
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const POST_ID = process.argv[2];

async function comment(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-blog-comment`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TEST_USER_JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!TEST_USER_JWT || !POST_ID) {
    console.error('Usage: TEST_USER_JWT=<jwt> node verify_create_blog_comment.js <post_id>');
    process.exit(1);
  }

  console.log('=== Root comment ===');
  const root = await comment({ post_id: POST_ID, content: 'Great post!' });
  console.log(root);
  if (root.status !== 200) throw new Error('Expected root comment to succeed');

  console.log('=== Reply to root ===');
  const reply = await comment({ post_id: POST_ID, content: 'Thanks!', parent_id: root.body.data.id });
  console.log(reply);
  if (reply.status !== 200) throw new Error('Expected reply to succeed');

  console.log('=== Reply to a reply (should be rejected) ===');
  const nested = await comment({ post_id: POST_ID, content: 'Nested', parent_id: reply.body.data.id });
  console.log(nested);
  if (nested.status !== 400) throw new Error('Expected nested reply to be rejected with 400');

  console.log('PASS: create-blog-comment enforces one-level-deep replies');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Start the local Functions runtime and run the verification script**

Run (background terminal): `supabase functions serve create-blog-comment --no-verify-jwt`
Run: `TEST_USER_JWT=<a real user JWT from local auth> node supabase/tests/verify_create_blog_comment.js <an existing blog_post id>`
Expected: `PASS: create-blog-comment enforces one-level-deep replies`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-blog-comment/index.ts supabase/tests/verify_create_blog_comment.js
git commit -m "feat(blog): add create-blog-comment Edge Function with one-level-reply enforcement"
```

---

### Task 7: Edge Function `visitor-create-blog-comment` (verified visitor)

**Files:**
- Create: `supabase/functions/visitor-create-blog-comment/index.ts`
- Test: `supabase/tests/verify_visitor_create_blog_comment.js`

**Interfaces:**
- Consumes: `verifyVisitorJWT(req)` from `supabase/functions/_shared/visitor-auth.ts`
- Produces: `POST /functions/v1/visitor-create-blog-comment` — same body/response shape as Task 6, Bearer = visitor JWT, same one-level-reply enforcement, plus the `email_verified` gate from Task 5

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/visitor-create-blog-comment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { post_id, content, parent_id } = await req.json();
    if (!post_id || !content || !content.trim()) {
      return new Response(JSON.stringify({ data: null, error: 'post_id and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitorRow, error: visitorError } = await supabase
      .from('visitor')
      .select('email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (visitorError || !visitorRow) {
      return new Response(JSON.stringify({ data: null, error: 'Visitor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitorRow.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before commenting' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('blog_comment')
        .select('parent_id')
        .eq('id', parent_id)
        .single();
      if (parentError || !parent) {
        return new Response(JSON.stringify({ data: null, error: 'Parent comment not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (parent.parent_id !== null) {
        return new Response(JSON.stringify({ data: null, error: 'Replies can only be one level deep' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data, error } = await supabase
      .from('blog_comment')
      .insert({
        post_id,
        visitor_id: visitor.visitor_id,
        content: content.trim(),
        parent_id: parent_id ?? null,
      })
      .select('id, post_id, visitor_id, content, parent_id, created_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ data, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-create-blog-comment] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Write the verification script**

```javascript
// supabase/tests/verify_visitor_create_blog_comment.js
// Usage: VISITOR_JWT_SECRET=<secret> node supabase/tests/verify_visitor_create_blog_comment.js <post_id> <visitor_id>
const { SignJWT } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SECRET = process.env.VISITOR_JWT_SECRET;
const POST_ID = process.argv[2];
const VISITOR_ID = process.argv[3];

async function signToken() {
  const secret = new TextEncoder().encode(SECRET);
  return new SignJWT({ visitor_id: VISITOR_ID, email: 'verify@blog.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function comment(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/visitor-create-blog-comment`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!SECRET || !POST_ID || !VISITOR_ID) {
    console.error('Usage: VISITOR_JWT_SECRET=<secret> node verify_visitor_create_blog_comment.js <post_id> <visitor_id>');
    process.exit(1);
  }
  const token = await signToken();

  console.log('=== Root comment ===');
  const root = await comment(token, { post_id: POST_ID, content: 'Visitor says hi!' });
  console.log(root);
  if (root.status !== 200) throw new Error('Expected root comment to succeed');

  console.log('=== Reply to a reply (should be rejected) ===');
  const reply = await comment(token, { post_id: POST_ID, content: 'Reply', parent_id: root.body.data.id });
  const nested = await comment(token, { post_id: POST_ID, content: 'Nested', parent_id: reply.body.data.id });
  console.log(nested);
  if (nested.status !== 400) throw new Error('Expected nested reply to be rejected with 400');

  console.log('PASS: visitor-create-blog-comment enforces the verified-visitor + one-level-reply rules');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Start the local Functions runtime and run the verification script**

Run (background terminal): `supabase functions serve visitor-create-blog-comment --no-verify-jwt`
Run: `VISITOR_JWT_SECRET=<local VISITOR_JWT_SECRET value> node supabase/tests/verify_visitor_create_blog_comment.js <post_id> <verified visitor_id>`
Expected: `PASS: visitor-create-blog-comment enforces the verified-visitor + one-level-reply rules`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/visitor-create-blog-comment/index.ts supabase/tests/verify_visitor_create_blog_comment.js
git commit -m "feat(blog): add visitor-create-blog-comment Edge Function"
```

---

### Task 8: View-count tracking Route Handler

**Files:**
- Create: `app/api/track/blog-view/route.ts`
- Test: `app/api/track/blog-view/route.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin()` from `lib/tracking/supabase-admin.ts`; `increment_post_view(p_post_id uuid)` RPC from Task 1
- Produces: `POST /api/track/blog-view` — body `{ post_id: string }`, response `{ ok: true }` (200) or `{ ok: false }` (500), `{ error: string }` (400)

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/track/blog-view/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/tracking/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock }),
}));

import { POST } from "@/app/api/track/blog-view/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/track/blog-view", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/track/blog-view", () => {
  beforeEach(() => rpcMock.mockClear());

  it("rejects missing post_id with 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls increment_post_view with the given post_id", async () => {
    const res = await POST(makeRequest({ post_id: "abc-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("increment_post_view", { p_post_id: "abc-123" });
  });

  it("returns 500 when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ error: new Error("db down") });
    const res = await POST(makeRequest({ post_id: "abc-123" }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/track/blog-view/route.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/track/blog-view/route'`

- [ ] **Step 3: Write the Route Handler**

```typescript
// app/api/track/blog-view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.post_id) {
      return NextResponse.json({ error: 'Missing post_id' }, { status: 400 });
    }

    const { error } = await (getSupabaseAdmin() as any).rpc('increment_post_view', {
      p_post_id: body.post_id,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/blog-view]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/track/blog-view/route.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/track/blog-view/route.ts app/api/track/blog-view/route.test.ts
git commit -m "feat(blog): add view-count tracking route handler"
```

---

## After This Plan

Phase 1 delivers a complete, testable backend: schema, storage, and interaction endpoints — all independently verifiable, none of it wired to any UI yet. Phase 2 (creator editor: `PostWizard`, `BlockEditor`, dashboard post list) and Phase 3 (public surface: creator blog feed, post page with SEO, likes/comments UI) will be written as separate plans once Phase 1 is merged, since their exact component boundaries benefit from whatever's learned building against the real schema here.
