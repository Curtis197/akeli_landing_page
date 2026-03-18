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
    // Cron job — service key auth
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({
        data: null,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), serviceKey);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // 1. Activate pending subscriptions
    const { error: activateError } = await supabase.from('fan_subscription').update({
      status: 'active'
    }).eq('status', 'pending').lte('effective_from', today);
    if (activateError) throw activateError;
    // 2. Deactivate cancelled subscriptions
    const { error: deactivateError } = await supabase.from('fan_subscription').update({
      status: 'expired'
    }).eq('status', 'cancelled').lte('effective_until', today);
    if (deactivateError) throw deactivateError;
    // 3. Initialize fan_external_recipe_counter for active fans
    const { data: activeFans } = await supabase.from('fan_subscription').select('user_id').eq('status', 'active');
    if (activeFans?.length) {
      const counters = activeFans.map((f)=>({
          user_id: f.user_id,
          month_key: monthKey,
          count: 0,
          limit: 10
        }));
      await supabase.from('fan_external_recipe_counter').upsert(counters, {
        onConflict: 'user_id,month_key',
        ignoreDuplicates: true
      });
    }
    console.log(`[process-fan-mode-transitions] Completed for ${today}. Active fans: ${activeFans?.length ?? 0}`);
    return new Response(JSON.stringify({
      data: {
        success: true,
        processed_at: today
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
    console.error('[process-fan-mode-transitions] Error:', err);
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
