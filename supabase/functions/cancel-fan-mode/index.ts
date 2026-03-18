import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
function firstOfNextMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
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
    // Find active fan subscription
    const { data: fanSub, error: findError } = await supabase.from('fan_subscription').select('id').eq('user_id', user.id).in('status', [
      'active',
      'pending'
    ]).maybeSingle();
    if (findError) throw findError;
    if (!fanSub) return new Response(JSON.stringify({
      data: null,
      error: 'No active Fan subscription found'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const effectiveUntil = firstOfNextMonth();
    // Cancel it
    const { error: updateError } = await supabase.from('fan_subscription').update({
      status: 'cancelled',
      effective_until: effectiveUntil
    }).eq('id', fanSub.id);
    if (updateError) throw updateError;
    // History log
    await supabase.from('fan_subscription_history').insert({
      fan_subscription_id: fanSub.id,
      user_id: user.id,
      event: 'cancelled',
      created_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      data: {
        effective_until: effectiveUntil
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
    console.error('[cancel-fan-mode] Error:', err);
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
