import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkBlogPostAccess } from '../_shared/blog-post-guard.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const { post_id, content, parent_id } = await req.json();
    if (!post_id || !content || !content.trim()) {
      return new Response(JSON.stringify({ data: null, error: 'post_id and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const access = await checkBlogPostAccess(supabase, post_id, { user_id: user.id });
    if (!access.ok) {
      return new Response(JSON.stringify({ data: null, error: access.error }), {
        status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('blog_comment')
        .select('parent_id, post_id')
        .eq('id', parent_id)
        .single();
      if (parentError || !parent) {
        return new Response(JSON.stringify({ data: null, error: 'Parent comment not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (parent.parent_id !== null) {
        return new Response(JSON.stringify({ data: null, error: 'Replies can only be one level deep' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (parent.post_id !== post_id) {
        return new Response(JSON.stringify({ data: null, error: 'Parent comment does not belong to this post' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { data, error } = await supabase
      .from('blog_comment')
      .insert({ post_id, user_id: user.id, content: content.trim(), parent_id: parent_id ?? null })
      .select('id, post_id, user_id, content, parent_id, created_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ data, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[create-blog-comment] Error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
