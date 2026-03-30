import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const CREATOR_PATHS = [
  "/dashboard",
  "/chat",
  "/profile",
  "/fan-mode",
  "/settings",
];

const intlMiddleware = createIntlMiddleware(routing);

/** Cookie-only session check — safe for Edge runtime (no @supabase/ssr). */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to get the actual path
  const pathWithoutLocale = pathname.replace(/^\/(fr|en|ar)(\/|$)/, "/") || "/";

  // Auth guard: redirect unauthenticated users away from creator routes
  const isCreatorRoute = CREATOR_PATHS.some((p) =>
    pathWithoutLocale.startsWith(p)
  );
  if (!hasSupabaseSession(request) && isCreatorRoute) {
    const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/ar") ? "ar" : "fr";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Let next-intl handle locale detection, prefix redirects, and header injection
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|avif)).*)"],
};
