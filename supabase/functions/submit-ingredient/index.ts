// ============================================================
// Edge Function: submit-ingredient
// Called by an authenticated creator to submit a new ingredient.
//
// What it does:
//   1. Verifies the caller is authenticated
//   2. Inserts the ingredient with status "pending" (service role)
//   3. Inserts the ingredient_submission record linking creator + ingredient
//   4. Returns { id, name } so the creator can add it to their recipe immediately
//
// POST /functions/v1/submit-ingredient
// Body: { name, name_fr?, name_en?, category?, notes? }
// Auth: anon key + user JWT (Authorization header)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User client — to verify the JWT and get the user id
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client — to bypass RLS for ingredient insert
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { name, name_fr, name_en, category, notes } = body;

    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nom invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Insert the ingredient (status: pending — will be validated by admin)
    // category is intentionally omitted here: it's a FK to ingredient_category.code
    // and the admin will set the correct code when validating the submission.
    // The creator's hint is stored in ingredient_submission.category_hint.
    const { data: ingredient, error: ingErr } = await adminClient
      .from("ingredient")
      .insert({
        name:    name.trim(),
        name_fr: name_fr?.trim() || name.trim(),
        name_en: name_en?.trim() || null,
        status:  "pending",
      })
      .select("id, name, name_fr")
      .single();

    if (ingErr || !ingredient) {
      return new Response(JSON.stringify({ error: ingErr?.message ?? "Erreur insertion ingrédient" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Insert the submission record (audit trail + admin review queue)
    await adminClient.from("ingredient_submission").insert({
      submitted_by:  user.id,
      name:          name.trim(),
      name_fr:       name_fr?.trim() || null,
      name_en:       name_en?.trim() || null,
      category_hint: category || null,
      notes:         notes?.trim() || null,
      ingredient_id: ingredient.id,
      status:        "pending",
    });

    return new Response(
      JSON.stringify({ id: ingredient.id, name: ingredient.name_fr ?? ingredient.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
