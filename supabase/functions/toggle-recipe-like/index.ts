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
    const { recipe_id } = await req.json();
    if (!recipe_id) return new Response(JSON.stringify({
      data: null,
      error: 'Missing recipe_id'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Check if like already exists
    const { data: existing } = await supabase.from('recipe_like').select('id').eq('user_id', user.id).eq('recipe_id', recipe_id).maybeSingle();
    if (existing) {
      // Unlike
      const { error } = await supabase.from('recipe_like').delete().eq('id', existing.id);
      if (error) throw error;
      return new Response(JSON.stringify({
        data: {
          liked: false
        },
        error: null
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Like
      const { error } = await supabase.from('recipe_like').insert({
        user_id: user.id,
        recipe_id
      });
      if (error) throw error;
      return new Response(JSON.stringify({
        data: {
          liked: true
        },
        error: null
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (err) {
    console.error('[toggle-recipe-like] Error:', err);
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
