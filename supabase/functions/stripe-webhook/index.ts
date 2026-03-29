import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 503 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify Stripe signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 });
    }

    const body = await req.text();
    const encoder = new TextEncoder();
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !v1) {
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), { status: 400 });
    }

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSig !== v1) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;

        await supabase
          .from('creator_stripe_account')
          .update({
            onboarding_complete: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id);

        if (account.details_submitted) {
          await supabase
            .from('creator')
            .update({ stripe_onboarding_complete: true })
            .eq('stripe_account_id', account.id);
        }
        break;
      }

      case 'payout.created': {
        const payout = event.data.object;
        // Update payout row matched by stripe_transfer_id (source_transfer links transfer → payout)
        if (payout.source_transfer) {
          await supabase
            .from('payout')
            .update({ status: 'processing' })
            .eq('stripe_transfer_id', payout.source_transfer);
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object;
        if (payout.source_transfer) {
          await supabase
            .from('payout')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              stripe_payout_id: payout.id,
            })
            .eq('stripe_transfer_id', payout.source_transfer);
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        if (payout.source_transfer) {
          await supabase
            .from('payout')
            .update({ status: 'failed' })
            .eq('stripe_transfer_id', payout.source_transfer);
        }
        break;
      }

      case 'account.external_account.updated': {
        // Log only — creator updated their bank account
        console.log('[stripe-webhook] Bank account updated for:', event.account);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-webhook] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
