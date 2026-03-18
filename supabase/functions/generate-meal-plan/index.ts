import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
function calculateTDEE(profile) {
  const age = Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  let bmr = profile.sex === 'male' ? 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5 : 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age - 161;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  return Math.round(bmr * (multipliers[profile.activity_level] || 1.55));
}
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
    const { start_date, days, meals_per_day } = await req.json();
    if (!start_date || !days || !meals_per_day?.length) {
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
    if (days < 1 || days > 14) {
      return new Response(JSON.stringify({
        data: null,
        error: 'days must be between 1 and 14'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch health profile
    const { data: healthProfile, error: hpError } = await supabase.from('user_health_profile').select('*').eq('user_id', user.id).single();
    if (hpError || !healthProfile) throw new Error('Health profile not found');
    const daily_calories = calculateTDEE(healthProfile);
    // Call PostgreSQL function via rpc
    const { data: plan, error: planError } = await supabase.rpc('generate_meal_plan', {
      p_user_id: user.id,
      p_days: days,
      p_meals_per_day: meals_per_day,
      p_start_date: start_date,
      p_daily_calories: daily_calories
    });
    if (planError) throw planError;
    return new Response(JSON.stringify({
      data: plan,
      error: null
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[generate-meal-plan] Error:', err);
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
