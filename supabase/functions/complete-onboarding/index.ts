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
    const body = await req.json();
    const { sex, birth_date, height_cm, weight_kg, target_weight_kg, activity_level, goals, dietary_restrictions, cuisine_preferences } = body;
    if (!sex || !birth_date || !height_cm || !weight_kg || !target_weight_kg || !activity_level) {
      return new Response(JSON.stringify({
        data: null,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 1. Upsert user_health_profile
    const { error: profileError } = await supabase.from('user_health_profile').upsert({
      user_id: user.id,
      sex,
      birth_date,
      height_cm,
      weight_kg,
      target_weight_kg,
      activity_level,
      updated_at: new Date().toISOString()
    });
    if (profileError) throw profileError;
    // 2. Replace user_goal
    await supabase.from('user_goal').delete().eq('user_id', user.id);
    if (goals?.length) {
      const { error: goalError } = await supabase.from('user_goal').insert(goals.map((g)=>({
          user_id: user.id,
          goal_type: g
        })));
      if (goalError) throw goalError;
    }
    // 3. Replace user_dietary_restriction
    await supabase.from('user_dietary_restriction').delete().eq('user_id', user.id);
    if (dietary_restrictions?.length) {
      const { error: dietError } = await supabase.from('user_dietary_restriction').insert(dietary_restrictions.map((r)=>({
          user_id: user.id,
          restriction_type: r
        })));
      if (dietError) throw dietError;
    }
    // 4. Replace user_cuisine_preference
    await supabase.from('user_cuisine_preference').delete().eq('user_id', user.id);
    if (cuisine_preferences?.length) {
      const { error: cuisineError } = await supabase.from('user_cuisine_preference').insert(cuisine_preferences.map((c)=>({
          user_id: user.id,
          region: c.region,
          score: c.score
        })));
      if (cuisineError) throw cuisineError;
    }
    // 5. Mark onboarding done
    const { error: profileUpdateError } = await supabase.from('user_profile').update({
      onboarding_done: true,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
    if (profileUpdateError) throw profileUpdateError;
    // 6. Trigger user vector generation in background (non-blocking)
    const pythonServiceUrl = Deno.env.get('PYTHON_SERVICE_URL');
    if (pythonServiceUrl) {
      fetch(`${pythonServiceUrl}/generate-user-vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id
        })
      }).catch((e)=>console.error(`[complete-onboarding] Vector generation failed: ${e.message}`, {
          user_id: user.id,
          timestamp: new Date().toISOString()
        }));
    }
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
    console.error('[complete-onboarding] Error:', err);
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
