// supabase/functions/visitor-follow-creator/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    const { creator_id } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ data: null, error: 'creator_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if visitor email is verified
    const { data: visitorRow, error: visitorError } = await supabase
      .from('visitor')
      .select('email_verified')
      .eq('id', visitor.visitor_id)
      .single();

    if (visitorError || !visitorRow) {
      return new Response(JSON.stringify({ data: null, error: 'Visitor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitorRow.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before following' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert follow record — reactivating if it was previously unfollowed
    const { error: upsertError } = await supabase
      .from('visitor_creator_follow')
      .upsert({
        visitor_id: visitor.visitor_id,
        creator_id,
        active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      }, { onConflict: 'visitor_id,creator_id' });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ data: { following: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-follow-creator] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
