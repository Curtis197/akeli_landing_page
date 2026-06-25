import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const handleIntl = createIntlMiddleware(routing);

// Paths (without locale prefix) that require an authenticated creator session.
const PROTECTED_PATHS = [
  "/dashboard",
  "/recipes/new",
  "/profile",
  "/chat",
  "/fan-mode",
  "/settings",
  "/help",
];

export async function middleware(request: NextRequest) {
  // Supabase redirects auth errors (e.g. flow_state_already_used) to the site
  // URL with ?error=...&error_code=... query params. Catch them here and send
  // the user to the login page with a descriptive error instead of leaving
  // them on the landing page with a raw error URL.
  const errorCode = request.nextUrl.searchParams.get("error_code");
  if (errorCode && request.nextUrl.searchParams.get("error")) {
    const localeMatch = request.nextUrl.pathname.match(/^\/(fr|en)(\/.*)?$/);
    const locale = localeMatch?.[1] ?? "fr";
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=${errorCode}`, request.url)
    );
  }

  // Let next-intl handle locale-prefix redirects (e.g. / → /fr/).
  const intlResponse = handleIntl(request);
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  // Refresh Supabase session cookie on every request so Server Components
  // can read the authenticated user.
  const { supabaseResponse, user } = await updateSession(request);

  // Auth guard: redirect unauthenticated users away from creator-only pages.
  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(/^\/(fr|en)(\/.*)?$/);
  const pathWithoutLocale = localeMatch?.[2] ?? "/";

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const locale = localeMatch?.[1] ?? "fr";
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login`, request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  // Skip Next.js internals and all static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
