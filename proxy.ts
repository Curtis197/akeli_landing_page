import { type NextRequest, NextResponse } from "next/server";

const LOCALES = ["fr", "en", "ar"] as const;
const DEFAULT_LOCALE = "fr";

const CREATOR_PATHS = [
  "/dashboard",
  "/chat",
  "/profile",
  "/fan-mode",
  "/settings",
];

/** Cookie-only session check — safe for Edge runtime (no @supabase/ssr). */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detect if path already has a locale prefix
  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  // If no locale prefix, redirect to default locale
  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Strip locale prefix to get the actual path
  const pathWithoutLocale = pathname.replace(/^\/(fr|en|ar)/, "") || "/";

  // Auth guard: redirect unauthenticated users away from creator routes
  const isCreatorRoute = CREATOR_PATHS.some((p) =>
    pathWithoutLocale.startsWith(p)
  );
  if (!hasSupabaseSession(request) && isCreatorRoute) {
    const url = request.nextUrl.clone();
    const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/ar") ? "ar" : DEFAULT_LOCALE;
    url.pathname = `/${locale}/auth/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|avif)).*)"],
};
