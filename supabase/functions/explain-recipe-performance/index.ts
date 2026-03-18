import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const rateLimitStore = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 3600;
function checkRateLimit(userId) {
  const key = `explain-recipe:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_WINDOW
    });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}
async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CLAUDE_API_KEY'),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  });
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const data = await response.json();
  const text = data.content[0].text;
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch  {
    return {
      explanation: text,
      insights: [],
      suggestions: []
    };
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
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({
        error: 'rate_limited',
        retry_after: 3600
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { recipe_id, creator_id } = await req.json();
    const { data: recipe } = await supabase.from('recipe').select(`
        title, created_at, prep_time_min, cook_time_min, difficulty, region,
        creator:creator_id (user_id)
      `).eq('id', recipe_id).single();
    if (!recipe || recipe.creator?.user_id !== user.id) {
      return new Response(JSON.stringify({
        error: 'Forbidden'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: tags } = await supabase.from('recipe_tag').select('tag:tag_id (name)').eq('recipe_id', recipe_id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const { data: allConsumptions } = await supabase.from('meal_consumption').select('consumed_at').eq('recipe_id', recipe_id);
    const total = allConsumptions?.length ?? 0;
    const thisMonth = allConsumptions?.filter((c)=>c.consumed_at >= startOfMonth).length ?? 0;
    const lastMonth = allConsumptions?.filter((c)=>c.consumed_at >= startOfLastMonth && c.consumed_at <= endOfLastMonth).length ?? 0;
    const trend = lastMonth > 0 ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : thisMonth > 0 ? 100 : 0;
    const { data: creatorRecipes } = await supabase.from('recipe').select('id').eq('creator_id', creator_id).eq('is_published', true);
    const totalPublished = creatorRecipes?.length ?? 1;
    const systemPrompt = `Tu es un assistant analytique pour les créateurs de recettes sur Akeli.
Explique la performance d'une recette en analysant uniquement les facteurs de découvrabilité.

RÈGLES ABSOLUES :
- Ne jamais juger la qualité culinaire de la recette
- Ne jamais suggérer de modifier les ingrédients pour des raisons de santé
- Analyser uniquement : temps de préparation, tags, région, tendances temporelles
- Être encourageant même pour les recettes peu performantes
- Suggestions concrètes et actionnables uniquement

FORMAT DE RÉPONSE (JSON strict, rien d'autre) :
{
  "explanation": "Analyse en 2-3 phrases",
  "insights": [
    { "type": "positive" | "neutral" | "opportunity", "text": "Point en 1 phrase" }
  ],
  "suggestions": [
    { "action": "Action concrète", "reason": "Pourquoi (1 phrase)", "priority": "high" | "medium" | "low" }
  ]
}`;
    const tagNames = (tags ?? []).map((t)=>t.tag?.name).filter(Boolean).join(', ');
    const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
    const userPrompt = `RECETTE : "${recipe.title}"
Publiée le : ${new Date(recipe.created_at).toLocaleDateString('fr-FR')}
Temps total : ${totalTime} min (${recipe.prep_time_min ?? 0} prep + ${recipe.cook_time_min ?? 0} cuisson)
Difficülté : ${recipe.difficulty ?? 'Non renseignée'}
Région : ${recipe.region ?? 'Non renseignée'}
Tags : ${tagNames || 'Aucun tag'}

PERFORMANCES :
Consommations totales : ${total}
Consommations ce mois : ${thisMonth}
Consommations mois précédent : ${lastMonth}
Tendance : ${trend > 0 ? 'En hausse' : trend < 0 ? 'En baisse' : 'Stable'} (${trend > 0 ? '+' : ''}${trend}%)

CONTEXTE :
${totalPublished} recettes publiées en tout dans le catalogue

Génère un insight sur la performance de cette recette.`;
    const result = await callClaude(systemPrompt, userPrompt);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('explain-recipe-performance error:', error);
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
