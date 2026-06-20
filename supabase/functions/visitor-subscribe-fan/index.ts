// supabase/functions/visitor-subscribe-fan/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const visitor = await verifyVisitorJWT(req);
    if (!visitor) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { creator_id, price_id } = await req.json();
    if (!creator_id || !price_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id and price_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is missing');
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';

    // Fetch visitor details
    const { data: visitorRow, error: visitorError } = await supabase
      .from('visitor')
      .select('stripe_customer_id, email, email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (visitorError || !visitorRow) {
      return new Response(JSON.stringify({ data: null, error: 'Visitor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitorRow.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before subscribing' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let stripeCustomerId = visitorRow.stripe_customer_id;

    // Create Stripe customer if they don't have one yet
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: visitorRow.email,
        metadata: { visitor_id: visitor.visitor_id },
      });
      stripeCustomerId = customer.id;
      const { error: updateError } = await supabase
        .from('visitor')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', visitor.visitor_id);

      if (updateError) {
        throw updateError;
      }
    }

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${siteUrl}/visitor/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/creator/${creator_id}`,
      metadata: { visitor_id: visitor.visitor_id, creator_id },
    });

    return new Response(JSON.stringify({ data: { checkout_url: session.url }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-subscribe-fan] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
