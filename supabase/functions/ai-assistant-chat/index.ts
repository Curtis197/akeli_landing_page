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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return new Response(JSON.stringify({
      data: null,
      error: 'AI assistant not configured yet'
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const { message, conversation_id } = await req.json();
    if (!message) return new Response(JSON.stringify({
      data: null,
      error: 'Missing message'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Create or load conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convError } = await supabase.from('ai_conversation').insert({
        user_id: user.id,
        created_at: new Date().toISOString()
      }).select('id').single();
      if (convError) throw convError;
      convId = conv.id;
    }
    // Fetch recent messages for context
    const { data: history } = await supabase.from('ai_message').select('role, content').eq('conversation_id', convId).order('created_at', {
      ascending: true
    }).limit(10);
    // Fetch user context
    const { data: profile } = await supabase.from('user_health_profile').select('weight_kg, target_weight_kg, activity_level').eq('user_id', user.id).maybeSingle();
    const systemPrompt = `Tu es l'assistant nutrition d'Akeli, une plateforme de nutrition africaine. Tu aides les utilisateurs avec leur alimentation, leurs recettes et leurs plans de repas. Tu es bienveillant, culturellement sensible, et tu ne juges jamais les choix alimentaires culturels. 

Contexte utilisateur: poids=${profile?.weight_kg ?? 'non renseigné'}kg, objectif=${profile?.target_weight_kg ?? 'non renseigné'}kg, activité=${profile?.activity_level ?? 'non renseigné'}.

Tu réponds uniquement en lecture — tu ne modifies pas les plans de repas directement. Si l'utilisateur demande une modification, tu proposes comment le faire dans l'app.`;
    const messages = [
      ...(history ?? []).map((m)=>({
          role: m.role,
          content: m.content
        })),
      {
        role: 'user',
        content: message
      }
    ];
    // Call OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 500
      })
    });
    const openaiData = await openaiRes.json();
    const assistantMessage = openaiData.choices?.[0]?.message?.content;
    if (!assistantMessage) throw new Error('No response from OpenAI');
    // Persist messages
    await supabase.from('ai_message').insert([
      {
        conversation_id: convId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      },
      {
        conversation_id: convId,
        role: 'assistant',
        content: assistantMessage,
        created_at: new Date().toISOString()
      }
    ]);
    return new Response(JSON.stringify({
      data: {
        conversation_id: convId,
        response: assistantMessage
      },
      error: null
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[ai-assistant-chat] Error:', err);
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
