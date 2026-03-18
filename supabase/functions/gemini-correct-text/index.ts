import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const cache = new Map();
const GEMINI_MODEL = 'gemini-1.5-flash';
const CACHE_TTL_MS = 5 * 60 * 1000;
function hashText(text) {
  let hash = 0;
  for(let i = 0; i < text.length; i++){
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: creator } = await supabase.from('creator').select('id').eq('user_id', user.id).single();
    if (!creator) {
      return new Response(JSON.stringify({
        error: 'Creator account required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const body = await req.json();
    const { text, field_type, source_language } = body;
    if (!text || text.length < 5) {
      return new Response(JSON.stringify({
        has_correction: false,
        corrected_text: null,
        corrections: []
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const cacheKey = `correction:${hashText(text)}:${source_language}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
    const prompt = `Tu es un assistant de correction pour des créateurs de recettes culinaires africaines.
Ton rôle est uniquement de corriger les erreurs techniques (orthographe, grammaire, incohérences).

RÈGLES ABSOLUES :
- Ne jamais commenter la qualité culinaire ou nutritionnelle
- Ne jamais suggérer de modifier les ingrédients ou les quantités pour des raisons de santé
- Ne jamais juger les choix culturels ou traditionnels
- Corriger uniquement les fautes d'orthographe et de grammaire évidentes
- Signaler les incohérences de quantités (ex: "500kg de sel") sans jugement
- Répondre dans la même langue que le texte soumis

FORMAT DE RÉPONSE (JSON strict, rien d'autre) :
{
  "has_correction": boolean,
  "corrected_text": "texte corrigé" | null,
  "corrections": [
    {
      "original": "mot original",
      "suggestion": "correction",
      "type": "spelling" | "grammar" | "coherence",
      "explanation": "explication courte en langue source"
    }
  ]
}

Champ : ${field_type}
Langue détectée : ${source_language}
Texte à vérifier : "${text}"`;
    const geminiResponse = await fetch(geminiUrl, {
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
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });
    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status}`);
    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let result;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch  {
      result = {
        has_correction: false,
        corrected_text: null,
        corrections: []
      };
    }
    cache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('gemini-correct-text error:', error);
    return new Response(JSON.stringify({
      error: 'service_unavailable',
      message: 'Service IA temporairement indisponible',
      retry_after: 30
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
