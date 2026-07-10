import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, calorie_goal, protein_g, carb_g, fat_g, region, target_weight_kg, remaining_weeks, session_id } = body;

    if (!email || !calorie_goal || !protein_g || !carb_g || !fat_g) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create Supabase client using the secret key (sb_secret_*) to bypass RLS.
    //    Les clés legacy (service_role JWT) sont désactivées depuis le 2026-06-23.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error("[onboarding-lead] SUPABASE_SECRET_KEY is missing from environment variables.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Insert into onboarding_lead table
    const { error: insertError } = await supabase
      .from("onboarding_lead")
      .insert({
        email,
        region,
        calorie_goal: Number(calorie_goal),
        protein_g: Number(protein_g),
        carb_g: Number(carb_g),
        fat_g: Number(fat_g),
        target_weight_kg: target_weight_kg ? Number(target_weight_kg) : null,
        remaining_weeks: remaining_weeks ? Number(remaining_weeks) : null,
        session_id: typeof session_id === "string" && session_id ? session_id : null,
      });

    if (insertError) {
      console.error("[onboarding-lead] Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }

    // 3. Send email using Resend if API key is present
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      try {
        const testflightLink = process.env.TESTFLIGHT_PUBLIC_LINK;
        const playLink = process.env.PLAY_OPTIN_LINK;

        const accessBlock = (testflightLink || playLink)
          ? `
            <p><strong>Votre accès anticipé est prêt.</strong> Installez l'app dès maintenant et faites partie des premiers — vos retours façonneront la suite :</p>
            <div style="text-align: center; margin: 24px 0;">
              ${testflightLink ? `<a href="${testflightLink}" style="background: #1c2b1c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 4px;">Accès anticipé iPhone</a>` : ""}
              ${playLink ? `<a href="${playLink}" style="background: #3bb78f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 4px;">Accès anticipé Android</a>` : ""}
            </div>`
          : `
            <p><strong>Vous êtes sur la liste d'accès anticipé.</strong> L'app Akeli arrive très bientôt sur iOS et Android — vous serez parmi les premiers à la recevoir, avec vos recettes adaptées à ce bilan.</p>`;

        await resend.emails.send({
          from: "Akeli Nutrition <onboarding@a-keli.com>",
          to: email,
          subject: "Votre bilan nutritionnel Akeli + votre accès anticipé",
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #1c2b1c; margin-bottom: 20px; text-align: center;">Votre bilan personnalisé 🎉</h2>
              <p>Bonjour,</p>
              <p>Voici le bilan de votre analyse nutritionnelle gratuite effectuée sur le site d'Akeli :</p>

              <div style="background: #f7f2ea; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3bb78f;">
                <p style="margin: 5px 0;"><strong>Objectif Calorique :</strong> ${calorie_goal} kcal / jour</p>
                <p style="margin: 5px 0;"><strong>Protéines :</strong> ${protein_g}g</p>
                <p style="margin: 5px 0;"><strong>Glucides :</strong> ${carb_g}g</p>
                <p style="margin: 5px 0;"><strong>Lipides :</strong> ${fat_g}g</p>
              </div>

              ${accessBlock}

              <p style="font-size: 12px; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                Cet e-mail vous a été envoyé automatiquement suite à votre demande d'analyse gratuite sur le site a-keli.com.
              </p>
            </div>
          `
        });
      } catch (emailError: any) {
        console.error("[onboarding-lead] Failed to send email via Resend:", emailError);
        // Do not fail the HTTP request if email sending failed but DB insert was successful
      }
    } else {
      console.warn("[onboarding-lead] RESEND_API_KEY is not configured. Skipping email dispatch.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[onboarding-lead] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
