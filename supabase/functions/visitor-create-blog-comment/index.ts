// supabase/functions/visitor-create-blog-comment/index.ts
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

    const { post_id, content, parent_id } = await req.json();
    if (!post_id || !content || !content.trim()) {
      return new Response(JSON.stringify({ data: null, error: 'post_id and content are required' }), {
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
      return new Response(JSON.stringify({ data: null, error: 'Email verification required before commenting' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('blog_comment')
        .select('parent_id')
        .eq('id', parent_id)
        .single();
      if (parentError || !parent) {
        return new Response(JSON.stringify({ data: null, error: 'Parent comment not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (parent.parent_id !== null) {
        return new Response(JSON.stringify({ data: null, error: 'Replies can only be one level deep' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data, error } = await supabase
      .from('blog_comment')
      .insert({
        post_id,
        visitor_id: visitor.visitor_id,
        content: content.trim(),
        parent_id: parent_id ?? null,
      })
      .select('id, post_id, visitor_id, content, parent_id, created_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ data, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-create-blog-comment] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
