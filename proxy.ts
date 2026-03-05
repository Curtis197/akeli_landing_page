import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication (creator space)
const PROTECTED_PATHS = [
  "/dashboard",
  "/profile",
  "/chat",
  "/fan-mode",
  "/settings",
];

// Auth pages — redirect to dashboard if already logged in
const AUTH_PATHS = ["/auth/login", "/auth/signup"];

function isProtectedPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";
  return PROTECTED_PATHS.some((p) => withoutLocale.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";
  return AUTH_PATHS.some((p) => withoutLocale.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedPath(pathname) && !user) {
    const locale = pathname.match(/^\/(fr|en)/)?.[1] ?? "fr";
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath(pathname) && user) {
    const locale = pathname.match(/^\/(fr|en)/)?.[1] ?? "fr";
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Apply i18n routing
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
    return intlResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
