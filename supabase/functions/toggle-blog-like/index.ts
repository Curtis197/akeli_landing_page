import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkBlogPostAccess } from '../_shared/blog-post-guard.ts';
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const { post_id } = await req.json();
    if (!post_id) return new Response(JSON.stringify({
      data: null,
      error: 'Missing post_id'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const access = await checkBlogPostAccess(supabase, post_id, { user_id: user.id });
    if (!access.ok) return new Response(JSON.stringify({
      data: null,
      error: access.error
    }), {
      status: access.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const { data: existing } = await supabase.from('blog_post_like').select('id').eq('user_id', user.id).eq('post_id', post_id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from('blog_post_like').delete().eq('id', existing.id);
      if (error) throw error;
      return new Response(JSON.stringify({
        data: { liked: false },
        error: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const { error } = await supabase.from('blog_post_like').insert({
        user_id: user.id,
        post_id
      });
      if (error) throw error;
      return new Response(JSON.stringify({
        data: { liked: true },
        error: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('[toggle-blog-like] Error:', err);
    return new Response(JSON.stringify({
      data: null,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
