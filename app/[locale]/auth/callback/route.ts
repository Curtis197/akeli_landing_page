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

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
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

    if (error) {
      // If the session is already valid (e.g. browser retry), go to dashboard.
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();
      if (existingUser) {
        return NextResponse.redirect(
          new URL(`/${locale}/dashboard`, request.url)
        );
      }
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
