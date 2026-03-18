import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const { meal_plan_entry_id, servings = 1 } = await req.json();
    if (!meal_plan_entry_id) return new Response(JSON.stringify({
      data: null,
      error: 'Missing meal_plan_entry_id'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Fetch entry + recipe
    const { data: entry, error: entryError } = await supabase.from('meal_plan_entry').select('recipe_id, meal_plan_id').eq('id', meal_plan_entry_id).single();
    if (entryError || !entry) throw new Error('Meal plan entry not found');
    const { data: recipe, error: recipeError } = await supabase.from('recipe').select('creator_id').eq('id', entry.recipe_id).single();
    if (recipeError || !recipe) throw new Error('Recipe not found');
    // Check active Fan mode
    const { data: fanSub } = await supabase.from('fan_subscription').select('creator_id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    // If fan mode active and recipe is from external creator, check counter
    if (fanSub && fanSub.creator_id !== recipe.creator_id) {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: counter } = await supabase.from('fan_external_recipe_counter').select('count, limit').eq('user_id', user.id).eq('month_key', monthKey).maybeSingle();
      if (counter && counter.count >= counter.limit) {
        return new Response(JSON.stringify({
          data: null,
          error: 'External recipe limit reached for this month in Fan mode'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Increment counter
      await supabase.rpc('increment_fan_external_counter', {
        p_user_id: user.id,
        p_month_key: monthKey
      });
    }
    // Insert consumption
    const { error: consumeError } = await supabase.from('meal_consumption').insert({
      user_id: user.id,
      recipe_id: entry.recipe_id,
      creator_id: recipe.creator_id,
      meal_plan_entry_id,
      servings,
      consumed_at: new Date().toISOString()
    });
    if (consumeError) throw consumeError;
    // Mark entry as consumed
    await supabase.from('meal_plan_entry').update({
      is_consumed: true
    }).eq('id', meal_plan_entry_id);
    return new Response(JSON.stringify({
      data: {
        success: true
      },
      error: null
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[log-meal-consumption] Error:', err);
    return new Response(JSON.stringify({
      data: null,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
