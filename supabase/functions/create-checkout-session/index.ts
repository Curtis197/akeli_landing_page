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
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return new Response(JSON.stringify({
      data: null,
      error: 'Stripe not configured yet'
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const stripePriceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!stripePriceId) return new Response(JSON.stringify({
      data: null,
      error: 'Stripe price not configured'
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Fetch or create Stripe customer
    const { data: profile } = await supabase.from('user_profile').select('stripe_customer_id, email').eq('id', user.id).single();
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const createCustomerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          email: profile?.email ?? user.email ?? '',
          'metadata[user_id]': user.id
        })
      });
      const customer = await createCustomerRes.json();
      customerId = customer.id;
      await supabase.from('user_profile').update({
        stripe_customer_id: customerId
      }).eq('id', user.id);
    }
    // Create Stripe Checkout session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        customer: customerId,
        'line_items[0][price]': stripePriceId,
        'line_items[0][quantity]': '1',
        mode: 'subscription',
        success_url: `${Deno.env.get('APP_URL') ?? 'akeli://app'}/subscription/success`,
        cancel_url: `${Deno.env.get('APP_URL') ?? 'akeli://app'}/subscription/cancel`,
        'subscription_data[metadata][user_id]': user.id
      })
    });
    const session = await sessionRes.json();
    if (!session.url) throw new Error('Failed to create checkout session');
    return new Response(JSON.stringify({
      data: {
        checkout_url: session.url
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
    console.error('[create-checkout-session] Error:', err);
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
