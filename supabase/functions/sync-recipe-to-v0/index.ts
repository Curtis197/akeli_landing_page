// ============================================================================
// AKELI V1 — Edge Function : sync-recipe-to-v0
// ============================================================================
// Date       : Mars 2026
// Auteur     : Curtis — Fondateur Akeli
// Projet     : Akeli V1 (njzqcftjzskwcpforwzf)
// Description: Synchronise une recette publiée depuis la base V1
//              vers la base V0 (Soya - African Health).
//
// Déclenchement : Trigger PostgreSQL sur recipe (is_published = true)
//
// Flux :
//   1. Récupère la recette complète depuis V1
//   2. Résout le creator_id V0 via l'email (mapping cross-auth)
//   3. Si créateur absent en V0 → le crée automatiquement
//   4. INSERT ou UPDATE dans V0 selon v1_recipe_id
//   5. Synchronise steps, ingredients, macros, images, tags
//      → Les titres de section (is_section_header = true) sont mappés
//        vers le pattern V0 (title: true, text: titre, quantity: null)
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseV1 = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const supabaseV0 = createClient(Deno.env.get("V0_SUPABASE_URL"), Deno.env.get("V0_SUPABASE_SERVICE_KEY"));
// ─── Handler principal ───────────────────────────────────────────────────────
Deno.serve(async (req)=>{
  try {
    const { recipe_id, event } = await req.json();
    if (!recipe_id) {
      return response({
        error: "Missing recipe_id"
      }, 400);
    }
    console.log(`[sync-recipe-to-v0] event=${event} recipe_id=${recipe_id}`);
    const recipe = await fetchRecipeV1(recipe_id);
    if (!recipe) return response({
      error: "Recipe not found in V1"
    }, 404);
    const creatorV0Id = await resolveOrCreateCreatorV0(recipe.creator_id);
    if (!creatorV0Id) return response({
      error: "Could not resolve creator in V0"
    }, 500);
    const receipeV0Id = await upsertReceipeV0(recipe, creatorV0Id);
    if (!receipeV0Id) return response({
      error: "Failed to upsert receipe in V0"
    }, 500);
    await Promise.all([
      syncSteps(recipe_id, receipeV0Id),
      syncIngredients(recipe_id, receipeV0Id),
      syncMacros(recipe_id, receipeV0Id),
      syncImages(recipe_id, receipeV0Id, recipe.cover_image_url),
      syncTags(recipe_id, receipeV0Id)
    ]);
    console.log(`[sync-recipe-to-v0] SUCCESS receipe_v0_id=${receipeV0Id}`);
    return response({
      ok: true,
      receipe_v0_id: receipeV0Id
    });
  } catch (err) {
    console.error("[sync-recipe-to-v0] ERROR", err);
    return response({
      error: String(err)
    }, 500);
  }
});
// ─── 1. Fetch recette V1 ─────────────────────────────────────────────────────
async function fetchRecipeV1(recipeId) {
  const { data, error } = await supabaseV1.from("recipe").select(`
      id, title, description, region, difficulty,
      prep_time_min, cook_time_min, servings,
      is_pork_free, cover_image_url, language,
      creator_id
    `).eq("id", recipeId).single();
  if (error) {
    console.error("[fetchRecipeV1]", error);
    return null;
  }
  return data;
}
// ─── 2. Résoudre ou créer le créateur dans V0 ────────────────────────────────
async function resolveOrCreateCreatorV0(creatorIdV1) {
  const { data: creatorV1, error: errV1 } = await supabaseV1.from("creator").select("user_id, display_name, bio, profile_image_url").eq("id", creatorIdV1).single();
  if (errV1 || !creatorV1) {
    console.error("[resolveOrCreateCreatorV0] creator not found in V1", errV1);
    return null;
  }
  const { data: authUserV1, error: errAuth } = await supabaseV1.auth.admin.getUserById(creatorV1.user_id);
  if (errAuth || !authUserV1?.user?.email) {
    console.error("[resolveOrCreateCreatorV0] auth user not found", errAuth);
    return null;
  }
  const email = authUserV1.user.email;
  const { data: authUsersV0 } = await supabaseV0.auth.admin.listUsers();
  const authUserV0 = authUsersV0?.users?.find((u)=>u.email === email);
  if (!authUserV0) {
    console.warn(`[resolveOrCreateCreatorV0] not found in V0 for email=${email}, creating orphan`);
    return await createOrphanCreatorV0(creatorV1.display_name, email, creatorV1.bio, creatorV1.profile_image_url);
  }
  const { data: usersV0 } = await supabaseV0.from("users").select("id").eq("user_id", authUserV0.id).single();
  if (!usersV0) {
    return await createOrphanCreatorV0(creatorV1.display_name, email, creatorV1.bio, creatorV1.profile_image_url);
  }
  const { data: creatorV0 } = await supabaseV0.from("creator").select("id").eq("user_id", usersV0.id).single();
  if (creatorV0) return creatorV0.id;
  return await createCreatorV0(usersV0.id, authUserV0.id, creatorV1.display_name, creatorV1.bio, creatorV1.profile_image_url);
}
async function createCreatorV0(userId, authId, name, bio, profilUrl) {
  const { data, error } = await supabaseV0.from("creator").insert({
    user_id: userId,
    auth_id: authId,
    name,
    bio: bio ?? "",
    profil_url: profilUrl
  }).select("id").single();
  if (error) {
    console.error("[createCreatorV0]", error);
    return null;
  }
  return data.id;
}
async function createOrphanCreatorV0(name, email, bio, profilUrl) {
  const { data, error } = await supabaseV0.from("creator").insert({
    name,
    bio: bio ?? "",
    profil_url: profilUrl,
    description: `Imported from V1 (email: ${email})`
  }).select("id").single();
  if (error) {
    console.error("[createOrphanCreatorV0]", error);
    return null;
  }
  return data.id;
}
// ─── 3. Upsert receipe dans V0 ───────────────────────────────────────────────
async function upsertReceipeV0(recipe, creatorV0Id) {
  const { data: existing } = await supabaseV0.from("receipe").select("id").eq("v1_recipe_id", recipe.id).single();
  const payload = {
    name: recipe.title,
    description: recipe.description ?? "",
    "Food Region": recipe.region ?? null,
    difficulty: recipe.difficulty ?? null,
    "sans porc": recipe.is_pork_free ?? false,
    creator_id: creatorV0Id,
    is_published: true,
    free: false,
    time_of_cooking_min: recipe.prep_time_min ?? null,
    time_of_cooking_hour: recipe.cook_time_min ? Math.floor(recipe.cook_time_min / 60) : null,
    v1_recipe_id: recipe.id
  };
  if (existing) {
    const { data, error } = await supabaseV0.from("receipe").update(payload).eq("id", existing.id).select("id").single();
    if (error) {
      console.error("[upsertReceipeV0 UPDATE]", error);
      return null;
    }
    return data.id;
  } else {
    const { data, error } = await supabaseV0.from("receipe").insert(payload).select("id").single();
    if (error) {
      console.error("[upsertReceipeV0 INSERT]", error);
      return null;
    }
    return data.id;
  }
}
// ─── 4a. Sync steps ──────────────────────────────────────────────────────────
// Mapping V1 → V0 :
//   is_section_header = true  → step V0 avec title: true, text: step.title
//                                (titre de section affiché dans l'app)
//   is_section_header = false → step V0 normal avec title: false
//                                text = "[titre]\n[contenu]" si titre présent
async function syncSteps(recipeIdV1, receipeIdV0) {
  const { data: steps } = await supabaseV1.from("recipe_step").select("step_number, title, content, is_section_header").eq("recipe_id", recipeIdV1).order("step_number");
  if (!steps?.length) return;
  await supabaseV0.from("step").delete().eq("receipe_id", receipeIdV0);
  const stepsV0 = steps.map((s, i)=>{
    if (s.is_section_header) {
      // Titre de section — pattern V0 : title: true, text: le titre
      return {
        receipe_id: receipeIdV0,
        number: s.step_number,
        index: i,
        text: s.title ?? "",
        title: true
      };
    }
    // Étape normale
    return {
      receipe_id: receipeIdV0,
      number: s.step_number,
      index: i,
      text: s.title ? `${s.title}\n${s.content}` : s.content ?? "",
      title: false
    };
  });
  const { error } = await supabaseV0.from("step").insert(stepsV0);
  if (error) console.error("[syncSteps]", error);
}
// ─── 4b. Sync ingredients ────────────────────────────────────────────────────
// Mapping V1 → V0 :
//   is_section_header = true  → ingredient V0 avec title: true, name: section title
//                                (titre de section affiché dans l'app)
//   is_section_header = false → ingredient V0 normal avec title: false
async function syncIngredients(recipeIdV1, receipeIdV0) {
  const { data: ingredients } = await supabaseV1.from("recipe_ingredient").select(`
      sort_order, quantity, unit, is_optional,
      is_section_header, title,
      ingredient:ingredient_id (name, name_fr, calories_per_100g)
    `).eq("recipe_id", recipeIdV1).order("sort_order");
  if (!ingredients?.length) return;
  await supabaseV0.from("ingredients").delete().eq("receipe_id", receipeIdV0);
  const ingredientsV0 = ingredients.map((i, idx)=>{
    if (i.is_section_header) {
      // Titre de section — pattern V0 : title: true, name: le titre
      return {
        receipe_id: receipeIdV0,
        name: i.title ?? "Section",
        quantity: null,
        unit: "",
        index: idx,
        title: true
      };
    }
    // Ingrédient normal
    return {
      receipe_id: receipeIdV0,
      name: i.ingredient?.name_fr ?? i.ingredient?.name ?? "Ingrédient",
      quantity: i.quantity,
      unit: i.unit ?? "",
      index: idx,
      title: false
    };
  });
  const { error } = await supabaseV0.from("ingredients").insert(ingredientsV0);
  if (error) console.error("[syncIngredients]", error);
}
// ─── 4c. Sync macros ─────────────────────────────────────────────────────────
async function syncMacros(recipeIdV1, receipeIdV0) {
  const { data: macro } = await supabaseV1.from("recipe_macro").select("calories, protein_g, carbs_g, fat_g, fiber_g").eq("recipe_id", recipeIdV1).single();
  if (!macro) return;
  await supabaseV0.from("receipe").update({
    calorie: macro.calories ? Math.round(macro.calories) : null
  }).eq("id", receipeIdV0);
  await supabaseV0.from("receipe_macro").delete().eq("receipe_id", receipeIdV0);
  const macrosV0 = [
    {
      receipe_id: receipeIdV0,
      type: "calories",
      name: "Calories",
      quantity: macro.calories,
      unit: "kcal"
    },
    {
      receipe_id: receipeIdV0,
      type: "protein",
      name: "Protéines",
      quantity: macro.protein_g,
      unit: "g"
    },
    {
      receipe_id: receipeIdV0,
      type: "carbs",
      name: "Glucides",
      quantity: macro.carbs_g,
      unit: "g"
    },
    {
      receipe_id: receipeIdV0,
      type: "fat",
      name: "Lipides",
      quantity: macro.fat_g,
      unit: "g"
    },
    {
      receipe_id: receipeIdV0,
      type: "fiber",
      name: "Fibres",
      quantity: macro.fiber_g,
      unit: "g"
    }
  ].filter((m)=>m.quantity !== null);
  const { error } = await supabaseV0.from("receipe_macro").insert(macrosV0);
  if (error) console.error("[syncMacros]", error);
}
// ─── 4d. Sync images ─────────────────────────────────────────────────────────
async function syncImages(recipeIdV1, receipeIdV0, coverUrl) {
  await supabaseV0.from("receipe_image").delete().eq("receipe_id", receipeIdV0);
  const images = [];
  if (coverUrl) images.push({
    receipe_id: receipeIdV0,
    url: coverUrl,
    type: "cover",
    index: 0
  });
  const { data: galleryImages } = await supabaseV1.from("recipe_image").select("url, sort_order").eq("recipe_id", recipeIdV1).order("sort_order");
  (galleryImages ?? []).forEach((img, i)=>{
    images.push({
      receipe_id: receipeIdV0,
      url: img.url,
      type: "gallery",
      index: i + 1
    });
  });
  if (!images.length) return;
  const { error } = await supabaseV0.from("receipe_image").insert(images);
  if (error) console.error("[syncImages]", error);
}
// ─── 4e. Sync tags ───────────────────────────────────────────────────────────
async function syncTags(recipeIdV1, receipeIdV0) {
  const { data: tags } = await supabaseV1.from("recipe_tag").select("tag:tag_id (name, name_fr)").eq("recipe_id", recipeIdV1);
  if (!tags?.length) return;
  await supabaseV0.from("receipe_tags").delete().eq("receipe_id", receipeIdV0);
  const tagsV0 = tags.map((t)=>({
      receipe_id: receipeIdV0,
      name: t.tag?.name_fr ?? t.tag?.name ?? "",
      color: "#000000"
    }));
  const { error } = await supabaseV0.from("receipe_tags").insert(tagsV0);
  if (error) console.error("[syncTags]", error);
}
// ─── Helper ──────────────────────────────────────────────────────────────────
function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
