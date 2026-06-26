import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const verifierCookie = allCookies.find((c) =>
      c.name.includes("code-verifier")
    );
    console.log("[callback] code received:", code.slice(0, 8) + "...");
    console.log("[callback] cookies present:", allCookies.map((c) => c.name).join(", ") || "NONE");
    console.log("[callback] verifier cookie:", verifierCookie ? verifierCookie.name : "MISSING");
    console.log("[callback] request URL:", request.url);
    console.log("[callback] SUPABASE_URL set:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[callback] exchangeCodeForSession error:", error ? JSON.stringify({ code: error.code, message: error.message, status: error.status }) : "null (success)");

    if (error) {
      // If the session is already valid (e.g. browser retry), go to dashboard.
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();
      if (existingUser) {
        console.log("[callback] existing session found → redirecting to dashboard");
        return NextResponse.redirect(
          new URL(`/${locale}/dashboard`, request.url)
        );
      }
      const errCode = encodeURIComponent(error.code ?? error.message ?? "unknown");
      console.log("[callback] no session, redirecting to login with debug:", errCode);
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login?error=auth_error&debug=${errCode}`, request.url)
      );
    }

    if (!error) {
      // Ensure a creator row exists for first-time OAuth users.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existing } = await supabase
          .from("creator")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          const displayName =
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "";
          await supabase.from("creator").insert({
            user_id: user.id,
            display_name: displayName,
          });
        }
      }

      return NextResponse.redirect(
        new URL(`/${locale}/dashboard`, request.url)
      );
    }
  }

  // No code or exchange failed — back to login with an error hint.
  return NextResponse.redirect(
    new URL(`/${locale}/auth/login?error=auth_error`, request.url)
  );
}
