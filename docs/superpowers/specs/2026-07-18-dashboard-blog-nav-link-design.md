# Dashboard Blog Nav Link — Design

## Overview

The creator-facing post management page (`/dashboard/posts` — list with status filters/search, publish/unpublish, delete, edit; `/dashboard/posts/new`; `/dashboard/posts/[id]/edit`) was fully built in an earlier phase and works correctly, but has zero entry point anywhere in the creator dashboard's own navigation. A creator can only reach it by typing the URL directly. This spec covers closing that one gap — no redesign of the existing page.

## Change

Add one entry to the `navItems` array in `app/[locale]/(creator)/layout.tsx`:

```typescript
{ label: t("myPosts"), href: "/dashboard/posts" }
```

Positioned immediately after the existing `{ label: t("myRecipes"), href: "/dashboard/recipes" }` entry — blog posts are a parallel content type to recipes, so they sit next to each other in the list (Dashboard → My Recipes → My Posts → Payments → Chat → Profile → Fan Mode → Settings → Help).

## i18n

This layout file already uses the `nav` i18n namespace for its sidebar labels (`t("myRecipes")`, `t("payments")`, `t("chat")`, etc.) — confirmed by reading the current file — even though the post editor's own internal content is hardcoded French (an established, deliberate convention from an earlier phase). The nav link follows the sidebar's existing i18n convention, not the editor's hardcoded-string one.

New key `nav.myPosts`, added to both `messages/fr.json` and `messages/en.json`:
- fr: `"Mes Articles"` — matches the existing page's own `<h1>Mes Articles</h1>` exactly.
- en: `"My Posts"`

Not reusing the existing `nav.blog` key (added earlier for the public global navbar, value `"Blog"`/`"Blog"`) — that generic label would read inconsistently next to `"Mes Recettes"` in this specific sidebar, which uses the `"My X"` pattern for every content-management entry.

## Scope

One array entry in one file, one new i18n key pair. Both the desktop sidebar and the mobile hamburger menu (`components/layout/CreatorMobileNav.tsx`) render off the same `navItems` array — confirmed by reading `layout.tsx` — so this single change covers both surfaces, no separate mobile-nav edit needed.

No changes to the existing `/dashboard/posts` page itself, no changes to any other route.
