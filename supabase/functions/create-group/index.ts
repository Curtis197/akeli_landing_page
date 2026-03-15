import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the auth token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { name, is_public } = await req.json();
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Missing name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-group] name:', name, 'is_public:', is_public);

    // Client with the user's JWT — respects RLS
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client — bypasses RLS for the multi-step inserts
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Verify the user is authenticated and is a creator
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[create-group] auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-group] user id:', user.id);

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creator')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (creatorError || !creator) {
      console.error('[create-group] creator check error:', creatorError);
      return new Response(
        JSON.stringify({ error: 'User is not a creator', detail: creatorError?.message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert community_group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('community_group')
      .insert({ name, is_public: is_public ?? true, creator_id: user.id })
      .select('id')
      .single();

    if (groupError || !group) {
      console.error('[create-group] community_group insert error:', groupError);
      return new Response(
        JSON.stringify({ error: 'Failed to create group', detail: groupError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-group] group created:', group.id);

    // Insert conversation
    const { data: conv, error: convError } = await supabaseAdmin
      .from('conversation')
      .insert({ type: 'creator_group', name, created_by: user.id, community_group_id: group.id })
      .select('id')
      .single();

    if (convError || !conv) {
      console.error('[create-group] conversation insert error:', convError);
      // Rollback: delete the group
      await supabaseAdmin.from('community_group').delete().eq('id', group.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create conversation', detail: convError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-group] conversation created:', conv.id);

    // Insert participant
    const { error: partError } = await supabaseAdmin
      .from('conversation_participant')
      .insert({ conversation_id: conv.id, user_id: user.id });

    if (partError) {
      console.error('[create-group] participant insert error:', partError);
      // Non-fatal — conv and group exist, user can still navigate
    }

    return new Response(
      JSON.stringify({ conversation_id: conv.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[create-group] unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
