// supabase/functions/visitor-toggle-blog-like/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyVisitorJWT } from '../_shared/visitor-auth.ts';
import { checkBlogPostAccess } from '../_shared/blog-post-guard.ts';

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

    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ data: null, error: 'post_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before liking' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const access = await checkBlogPostAccess(supabase, post_id, { visitor_id: visitor.visitor_id });
    if (!access.ok) {
      return new Response(JSON.stringify({ data: null, error: access.error }), {
        status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('blog_post_like')
      .select('id')
      .eq('visitor_id', visitor.visitor_id)
      .eq('post_id', post_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('blog_post_like').delete().eq('id', existing.id);
      if (error) throw error;
      return new Response(JSON.stringify({ data: { liked: false }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const { error } = await supabase.from('blog_post_like').insert({
        visitor_id: visitor.visitor_id,
        post_id,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ data: { liked: true }, error: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[visitor-toggle-blog-like] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
