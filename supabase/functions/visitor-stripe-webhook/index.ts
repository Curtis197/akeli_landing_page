// supabase/functions/visitor-stripe-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_VISITOR_WEBHOOK_SECRET');

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[visitor-stripe-webhook] Missing Stripe keys');
    return new Response(JSON.stringify({ error: 'Webhook configuration error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[visitor-stripe-webhook] Signature verification failed:', err);
    return new Response(JSON.stringify({ error: `Invalid signature: ${err.message}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const type = event.type;

    if (type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.metadata?.visitor_id) {
        const subId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subId);

        const { error: upsertError } = await supabase
          .from('visitor_fan_subscription')
          .upsert({
            visitor_id: session.metadata.visitor_id,
            creator_id: session.metadata.creator_id,
            status: 'active',
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            amount_cents: subscription.items.data[0].price.unit_amount,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            subscribed_at: new Date().toISOString(),
          }, { onConflict: 'visitor_id,creator_id' });

        if (upsertError) {
          throw upsertError;
        }
        console.log(`[visitor-stripe-webhook] Active subscription created for visitor ${session.metadata.visitor_id}`);
      }
    }

    else if (type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subId = invoice.subscription as string;
        const { error: updateError } = await supabase
          .from('visitor_fan_subscription')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);

        if (updateError) {
          throw updateError;
        }
        console.log(`[visitor-stripe-webhook] Subscription past_due for sub ${subId}`);
      }
    }

    else if (type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const { error: updateError } = await supabase
        .from('visitor_fan_subscription')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', sub.id);

      if (updateError) {
        throw updateError;
      }
      console.log(`[visitor-stripe-webhook] Subscription cancelled for sub ${sub.id}`);
    }

    else if (type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
      };
      const status = statusMap[sub.status] || 'cancelled';

      const { error: updateError } = await supabase
        .from('visitor_fan_subscription')
        .update({
          status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);

      if (updateError) {
        throw updateError;
      }
      console.log(`[visitor-stripe-webhook] Subscription status updated to ${status} for sub ${sub.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-stripe-webhook] processing error:', err);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
