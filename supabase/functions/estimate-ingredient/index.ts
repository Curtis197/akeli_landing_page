import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const CLAUDE_MODEL = 'claude-sonnet-5';

function extractFinalText(content) {
  const textBlocks = (content ?? []).filter((block)=>block.type === 'text');
  return textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '';
}

async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CLAUDE_API_KEY'),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 3
        },
        {
          type: 'web_fetch_20260209',
          name: 'web_fetch',
          max_uses: 3,
          max_content_tokens: 8000
        }
      ],
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errBody}`);
  }
  const data = await response.json();
  const text = extractFinalText(data.content);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

function isValidResult(result, categoryCodes) {
  if (!result || typeof result !== 'object') return false;
  const { nameFr, nameEn, category, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g } = result;
  if (typeof nameFr !== 'string' || !nameFr) return false;
  if (typeof nameEn !== 'string' || !nameEn) return false;
  if (typeof category !== 'string' || !categoryCodes.includes(category)) return false;
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
    const claudeKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeKey) {
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), serviceKey);
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

Use web search and web fetch to find real, reliable nutrition data for this specific ingredient (prefer official nutrition databases like USDA FoodData Central, Open Food Facts, or reputable food-composition sources) before answering. Do not guess if you can find a real source.

Respond with strict JSON only, no other text, no markdown fences, matching exactly this shape:
{
  "nameFr": "French name",
  "nameEn": "English name",
  "category": "one of the valid category codes listed below",
  "caloriesPer100g": number,
  "proteinPer100g": number,
  "carbsPer100g": number,
  "fatPer100g": number
}

Valid categories (code and English name): ${categoryList}

All four macro values are per 100g of the edible ingredient, as non-negative numbers.`;
    const result = await callClaude(prompt);
    if (!isValidResult(result, categoryCodes)) {
      throw new Error('Model returned an invalid or incomplete result');
    }
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
