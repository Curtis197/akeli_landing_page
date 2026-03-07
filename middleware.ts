import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const CREATOR_PATHS = ["/dashboard", "/chat", "/profile", "/fan-mode", "/settings"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Strip locale prefix to get the actual path
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";

  // Auth guard: redirect unauthenticated users away from creator routes
  const isCreatorRoute = CREATOR_PATHS.some((p) => pathWithoutLocale.startsWith(p));
  if (!user && isCreatorRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // Run i18n middleware
  const intlResponse = intlMiddleware(request);

  // Forward Supabase auth cookies to the i18n response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
