import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const GEMINI_MODEL = 'gemini-1.5-flash';
const ALL_LOCALES = [
  'fr',
  'en',
  'es',
  'pt',
  'wo',
  'bm',
  'ln',
  'ar'
];
const AFRICAN_LOCALES = [
  'wo',
  'bm',
  'ln'
];
async function callGemini(recipe, sourceLocale, targetLocale, apiKey) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const prompt = `Tu es un traducteur spécialisé en cuisine africaine et de la diaspora.
Traduis avec précision les recettes en respectant les termes culinaires authentiques.

RÈGLES :
- Conserver les noms propres de plats (Thiéboudienne, Mafé, Attieké, Jollof...)
- Adapter les unités si nécessaire (ex: "une poignée" reste "une poignée", pas de conversion)
- Traduire les instructions en langage naturel, pas en langage robotique
- Ne pas ajouter ni supprimer d'étapes
- Ne jamais commenter la valeur nutritionnelle ou suggérer des modifications
- Pour les langues africaines (Wolof, Bambara, Lingala) : privilégier les termes locaux si disponibles

Traduis de ${sourceLocale} vers ${targetLocale} :

TITRE: ${recipe.title}

DESCRIPTION: ${recipe.description ?? ''}

INSTRUCTIONS:
${recipe.instructions}

FORMAT JSON STRICT (rien d'autre) :
{
  "title": "traduction du titre",
  "description": "traduction de la description",
  "instructions": "traduction des instructions"
}`;
  const response = await fetch(geminiUrl, {
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
        maxOutputTokens: 2048
      }
    })
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
async function translateToLocale(recipe, sourceLocale, targetLocale, apiKey) {
  try {
    return await callGemini(recipe, sourceLocale, targetLocale, apiKey);
  } catch (error) {
    if (AFRICAN_LOCALES.includes(targetLocale) && sourceLocale !== 'fr') {
      console.log(`Fallback: ${sourceLocale} → fr → ${targetLocale}`);
      const intermediate = await callGemini(recipe, sourceLocale, 'fr', apiKey);
      return await callGemini(intermediate, 'fr', targetLocale, apiKey);
    }
    throw error;
  }
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const body = await req.json();
    const { recipe_id, source_locale } = body;
    if (!recipe_id || !source_locale) {
      return new Response(JSON.stringify({
        error: 'recipe_id and source_locale are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: recipe, error: recipeError } = await supabase.from('recipe').select('title, description, instructions').eq('id', recipe_id).single();
    if (recipeError || !recipe) {
      return new Response(JSON.stringify({
        error: 'Recipe not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const targets = ALL_LOCALES.filter((l)=>l !== source_locale);
    // Respond immediately then continue translating
    const immediateResponse = new Response(JSON.stringify({
      success: true,
      message: 'Translation started',
      targets
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const results = await Promise.allSettled(targets.map((target)=>translateToLocale(recipe, source_locale, target, apiKey)));
    for(let i = 0; i < targets.length; i++){
      const result = results[i];
      if (result.status === 'fulfilled') {
        const { error } = await supabase.from('recipe_translation').upsert({
          recipe_id,
          locale: targets[i],
          title: result.value.title,
          description: result.value.description,
          instructions: result.value.instructions,
          is_auto: true,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'recipe_id,locale'
        });
        if (error) console.error(`Upsert error for ${targets[i]}:`, error);
        else console.log(`✓ Translated to ${targets[i]}`);
      } else {
        console.error(`✗ Translation failed for ${targets[i]}:`, result.reason);
      }
    }
    return immediateResponse;
  } catch (error) {
    console.error('translate-recipe error:', error);
    return new Response(JSON.stringify({
      error: 'service_unavailable',
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
