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
    const { creator_id } = await req.json();
    if (!creator_id) return new Response(JSON.stringify({
      data: null,
      error: 'Missing creator_id'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // 1. Check active subscription
    const { data: subscription } = await supabase.from('subscription').select('status').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!subscription) return new Response(JSON.stringify({
      data: null,
      error: 'Active subscription required'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // 2. Check creator eligibility
    const { data: creator } = await supabase.from('creator').select('is_fan_eligible').eq('user_id', creator_id).single();
    if (!creator?.is_fan_eligible) return new Response(JSON.stringify({
      data: null,
      error: 'Creator not eligible for Fan mode'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // 3. Check no existing active/pending fan subscription
    const { data: existing } = await supabase.from('fan_subscription').select('id, status').eq('user_id', user.id).in('status', [
      'active',
      'pending'
    ]).maybeSingle();
    if (existing) {
      // Cancel existing
      await supabase.from('fan_subscription').update({
        status: 'cancelled',
        effective_until: firstOfNextMonth()
      }).eq('id', existing.id);
      await supabase.from('fan_subscription_history').insert({
        fan_subscription_id: existing.id,
        user_id: user.id,
        event: 'cancelled',
        created_at: new Date().toISOString()
      });
    }
    const effectiveFrom = firstOfNextMonth();
    // 4. Create new pending fan subscription
    const { data: newSub, error: subError } = await supabase.from('fan_subscription').insert({
      user_id: user.id,
      creator_id,
      status: 'pending',
      effective_from: effectiveFrom
    }).select('id').single();
    if (subError) throw subError;
    await supabase.from('fan_subscription_history').insert({
      fan_subscription_id: newSub.id,
      user_id: user.id,
      creator_id,
      event: 'created_pending',
      created_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      data: {
        effective_from: effectiveFrom
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
    console.error('[activate-fan-mode] Error:', err);
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
