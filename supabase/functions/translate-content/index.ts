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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({
        data: null,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) return new Response(JSON.stringify({
      data: null,
      error: 'Translation service not configured yet'
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const { content, source_language, target_language } = await req.json();
    if (!content || !source_language || !target_language) {
      return new Response(JSON.stringify({
        data: null,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const prompt = `Tu es un traducteur expert en cuisine africaine. Traduis le texte suivant du ${source_language === 'fr' ? 'français' : 'anglais'} vers la langue cible (code: ${target_language}). 

Respecte le vocabulaire culinaire local et les noms d'ingrédients africains (ne les traduis pas s'ils sont des noms propres locaux). Réponds uniquement avec la traduction, sans explication.

Texte à traduire:
${content}`;
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      })
    });
    const geminiData = await geminiRes.json();
    const translation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translation) throw new Error('No translation returned from Gemini');
    return new Response(JSON.stringify({
      data: {
        translation,
        source_language,
        target_language
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
    console.error('[translate-content] Error:', err);
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
