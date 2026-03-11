import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";

const CREATOR_PATHS = [
  "/dashboard",
  "/chat",
  "/profile",
  "/fan-mode",
  "/settings",
  "/recipes",
];

const intlMiddleware = createMiddleware(routing);

/** Cookie-only session check — safe for Edge runtime (no @supabase/ssr). */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Strip locale prefix to get the actual path
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";

  // Auth guard: redirect unauthenticated users away from creator routes
  const isCreatorRoute = CREATOR_PATHS.some((p) =>
    pathWithoutLocale.startsWith(p)
  );
  if (!hasSupabaseSession(request) && isCreatorRoute) {
    const loginUrl = new URL(
      `/auth/login?redirect=${encodeURIComponent(pathname)}`,
      request.url
    );
    return NextResponse.redirect(loginUrl);
  }

  // Let next-intl handle locale detection and routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
