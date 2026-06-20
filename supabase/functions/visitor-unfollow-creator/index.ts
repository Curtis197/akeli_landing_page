// supabase/functions/visitor-unfollow-creator/index.ts
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

    const { error: updateError } = await supabase
      .from('visitor_creator_follow')
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq('visitor_id', visitor.visitor_id)
      .eq('creator_id', creator_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ data: { following: false }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-unfollow-creator] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
