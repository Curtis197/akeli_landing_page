// ============================================================================
// AKELI V1 — Edge Function : batch-sync-v0
// v4 — Fix resolveOrCreateCreatorV0 : utilise maybeSingle() au lieu de single()
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseV1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const supabaseV0 = createClient(Deno.env.get('V0_SUPABASE_URL'), Deno.env.get('V0_SUPABASE_SERVICE_KEY'));
Deno.serve(async (_req)=>{
  const startedAt = Date.now();
  let synced = 0;
  let errored = 0;
  const errors = [];
  console.log('[batch-sync-v0] Starting...');
  const { data: recipes, error: fetchError } = await supabaseV1.from('recipe').select('id, title, creator_id').eq('is_published', true);
  if (fetchError || !recipes) {
    return json({
      error: 'Failed to fetch recipes'
    }, 500);
  }
  console.log(`[batch-sync-v0] ${recipes.length} recipes to sync`);
  const creatorCache = {};
  for (const recipe of recipes){
    try {
      if (!creatorCache[recipe.creator_id]) {
        const creatorV0Id = await resolveOrCreateCreatorV0(recipe.creator_id);
        if (!creatorV0Id) {
          errors.push(`Creator not resolved: ${recipe.title}`);
          errored++;
          continue;
        }
        creatorCache[recipe.creator_id] = creatorV0Id;
      }
      const receipeV0Id = await upsertReceipeV0(recipe.id, creatorCache[recipe.creator_id]);
      if (!receipeV0Id) {
        errors.push(`Upsert failed: ${recipe.title}`);
        errored++;
        continue;
      }
      await Promise.all([
        syncSteps(recipe.id, receipeV0Id),
        syncIngredients(recipe.id, receipeV0Id),
        syncMacros(recipe.id, receipeV0Id),
        syncImages(recipe.id, receipeV0Id),
        syncTags(recipe.id, receipeV0Id)
      ]);
      synced++;
      console.log(`[batch-sync-v0] OK ${recipe.title}`);
    } catch (err) {
      console.error(`[batch-sync-v0] ERR ${recipe.title}:`, err);
      errors.push(`${recipe.title}: ${String(err)}`);
      errored++;
    }
  }
  const durationMs = Date.now() - startedAt;
  console.log(`[batch-sync-v0] Done synced=${synced} errored=${errored} (${durationMs}ms)`);
  await supabaseV1.from('sync_log').upsert({
    sync_type: 'recipes_v1_to_v0',
    last_synced_date: new Date().toISOString().split('T')[0],
    last_run_at: new Date().toISOString(),
    last_run_status: errored === 0 ? 'success' : synced > 0 ? 'partial' : 'error',
    rows_synced: synced,
    rows_skipped: 0,
    rows_errored: errored,
    error_detail: errors.length > 0 ? errors.slice(0, 5).join(' | ') : null
  }, {
    onConflict: 'sync_type'
  });
  return json({
    ok: true,
    synced,
    errored,
    duration_ms: durationMs,
    errors: errors.slice(0, 5)
  });
});
// ---- resolveOrCreateCreatorV0 -----------------------------------------------
// Utilise maybeSingle() pour éviter l'erreur quand aucun résultat n'est trouvé
async function resolveOrCreateCreatorV0(creatorIdV1) {
  const { data: creatorV1 } = await supabaseV1.from('creator').select('user_id, display_name, bio, profile_image_url').eq('id', creatorIdV1).maybeSingle();
  if (!creatorV1) return null;
  // 1. Chercher par display_name en V0 (orphelin existant)
  const { data: existing } = await supabaseV0.from('creator').select('id').eq('name', creatorV1.display_name).maybeSingle();
  if (existing?.id) return existing.id;
  // 2. Tenter résolution via email Auth V1
  const { data: authUserV1 } = await supabaseV1.auth.admin.getUserById(creatorV1.user_id);
  const email = authUserV1?.user?.email;
  if (email) {
    const { data: authUsersV0 } = await supabaseV0.auth.admin.listUsers();
    const authUserV0 = authUsersV0?.users?.find((u)=>u.email === email);
    if (authUserV0) {
      const { data: creatorV0 } = await supabaseV0.from('creator').select('id').eq('supabase_auth_id', authUserV0.id).maybeSingle();
      if (creatorV0?.id) return creatorV0.id;
    }
  }
  // 3. Créer orphelin en V0
  console.log(`[resolveOrCreateCreatorV0] Creating orphan for: ${creatorV1.display_name}`);
  const { data: newCreator, error } = await supabaseV0.from('creator').insert({
    name: creatorV1.display_name,
    bio: creatorV1.bio ?? '',
    profil_url: creatorV1.profile_image_url ?? null,
    description: `Synced from Akeli V1${email ? ` (${email})` : ''}`
  }).select('id').single();
  if (error) {
    console.error('[resolveOrCreateCreatorV0] INSERT error:', JSON.stringify(error));
    return null;
  }
  console.log(`[resolveOrCreateCreatorV0] Created orphan id=${newCreator.id}`);
  return newCreator.id;
}
// ---- upsertReceipeV0 --------------------------------------------------------
async function upsertReceipeV0(recipeIdV1, creatorV0Id) {
  const { data: recipe } = await supabaseV1.from('recipe').select('id, title, description, region, difficulty, prep_time_min, cook_time_min, is_pork_free, cover_image_url').eq('id', recipeIdV1).maybeSingle();
  if (!recipe) return null;
  const difficultyMap = {
    easy: 'Facile',
    medium: 'Modéré',
    hard: 'Difficile'
  };
  const payload = {
    name: recipe.title,
    description: recipe.description ?? '',
    'Food Region': recipe.region ?? null,
    difficulty: difficultyMap[recipe.difficulty ?? ''] ?? null,
    'sans porc': recipe.is_pork_free ?? false,
    creator_id: creatorV0Id,
    is_published: true,
    free: false,
    time_of_cooking_min: recipe.prep_time_min ?? null,
    time_of_cooking_hour: recipe.cook_time_min ? Math.floor(recipe.cook_time_min / 60) : null,
    v1_recipe_id: recipe.id
  };
  const { data: existing } = await supabaseV0.from('receipe').select('id').eq('v1_recipe_id', recipe.id).maybeSingle();
  if (existing) {
    const { data, error } = await supabaseV0.from('receipe').update(payload).eq('id', existing.id).select('id').single();
    if (error) {
      console.error('[upsertReceipeV0 UPDATE]', error);
      return null;
    }
    return data.id;
  } else {
    const { data, error } = await supabaseV0.from('receipe').insert(payload).select('id').single();
    if (error) {
      console.error('[upsertReceipeV0 INSERT]', JSON.stringify(error));
      return null;
    }
    return data.id;
  }
}
// ---- syncSteps --------------------------------------------------------------
async function syncSteps(recipeIdV1, receipeIdV0) {
  const { data: steps } = await supabaseV1.from('recipe_step').select('step_number, title, content, is_section_header').eq('recipe_id', recipeIdV1).order('step_number');
  if (!steps?.length) return;
  await supabaseV0.from('step').delete().eq('receipe_id', receipeIdV0);
  const stepsV0 = steps.map((s, i)=>({
      receipe_id: receipeIdV0,
      number: s.step_number,
      index: i,
      text: s.is_section_header ? s.title ?? '' : s.title ? `${s.title}\n${s.content}` : s.content ?? '',
      title: s.is_section_header
    }));
  const { error } = await supabaseV0.from('step').insert(stepsV0);
  if (error) console.error('[syncSteps]', error);
}
// ---- syncIngredients --------------------------------------------------------
async function syncIngredients(recipeIdV1, receipeIdV0) {
  const { data: ingredients } = await supabaseV1.from('recipe_ingredient').select('sort_order, quantity, unit, is_section_header, title, ingredient:ingredient_id (name, name_fr)').eq('recipe_id', recipeIdV1).order('sort_order');
  if (!ingredients?.length) return;
  await supabaseV0.from('ingredients').delete().eq('receipe_id', receipeIdV0);
  const ingredientsV0 = ingredients.map((i, idx)=>({
      receipe_id: receipeIdV0,
      name: i.is_section_header ? i.title ?? 'Section' : i.ingredient?.name_fr ?? i.ingredient?.name ?? 'Ingrédient',
      quantity: i.is_section_header ? null : i.quantity,
      unit: i.is_section_header ? '' : i.unit ?? '',
      index: idx,
      title: i.is_section_header
    }));
  const { error } = await supabaseV0.from('ingredients').insert(ingredientsV0);
  if (error) console.error('[syncIngredients]', error);
}
// ---- syncMacros -------------------------------------------------------------
async function syncMacros(recipeIdV1, receipeIdV0) {
  const { data: macro } = await supabaseV1.from('recipe_macro').select('calories, protein_g, carbs_g, fat_g, fiber_g').eq('recipe_id', recipeIdV1).maybeSingle();
  if (!macro) return;
  await supabaseV0.from('receipe').update({
    calorie: macro.calories ? Math.round(macro.calories) : null
  }).eq('id', receipeIdV0);
  await supabaseV0.from('receipe_macro').delete().eq('receipe_id', receipeIdV0);
  const macrosV0 = [
    {
      receipe_id: receipeIdV0,
      type: 'calories',
      name: 'Calories',
      quantity: macro.calories,
      unit: 'kcal'
    },
    {
      receipe_id: receipeIdV0,
      type: 'protein',
      name: 'Protéines',
      quantity: macro.protein_g,
      unit: 'g'
    },
    {
      receipe_id: receipeIdV0,
      type: 'carbs',
      name: 'Glucides',
      quantity: macro.carbs_g,
      unit: 'g'
    },
    {
      receipe_id: receipeIdV0,
      type: 'fat',
      name: 'Lipides',
      quantity: macro.fat_g,
      unit: 'g'
    },
    {
      receipe_id: receipeIdV0,
      type: 'fiber',
      name: 'Fibres',
      quantity: macro.fiber_g,
      unit: 'g'
    }
  ].filter((m)=>m.quantity != null);
  if (macrosV0.length) {
    const { error } = await supabaseV0.from('receipe_macro').insert(macrosV0);
    if (error) console.error('[syncMacros]', error);
  }
}
// ---- syncImages -------------------------------------------------------------
async function syncImages(recipeIdV1, receipeIdV0) {
  const { data: recipe } = await supabaseV1.from('recipe').select('cover_image_url').eq('id', recipeIdV1).maybeSingle();
  await supabaseV0.from('receipe_image').delete().eq('receipe_id', receipeIdV0);
  const images = [];
  if (recipe?.cover_image_url) images.push({
    receipe_id: receipeIdV0,
    url: recipe.cover_image_url,
    type: 'cover',
    index: 0
  });
  const { data: gallery } = await supabaseV1.from('recipe_image').select('url, sort_order').eq('recipe_id', recipeIdV1).order('sort_order');
  (gallery ?? []).forEach((img, i)=>images.push({
      receipe_id: receipeIdV0,
      url: img.url,
      type: 'gallery',
      index: i + 1
    }));
  if (images.length) {
    const { error } = await supabaseV0.from('receipe_image').insert(images);
    if (error) console.error('[syncImages]', error);
  }
}
// ---- syncTags ---------------------------------------------------------------
async function syncTags(recipeIdV1, receipeIdV0) {
  const { data: tags } = await supabaseV1.from('recipe_tag').select('tag:tag_id (name, name_fr)').eq('recipe_id', recipeIdV1);
  if (!tags?.length) return;
  await supabaseV0.from('receipe_tags').delete().eq('receipe_id', receipeIdV0);
  const tagsV0 = tags.map((t)=>({
      receipe_id: receipeIdV0,
      name: t.tag?.name_fr ?? t.tag?.name ?? '',
      color: '#000000'
    }));
  const { error } = await supabaseV0.from('receipe_tags').insert(tagsV0);
  if (error) console.error('[syncTags]', error);
}
// ---- helper -----------------------------------------------------------------
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
