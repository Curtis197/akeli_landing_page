# Dashboard Blog Nav Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-built creator post management page (`/dashboard/posts`) reachable from the creator dashboard's own navigation, which currently has no entry for it at all.

**Architecture:** One new entry in the `navItems` array already driving both the desktop sidebar and the mobile hamburger menu in `app/[locale]/(creator)/layout.tsx`, plus the one new i18n key it needs.

**Tech Stack:** Next.js App Router, next-intl.

**Spec:** `docs/superpowers/specs/2026-07-18-dashboard-blog-nav-link-design.md`

## Global Constraints

- No changes to the existing `/dashboard/posts` page itself, or to any other route — this is purely a navigation-discoverability fix.
- Follow this layout file's own existing i18n convention (`useTranslations("nav")`, already in use for `myRecipes`/`payments`/`chat`/etc.) — do NOT hardcode the new label, even though the post editor's own internal pages are deliberately hardcoded-French (a different, established convention for a different part of the app).
- New key name: `nav.myPosts` — `"Mes Articles"` (fr, matching the existing page's own `<h1>Mes Articles</h1>`) / `"My Posts"` (en). Do NOT reuse the existing `nav.blog` key (`"Blog"`/`"Blog"`, added for the public global navbar) — it would read inconsistently next to `"Mes Recettes"` in this sidebar's `"My X"` naming pattern.
- Position: immediately after the existing `{ label: t("myRecipes"), href: "/dashboard/recipes" }` entry.

---

## File Structure

```
messages/fr.json, messages/en.json      — new "nav.myPosts" key
app/[locale]/(creator)/layout.tsx        — add one navItems entry
```

---

### Task 1: Add the dashboard blog nav link

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`
- Modify: `app/[locale]/(creator)/layout.tsx`

**Interfaces:**
- Consumes: nothing new from elsewhere in the codebase.
- Produces: nothing consumed by later tasks — this is the only task in this plan.

- [ ] **Step 1: Add `nav.myPosts` to `messages/fr.json`**

Find the existing `"nav": { ... }` object (it already has `myRecipes`, `payments`, `chat`, `profile`, `fanMode`, `settings`, `help`, `logout`, `blog`, etc.) and add this key alongside them:

```json
"myPosts": "Mes Articles"
```

- [ ] **Step 2: Add the equivalent key to `messages/en.json`**

In the same `"nav"` object:

```json
"myPosts": "My Posts"
```

- [ ] **Step 3: Verify both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Add the nav entry in `app/[locale]/(creator)/layout.tsx`**

Find:

```typescript
  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: t("myRecipes"), href: "/dashboard/recipes" },
    { label: t("payments"), href: "/dashboard/payments" },
    { label: t("chat"), href: "/chat" },
    { label: t("profile"), href: "/profile" },
    { label: t("fanMode"), href: "/fan-mode" },
    { label: t("settings"), href: "/settings" },
    { label: t("help"), href: "/help" },
  ];
```

Replace with:

```typescript
  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: t("myRecipes"), href: "/dashboard/recipes" },
    { label: t("myPosts"), href: "/dashboard/posts" },
    { label: t("payments"), href: "/dashboard/payments" },
    { label: t("chat"), href: "/chat" },
    { label: t("profile"), href: "/profile" },
    { label: t("fanMode"), href: "/fan-mode" },
    { label: t("settings"), href: "/settings" },
    { label: t("help"), href: "/help" },
  ];
```

This single array already feeds both the desktop `<aside>` sidebar (`.map()` over `navItems` later in the same file) and `<CreatorMobileNav items={navItems} ... />` — no other file needs to change.

- [ ] **Step 5: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual browser verification (required)**

Run: `npm run dev` (if not already running), log in as any creator account, then in a browser:
1. On the desktop sidebar, confirm "Mes Articles" appears between "Mes Recettes" and "Paiements".
2. Click it and confirm it navigates to `/fr/dashboard/posts` and the existing posts list page renders correctly (already-built page — this is only confirming the link target, not re-testing that page's own functionality).
3. Confirm the active-state highlight (the `isActive` styling already present in the file) applies to "Mes Articles" while on `/dashboard/posts` or any of its sub-routes (`/dashboard/posts/new`, `/dashboard/posts/[id]/edit`) — the existing `isActive` check is `pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))`, so it should also highlight correctly on the `new`/`edit` sub-pages, not just the exact list page.
4. Shrink the viewport to mobile width, open the hamburger menu via `CreatorMobileNav`, and confirm "Mes Articles" appears there too, in the same position, and also navigates correctly.
5. Switch the site to English (`/en/...`) and confirm the label reads "My Posts" in both desktop and mobile nav.

Expected: all 5 checks pass.

- [ ] **Step 7: Commit**

```bash
git add messages/fr.json messages/en.json "app/[locale]/(creator)/layout.tsx"
git commit -m "feat(dashboard): add missing nav link to the creator post management page"
```

---

## After This Plan

Creators can now actually find their blog post list from within the dashboard itself — the page has existed and worked since an earlier phase, but had zero discoverable entry point until now. No further follow-up implied by this plan.
