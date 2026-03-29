import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ data: null, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ data: null, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({ data: null, error: 'Stripe not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { creator_id } = await req.json();
    if (!creator_id) {
      return new Response(
        JSON.stringify({ data: null, error: 'creator_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the creator belongs to the authenticated user
    const { data: creator, error: creatorError } = await supabase
      .from('creator')
      .select('id, stripe_account_id')
      .eq('id', creator_id)
      .eq('auth_id', user.id)
      .maybeSingle();

    if (creatorError || !creator) {
      return new Response(
        JSON.stringify({ data: null, error: 'Creator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If account already exists, generate a new onboarding link (re-entry)
    if (creator.stripe_account_id) {
      const accountLinkRes = await fetch('https://api.stripe.com/v1/account_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          account: creator.stripe_account_id,
          refresh_url: `https://a-keli.com/fr/settings?stripe=refresh`,
          return_url: `https://a-keli.com/fr/settings?stripe=success`,
          type: 'account_onboarding',
        }),
      });
      const accountLink = await accountLinkRes.json();
      if (!accountLink.url) {
        throw new Error(`Failed to create account link: ${JSON.stringify(accountLink)}`);
      }
      return new Response(
        JSON.stringify({ data: { url: accountLink.url }, error: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new Express account
    const accountRes = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        type: 'express',
        country: 'FR',
        'capabilities[transfers][requested]': 'true',
      }),
    });
    const account = await accountRes.json();
    if (!account.id) {
      throw new Error(`Failed to create Stripe account: ${JSON.stringify(account)}`);
    }

    // Store stripe_account_id in creator table
    const { error: updateCreatorError } = await supabase
      .from('creator')
      .update({ stripe_account_id: account.id })
      .eq('id', creator_id);

    if (updateCreatorError) {
      throw new Error(`Failed to update creator: ${updateCreatorError.message}`);
    }

    // Insert into creator_stripe_account
    const { error: insertError } = await supabase
      .from('creator_stripe_account')
      .insert({
        creator_id,
        stripe_account_id: account.id,
        country: 'FR',
      });

    if (insertError) {
      throw new Error(`Failed to insert creator_stripe_account: ${insertError.message}`);
    }

    // Generate onboarding link
    const accountLinkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: account.id,
        refresh_url: `https://a-keli.com/fr/settings?stripe=refresh`,
        return_url: `https://a-keli.com/fr/settings?stripe=success`,
        type: 'account_onboarding',
      }),
    });
    const accountLink = await accountLinkRes.json();
    if (!accountLink.url) {
      throw new Error(`Failed to create account link: ${JSON.stringify(accountLink)}`);
    }

    return new Response(
      JSON.stringify({ data: { url: accountLink.url }, error: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-connect-account] Error:', err);
    return new Response(
      JSON.stringify({ data: null, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
