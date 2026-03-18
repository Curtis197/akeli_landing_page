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
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeSecret || !webhookSecret) {
      return new Response(JSON.stringify({
        error: 'Stripe not configured yet'
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response(JSON.stringify({
      error: 'Missing stripe signature'
    }), {
      status: 400
    });
    const body = await req.text();
    // Verify Stripe signature using Web Crypto
    const encoder = new TextEncoder();
    const parts = signature.split(',');
    const timestamp = parts.find((p)=>p.startsWith('t='))?.slice(2);
    const v1 = parts.find((p)=>p.startsWith('v1='))?.slice(3);
    if (!timestamp || !v1) return new Response(JSON.stringify({
      error: 'Invalid signature format'
    }), {
      status: 400
    });
    const signedPayload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret), {
      name: 'HMAC',
      hash: 'SHA-256'
    }, false, [
      'sign'
    ]);
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBytes)).map((b)=>b.toString(16).padStart(2, '0')).join('');
    if (expectedSig !== v1) return new Response(JSON.stringify({
      error: 'Invalid signature'
    }), {
      status: 400
    });
    const event = JSON.parse(body);
    const subscription = event.data?.object;
    const userId = subscription?.metadata?.user_id;
    switch(event.type){
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        if (userId) {
          await supabase.from('subscription').upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stripe_subscription_id'
          });
        }
        break;
      case 'customer.subscription.deleted':
        if (userId) {
          await supabase.from('subscription').update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          }).eq('stripe_subscription_id', subscription.id);
          // Cancel any active fan mode
          await supabase.from('fan_subscription').update({
            status: 'cancelled',
            effective_until: new Date().toISOString().split('T')[0]
          }).eq('user_id', userId).in('status', [
            'active',
            'pending'
          ]);
        }
        break;
      case 'invoice.payment_failed':
        if (userId) {
          await supabase.from('subscription').update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          }).eq('stripe_customer_id', subscription.customer);
        }
        break;
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[stripe-webhook] Error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500
    });
  }
});
