import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const CREATOR_PATHS = [
  "/dashboard",
  "/chat",
  "/profile",
  "/fan-mode",
  "/settings",
  "/recipes/new",
  "/help",
];

const intlMiddleware = createIntlMiddleware(routing);

/** Cookie-only session check — safe for Edge runtime (no @supabase/ssr).
 *  Matches both the plain cookie (sb-*-auth-token) and the chunked format
 *  written by @supabase/ssr (sb-*-auth-token.0, .1, …). */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) =>
    /^sb-.+-auth-token(\.\d+)?$/.test(c.name)
  );
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase redirects auth errors (flow_state_already_used, otp_expired, etc.)
  // to the site URL with ?error=...&error_code=... params. Forward the user to
  // the login page with the error code so they get a readable message.
  const errorCode = searchParams.get("error_code");
  if (errorCode && searchParams.get("error")) {
    const locale = pathname.startsWith("/en") ? "en" : "fr";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.search = `?error=${errorCode}`;
    return NextResponse.redirect(url);
  }

  // Supabase auth emails (magic links, invites, password resets) use the site
  // URL as the redirect base, landing as /?code=<pkce-code>. Forward the code
  // to the callback route so it can be exchanged for a session.
  const code = searchParams.get("code");
  if (code && (pathname === "/" || pathname === "/fr" || pathname === "/en")) {
    const locale = pathname.startsWith("/en") ? "en" : "fr";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/callback`;
    url.search = `?code=${code}`;
    return NextResponse.redirect(url);
  }

  // Strip locale prefix to get the actual path
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)(\/|$)/, "/") || "/";

  // Auth guard: redirect unauthenticated users away from creator routes
  const isCreatorRoute = CREATOR_PATHS.some((p) =>
    pathWithoutLocale.startsWith(p)
  );
  if (!hasSupabaseSession(request) && isCreatorRoute) {
    const locale = pathname.startsWith("/en") ? "en" : "fr";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Let next-intl handle locale detection, prefix redirects, and header injection
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|avif|html|css|js|txt|woff|woff2)).*)"],
};
