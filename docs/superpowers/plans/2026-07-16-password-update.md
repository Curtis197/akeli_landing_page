# Password Update (forgot-password flow + hardened change-password) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creators can reset a forgotten password by email, and the settings change-password form verifies the current password (with a "set a password" variant for Google-only accounts).

**Architecture:** PKCE recovery flow reusing the existing `/auth/callback` code exchange — a new sanitized `next` query param routes recovery users to a new `/auth/reset-password` page instead of `/dashboard`. A new `/auth/forgot-password` page sends the reset email. The settings password section re-authenticates with `signInWithPassword` before `updateUser` when the account has an email identity.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` / `supabase-js` auth, Tailwind, Vitest (pure helpers only — no component test setup).

**Spec:** `docs/superpowers/specs/2026-07-16-password-update-design.md`

## Global Constraints

- All user-facing copy is hardcoded French (matches login + settings pages; no `useTranslations`). Exact strings are given in each task — use them verbatim.
- Password minimum is **8 characters**, message: « Le nouveau mot de passe doit contenir au moins 8 caractères. »
- No Supabase email-template changes (project shared with the Flutter app).
- Forgot-password success message must be identical whether or not the email exists (anti-enumeration).
- `next` redirect param must only ever accept same-site relative paths (open-redirect guard).
- Form input/button styles are copied from the login page — reuse the exact `className` strings shown in the task code.
- Verification commands: `npx vitest run <file>` for helpers, `npm run build` for pages/routes (repo has no lint script).

---

### Task 1: `sanitizeNextPath` helper (TDD)

**Files:**
- Create: `lib/utils/safe-redirect.ts`
- Test: `lib/utils/safe-redirect.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `sanitizeNextPath(next: string | null): string | null` — returns the input only if it is a safe same-site relative path, otherwise `null`. Task 2 imports it as `import { sanitizeNextPath } from "@/lib/utils/safe-redirect";`.

- [ ] **Step 1: Write the failing test**

Create `lib/utils/safe-redirect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sanitizeNextPath } from "./safe-redirect";

describe("sanitizeNextPath", () => {
  it("accepts a same-site relative path", () => {
    expect(sanitizeNextPath("/fr/auth/reset-password")).toBe("/fr/auth/reset-password");
  });

  it("accepts a relative path with a query string", () => {
    expect(sanitizeNextPath("/fr/dashboard?tab=stats")).toBe("/fr/dashboard?tab=stats");
  });

  it("rejects null and empty values", () => {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com/phish")).toBeNull();
    expect(sanitizeNextPath("http://evil.com")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.com/phish")).toBeNull();
  });

  it("rejects backslash protocol-relative URLs", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBeNull();
  });

  it("rejects paths that do not start with a slash", () => {
    expect(sanitizeNextPath("fr/dashboard")).toBeNull();
    expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/safe-redirect.test.ts`
Expected: FAIL — cannot resolve `./safe-redirect`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/safe-redirect.ts`:

```ts
/** Accept only same-site relative paths ("/...") so the auth callback's
 *  `next` param can't be abused as an open redirect. Browsers treat both
 *  "//host" and "/\host" as protocol-relative URLs, so both are rejected. */
export function sanitizeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/safe-redirect.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/safe-redirect.ts lib/utils/safe-redirect.test.ts
git commit -m "feat: add sanitizeNextPath helper for safe auth redirects"
```

---

### Task 2: Auth callback honors a sanitized `next` param

**Files:**
- Modify: `app/[locale]/auth/callback/route.ts`

**Interfaces:**
- Consumes: `sanitizeNextPath` from Task 1.
- Produces: `GET /{locale}/auth/callback?code=...&next=<relative-path>` redirects to `next` after a successful exchange (and in the already-valid-session retry branch); falls back to `/{locale}/dashboard` exactly as today. Task 3 relies on this URL shape.

- [ ] **Step 1: Add the import and read `next`**

In `app/[locale]/auth/callback/route.ts`, add the import at the top:

```ts
import { sanitizeNextPath } from "@/lib/utils/safe-redirect";
```

Below `const code = searchParams.get("code");` add:

```ts
const next = sanitizeNextPath(searchParams.get("next"));
```

- [ ] **Step 2: Use `next` in both success redirects**

Replace the already-valid-session redirect (inside `if (existingUser) {`):

```ts
return NextResponse.redirect(
  new URL(next ?? `/${locale}/dashboard`, request.url)
);
```

Replace the final success redirect (end of the `if (!error) {` block, after the creator-row bootstrap — the bootstrap logic itself is unchanged):

```ts
return NextResponse.redirect(
  new URL(next ?? `/${locale}/dashboard`, request.url)
);
```

The failure redirect to `/auth/login?error=auth_error` stays untouched.

- [ ] **Step 3: Verify with build and existing tests**

Run: `npm run build`
Expected: build succeeds with no type errors.

Run: `npx vitest run`
Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/auth/callback/route.ts"
git commit -m "feat: auth callback honors sanitized next redirect param"
```

---

### Task 3: Forgot-password page + login link

**Files:**
- Create: `app/[locale]/auth/forgot-password/page.tsx`
- Modify: `app/[locale]/auth/login/page.tsx` (add link after the password field block, around line 154)

**Interfaces:**
- Consumes: callback `next` behaviour from Task 2.
- Produces: page at `/{locale}/auth/forgot-password` that sends a recovery email whose link lands on `/{locale}/auth/callback?next=%2F{locale}%2Fauth%2Freset-password&code=...`. Task 4's page is the destination.

- [ ] **Step 1: Create the forgot-password page**

Create `app/[locale]/auth/forgot-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "fr";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = `${siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(
      `/${locale}/auth/reset-password`
    )}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (resetError) {
      setError("Impossible d'envoyer l'email pour le moment. Réessaye dans quelques minutes.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Reçois un lien par email pour réinitialiser ton mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-foreground">
              Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
              Pense à vérifier tes spams.
            </p>
            <Link
              href="/auth/login"
              className="text-primary text-sm font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add the "Mot de passe oublié ?" link to the login page**

In `app/[locale]/auth/login/page.tsx`, directly after the closing `</div>` of the password field block (the `div.space-y-1.5` containing the `id="password"` input, ends around line 154), insert:

```tsx
<div className="flex justify-end">
  <Link
    href="/auth/forgot-password"
    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
  >
    Mot de passe oublié ?
  </Link>
</div>
```

`Link` is already imported from `@/lib/i18n/navigation` in this file — no import change.

- [ ] **Step 3: Verify with build**

Run: `npm run build`
Expected: build succeeds; the routes list includes `/[locale]/auth/forgot-password`.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/auth/forgot-password/page.tsx" "app/[locale]/auth/login/page.tsx"
git commit -m "feat: forgot-password page and login link"
```

---

### Task 4: Reset-password page

**Files:**
- Create: `app/[locale]/auth/reset-password/page.tsx`

**Interfaces:**
- Consumes: arrives with a session set by the callback (Task 2); linked from recovery emails sent by Task 3.
- Produces: page at `/{locale}/auth/reset-password` — sets the new password for the logged-in user, then redirects to `/dashboard`.

- [ ] **Step 1: Create the reset-password page**

Create `app/[locale]/auth/reset-password/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type PageState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pageState, setPageState] = useState<PageState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link logs the user in via the callback; without a session
  // the link was expired, reused, or the page was visited directly.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setPageState(user ? "ready" : "invalid");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setError(updateError.message ?? "Impossible de modifier le mot de passe.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Choisis un nouveau mot de passe pour ton compte.
          </p>
        </div>

        {pageState === "checking" && (
          <p className="text-center text-sm text-muted-foreground">Vérification du lien…</p>
        )}

        {pageState === "invalid" && (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive font-medium">
              Ce lien est invalide ou a expiré.
            </p>
            <Link
              href="/auth/forgot-password"
              className="text-primary text-sm font-medium hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {pageState === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify with build**

Run: `npm run build`
Expected: build succeeds; the routes list includes `/[locale]/auth/reset-password`.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/auth/reset-password/page.tsx"
git commit -m "feat: reset-password page for recovery-link arrivals"
```

---

### Task 5: Harden settings change-password

**Files:**
- Modify: `app/[locale]/(creator)/settings/page.tsx` (password state ~lines 44-74, section JSX ~lines 260-312)

**Interfaces:**
- Consumes: `useAuthStore()` already exposes `user: User | null` (Supabase `User`, includes `identities`); the page already destructures `reset` and `creator` from it.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Read the current user and identity flag**

Change the store destructure (line 42) to also pull `user`:

```tsx
const { reset, creator, user } = useAuthStore();
```

Below the password state declarations, add the current-password state and the identity flag (defaults to `true` while `user` is still loading, so the stricter form is never skipped by a race):

```tsx
const [currentPassword, setCurrentPassword] = useState("");
const hasEmailIdentity =
  user?.identities?.some((identity) => identity.provider === "email") ?? true;
```

- [ ] **Step 2: Verify the current password in `handleChangePassword`**

Replace the whole `handleChangePassword` function with:

```tsx
async function handleChangePassword(e: React.FormEvent) {
  e.preventDefault();
  if (newPassword.length < 8) {
    setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    return;
  }
  if (newPassword !== confirmPassword) {
    setPasswordError("Les mots de passe ne correspondent pas.");
    return;
  }
  setPasswordLoading(true);
  setPasswordError(null);
  setPasswordSuccess(null);

  if (hasEmailIdentity) {
    if (!user?.email) {
      setPasswordError("Session invalide. Reconnecte-toi puis réessaye.");
      setPasswordLoading(false);
      return;
    }
    // Supabase has no dedicated verify endpoint: re-authenticating is the
    // standard way to check the current password. It refreshes the same
    // user's session, which is harmless.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordError("Mot de passe actuel incorrect.");
      setPasswordLoading(false);
      return;
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    setPasswordError(error.message ?? "Impossible de modifier le mot de passe.");
  } else {
    setPasswordSuccess(
      hasEmailIdentity
        ? "Mot de passe mis à jour avec succès."
        : "Mot de passe défini avec succès. Tu peux maintenant te connecter avec ton email."
    );
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }
  setPasswordLoading(false);
}
```

- [ ] **Step 3: Update the section JSX**

Replace the section heading line:

```tsx
<h2 className="text-base font-semibold text-foreground">
  {hasEmailIdentity ? "Changer le mot de passe" : "Définir un mot de passe"}
</h2>
```

Directly under the heading (before the `<form>`), add the Google-only hint:

```tsx
{!hasEmailIdentity && (
  <p className="text-sm text-muted-foreground">
    Ton compte utilise Google. Définis un mot de passe pour pouvoir aussi te
    connecter avec ton email.
  </p>
)}
```

As the first child of the `<form>` (before the new-password field), add the conditional current-password field:

```tsx
{hasEmailIdentity && (
  <div className="space-y-1.5">
    <label htmlFor="current-password" className="text-sm font-medium text-foreground">
      Mot de passe actuel
    </label>
    <input
      id="current-password"
      type="password"
      required
      autoComplete="current-password"
      value={currentPassword}
      onChange={(e) => setCurrentPassword(e.target.value)}
      placeholder="••••••••"
      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
)}
```

Everything else in the section (new password, confirm, error/success messages, submit button) stays as is.

- [ ] **Step 4: Verify with build and full test suite**

Run: `npm run build`
Expected: build succeeds with no type errors.

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(creator)/settings/page.tsx"
git commit -m "feat: require current password (or set-password variant) in settings"
```

---

### Task 6: Manual end-to-end verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: verified feature; no code.

- [ ] **Step 1: Check the Supabase redirect allowlist**

In the Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, confirm entries covering `http://localhost:3000/**` and `https://a-keli.com/**` exist (they should, from the earlier OAuth setup). If missing, add them. Without this, the reset link degrades gracefully (user lands logged-in on `/dashboard`) but never reaches the reset form.

- [ ] **Step 2: Walk the forgot-password flow locally**

1. `npm run dev`
2. Visit `http://localhost:3000/fr/auth/login` → click « Mot de passe oublié ? ».
3. Submit the email of a real test creator account → generic success message shows.
4. Open the email (Supabase Dashboard → Authentication → Logs if needed) and click the link.
5. Expected: land on `/fr/auth/reset-password` logged in, form visible.
6. Set a new 8+ char password → redirected to `/fr/dashboard`.
7. Log out, log back in with the new password → works.
8. Click the same email link again → login page shows the readable expired-link message (via `proxy.ts` error forwarding) or the reset page shows « Ce lien est invalide ou a expiré. »
9. Visit `/fr/auth/reset-password` directly in a private window → invalid-link state with a link to forgot-password.

- [ ] **Step 3: Walk the settings hardening**

1. As an email+password creator: `/fr/settings` shows « Mot de passe actuel » field; wrong current password → « Mot de passe actuel incorrect. » and the password is unchanged; correct current password → success and the new password works at next login.
2. As a Google-only creator: section is titled « Définir un mot de passe », no current-password field, hint text visible; setting a password succeeds and email+password login now works for that account.

- [ ] **Step 4: Update the spec status**

In `docs/superpowers/specs/2026-07-16-password-update-design.md`, change `**Status:**` to `Implemented — 2026-07-16` (adjust date), then:

```bash
git add docs/superpowers/specs/2026-07-16-password-update-design.md
git commit -m "docs: mark password update spec as implemented"
```
