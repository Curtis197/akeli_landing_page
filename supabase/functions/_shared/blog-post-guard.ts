// supabase/functions/_shared/blog-post-guard.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Identity = { user_id: string } | { visitor_id: string };

export async function checkBlogPostAccess(
  supabase: ReturnType<typeof createClient>,
  post_id: string,
  identity: Identity
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: post, error } = await supabase
    .from('blog_post')
    .select('id, creator_id, is_published, visibility')
    .eq('id', post_id)
    .maybeSingle();

  if (error || !post || !post.is_published) {
    return { ok: false, status: 404, error: 'Post not found' };
  }

  if (post.visibility === 'public') {
    return { ok: true };
  }

  if ('user_id' in identity) {
    if (post.visibility === 'followers') {
      const { data } = await supabase
        .from('creator_follow')
        .select('id')
        .eq('creator_id', post.creator_id)
        .eq('user_id', identity.user_id)
        .eq('active', true)
        .maybeSingle();
      if (data) return { ok: true };
    } else if (post.visibility === 'fans') {
      const { data } = await supabase
        .from('fan_subscription')
        .select('id')
        .eq('creator_id', post.creator_id)
        .eq('user_id', identity.user_id)
        .eq('status', 'active')
        .maybeSingle();
      if (data) return { ok: true };
    }
  } else {
    if (post.visibility === 'followers') {
      const { data } = await supabase
        .from('visitor_creator_follow')
        .select('visitor_id')
        .eq('creator_id', post.creator_id)
        .eq('visitor_id', identity.visitor_id)
        .eq('active', true)
        .maybeSingle();
      if (data) return { ok: true };
    } else if (post.visibility === 'fans') {
      const { data } = await supabase
        .from('visitor_fan_subscription')
        .select('visitor_id')
        .eq('creator_id', post.creator_id)
        .eq('visitor_id', identity.visitor_id)
        .eq('status', 'active')
        .maybeSingle();
      if (data) return { ok: true };
    }
  }

  return { ok: false, status: 403, error: 'You do not have access to this post' };
}
