import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_TIMEOUT_MS = 110000;

function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in model response: ${text.slice(0, 200)}`);
  }
  return text.slice(start, end + 1);
}

async function callGemini(prompt, geminiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(()=>controller.abort(), GEMINI_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      signal: controller.signal,
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
        tools: [
          {
            google_search: {}
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          thinkingConfig: {
            thinkingLevel: 'LOW'
          }
        }
      })
    });
  } catch (fetchError) {
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new Error('TIMEOUT: AI research took too long for this ingredient');
    }
    throw fetchError;
  } finally{
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errBody}`);
  }
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p)=>p.text ?? '').join('');
  if (!text) {
    throw new Error(`No text returned from Gemini. finishReason: ${candidate?.finishReason}`);
  }
  return {
    result: JSON.parse(extractJsonObject(text)),
    usage: data.usageMetadata
  };
}

function isValidResult(result, categoryCodes) {
  if (!result || typeof result !== 'object') return false;
  const { nameFr, nameEn, category, descriptionFr, descriptionEn, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g } = result;
  if (typeof nameFr !== 'string' || !nameFr) return false;
  if (typeof nameEn !== 'string' || !nameEn) return false;
  if (typeof category !== 'string' || !categoryCodes.includes(category)) return false;
  if (typeof descriptionFr !== 'string' || !descriptionFr) return false;
  if (typeof descriptionEn !== 'string' || !descriptionEn) return false;
  for (const value of [
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g
  ]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  }
  return true;
}

Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    const providedSecret = req.headers.get('x-internal-secret');
    const internalSecret = Deno.env.get('INTERNAL_SECRET');
    if (!internalSecret || providedSecret !== internalSecret) {
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
    if (!geminiKey) {
      return new Response(JSON.stringify({
        data: null,
        error: 'AI service not configured'
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { name, notes, categoryHint } = await req.json();
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({
        data: null,
        error: 'Missing required field: name'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    const { data: categories, error: categoriesError } = await supabase.from('ingredient_category').select('code, name_en');
    if (categoriesError || !categories || categories.length === 0) {
      throw new Error('Failed to load ingredient categories');
    }
    const categoryCodes = categories.map((c)=>c.code);
    const categoryList = categories.map((c)=>`${c.code} (${c.name_en})`).join(', ');
    const prompt = `You are helping an admin at Akeli, a nutrition app, complete a food ingredient's record before it's published.

Ingredient (as submitted by a user, may be in French, may name a regional/African dish ingredient): "${name}"
${categoryHint ? `Submitter's category hint: "${categoryHint}"` : ''}
${notes ? `Submitter's notes: "${notes}"` : ''}

Use Google Search to find real, reliable nutrition data for this specific ingredient (prefer official nutrition databases like USDA FoodData Central, Open Food Facts, or reputable food-composition sources) before answering. Do not guess if you can find a real source.

Also write a short, factual 1-2 sentence description of the ingredient in French and in English (what it is, how it's typically used) — suitable for showing to an end user browsing the ingredient in a nutrition app.

After you finish researching, respond with ONLY the JSON object below as your final message — no preamble sentence, no explanation of your sources, no markdown fences, nothing before or after it. Just the object, matching exactly this shape:
{
  "nameFr": "French name",
  "nameEn": "English name",
  "category": "one of the valid category codes listed below",
  "descriptionFr": "1-2 sentence description in French",
  "descriptionEn": "1-2 sentence description in English",
  "caloriesPer100g": number,
  "proteinPer100g": number,
  "carbsPer100g": number,
  "fatPer100g": number
}

Valid categories (code and English name): ${categoryList}

All four macro values are per 100g of the edible ingredient, as non-negative numbers.`;
    const { result, usage } = await callGemini(prompt, geminiKey);
    if (!isValidResult(result, categoryCodes)) {
      throw new Error('Model returned an invalid or incomplete result');
    }
    console.log('[estimate-ingredient] success', {
      name,
      category: result.category,
      caloriesPer100g: result.caloriesPer100g,
      promptTokens: usage?.promptTokenCount ?? null,
      candidateTokens: usage?.candidatesTokenCount ?? null,
      at: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      data: result,
      error: null
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[estimate-ingredient] Error:', err);
    const isTimeout = err instanceof Error && err.message.startsWith('TIMEOUT:');
    return new Response(JSON.stringify({
      data: null,
      error: isTimeout ? 'AI research took too long for this ingredient. Try again or fill in the fields manually.' : 'Internal server error'
    }), {
      status: isTimeout ? 504 : 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
