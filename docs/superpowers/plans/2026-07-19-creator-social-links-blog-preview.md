# Creator Social Links + Blog Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators show links to their social media (Instagram, TikTok, YouTube, website) and let their public profile show their latest 3 blog articles below their recipes, when they have any.

**Architecture:** The `creator` table already has unused `instagram_handle` / `tiktok_handle` / `youtube_handle` / `website_url` columns (confirmed in `lib/supabase/database.types.ts`), so this is a pure UI + normalization-logic feature — no migration. A new small validation module normalizes and validates the four social fields; the creator profile edit form gets a new section wired to it; the public profile page selects the four columns and renders them as icon links, and separately fetches the creator's blog feed (via the existing `fetchCreatorBlogFeed`/`get_creator_blog_feed` RPC, already ordered newest-first) to render up to 3 preview cards with a "see all" link.

**Tech Stack:** Next.js App Router, TypeScript, Zod v4, Vitest, next-intl, Supabase JS client, lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-19-creator-social-links-blog-preview-design.md`

## Global Constraints

- No database migration — use only the existing `creator.instagram_handle`, `creator.tiktok_handle`, `creator.youtube_handle`, `creator.website_url` columns.
- Social handles are stored bare (no `@`, no full URL) — e.g. `"chef_amina"`, not `"@chef_amina"`.
- `app/[locale]/(creator)/profile/page.tsx` has no `useTranslations` calls anywhere and hardcodes French strings by deliberate existing convention — new labels there follow that convention, no i18n keys for this form.
- `app/[locale]/creator/[username]/CreatorProfileClient.tsx` already uses `useTranslations("creators")` — new user-facing strings on the public profile page go through i18n, added to both `messages/fr.json` and `messages/en.json`.
- No changes to `get_creator_blog_feed`, the `/creator/[username]/blog` feed page, the post reader page, or the creator dashboard's own blog editor.

---

## File Structure

```
lib/validations/social-links.schema.ts        — new: normalizeHandle, normalizeWebsiteUrl, socialLinksSchema
lib/validations/social-links.schema.test.ts   — new: vitest unit tests for the above
app/[locale]/(creator)/profile/page.tsx       — modify: add "Réseaux sociaux" form section + save logic
app/[locale]/creator/[username]/CreatorProfileClient.tsx  — modify: select new columns, render social icon row + blog preview section
messages/fr.json, messages/en.json            — modify: 2 new keys under "creators"
```

---

### Task 1: Social link normalization + validation library

**Files:**
- Create: `lib/validations/social-links.schema.ts`
- Test: `lib/validations/social-links.schema.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 2): `normalizeHandle(input: string): string`, `normalizeWebsiteUrl(input: string): string`, `socialLinksSchema: z.ZodObject` with shape `{ instagram_handle: string, tiktok_handle: string, youtube_handle: string, website_url: string }`, and its inferred type `SocialLinksData`.

- [ ] **Step 1: Write the failing test file**

Create `lib/validations/social-links.schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizeHandle, normalizeWebsiteUrl, socialLinksSchema } from "@/lib/validations/social-links.schema";

describe("normalizeHandle", () => {
  it("returns a bare handle unchanged", () => {
    expect(normalizeHandle("chef_amina")).toBe("chef_amina");
  });

  it("strips a leading @", () => {
    expect(normalizeHandle("@chef_amina")).toBe("chef_amina");
  });

  it("extracts the handle from a pasted profile URL", () => {
    expect(normalizeHandle("https://instagram.com/chef_amina")).toBe("chef_amina");
  });

  it("extracts the handle from a pasted URL with a trailing slash", () => {
    expect(normalizeHandle("https://instagram.com/chef_amina/")).toBe("chef_amina");
  });

  it("extracts the handle from a www. URL with an @ segment", () => {
    expect(normalizeHandle("https://www.tiktok.com/@chef_amina")).toBe("chef_amina");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeHandle("   ")).toBe("");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("returns an empty string for blank input", () => {
    expect(normalizeWebsiteUrl("  ")).toBe("");
  });

  it("leaves a URL with an existing scheme unchanged", () => {
    expect(normalizeWebsiteUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to a bare domain", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com");
  });
});

describe("socialLinksSchema", () => {
  it("accepts all-empty values", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid handles and a normalized website url", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "chef_amina",
      tiktok_handle: "chef_amina",
      youtube_handle: "ChefAminaCooks",
      website_url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an instagram handle over 30 characters", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "a".repeat(31),
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a youtube handle over 60 characters", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "a".repeat(61),
      website_url: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed website url even after https:// normalization", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "https://",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/validations/social-links.schema.test.ts`
Expected: FAIL — `Cannot find module '@/lib/validations/social-links.schema'` (or similar resolution error), since the module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/validations/social-links.schema.ts`:

```typescript
import { z } from "zod";

export function normalizeHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const lastSegment = withoutProtocol.includes("/")
    ? withoutProtocol.split("/").filter(Boolean).pop() ?? ""
    : withoutProtocol;
  return lastSegment.replace(/^@/, "");
}

export function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const socialLinksSchema = z.object({
  instagram_handle: z.string().max(30, "Maximum 30 caractères"),
  tiktok_handle: z.string().max(30, "Maximum 30 caractères"),
  youtube_handle: z.string().max(60, "Maximum 60 caractères"),
  website_url: z.union([z.literal(""), z.string().url("URL invalide")]),
});

export type SocialLinksData = z.infer<typeof socialLinksSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/validations/social-links.schema.test.ts`
Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/social-links.schema.ts lib/validations/social-links.schema.test.ts
git commit -m "feat(validations): add social links normalization and schema"
```

---

### Task 2: Add social links section to the creator profile edit form

**Files:**
- Modify: `app/[locale]/(creator)/profile/page.tsx`

**Interfaces:**
- Consumes: `normalizeHandle`, `normalizeWebsiteUrl`, `socialLinksSchema` from `@/lib/validations/social-links.schema` (Task 1). Also relies on `useAuthStore`'s existing `CreatorProfile` type (`lib/stores/authStore.ts`) already declaring `instagram_handle: string | null`, `tiktok_handle: string | null`, `youtube_handle: string | null`, `website_url: string | null` — confirmed present already, no store change needed.
- Produces: nothing consumed by later tasks (Task 3/4 read the columns directly from Supabase, not from this form).

- [ ] **Step 1: Add the import**

In `app/[locale]/(creator)/profile/page.tsx`, after the existing imports (currently ending with `import imageCompression from "browser-image-compression";`), add:

```typescript
import { normalizeHandle, normalizeWebsiteUrl, socialLinksSchema } from "@/lib/validations/social-links.schema";
```

- [ ] **Step 2: Add form state for the four fields**

Find:

```typescript
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [heritageRegion, setHeritageRegion] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
```

Replace with:

```typescript
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [heritageRegion, setHeritageRegion] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
```

- [ ] **Step 3: Populate the new fields from the store**

Find:

```typescript
  useEffect(() => {
    if (!creator) return;
    setName(creator.display_name ?? "");
    setBio(creator.bio ?? "");
    setHeritageRegion(creator.heritage_region ?? "");
    setSpecialties(creator.specialties ?? []);
    setAvatarUrl(creator.profile_image_url ?? null);
  }, [creator]);
```

Replace with:

```typescript
  useEffect(() => {
    if (!creator) return;
    setName(creator.display_name ?? "");
    setBio(creator.bio ?? "");
    setHeritageRegion(creator.heritage_region ?? "");
    setSpecialties(creator.specialties ?? []);
    setAvatarUrl(creator.profile_image_url ?? null);
    setInstagramHandle(creator.instagram_handle ?? "");
    setTiktokHandle(creator.tiktok_handle ?? "");
    setYoutubeHandle(creator.youtube_handle ?? "");
    setWebsiteUrl(creator.website_url ?? "");
  }, [creator]);
```

- [ ] **Step 4: Validate and include the fields in the save payload**

Find:

```typescript
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!creator) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }
      const { data, error } = await supabase
        .from("creator")
        .update({
          display_name: name.trim() || null,
          bio: bio.trim() || null,
          heritage_region: heritageRegion || null,
          specialties,
          profile_image_url: newAvatarUrl,
        })
        .eq("id", creator.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      if (data) {
        setCreator(data);
        setAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
      setSuccessMsg("Profil mis à jour avec succès !");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }
```

Replace with:

```typescript
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!creator) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const normalizedSocial = {
      instagram_handle: normalizeHandle(instagramHandle),
      tiktok_handle: normalizeHandle(tiktokHandle),
      youtube_handle: normalizeHandle(youtubeHandle),
      website_url: normalizeWebsiteUrl(websiteUrl),
    };
    const socialResult = socialLinksSchema.safeParse(normalizedSocial);
    if (!socialResult.success) {
      setErrorMsg(socialResult.error.issues[0]?.message ?? "Réseaux sociaux invalides.");
      setSaving(false);
      return;
    }

    try {
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }
      const { data, error } = await supabase
        .from("creator")
        .update({
          display_name: name.trim() || null,
          bio: bio.trim() || null,
          heritage_region: heritageRegion || null,
          specialties,
          profile_image_url: newAvatarUrl,
          instagram_handle: normalizedSocial.instagram_handle || null,
          tiktok_handle: normalizedSocial.tiktok_handle || null,
          youtube_handle: normalizedSocial.youtube_handle || null,
          website_url: normalizedSocial.website_url || null,
        })
        .eq("id", creator.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      if (data) {
        setCreator(data);
        setAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
        setInstagramHandle(normalizedSocial.instagram_handle);
        setTiktokHandle(normalizedSocial.tiktok_handle);
        setYoutubeHandle(normalizedSocial.youtube_handle);
        setWebsiteUrl(normalizedSocial.website_url);
      }
      setSuccessMsg("Profil mis à jour avec succès !");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 5: Add the "Réseaux sociaux" form section**

Find the end of the "Spécialités" section (it ends right before the "Feedback & Submit" comment):

```typescript
          )}
        </section>

        {/* ── Feedback & Submit ── */}
```

Replace with (adding the new section in between):

```typescript
          )}
        </section>

        {/* ── Réseaux sociaux ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Réseaux sociaux</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="instagram">
              Instagram
            </label>
            <input
              id="instagram"
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value.slice(0, 30))}
              placeholder="ton_pseudo"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="tiktok">
              TikTok
            </label>
            <input
              id="tiktok"
              type="text"
              value={tiktokHandle}
              onChange={(e) => setTiktokHandle(e.target.value.slice(0, 30))}
              placeholder="ton_pseudo"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="youtube">
              YouTube
            </label>
            <input
              id="youtube"
              type="text"
              value={youtubeHandle}
              onChange={(e) => setYoutubeHandle(e.target.value.slice(0, 60))}
              placeholder="ta_chaine"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="website">
              Site web
            </label>
            <input
              id="website"
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://tonsite.com"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        {/* ── Feedback & Submit ── */}
```

- [ ] **Step 6: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Manual browser verification (required)**

Run: `npm run dev` (if not already running), log in as a creator account, go to `/profile`:
1. Confirm a new "Réseaux sociaux" section renders with 4 inputs, after "Spécialités culinaires" and before the save button.
2. Type `@chef_test` into Instagram, `https://www.tiktok.com/@chef_test` into TikTok, `chef_test` into YouTube, and `example.com` into Site web. Click "Enregistrer le profil".
3. Confirm the success message appears and, after a page refresh, the fields show the normalized values: `chef_test` (Instagram), `chef_test` (TikTok), `chef_test` (YouTube), `https://example.com` (Site web) — i.e. the `@` and platform URL were stripped, and the bare domain got `https://` prepended.
4. Enter `not a valid url` in Site web and save; confirm an error message appears and the save is blocked (check in Supabase or via refresh that the value wasn't persisted).

Expected: all 4 checks pass.

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/(creator)/profile/page.tsx"
git commit -m "feat(profile): let creators set their social media links"
```

---

### Task 3: Display social links on the public creator profile page

**Files:**
- Modify: `app/[locale]/creator/[username]/CreatorProfileClient.tsx`

**Interfaces:**
- Consumes: `creator.instagram_handle`, `creator.tiktok_handle`, `creator.youtube_handle`, `creator.website_url` — same column names as Task 2, now read on the public (unauthenticated) side via a plain `supabase.from("creator").select(...)` call.
- Produces: nothing consumed by Task 4 directly, but Task 4 edits the same file's `useEffect`/render tree, so this task must land first to avoid overlapping edits.

- [ ] **Step 1: Add the lucide-react import**

In `app/[locale]/creator/[username]/CreatorProfileClient.tsx`, after the existing imports (currently ending with `import Navbar from "@/components/layout/Navbar";`), add:

```typescript
import { Instagram, Youtube, Globe } from "lucide-react";
```

- [ ] **Step 2: Add the new fields to the `CreatorProfile` interface**

Find:

```typescript
interface CreatorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
}
```

Replace with:

```typescript
interface CreatorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  website_url: string | null;
}
```

- [ ] **Step 3: Select the new columns**

Find:

```typescript
      supabase
        .from("creator")
        .select("id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count")
        .eq("id", creatorId)
        .single(),
```

Replace with:

```typescript
      supabase
        .from("creator")
        .select(
          "id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count, instagram_handle, tiktok_handle, youtube_handle, website_url"
        )
        .eq("id", creatorId)
        .single(),
```

- [ ] **Step 4: Render the social links row in the profile header**

Find:

```typescript
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{creator.recipe_count}</strong>{" "}
              {t("stats.recipesPublished", { count: creator.recipe_count })}
            </p>
          </div>
        </section>
```

Replace with:

```typescript
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{creator.recipe_count}</strong>{" "}
              {t("stats.recipesPublished", { count: creator.recipe_count })}
            </p>

            <SocialLinks creator={creator} />
          </div>
        </section>
```

- [ ] **Step 5: Add the `SocialLinks` and `TikTokIcon` components**

Find the `RecipeCard` component at the bottom of the file (starts with `function RecipeCard({ recipe }: { recipe: RecipeTeaser }) {`) and add the following two functions immediately **before** it:

```typescript
// ─── SocialLinks ──────────────────────────────────────────────────────────────

function SocialLinks({ creator }: { creator: CreatorProfile }) {
  const links: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];

  if (creator.instagram_handle) {
    links.push({
      key: "instagram",
      href: `https://instagram.com/${creator.instagram_handle}`,
      label: "Instagram",
      icon: <Instagram className="w-4 h-4" />,
    });
  }
  if (creator.tiktok_handle) {
    links.push({
      key: "tiktok",
      href: `https://www.tiktok.com/@${creator.tiktok_handle}`,
      label: "TikTok",
      icon: <TikTokIcon className="w-4 h-4" />,
    });
  }
  if (creator.youtube_handle) {
    links.push({
      key: "youtube",
      href: `https://youtube.com/@${creator.youtube_handle}`,
      label: "YouTube",
      icon: <Youtube className="w-4 h-4" />,
    });
  }
  if (creator.website_url) {
    links.push({
      key: "website",
      href: creator.website_url,
      label: "Site web",
      icon: <Globe className="w-4 h-4" />,
    });
  }

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.75 2h2.5a4.75 4.75 0 0 0 4.75 4.75V9.5a7.22 7.22 0 0 1-4.75-1.79v6.94a5.65 5.65 0 1 1-5.65-5.65c.19 0 .38.01.56.04v2.55a3.1 3.1 0 1 0 2.19 2.96V2z" />
    </svg>
  );
}

```

- [ ] **Step 6: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Manual browser verification (required)**

Using the account you set social links on in Task 2, run `npm run dev` (if not already running) and visit `/creator/<that creator's id>` in a browser:
1. Confirm 4 small round icon links (Instagram, TikTok, YouTube, Globe) render below the recipe count.
2. Confirm each opens the expected URL in a new tab (e.g. Instagram icon opens `https://instagram.com/chef_test`).
3. Visit the profile of a creator with no social fields set and confirm the icon row doesn't render at all (no empty gap).

Expected: all 3 checks pass.

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/creator/[username]/CreatorProfileClient.tsx"
git commit -m "feat(creator-profile): display creator social media links"
```

---

### Task 4: Add latest blog articles preview below recipes

**Files:**
- Modify: `app/[locale]/creator/[username]/CreatorProfileClient.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: `fetchCreatorBlogFeed(creatorId: string): Promise<BlogFeedPost[]>` and the `BlogFeedPost` type, both from `lib/queries/blog-posts.ts` (pre-existing, used already by `components/public/blog/BlogFeedClient.tsx` — confirmed the underlying `get_creator_blog_feed` RPC already orders by `published_at DESC`, so no extra sorting is needed client-side).
- Produces: nothing consumed elsewhere — last task in this plan.

- [ ] **Step 1: Add the blog-posts imports**

In `app/[locale]/creator/[username]/CreatorProfileClient.tsx`, after the import added in Task 3 (`import { Instagram, Youtube, Globe } from "lucide-react";`), add:

```typescript
import { fetchCreatorBlogFeed } from "@/lib/queries/blog-posts";
import type { BlogFeedPost } from "@/lib/queries/blog-posts";
```

- [ ] **Step 2: Add `posts` state**

Find:

```typescript
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeTeaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
```

Replace with:

```typescript
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeTeaser[]>([]);
  const [posts, setPosts] = useState<BlogFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
```

- [ ] **Step 3: Fetch the blog feed alongside creator + recipes**

Find:

```typescript
  useEffect(() => {
    Promise.all([
      supabase
        .from("creator")
        .select(
          "id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count, instagram_handle, tiktok_handle, youtube_handle, website_url"
        )
        .eq("id", creatorId)
        .single(),
      supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, region, difficulty, prep_time_min, cook_time_min, is_published")
        .eq("creator_id", creatorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
    ]).then(([creatorRes, recipesRes]) => {
      if (!creatorRes.data) {
        setNotFound(true);
      } else {
        setCreator({
          ...creatorRes.data,
          recipe_count: creatorRes.data.recipe_count ?? 0,
          specialties: creatorRes.data.specialties ?? [],
        });
      }
      if (recipesRes.data) setRecipes(recipesRes.data as RecipeTeaser[]);
      setLoading(false);
    });
  }, [creatorId, supabase]);
```

Replace with:

```typescript
  useEffect(() => {
    Promise.all([
      supabase
        .from("creator")
        .select(
          "id, display_name, bio, profile_image_url, heritage_region, specialties, recipe_count, instagram_handle, tiktok_handle, youtube_handle, website_url"
        )
        .eq("id", creatorId)
        .single(),
      supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, region, difficulty, prep_time_min, cook_time_min, is_published")
        .eq("creator_id", creatorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      fetchCreatorBlogFeed(creatorId),
    ])
      .then(([creatorRes, recipesRes, blogPosts]) => {
        if (!creatorRes.data) {
          setNotFound(true);
        } else {
          setCreator({
            ...creatorRes.data,
            recipe_count: creatorRes.data.recipe_count ?? 0,
            specialties: creatorRes.data.specialties ?? [],
          });
        }
        if (recipesRes.data) setRecipes(recipesRes.data as RecipeTeaser[]);
        setPosts(blogPosts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [creatorId, supabase]);
```

Note the added `.catch(() => setLoading(false))`: `fetchCreatorBlogFeed` throws on an RPC error (see `lib/queries/blog-posts.ts`), and since it's now inside the same `Promise.all` as the creator/recipes fetch, an RPC failure would otherwise reject the whole `Promise.all` with no handler, leaving the page stuck on its loading skeleton forever.

- [ ] **Step 4: Render the blog preview section**

Find:

```typescript
        {/* ── App CTA ── */}
```

Replace with (inserting the new section right before it):

```typescript
        {/* ── Blog ── */}
        {posts.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("blogPreviewTitle", { name: creator.display_name?.split(" ")[0] ?? t("defaultName") })}
              </h2>
              <Link href={`/creator/${creatorId}/blog`} className="text-sm text-primary hover:underline shrink-0">
                {t("seeAllArticles")}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.slice(0, 3).map((post) => (
                <BlogPostCard key={post.id} post={post} creatorId={creatorId} />
              ))}
            </div>
          </section>
        )}

        {/* ── App CTA ── */}
```

- [ ] **Step 5: Add the `BlogPostCard` component**

Find the `SocialLinks`/`TikTokIcon` components added in Task 3 and add the following function immediately **after** `TikTokIcon` (still before `RecipeCard`):

```typescript
// ─── BlogPostCard ─────────────────────────────────────────────────────────────

function BlogPostCard({ post, creatorId }: { post: BlogFeedPost; creatorId: string }) {
  const tBlog = useTranslations("blog");

  const card = (
    <>
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className={`w-full h-40 object-cover ${post.can_read ? "" : "blur-md"}`}
        />
      ) : (
        <div className="w-full h-40 bg-secondary flex items-center justify-center text-3xl">📝</div>
      )}
      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {post.category && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {tBlog(`categories.${post.category}` as any)}
            </span>
          )}
          {!post.can_read && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              🔒 {tBlog("gatedTitle")}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</p>
        {post.can_read && post.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
        )}
        {post.can_read && post.reading_time_min != null && (
          <p className="text-[10px] text-muted-foreground">{tBlog("minRead", { min: post.reading_time_min })}</p>
        )}
      </div>
    </>
  );

  return post.can_read && post.slug ? (
    <Link
      href={`/creator/${creatorId}/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      {card}
    </Link>
  ) : (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden opacity-90">{card}</div>
  );
}

```

- [ ] **Step 6: Add the i18n keys to `messages/fr.json`**

Find (inside the `"creators"` object):

```json
    "recipesBy": "Recettes de",
    "ctaTitle": "Accède aux recettes complètes dans l'app Akeli",
```

Replace with:

```json
    "recipesBy": "Recettes de",
    "blogPreviewTitle": "Articles de {name}",
    "seeAllArticles": "Voir tous les articles →",
    "ctaTitle": "Accède aux recettes complètes dans l'app Akeli",
```

- [ ] **Step 7: Add the equivalent keys to `messages/en.json`**

Find (inside the `"creators"` object):

```json
    "recipesBy": "Recipes by",
    "ctaTitle": "Access full recipes in the Akeli app",
```

Replace with:

```json
    "recipesBy": "Recipes by",
    "blogPreviewTitle": "Articles by {name}",
    "seeAllArticles": "See all articles →",
    "ctaTitle": "Access full recipes in the Akeli app",
```

- [ ] **Step 8: Verify both message files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 9: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 10: Manual browser verification (required)**

Using a creator account that has at least one published blog post (create one via `/dashboard/posts/new` if none exists) and `npm run dev` running:
1. Visit that creator's public profile `/creator/<id>` and confirm a "Blog" section (titled "Articles de <FirstName>") renders below the Recipes section and above the App CTA, showing up to 3 post cards.
2. Confirm a public (non-gated) post card shows its title, excerpt, reading time, and category badge, with no cover blur, and that clicking it navigates to `/creator/<id>/blog/<slug>`.
3. If the creator has a `followers`- or `fans`-gated post, confirm its card shows a blurred cover and a "🔒 Contenu réservé" badge, with no excerpt/reading-time, and that it is not a clickable link (visiting while logged out or as a non-qualifying viewer).
4. Confirm the "Voir tous les articles →" link navigates to `/creator/<id>/blog` and that page still works as before (unchanged).
5. Visit the profile of a creator with zero published posts and confirm no "Blog" section renders at all (not even an empty heading).
6. Switch to English (`/en/creator/<id>`) and confirm the section title reads "Articles by <FirstName>" and the link reads "See all articles →".

Expected: all 6 checks pass.

- [ ] **Step 11: Commit**

```bash
git add "app/[locale]/creator/[username]/CreatorProfileClient.tsx" messages/fr.json messages/en.json
git commit -m "feat(creator-profile): show latest blog articles below recipes"
```

---

## After This Plan

Creators can set Instagram/TikTok/YouTube/website links from their profile editor, and those links plus their 3 most recent blog posts (respecting existing follower/fan gating) appear on their public profile page. No further follow-up implied — this closes both parts of the request using entirely pre-existing database columns and blog infrastructure.
