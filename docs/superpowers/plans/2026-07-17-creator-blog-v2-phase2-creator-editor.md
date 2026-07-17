# Creator Blog V2 — Phase 2: Creator Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the creator-facing post editor — a multi-step wizard producing draft/published blog posts against Phase 1's backend — plus the dashboard post list.

**Architecture:** `PostWizard.tsx` mirrors `RecipeWizard.tsx`'s exact state-container pattern: local `useState`, 30s autosave, and the `draft_data` staging pattern for already-published posts. The post body is a custom block editor (not TipTap — decided in brainstorming) using the same `@dnd-kit` reorder pattern already proven on recipe steps. No i18n, no Server Actions, no component-test framework — all three deliberately match this codebase's actual (not aspirational) conventions.

**Tech Stack:** React Hook Form + Zod (per-field validation, mirroring `Step1Basic.tsx`), `@dnd-kit` (already a dependency), `react-dropzone` (already a dependency), Supabase browser client.

**Spec:** `docs/superpowers/specs/2026-07-17-creator-blog-v2-design.md` (Section: Creator Space)
**Phase 1 plan (backend this builds on):** `docs/superpowers/plans/2026-07-17-creator-blog-v2-phase1-schema-backend.md`

## Global Constraints

- **No i18n in the editor.** `components/creator/recipe-form/*` and the dashboard recipe pages use hardcoded French strings throughout — confirmed by grep, zero `useTranslations("recipe_form")` calls exist anywhere despite CLAUDE.md documenting that namespace (it's dead scaffolding in `messages/fr.json`). Match this: write hardcoded French UI text in every new component. Do not create a `post_form` i18n namespace.
- **No Server Actions anywhere in this codebase** — mutations are inline client Supabase calls in `"use client"` components. `RecipeWizard.tsx` is the reference: every DB write is a direct `supabase.from(...).insert/update()` call inside the component.
- **No React component-testing framework exists** (no `@testing-library/react`, no equivalent — confirmed via `package.json`). Every existing vitest test in this repo covers a plain utility function or a Route Handler, never a component. Verification for component tasks is: TypeScript compiles clean (`npx tsc --noEmit`), plus a manual browser check via `npm run dev` at the two integration points that carry real regression risk (Task 3's `ImageDropzone` extraction, which touches the live recipe-creation flow, and Task 8's `PostWizard`, the full save/publish flow). Pure-function tasks (Task 1) and Zod schemas (Task 2) get real vitest unit tests, matching the established `lib/utils/*.test.ts` convention.
- **`draft_data` pattern** (from `RecipeWizard.tsx:126-176`): while a post has never been published, every save writes both the live `blog_post`/`blog_post_translation` rows AND a `draft_data` JSONB blob holding the full form state verbatim. Once published, subsequent edits write ONLY to `draft_data` until an explicit Publish action materializes them — the live row never changes mid-edit. On load, prefer `draft_data` over reconstructing from live tables if present (`RecipeWizard`'s edit page does this at `app/[locale]/(creator)/dashboard/recipes/[id]/edit/page.tsx:62-66`).
- **Single locale per post, for now** (Phase 1 decision): one `blog_post_translation` row per post, in whichever language the creator wrote it. No FR/EN dual-authoring UI.
- **`blog_post.category`** is constrained to exactly: `'recette'`, `'culture'`, `'technique'`, `'ingredients'`, `'parcours'`, `'actualite'` (DB `CHECK`, Phase 1).
- **Route protection**: `/dashboard/posts` is already covered by the `/dashboard` prefix in `proxy.ts`'s `CREATOR_PATHS` — no proxy.ts change needed (confirmed in Phase 1).
- **Image upload**: `uploadImage(file, storagePath, bucket = "recipe-images")` from `lib/utils/upload-image.ts` (Phase 1, Task 3) — pass `"post-images"` explicitly for every post-related upload.
- **Supabase client**: `createClient()` from `@/lib/supabase/client`, called fresh per use (not memoized), matching every existing client component.
- **Routing**: use `Link`/`useRouter` from `@/lib/i18n/navigation` (locale-aware), matching `RecipeWizard.tsx` and the recipe dashboard pages — even though page copy is hardcoded French, navigation still goes through the locale-aware router.

---

## File Structure

```
lib/utils/
  slugify.ts                          — slugify(title, id) — Task 1
  reading-time.ts                     — computeReadingTimeMin(blocks) — Task 1
lib/validations/
  post.schema.ts                      — Zod schemas + CATEGORY_OPTIONS — Task 2
lib/queries/
  creator-recipes.ts                  — searchCreatorRecipes(creatorId, query) — Task 4
components/shared/
  ImageDropzone.tsx                   — extracted single-image dropzone — Task 3
components/creator/post-form/
  RecipeEmbedPicker.tsx               — Task 4
  BlockRenderer.tsx                   — single-block editor UI, switches on block.type — Task 5
  BlockEditor.tsx                     — dnd-kit reorder list + add-block toolbar — Task 5
  Step1Content.tsx                    — title, language, BlockEditor — Task 6
  Step2CoverSettings.tsx              — cover image, category, tags, excerpt, SEO, visibility — Task 7
  Step3Publish.tsx                    — preview + validation + save/publish buttons — Task 7
  PostWizard.tsx                      — state container, draft/publish, autosave — Task 8
app/[locale]/(creator)/dashboard/posts/
  page.tsx                            — list (drafts/published/archived) — Task 9
  new/page.tsx                        — Task 9
  [id]/edit/page.tsx                  — Task 9
components/creator/recipe-form/
  Step5Images.tsx                     — MODIFIED: cover section now uses ImageDropzone — Task 3
```

---

### Task 1: Shared utilities — `slugify` and `computeReadingTimeMin`

**Files:**
- Create: `lib/utils/slugify.ts`
- Test: `lib/utils/slugify.test.ts`
- Create: `lib/utils/reading-time.ts`
- Test: `lib/utils/reading-time.test.ts`

**Interfaces:**
- Produces: `slugify(title: string, id: string): string`
- Produces: `computeReadingTimeMin(blocks: PostBlock[]): number` — `PostBlock` is defined in Task 2's `post.schema.ts`; for this task, accept `{ type: string; text?: string }[]` (structurally compatible, avoids a circular file dependency)

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/utils/slugify.test.ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("lowercases and hyphenates a simple title", () => {
    expect(slugify("Mon Article de Blog", "abc123def")).toBe("mon-article-de-blog-abc123");
  });

  it("strips accents", () => {
    expect(slugify("Le Café Préféré", "xyz789abc")).toBe("le-cafe-prefere-xyz789");
  });

  it("strips punctuation", () => {
    expect(slugify("Qu'est-ce que c'est ?!", "111222333")).toBe("quest-ce-que-cest-111222");
  });

  it("collapses multiple spaces into one hyphen", () => {
    expect(slugify("Trop    d'espaces", "aaabbbccc")).toBe("trop-despaces-aaabbb");
  });

  it("always appends only the first 6 characters of the id", () => {
    expect(slugify("Titre", "0123456789abcdef")).toBe("titre-012345");
  });
});
```

```typescript
// lib/utils/reading-time.test.ts
import { describe, it, expect } from "vitest";
import { computeReadingTimeMin } from "@/lib/utils/reading-time";

describe("computeReadingTimeMin", () => {
  it("returns 1 for empty content", () => {
    expect(computeReadingTimeMin([])).toBe(1);
  });

  it("computes ~200 words per minute, rounded up", () => {
    const text = Array(200).fill("mot").join(" ");
    expect(computeReadingTimeMin([{ type: "paragraph", text }])).toBe(1);
  });

  it("rounds up a partial minute", () => {
    const text = Array(250).fill("mot").join(" "); // 1.25 min
    expect(computeReadingTimeMin([{ type: "paragraph", text }])).toBe(2);
  });

  it("sums text across multiple blocks and ignores blocks without text", () => {
    const blocks = [
      { type: "heading", text: Array(100).fill("mot").join(" ") },
      { type: "divider" },
      { type: "paragraph", text: Array(100).fill("mot").join(" ") },
    ];
    expect(computeReadingTimeMin(blocks)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/utils/slugify.test.ts lib/utils/reading-time.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/slugify'` (and `reading-time`)

- [ ] **Step 3: Write the implementations**

```typescript
// lib/utils/slugify.ts
export function slugify(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${id.slice(0, 6)}`;
}
```

```typescript
// lib/utils/reading-time.ts
const WORDS_PER_MINUTE = 200;

export function computeReadingTimeMin(blocks: { type: string; text?: string }[]): number {
  const wordCount = blocks
    .map((b) => b.text ?? "")
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount === 0) return 1;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/utils/slugify.test.ts lib/utils/reading-time.test.ts`
Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/slugify.ts lib/utils/slugify.test.ts lib/utils/reading-time.ts lib/utils/reading-time.test.ts
git commit -m "feat(blog): add slugify and reading-time utilities for the post editor"
```

---

### Task 2: Post validation schemas

**Files:**
- Create: `lib/validations/post.schema.ts`
- Test: `lib/validations/post.schema.test.ts`

**Interfaces:**
- Produces: `CATEGORY_OPTIONS: { value: string; label: string }[]` — the 6 fixed category values with French display labels
- Produces: `postBlockSchema: z.ZodType<PostBlock>`, `PostBlock` (exported type) — a discriminated union on `type`: `paragraph | heading | quote | divider | image | image_gallery | video_embed | recipe_embed`, each with an `id: string`
- Produces: `postContentSchema` (title, language, blocks), `PostContentData` (inferred type)
- Produces: `postSettingsSchema` (category, tags, excerpt, seo_title, seo_description, visibility), `PostSettingsData` (inferred type)

- [ ] **Step 1: Write the failing test**

```typescript
// lib/validations/post.schema.test.ts
import { describe, it, expect } from "vitest";
import {
  postBlockSchema,
  postContentSchema,
  postSettingsSchema,
  CATEGORY_OPTIONS,
} from "@/lib/validations/post.schema";

describe("postBlockSchema", () => {
  it("accepts a paragraph block", () => {
    const result = postBlockSchema.safeParse({ id: "a", type: "paragraph", text: "Hello" });
    expect(result.success).toBe(true);
  });

  it("accepts a heading block with level 2 or 3", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "heading", level: 2, text: "T" }).success).toBe(true);
    expect(postBlockSchema.safeParse({ id: "a", type: "heading", level: 4, text: "T" }).success).toBe(false);
  });

  it("accepts a divider block with no other fields", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "divider" }).success).toBe(true);
  });

  it("accepts a recipe_embed block", () => {
    const result = postBlockSchema.safeParse({
      id: "a",
      type: "recipe_embed",
      recipe_id: "uuid-1",
      recipe_title: "Poulet DG",
      recipe_image_url: "https://example.test/img.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown block type", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "table", text: "x" }).success).toBe(false);
  });
});

describe("postContentSchema", () => {
  it("requires a title of at least 3 characters", () => {
    expect(postContentSchema.safeParse({ title: "ab", language: "fr", blocks: [] }).success).toBe(false);
    expect(postContentSchema.safeParse({ title: "abc", language: "fr", blocks: [] }).success).toBe(true);
  });

  it("restricts language to fr or en", () => {
    expect(postContentSchema.safeParse({ title: "Titre valide", language: "de", blocks: [] }).success).toBe(false);
  });
});

describe("postSettingsSchema", () => {
  it("accepts a valid category", () => {
    expect(postSettingsSchema.safeParse({
      category: "technique", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(true);
  });

  it("rejects an invalid category", () => {
    expect(postSettingsSchema.safeParse({
      category: "not-real", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(false);
  });

  it("caps tags at 8", () => {
    const tags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    expect(postSettingsSchema.safeParse({
      category: "recette", tags, excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(false);
  });

  it("restricts visibility to public, followers, or fans", () => {
    expect(postSettingsSchema.safeParse({
      category: "recette", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "premium",
    }).success).toBe(false);
  });
});

describe("CATEGORY_OPTIONS", () => {
  it("has exactly the 6 DB-approved values", () => {
    expect(CATEGORY_OPTIONS.map((c) => c.value).sort()).toEqual(
      ["actualite", "culture", "ingredients", "parcours", "recette", "technique"].sort()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/validations/post.schema.test.ts`
Expected: FAIL — `Cannot find module '@/lib/validations/post.schema'`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/validations/post.schema.ts
import { z } from "zod";

export const CATEGORY_OPTIONS = [
  { value: "recette", label: "Recette" },
  { value: "culture", label: "Culture" },
  { value: "technique", label: "Technique" },
  { value: "ingredients", label: "Ingrédients" },
  { value: "parcours", label: "Parcours" },
  { value: "actualite", label: "Actualité" },
] as const;

const categoryValues = CATEGORY_OPTIONS.map((c) => c.value) as [string, ...string[]];

const paragraphBlockSchema = z.object({
  id: z.string(),
  type: z.literal("paragraph"),
  text: z.string(),
});

const headingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string(),
});

const quoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  text: z.string(),
  author: z.string().optional(),
});

const dividerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("divider"),
});

const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  url: z.string(),
  caption: z.string().optional(),
});

const imageGalleryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image_gallery"),
  urls: z.array(z.string()).min(2).max(4),
});

const videoEmbedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video_embed"),
  url: z.string(),
});

const recipeEmbedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("recipe_embed"),
  recipe_id: z.string(),
  recipe_title: z.string(),
  recipe_image_url: z.string().nullable(),
});

export const postBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  quoteBlockSchema,
  dividerBlockSchema,
  imageBlockSchema,
  imageGalleryBlockSchema,
  videoEmbedBlockSchema,
  recipeEmbedBlockSchema,
]);

export type PostBlock = z.infer<typeof postBlockSchema>;

export const postContentSchema = z.object({
  title: z.string().min(3, "Minimum 3 caractères").max(120, "Maximum 120 caractères"),
  language: z.enum(["fr", "en"]),
  blocks: z.array(postBlockSchema),
});

export type PostContentData = z.infer<typeof postContentSchema>;

export const postSettingsSchema = z.object({
  category: z.enum(categoryValues, { message: "Sélectionne une catégorie" }),
  tags: z.array(z.string()).max(8, "Maximum 8 tags"),
  excerpt: z.string().max(200, "Maximum 200 caractères"),
  seo_title: z.string().max(70, "Maximum 70 caractères"),
  seo_description: z.string().max(160, "Maximum 160 caractères"),
  visibility: z.enum(["public", "followers", "fans"]),
});

export type PostSettingsData = z.infer<typeof postSettingsSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/validations/post.schema.test.ts`
Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/post.schema.ts lib/validations/post.schema.test.ts
git commit -m "feat(blog): add post content/settings/block Zod validation schemas"
```

---

### Task 3: Extract `ImageDropzone`, refactor `Step5Images.tsx` to use it

**Files:**
- Create: `components/shared/ImageDropzone.tsx`
- Modify: `components/creator/recipe-form/Step5Images.tsx:98-145` (cover image section only — gallery section is untouched)

**Interfaces:**
- Produces: `ImageDropzone({ value, onChange, onRemove, uploadPath, bucket, aspectClassName, label, disabled }: ImageDropzoneProps)` — a `"use client"` component
  - `value: string | null` — current image URL, or null/empty for the empty state
  - `onChange: (url: string) => void` — called with the new URL after a successful upload
  - `onRemove: () => void`
  - `uploadPath: string` — exact storage path passed through to `uploadImage`
  - `bucket?: string` — defaults to `"recipe-images"` (matches `uploadImage`'s own default)
  - `aspectClassName?: string` — defaults to `"aspect-video"`
  - `label?: string` — defaults to `"Photo"`
  - `disabled?: boolean`
- Consumes: `uploadImage(file, storagePath, bucket?)` from `@/lib/utils/upload-image` (Phase 1)

This is a **behavior-preserving extraction** — `Step5Images.tsx`'s cover image section currently has ~45 lines of inline dropzone JSX (lines 98-145 in the file read during planning). The new component reproduces that exact JSX/behavior as a reusable unit; the gallery section (multi-image) is untouched.

- [ ] **Step 1: Write `ImageDropzone.tsx`**

```typescript
// components/shared/ImageDropzone.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadImage } from "@/lib/utils/upload-image";

interface ImageDropzoneProps {
  value: string | null;
  onChange: (url: string) => void;
  onRemove: () => void;
  uploadPath: string;
  bucket?: string;
  aspectClassName?: string;
  label?: string;
  disabled?: boolean;
}

export default function ImageDropzone({
  value,
  onChange,
  onRemove,
  uploadPath,
  bucket = "recipe-images",
  aspectClassName = "aspect-video",
  label = "Photo",
  disabled = false,
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        const url = await uploadImage(file, uploadPath, bucket);
        onChange(url);
      } catch {
        setError("Échec de l'upload. Réessaie.");
      } finally {
        setUploading(false);
      }
    },
    [uploadPath, bucket, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
      {value ? (
        <div className={`relative w-full ${aspectClassName} rounded-xl overflow-hidden border border-border`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`w-full ${aspectClassName} rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-secondary/50"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-muted-foreground">Upload en cours...</p>
          ) : (
            <>
              <p className="text-2xl mb-2">📷</p>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Dépose ici" : "Glisse ou clique pour ajouter"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 10 Mo</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Refactor `Step5Images.tsx`'s cover section to use it**

Replace lines 98-145 of `components/creator/recipe-form/Step5Images.tsx` (the entire "Cover image" `<div className="space-y-3">...</div>` block, from `{/* Cover image */}` through its closing `</div>`) with:

```typescript
      {/* Cover image */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Photo de couverture
        </label>
        <ImageDropzone
          value={data.cover_image_url || null}
          onChange={(url) => onChange({ cover_image_url: url })}
          onRemove={() => onChange({ cover_image_url: "" })}
          uploadPath={`${draftId ?? crypto.randomUUID()}/cover.webp`}
          label="Couverture"
        />
      </div>
```

Then remove the now-unused `onDropCover`, `useDropzone` (cover instance), and `removeCover` code (lines 21-49 of the original file) and the now-unused `useDropzone` import if the gallery section's own `useDropzone` call still needs it (it does — gallery still uses `useDropzone` directly, so keep that import). Add the new import:

```typescript
import ImageDropzone from "@/components/shared/ImageDropzone";
```

The resulting file should still export the same `Step5Images` component with the same props, with only the cover section's internals changed. The gallery section (lines 51-88, 147-196 of the original) is untouched.

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors introduced (pre-existing errors, if any, are not this task's concern — compare against a baseline run before this task if uncertain).

- [ ] **Step 4: Manual browser verification (this touches the live recipe-creation flow — required, not optional)**

Run: `npm run dev`, then in a browser:
1. Navigate to `/dashboard/recipes/new`, log in as a creator if needed.
2. On Step 5 (Photos), drag or click to upload a cover image. Confirm it uploads, previews, and the ✕ remove button works.
3. Confirm the gallery section (unaffected by this change) still works: upload 1-2 gallery images, remove one.
4. Save the recipe as a draft and reload the edit page — confirm the cover image persisted.

Expected: cover upload/remove/persist all work identically to before the refactor.

- [ ] **Step 5: Commit**

```bash
git add components/shared/ImageDropzone.tsx components/creator/recipe-form/Step5Images.tsx
git commit -m "refactor(blog): extract ImageDropzone from Step5Images cover section for reuse in the post editor"
```

---

### Task 4: `RecipeEmbedPicker` and `searchCreatorRecipes`

**Files:**
- Create: `lib/queries/creator-recipes.ts`
- Create: `components/creator/post-form/RecipeEmbedPicker.tsx`

**Interfaces:**
- Produces: `searchCreatorRecipes(creatorId: string, query: string): Promise<CreatorRecipeResult[]>`, `CreatorRecipeResult` (exported type: `{ id: string; title: string; cover_image_url: string | null }`)
- Produces: `RecipeEmbedPicker({ creatorId, onSelect }: RecipeEmbedPickerProps)` — `onSelect: (recipe: CreatorRecipeResult) => void`

This mirrors `IngredientSearch.tsx`'s exact debounced-inline-dropdown pattern (`components/creator/recipe-form/IngredientSearch.tsx`), scoped to one creator's own recipes instead of the global ingredient catalog. No component-test framework exists (Global Constraints) — verify via `npx tsc --noEmit` and the manual check in Step 3.

- [ ] **Step 1: Write `searchCreatorRecipes`**

```typescript
// lib/queries/creator-recipes.ts
import { createClient } from "@/lib/supabase/client";

export type CreatorRecipeResult = {
  id: string;
  title: string;
  cover_image_url: string | null;
};

export async function searchCreatorRecipes(
  creatorId: string,
  query: string
): Promise<CreatorRecipeResult[]> {
  if (query.trim().length < 2) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe")
    .select("id, title, cover_image_url")
    .eq("creator_id", creatorId)
    .ilike("title", `%${query.trim()}%`)
    .order("title")
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Write `RecipeEmbedPicker.tsx`**

```typescript
// components/creator/post-form/RecipeEmbedPicker.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { searchCreatorRecipes } from "@/lib/queries/creator-recipes";
import type { CreatorRecipeResult } from "@/lib/queries/creator-recipes";

interface RecipeEmbedPickerProps {
  creatorId: string;
  onSelect: (recipe: CreatorRecipeResult) => void;
}

export default function RecipeEmbedPicker({ creatorId, onSelect }: RecipeEmbedPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CreatorRecipeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchCreatorRecipes(creatorId, query);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, creatorId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (recipe: CreatorRecipeResult) => {
    onSelect(recipe);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une de tes recettes..."
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">...</span>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Aucune recette trouvée</li>
          ) : (
            results.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(recipe)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
                >
                  {recipe.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={recipe.cover_image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary shrink-0 flex items-center justify-center text-sm">🍽️</div>
                  )}
                  <span className="flex-1 font-medium text-foreground truncate">{recipe.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify and manually spot-check**

Run: `npx tsc --noEmit` — expect no new errors.

This component isn't mounted anywhere yet (Task 5 wires it in) — full manual verification happens as part of Task 5's browser check. For now, confirm the file compiles and `searchCreatorRecipes` matches the `recipe` table's real columns (`id`, `title`, `cover_image_url`, `creator_id` — all confirmed present in `app/[locale]/(creator)/dashboard/recipes/page.tsx`'s own query).

- [ ] **Step 4: Commit**

```bash
git add lib/queries/creator-recipes.ts components/creator/post-form/RecipeEmbedPicker.tsx
git commit -m "feat(blog): add searchCreatorRecipes and RecipeEmbedPicker for embedding recipes in posts"
```

---

### Task 5: `BlockRenderer` and `BlockEditor`

**Files:**
- Create: `components/creator/post-form/BlockRenderer.tsx`
- Create: `components/creator/post-form/BlockEditor.tsx`

**Interfaces:**
- Consumes: `PostBlock` type and `postBlockSchema` from `@/lib/validations/post.schema` (Task 2); `ImageDropzone` from `@/components/shared/ImageDropzone` (Task 3); `RecipeEmbedPicker`, `CreatorRecipeResult` from `@/components/creator/post-form/RecipeEmbedPicker` (Task 4)
- Produces: `BlockRenderer({ block, onChange, onRemove }: BlockRendererProps)` — `onChange: (updated: PostBlock) => void`
- Produces: `BlockEditor({ blocks, onChange, creatorId }: BlockEditorProps)` — `onChange: (blocks: PostBlock[]) => void`, drag-reorder via `@dnd-kit` (mirrors `Step3Steps.tsx`'s `SortableStepCard` pattern), an "add block" toolbar appending a new block of the chosen type, and a remove control per block.

Video embed support: YouTube URLs (`youtube.com/watch?v=`, `youtu.be/`) are rendered as an embedded iframe by extracting the video ID; any other URL renders as a plain link with a note. Full oEmbed/TikTok embedding is out of scope for this task.

- [ ] **Step 1: Write `BlockRenderer.tsx`**

```typescript
// components/creator/post-form/BlockRenderer.tsx
"use client";

import { useState } from "react";
import ImageDropzone from "@/components/shared/ImageDropzone";
import RecipeEmbedPicker from "./RecipeEmbedPicker";
import type { PostBlock } from "@/lib/validations/post.schema";
import type { CreatorRecipeResult } from "@/lib/queries/creator-recipes";

interface BlockRendererProps {
  block: PostBlock;
  postId: string | null;
  creatorId: string;
  onChange: (updated: PostBlock) => void;
  onRemove: () => void;
}

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return null;
}

export default function BlockRenderer({ block, postId, creatorId, onChange, onRemove }: BlockRendererProps) {
  const [pickingRecipe, setPickingRecipe] = useState(false);

  const wrapper = (content: React.ReactNode, label: string) => (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <button type="button" onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive">
          ✕
        </button>
      </div>
      {content}
    </div>
  );

  switch (block.type) {
    case "paragraph":
      return wrapper(
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          rows={4}
          placeholder="Écris ton paragraphe... (**gras**, *italique*)"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />,
        "Paragraphe"
      );

    case "heading":
      return wrapper(
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            className="px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Titre de section"
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Titre"
      );

    case "quote":
      return wrapper(
        <div className="space-y-2">
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={2}
            placeholder="Citation..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={block.author ?? ""}
            onChange={(e) => onChange({ ...block, author: e.target.value })}
            placeholder="Auteur (optionnel)"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Citation"
      );

    case "divider":
      return wrapper(<hr className="border-border" />, "Séparateur");

    case "image":
      return wrapper(
        <div className="space-y-2">
          <ImageDropzone
            value={block.url || null}
            onChange={(url) => onChange({ ...block, url })}
            onRemove={() => onChange({ ...block, url: "" })}
            uploadPath={`${postId ?? crypto.randomUUID()}/block_${block.id}.webp`}
            bucket="post-images"
            aspectClassName="aspect-video"
          />
          <input
            type="text"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Légende (optionnel)"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Image"
      );

    case "image_gallery": {
      const setUrlAt = (index: number, url: string) => {
        const urls = [...block.urls];
        urls[index] = url;
        onChange({ ...block, urls });
      };
      const removeAt = (index: number) => {
        onChange({ ...block, urls: block.urls.filter((_, i) => i !== index) });
      };
      const addSlot = () => {
        if (block.urls.length >= 4) return;
        onChange({ ...block, urls: [...block.urls, ""] });
      };
      return wrapper(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {block.urls.map((url, i) => (
              <div key={i} className="relative">
                <ImageDropzone
                  value={url || null}
                  onChange={(u) => setUrlAt(i, u)}
                  onRemove={() => removeAt(i)}
                  uploadPath={`${postId ?? crypto.randomUUID()}/gallery_block_${block.id}_${i}.webp`}
                  bucket="post-images"
                  aspectClassName="aspect-square"
                />
              </div>
            ))}
          </div>
          {block.urls.length < 4 && (
            <button
              type="button"
              onClick={addSlot}
              className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + Ajouter une image ({block.urls.length}/4)
            </button>
          )}
        </div>,
        "Galerie"
      );
    }

    case "video_embed": {
      const embedUrl = youtubeEmbedUrl(block.url);
      return wrapper(
        <div className="space-y-2">
          <input
            type="text"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="URL YouTube ou TikTok"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {block.url && (
            embedUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vidéo intégrée" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lien non reconnu comme YouTube — sera affiché comme un simple lien : {block.url}
              </p>
            )
          )}
        </div>,
        "Vidéo"
      );
    }

    case "recipe_embed":
      return wrapper(
        block.recipe_id ? (
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
            {block.recipe_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.recipe_image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded bg-secondary shrink-0 flex items-center justify-center">🍽️</div>
            )}
            <span className="flex-1 text-sm font-medium text-foreground truncate">{block.recipe_title}</span>
            <button
              type="button"
              onClick={() => onChange({ ...block, recipe_id: "", recipe_title: "", recipe_image_url: null })}
              className="text-xs text-primary hover:underline"
            >
              Changer
            </button>
          </div>
        ) : pickingRecipe ? (
          <RecipeEmbedPicker
            creatorId={creatorId}
            onSelect={(recipe: CreatorRecipeResult) => {
              onChange({
                ...block,
                recipe_id: recipe.id,
                recipe_title: recipe.title,
                recipe_image_url: recipe.cover_image_url,
              });
              setPickingRecipe(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPickingRecipe(true)}
            className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Choisir une recette à intégrer
          </button>
        ),
        "Recette intégrée"
      );

    default:
      return null;
  }
}
```

- [ ] **Step 2: Write `BlockEditor.tsx`**

```typescript
// components/creator/post-form/BlockEditor.tsx
"use client";

import { useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BlockRenderer from "./BlockRenderer";
import type { PostBlock } from "@/lib/validations/post.schema";

interface BlockEditorProps {
  blocks: PostBlock[];
  postId: string | null;
  creatorId: string;
  onChange: (blocks: PostBlock[]) => void;
}

const BLOCK_TYPE_LABELS: { type: PostBlock["type"]; label: string }[] = [
  { type: "paragraph", label: "+ Paragraphe" },
  { type: "heading", label: "+ Titre" },
  { type: "quote", label: "+ Citation" },
  { type: "image", label: "+ Image" },
  { type: "image_gallery", label: "+ Galerie" },
  { type: "video_embed", label: "+ Vidéo" },
  { type: "recipe_embed", label: "+ Recette" },
  { type: "divider", label: "+ Séparateur" },
];

function makeBlock(type: PostBlock["type"]): PostBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph":
      return { id, type: "paragraph", text: "" };
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "quote":
      return { id, type: "quote", text: "" };
    case "divider":
      return { id, type: "divider" };
    case "image":
      return { id, type: "image", url: "" };
    case "image_gallery":
      return { id, type: "image_gallery", urls: ["", ""] };
    case "video_embed":
      return { id, type: "video_embed", url: "" };
    case "recipe_embed":
      return { id, type: "recipe_embed", recipe_id: "", recipe_title: "", recipe_image_url: null };
  }
}

export default function BlockEditor({ blocks, postId, creatorId, onChange }: BlockEditorProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  const updateBlock = (updated: PostBlock) =>
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)));

  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const addBlock = (type: PostBlock["type"]) => onChange([...blocks, makeBlock(type)]);

  return (
    <div className="space-y-4">
      {blocks.length > 0 && (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  postId={postId}
                  creatorId={creatorId}
                  onChange={updateBlock}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPE_LABELS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="px-3 py-1.5 rounded-lg border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  postId,
  creatorId,
  onChange,
  onRemove,
}: {
  block: PostBlock;
  postId: string | null;
  creatorId: string;
  onChange: (b: PostBlock) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground p-2 mt-1"
        aria-label="Réordonner"
      >
        ⠿
      </button>
      <div className="flex-1">
        <BlockRenderer block={block} postId={postId} creatorId={creatorId} onChange={onChange} onRemove={onRemove} />
      </div>
    </li>
  );
}
```

- [ ] **Step 3: Verify and manually spot-check**

Run: `npx tsc --noEmit` — expect no new errors.

This is the highest-complexity UI task in this plan (recipe_embed picker interaction, drag-reorder, 8 block types). Full manual verification happens in Task 8's browser check once `PostWizard` mounts it — note any concerns for that step here rather than building a standalone test harness page.

- [ ] **Step 4: Commit**

```bash
git add components/creator/post-form/BlockRenderer.tsx components/creator/post-form/BlockEditor.tsx
git commit -m "feat(blog): add BlockEditor and BlockRenderer for post body content"
```

---

### Task 6: `Step1Content.tsx`

**Files:**
- Create: `components/creator/post-form/Step1Content.tsx`

**Interfaces:**
- Consumes: `BlockEditor` (Task 5), `PostFormState` (defined in Task 8's `PostWizard.tsx` — this task takes `data`/`onChange` generically typed against the subset it needs, matching `Step1Basic.tsx`'s pattern of accepting the whole form state and reading only its own fields)
- Produces: `Step1Content({ data, onChange, postId, creatorId }: Step1ContentProps)`

- [ ] **Step 1: Write `Step1Content.tsx`**

```typescript
// components/creator/post-form/Step1Content.tsx
"use client";

import { useLocale } from "next-intl";
import BlockEditor from "./BlockEditor";
import type { PostBlock } from "@/lib/validations/post.schema";

interface Step1ContentData {
  title: string;
  language: "fr" | "en";
  blocks: PostBlock[];
}

interface Step1ContentProps {
  data: Step1ContentData;
  onChange: (patch: Partial<Step1ContentData>) => void;
  postId: string | null;
  creatorId: string;
}

export default function Step1Content({ data, onChange, postId, creatorId }: Step1ContentProps) {
  const siteLocale = useLocale();
  const language = data.language || (siteLocale === "en" ? "en" : "fr");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Contenu</h2>

      <div>
        <label className="text-sm font-medium text-foreground">
          Titre <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ex : Pourquoi le Ndolé est une recette de fête"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Langue</label>
        <select
          value={language}
          onChange={(e) => onChange({ language: e.target.value as "fr" | "en" })}
          className="mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Corps de l'article</label>
        <BlockEditor
          blocks={data.blocks}
          postId={postId}
          creatorId={creatorId}
          onChange={(blocks) => onChange({ blocks })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expect no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/creator/post-form/Step1Content.tsx
git commit -m "feat(blog): add Step1Content wizard step (title, language, block editor)"
```

---

### Task 7: `Step2CoverSettings.tsx` and `Step3Publish.tsx`

**Files:**
- Create: `components/creator/post-form/Step2CoverSettings.tsx`
- Create: `components/creator/post-form/Step3Publish.tsx`

**Interfaces:**
- Consumes: `ImageDropzone` (Task 3), `CATEGORY_OPTIONS` (Task 2)
- Produces: `Step2CoverSettings({ data, onChange, postId }: Step2Props)`
- Produces: `Step3Publish({ data, onSaveDraft, onPublish, isPublished, isPublishing }: Step3Props)`

- [ ] **Step 1: Write `Step2CoverSettings.tsx`**

```typescript
// components/creator/post-form/Step2CoverSettings.tsx
"use client";

import { useState } from "react";
import ImageDropzone from "@/components/shared/ImageDropzone";
import { CATEGORY_OPTIONS } from "@/lib/validations/post.schema";

interface Step2Data {
  cover_image_url: string;
  category: string;
  tags: string[];
  excerpt: string;
  seo_title: string;
  seo_description: string;
  visibility: "public" | "followers" | "fans";
}

interface Step2Props {
  data: Step2Data;
  onChange: (patch: Partial<Step2Data>) => void;
  postId: string | null;
}

export default function Step2CoverSettings({ data, onChange, postId }: Step2Props) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || data.tags.includes(value) || data.tags.length >= 8) return;
    onChange({ tags: [...data.tags, value] });
    setTagInput("");
  };

  const removeTag = (tag: string) => onChange({ tags: data.tags.filter((t) => t !== tag) });

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Couverture & Paramètres</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Photo de couverture</label>
        <ImageDropzone
          value={data.cover_image_url || null}
          onChange={(url) => onChange({ cover_image_url: url })}
          onRemove={() => onChange({ cover_image_url: "" })}
          uploadPath={`${postId ?? crypto.randomUUID()}/cover.webp`}
          bucket="post-images"
          label="Couverture"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Catégorie</label>
        <select
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sélectionner...</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Tags</label>
          <span className="text-xs text-muted-foreground">{data.tags.length}/8</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Ajouter un tag..."
            disabled={data.tags.length >= 8}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={data.tags.length >= 8}
            className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-secondary text-foreground">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Extrait (optionnel)</label>
        <textarea
          value={data.excerpt}
          onChange={(e) => onChange({ excerpt: e.target.value })}
          rows={2}
          maxLength={200}
          placeholder="Résumé affiché dans les listes d'articles..."
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Accès</label>
        <div className="mt-2 flex gap-2">
          {(["public", "followers", "fans"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ visibility: v })}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                data.visibility === v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              {v === "public" ? "Public" : v === "followers" ? "Abonnés" : "Fans"}
            </button>
          ))}
        </div>
      </div>

      <details className="space-y-3">
        <summary className="text-sm font-medium text-foreground cursor-pointer">SEO (optionnel)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Titre SEO</label>
            <input
              type="text"
              value={data.seo_title}
              onChange={(e) => onChange({ seo_title: e.target.value })}
              maxLength={70}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Description SEO</label>
            <textarea
              value={data.seo_description}
              onChange={(e) => onChange({ seo_description: e.target.value })}
              rows={2}
              maxLength={160}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Write `Step3Publish.tsx`**

```typescript
// components/creator/post-form/Step3Publish.tsx
"use client";

interface Step3Data {
  title: string;
  category: string;
  cover_image_url: string;
  blocks: { type: string }[];
}

interface Step3Props {
  data: Step3Data;
  onSaveDraft: () => void;
  onPublish: () => void;
  isPublished: boolean;
  isPublishing: boolean;
}

export default function Step3Publish({ data, onSaveDraft, onPublish, isPublished, isPublishing }: Step3Props) {
  const missing: string[] = [];
  if (!data.title || data.title.length < 3) missing.push("Titre (min 3 caractères)");
  if (!data.category) missing.push("Catégorie");
  if (!data.cover_image_url) missing.push("Photo de couverture");
  if (data.blocks.length === 0) missing.push("Au moins un bloc de contenu");

  const canPublish = missing.length === 0;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Publication</h2>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-3 bg-secondary/30 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aperçu</p>
        </div>
        <div className="p-4 space-y-2">
          {data.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.cover_image_url} alt="Couverture" className="w-full aspect-video object-cover rounded-lg mb-3" />
          )}
          <h3 className="font-semibold text-foreground">
            {data.title || <span className="text-muted-foreground italic">Sans titre</span>}
          </h3>
          <p className="text-xs text-muted-foreground">{data.blocks.length} bloc{data.blocks.length !== 1 ? "s" : ""} de contenu</p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">Complète ces éléments avant de publier :</p>
          <ul className="space-y-1">
            {missing.map((m) => (
              <li key={m} className="text-xs text-destructive flex items-center gap-1.5">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isPublishing}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          💾 Sauvegarder le brouillon
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? "Publication..." : isPublished ? "🚀 Mettre à jour" : "🚀 Publier l'article"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/creator/post-form/Step2CoverSettings.tsx components/creator/post-form/Step3Publish.tsx
git commit -m "feat(blog): add Step2CoverSettings and Step3Publish wizard steps"
```

---

### Task 8: `PostWizard.tsx`

**Files:**
- Create: `components/creator/post-form/PostWizard.tsx`

**Interfaces:**
- Consumes: `Step1Content` (Task 6), `Step2CoverSettings`, `Step3Publish` (Task 7), `postContentSchema`, `postSettingsSchema`, `PostBlock` (Task 2), `slugify` (Task 1), `computeReadingTimeMin` (Task 1)
- Produces: `PostWizard({ postId, initialData, initialIsPublished }: PostWizardProps)`, `PostFormState` (exported type) — consumed by Task 9's edit page

This is the architectural core, mirroring `RecipeWizard.tsx` exactly: local state container, `draft_data` staging, 30s autosave, transactional publish.

- [ ] **Step 1: Write `PostWizard.tsx`**

```typescript
// components/creator/post-form/PostWizard.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { slugify } from "@/lib/utils/slugify";
import { computeReadingTimeMin } from "@/lib/utils/reading-time";
import type { PostBlock } from "@/lib/validations/post.schema";
import Step1Content from "./Step1Content";
import Step2CoverSettings from "./Step2CoverSettings";
import Step3Publish from "./Step3Publish";

export interface PostFormState {
  title: string;
  language: "fr" | "en";
  blocks: PostBlock[];
  cover_image_url: string;
  category: string;
  tags: string[];
  excerpt: string;
  seo_title: string;
  seo_description: string;
  visibility: "public" | "followers" | "fans";
}

const STEP_LABELS = ["Contenu", "Couverture & Paramètres", "Publication"];

interface PostWizardProps {
  postId?: string;
  initialData?: Partial<PostFormState>;
  initialIsPublished?: boolean;
}

export default function PostWizard({ postId, initialData, initialIsPublished }: PostWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { creator } = useAuthStore();
  const siteLocale = useLocale();

  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<PostFormState>({
    title: "",
    language: siteLocale === "en" ? "en" : "fr",
    blocks: [],
    cover_image_url: "",
    category: "",
    tags: [],
    excerpt: "",
    seo_title: "",
    seo_description: "",
    visibility: "public",
    ...initialData,
  });
  const [draftId, setDraftId] = useState<string | null>(postId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const [isLivePublished] = useState<boolean>(initialIsPublished ?? false);

  // ── Save translation row (title, content, excerpt, SEO, reading time) ────────
  // Looked up by post_id ALONE (not post_id + locale): a post has exactly one
  // translation row for now (Phase 1's single-locale decision). If the creator
  // changes the language dropdown mid-draft, this must update that same row's
  // locale rather than search for a row under the new locale (which wouldn't
  // exist yet) and insert a duplicate.
  const saveTranslation = useCallback(
    async (id: string, data: PostFormState) => {
      const reading_time_min = computeReadingTimeMin(data.blocks);
      const { data: existing } = await supabase
        .from("blog_post_translation")
        .select("id")
        .eq("post_id", id)
        .maybeSingle();

      const payload = {
        post_id: id,
        locale: data.language,
        title: data.title || "Brouillon",
        content_json: data.blocks,
        excerpt: data.excerpt || null,
        seo_title: data.seo_title || null,
        seo_description: data.seo_description || null,
        reading_time_min,
      };

      if (existing) {
        const { error } = await supabase.from("blog_post_translation").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_post_translation").insert(payload);
        if (error) throw error;
      }
    },
    [supabase]
  );

  // ── Save post row ──────────────────────────────────────────────────────────
  const savePostRow = useCallback(
    async (data: PostFormState): Promise<string | null> => {
      if (!creator) return null;

      // Published posts: work-in-progress goes to draft_data ONLY — the live row
      // must not change until Publish materializes it explicitly.
      if (draftId && isLivePublished) {
        const { error } = await supabase.from("blog_post").update({ draft_data: data }).eq("id", draftId);
        if (error) throw error;
        return draftId;
      }

      const payload = {
        creator_id: creator.id,
        cover_image_url: data.cover_image_url || null,
        category: data.category || null,
        tags: data.tags,
        visibility: data.visibility,
        draft_data: data,
      };

      let id: string;
      if (draftId) {
        const { error } = await supabase.from("blog_post").update(payload).eq("id", draftId);
        if (error) throw error;
        id = draftId;
      } else {
        const { data: newPost, error } = await supabase.from("blog_post").insert(payload).select("id").single();
        if (error) throw error;
        if (!newPost) return null;
        setDraftId(newPost.id);
        id = newPost.id;
      }

      // Never-published posts keep live tables continuously in sync (matches
      // RecipeWizard's behavior — draft_data is belt-and-suspenders, not the
      // only copy, until the post has actually gone live once).
      await saveTranslation(id, data);
      return id;
    },
    [creator, draftId, isLivePublished, supabase, saveTranslation]
  );

  const saveDraft = useCallback(
    async (data: PostFormState) => {
      setIsSaving(true);
      try {
        await savePostRow(data);
        setLastSaved(new Date());
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [savePostRow]
  );

  // ── Auto-save every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) saveDraft(formState);
    }, 30000);
    return () => clearInterval(interval);
  }, [formState, saveDraft]);

  const updateForm = useCallback((patch: Partial<PostFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
    isDirtyRef.current = true;
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    await saveDraft(formState);
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };
  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };
  const handleStepClick = async (target: number) => {
    if (target === currentStep) return;
    await saveDraft(formState);
    setCurrentStep(target);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const id = await savePostRow(formState);
      if (!id) return;

      if (publish) {
        await saveTranslation(id, formState);

        const recipe_embeds = formState.blocks
          .filter((b): b is Extract<PostBlock, { type: "recipe_embed" }> => b.type === "recipe_embed" && !!b.recipe_id)
          .map((b) => b.recipe_id);

        const slug = slugify(formState.title, id);

        const { error: pubError } = await supabase
          .from("blog_post")
          .update({
            cover_image_url: formState.cover_image_url || null,
            category: formState.category || null,
            tags: formState.tags,
            visibility: formState.visibility,
            recipe_embeds,
            slug,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (pubError) throw pubError;
      }

      router.push("/dashboard/posts");
    } catch (err) {
      console.error("Publish failed:", err);
      setPublishError("La publication a échoué — aucune donnée n'a été perdue. Réessayez.");
    } finally {
      setIsPublishing(false);
    }
  };

  const savedLabel = (() => {
    if (isSaving) return "Sauvegarde...";
    if (!lastSaved) return "";
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    return s < 60 ? `Sauvé il y a ${s}s` : `Sauvé il y a ${Math.round(s / 60)}min`;
  })();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="hidden sm:flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <button
              key={step}
              onClick={() => handleStepClick(step)}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors truncate ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {step}. {label}
            </button>
          );
        })}
      </div>
      <div className="sm:hidden mb-2">
        <span className="text-sm font-medium text-foreground">
          Étape {currentStep} — {STEP_LABELS[currentStep - 1]}
        </span>
      </div>

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Content
            data={formState}
            onChange={updateForm}
            postId={draftId}
            creatorId={creator?.id ?? ""}
          />
        )}
        {currentStep === 2 && (
          <Step2CoverSettings data={formState} onChange={updateForm} postId={draftId} />
        )}
        {currentStep === 3 && (
          <Step3Publish
            data={formState}
            onSaveDraft={() => handlePublish(false)}
            onPublish={() => handlePublish(true)}
            isPublished={isLivePublished}
            isPublishing={isPublishing}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        {publishError && <p className="text-sm text-red-600 mr-4">{publishError}</p>}
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <span className="text-xs text-muted-foreground">{savedLabel}</span>
        {currentStep < 3 && (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual browser verification (required — this is the full save/publish flow)**

Run: `npm run dev`, then in a browser (logged in as a creator with a `creator` row):
1. Navigate to a temporary test route rendering `<PostWizard />` with no props (Task 9 wires the real route next — if Task 9 isn't done yet, temporarily mount `PostWizard` on any existing creator-only page to test, then revert that temporary mount before committing).
2. Step 1: enter a title, add a paragraph block, add a heading block, add a recipe_embed block and pick one of your own recipes, drag-reorder two blocks.
3. Step 2: upload a cover image, pick a category, add 2 tags, write an excerpt.
4. Step 3: confirm the validation checklist shows nothing missing, click "Sauvegarder le brouillon" — confirm no error.
5. Reload the page (simulating a return visit) and confirm `blog_post`/`blog_post_translation` rows exist with the right data (check via Supabase Studio at `http://127.0.0.1:54323`).
6. Go back to the wizard, click "Publier l'article" — confirm `is_published = true`, `slug` is set, `published_at` is set, `recipe_embeds` contains the embedded recipe's id.

Expected: full flow works end-to-end, matching the described behavior at each step.

- [ ] **Step 4: Commit**

```bash
git add components/creator/post-form/PostWizard.tsx
git commit -m "feat(blog): add PostWizard state container with draft/publish materialization"
```

---

### Task 9: Dashboard routes — list, new, edit

**Files:**
- Create: `app/[locale]/(creator)/dashboard/posts/page.tsx`
- Create: `app/[locale]/(creator)/dashboard/posts/new/page.tsx`
- Create: `app/[locale]/(creator)/dashboard/posts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PostWizard`, `PostFormState` from `@/components/creator/post-form/PostWizard` (Task 8)

- [ ] **Step 1: Write `new/page.tsx`**

```typescript
// app/[locale]/(creator)/dashboard/posts/new/page.tsx
import PostWizard from "@/components/creator/post-form/PostWizard";

export const metadata = {
  title: "Nouvel article — Akeli Créateur",
};

export default function NewPostPage() {
  return (
    <main className="py-6 px-4 sm:px-6">
      <PostWizard />
    </main>
  );
}
```

- [ ] **Step 2: Write `[id]/edit/page.tsx`**

```typescript
// app/[locale]/(creator)/dashboard/posts/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PostWizard from "@/components/creator/post-form/PostWizard";
import type { PostFormState } from "@/components/creator/post-form/PostWizard";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [initialData, setInitialData] = useState<Partial<PostFormState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadPost() {
      const { data, error: err } = await supabase
        .from("blog_post")
        .select(`
          id, cover_image_url, category, tags, visibility, is_published, draft_data,
          blog_post_translation ( locale, title, content_json, excerpt, seo_title, seo_description )
        `)
        .eq("id", id)
        .single();

      if (err || !data) {
        setError("Article introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

      setIsPublished((data as any).is_published ?? false);

      // A saved draft holds the full PostFormState verbatim (PostWizard stores it as-is).
      // Prefer it over live tables so in-progress edits survive a page reload.
      if ((data as any).draft_data && typeof (data as any).draft_data === "object") {
        setInitialData((data as any).draft_data as Partial<PostFormState>);
        setLoading(false);
        return;
      }

      const translation = ((data as any).blog_post_translation ?? [])[0];

      const mapped: Partial<PostFormState> = {
        title: translation?.title ?? "",
        language: (translation?.locale as "fr" | "en") ?? "fr",
        blocks: translation?.content_json ?? [],
        cover_image_url: (data as any).cover_image_url ?? "",
        category: (data as any).category ?? "",
        tags: (data as any).tags ?? [],
        excerpt: translation?.excerpt ?? "",
        seo_title: translation?.seo_title ?? "",
        seo_description: translation?.seo_description ?? "",
        visibility: (data as any).visibility ?? "public",
      };

      setInitialData(mapped);
      setLoading(false);
    }

    loadPost();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-foreground font-medium">{error ?? "Erreur inconnue"}</p>
        <a href="/dashboard/posts" className="text-sm text-primary hover:underline">
          ← Retour à mes articles
        </a>
      </div>
    );
  }

  return (
    <main className="py-6 px-4 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <a href="/dashboard/posts" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Mes articles
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold text-foreground truncate">
          Éditer — {initialData.title || "Sans titre"}
        </h1>
      </div>
      <PostWizard postId={id} initialData={initialData} initialIsPublished={isPublished} />
    </main>
  );
}
```

- [ ] **Step 3: Write `page.tsx`** (list)

```typescript
// app/[locale]/(creator)/dashboard/posts/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { CATEGORY_OPTIONS } from "@/lib/validations/post.schema";

type StatusFilter = "all" | "published" | "draft";

interface Post {
  id: string;
  is_published: boolean;
  category: string | null;
  view_count: number;
  created_at: string;
  blog_post_translation: { title: string }[];
}

export default function PostsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const { creator } = useAuthStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!creator) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("blog_post")
        .select("id, is_published, category, view_count, created_at, blog_post_translation ( title )")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false });
      if (data) setPosts(data as any);
    } finally {
      setLoading(false);
    }
  }, [creator, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function titleOf(post: Post) {
    return post.blog_post_translation?.[0]?.title || "Sans titre";
  }

  async function togglePublish(id: string, currentlyPublished: boolean) {
    setActionLoading(id);
    try {
      await supabase.from("blog_post").update({ is_published: !currentlyPublished }).eq("id", id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: !currentlyPublished } : p)));
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePost(id: string) {
    setActionLoading(id);
    try {
      await supabase.from("blog_post").delete().eq("id", id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  const displayed = posts.filter((p) => {
    if (statusFilter === "published" && !p.is_published) return false;
    if (statusFilter === "draft" && p.is_published) return false;
    if (search && !titleOf(p).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryLabel = (value: string | null) =>
    CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value ?? "";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4" style={{ borderBottom: "2px solid var(--color-brand-dark)", paddingBottom: "1.25rem" }}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Espace Créateur</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Mes Articles
          </h1>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}
        >
          + Nouvel article
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => {
            const labels = { all: "Tous", published: "Publiés", draft: "Brouillons" };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={"px-3 py-1.5 text-xs font-medium transition-colors " + (statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <p className="text-4xl">✍️</p>
          <p className="font-semibold text-foreground">{posts.length === 0 ? "Aucun article pour le moment" : "Aucun résultat"}</p>
          {posts.length === 0 && (
            <Link
              href="/dashboard/posts/new"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}
            >
              + Écrire mon premier article
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {displayed.map((post) => (
            <li key={post.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
              <div
                className="flex-1 min-w-0 space-y-1 cursor-pointer"
                onClick={() => router.push(("/dashboard/posts/" + post.id + "/edit") as any)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{titleOf(post)}</span>
                  <span className={"px-2 py-0.5 rounded-full text-[10px] font-medium " + (post.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {post.is_published ? "Publié" : "Brouillon"}
                  </span>
                  {post.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                      {categoryLabel(post.category)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.is_published && <span>{post.view_count} vue{post.view_count !== 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(("/dashboard/posts/" + post.id + "/edit") as any)}
                  disabled={actionLoading === post.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-secondary disabled:opacity-40"
                >
                  Éditer
                </button>
                <button
                  onClick={() => togglePublish(post.id, post.is_published)}
                  disabled={actionLoading === post.id}
                  className={"px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 " + (post.is_published ? "border border-destructive text-destructive hover:bg-destructive/10" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                >
                  {post.is_published ? "Dépublier" : "Publier"}
                </button>
                <button
                  onClick={() => setConfirmDelete(post.id)}
                  disabled={actionLoading === post.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Supprimer l'article ?</h2>
              <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
                  Annuler
                </button>
                <button
                  onClick={() => deletePost(confirmDelete)}
                  disabled={actionLoading === confirmDelete}
                  className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading === confirmDelete ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual browser verification (full loop, required)**

Run: `npm run dev`, then in a browser as a logged-in creator:
1. Navigate to `/dashboard/posts` — confirm the empty state shows, then "Écrire mon premier article" navigates to `/dashboard/posts/new`.
2. Complete the wizard (title, one paragraph block, category, cover image) and publish.
3. Confirm redirect to `/dashboard/posts` and the new post appears in the list with the "Publié" badge and correct category label.
4. Click "Éditer" — confirm the wizard reloads with all the same data (this exercises the `draft_data`-priority load path from Task 9 Step 2, since the post is now published and every edit stages into `draft_data`).
5. Click "Dépublier" from the list — confirm the badge flips to "Brouillon".
6. Click "Supprimer", confirm the dialog, confirm the post disappears from the list and the row is actually gone from `blog_post` (check Supabase Studio).

Expected: full creator flow works end-to-end.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(creator)/dashboard/posts/page.tsx" "app/[locale]/(creator)/dashboard/posts/new/page.tsx" "app/[locale]/(creator)/dashboard/posts/[id]/edit/page.tsx"
git commit -m "feat(blog): add creator dashboard post list, new, and edit routes"
```

---

## After This Plan

Phase 2 delivers a complete creator-facing authoring flow: write, save as draft, publish, edit, unpublish, delete — with a custom block editor supporting all 8 content types from the spec, including recipe embeds. Nothing from this phase is publicly visible yet (no public feed, no post page, no SEO, no likes/comments UI) — that's Phase 3, written as a separate plan once this one lands, since its exact data-fetching approach (Server Component for `generateMetadata`, per the original spec's deliberate deviation from the client-component pattern) benefits from real posts existing to test against.
