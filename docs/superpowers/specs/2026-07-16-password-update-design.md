# Password Update (forgot-password flow + hardened change-password) — Design Spec

**Date:** 2026-07-16
**Author:** Curtis — Founder Akeli
**Status:** Validated — ready for implementation planning

---

## 1. Context & problem

Creators sign in at `/auth/login` with email+password or Google OAuth. Two gaps exist around passwords:

1. **No forgot-password flow.** The login page has no "Mot de passe oublié ?" link and no reset page exists. Worse, the plumbing half-exists: `proxy.ts` already forwards Supabase auth-email links (`/?code=<pkce>`) to `/auth/callback`, but the callback always redirects to `/dashboard` — a creator clicking a recovery link would land logged-in on the dashboard with no way to actually set a new password from that flow.
2. **Change-password is not verified.** `settings/page.tsx`'s "Changer le mot de passe" section calls `supabase.auth.updateUser({ password })` with no current-password check — anyone at an unlocked machine can silently take over the account.

The visitor/fan system has its own reset edge functions (`visitor-request-reset`, `visitor-reset-password`); those are unrelated (visitors are not Supabase Auth users) and out of scope.

---

## 2. Scope

**In scope:**
- "Mot de passe oublié ?" link on the login page.
- New page `/auth/forgot-password` — request a reset email via `supabase.auth.resetPasswordForEmail`.
- New page `/auth/reset-password` — set a new password after arriving via the recovery link.
- `auth/callback/route.ts` learns an optional, sanitized `next` redirect param.
- Settings "Changer le mot de passe": require the current password (verified via `signInWithPassword`) when the account has an email identity; Google-only accounts get a "set a password" variant instead.

**Explicitly out of scope:**
- No visitor/fan reset UI (mobile app consumes those edge functions).
- No Supabase email-template changes — the project is shared with the Flutter app; the default recovery template's PKCE `?code=` link is used as-is.
- No i18n — the login and settings pages are hardcoded French today; new UI matches that local convention.
- No password-strength rules beyond the existing 8-character minimum used in settings.

---

## 3. Approach

**Chosen: PKCE code flow reusing the existing callback.** The default Supabase recovery email produces a link that ends at our site with `?code=<pkce>`. The existing callback already exchanges that code for a session; we only need to route recovery users to a reset form instead of the dashboard, via a `next` param on the callback URL.

Rejected alternatives:
- **`token_hash` + `verifyOtp` confirm route** (Supabase's SSR docs pattern): requires editing the recovery email template in the shared Supabase project, risking the Flutter app's reset flow.
- **Custom edge function** (visitor-system style): unnecessary — creators are real Supabase Auth users.

---

## 4. Flow details

### 4.1 Forgot-password page (`app/[locale]/auth/forgot-password/page.tsx`)

Client component styled like the login page. Single email field. Submit calls:

```ts
supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: `${siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/reset-password`)}`,
});
```

Regardless of whether the email exists, the page shows the same success state: « Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. » (prevents account enumeration). Errors from Supabase (e.g. rate limiting) show a generic retry message.

### 4.2 Callback `next` param (`app/[locale]/auth/callback/route.ts`)

After a successful `exchangeCodeForSession`, read `searchParams.get("next")`. If it is a same-site relative path (starts with `/`, does not start with `//`), redirect there; otherwise fall back to `/dashboard` exactly as today. The creator-row bootstrap logic runs unchanged. The "session already valid" retry branch also honors `next`.

### 4.3 Reset-password page (`app/[locale]/auth/reset-password/page.tsx`)

Client component. On mount, checks `supabase.auth.getUser()`:
- **Recovery session present** (normal case — the recovery link logged them in): the session's authentication methods (Supabase AMR) must include a `recovery`/`otp`/`magiclink` entry less than 15 minutes old. Then show new password + confirm fields (min 8 chars, same rule and styles as settings). Submit calls `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.
- **Any other logged-in session** (e.g. someone at an unlocked machine visiting directly): treated the same as no session — the invalid-link state. Changing a password from an ordinary session goes through the settings page, which verifies the current password.
- **No session** (expired/reused link, direct visit): show « Ce lien est invalide ou a expiré » with a link to `/auth/forgot-password`.

Expired-link error params from Supabase (`otp_expired`, `flow_state_expired`…) never reach this page — `proxy.ts` already reroutes `?error_code=` to the login page with a readable message.

`/auth/*` paths are not in `proxy.ts`'s `CREATOR_PATHS`, so no guard change is needed.

### 4.4 Settings change-password hardening (`app/[locale]/(creator)/settings/page.tsx`)

The account's identities decide the form variant (`user.identities` from `supabase.auth.getUser()`):

- **Has an `email` identity:** a « Mot de passe actuel » field is shown above the existing fields. On submit, verify it first with `signInWithPassword({ email: user.email, password: currentPassword })`; on failure show « Mot de passe actuel incorrect. » and change nothing. On success, proceed with `updateUser` as today. (The re-auth just refreshes the same user's session — harmless side effect.)
- **Google-only (no `email` identity):** no current-password field; the section is titled « Définir un mot de passe » with a hint that this enables email+password login alongside Google.

All existing client-side checks (min 8 chars, confirm match) stay.

---

## 5. Configuration & degradation

- **Supabase Redirect URLs allowlist** must cover the callback URL with its query string (the existing `/**` wildcard entries on a-keli.com and localhost cover this — verify at deploy).
- **Graceful degradation:** if the `redirectTo` is not allowlisted, Supabase falls back to the Site URL — the user lands as `/?code=`, which `proxy.ts` forwards to the callback without `next`, so they end up logged-in on `/dashboard` and can still change the password in settings. No lockout path.

---

## 6. Error handling summary

| Case | Behaviour |
|---|---|
| Email not registered | Same generic success message (no enumeration) |
| Reset email rate-limited | Generic « réessaye dans quelques minutes » error |
| Recovery link expired / reused | `proxy.ts` → login page with readable message; direct visit to reset page without session → invalid-link state |
| Logged-in visit without a recent recovery session | Invalid-link state — use settings instead |
| Wrong current password in settings | « Mot de passe actuel incorrect. », no change |
| New password < 8 chars or mismatch | Existing inline validation |

---

## 7. Testing

- Unit-testable pure helper: `next`-param sanitizer (relative-path check) if extracted; otherwise covered by route-level manual tests.
- Manual E2E: request reset → receive email → link lands on reset page logged-in → new password works at login; expired link shows readable message; wrong current password blocked in settings; Google-only account sees "set a password" variant and gains email login after setting one.
