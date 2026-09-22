import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Deliberately simple: no whitespace, angle brackets or quotes, and an "@" followed by a dotted domain.
const EMAIL_PATTERN = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, platform } = body;

    if (typeof email !== "string" || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    if (platform !== "ios" && platform !== "android") {
      return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error("[beta-signup] SUPABASE_SECRET_KEY is missing from environment variables.");
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existing, error: lookupError } = await supabase
      .from("beta_tester")
      .select("id")
      .eq("email", normalizedEmail)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (lookupError) {
      console.error("[beta-signup] Lookup error:", lookupError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "already_signed_up" }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from("beta_tester")
      .insert({ email: normalizedEmail, platform, status: "pending" });

    if (insertError) {
      console.error("[beta-signup] Database insert error:", insertError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[beta-signup] Unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
