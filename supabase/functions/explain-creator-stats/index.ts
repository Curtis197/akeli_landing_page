import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const rateLimitStore = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 3600;
function checkRateLimit(userId) {
  const key = `explain-stats:${userId}`;
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
        message: 'Limite de 5 analyses par heure atteinte',
        retry_after: 3600
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { creator_id } = await req.json();
    const { data: creator } = await supabase.from('creator').select('id, user_id').eq('id', creator_id).eq('user_id', user.id).single();
    if (!creator) {
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
    const { data: stats } = await supabase.from('creator_dashboard_stats').select('*').eq('creator_id', creator_id).single();
    const { data: monthlyHistory } = await supabase.from('creator_revenue_log').select('amount, logged_at, revenue_type').eq('creator_id', creator_id).gte('logged_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()).order('logged_at', {
      ascending: false
    });
    const { data: topRecipes } = await supabase.from('recipe').select('title, created_at').eq('creator_id', creator_id).eq('is_published', true).limit(5);
    const monthlySummary = {};
    for (const log of monthlyHistory ?? []){
      const monthKey = log.logged_at.substring(0, 7);
      if (!monthlySummary[monthKey]) monthlySummary[monthKey] = {
        revenue: 0,
        consumptions: 0
      };
      monthlySummary[monthKey].revenue += Number(log.amount);
      if (log.revenue_type === 'consumption') monthlySummary[monthKey].consumptions++;
    }
    const systemPrompt = `Tu es un assistant analytique pour les créateurs de recettes sur Akeli, une plateforme de cuisine africaine et de la diaspora.

TON RÔLE :
- Expliquer les statistiques en langage simple et accessible
- Identifier les recettes qui fonctionnent bien et pourquoi
- Suggérer des actions concrètes et réalistes
- Célébrer les succès, même modestes

RÈGLES ABSOLUES :
- Utiliser un langage simple, sans jargon
- Ne jamais juger la valeur nutritionnelle des recettes
- Ne jamais suggérer de modifier les recettes pour les "rendre plus saines"
- Ne jamais comparer défavorablement le créateur à d'autres
- Parler au créateur comme à un partenaire, pas comme à un élève

FORMAT DE RÉPONSE (JSON strict, rien d'autre) :
{
  "explanation": "Explication globale en 2-3 phrases",
  "insights": [
    { "type": "positive" | "neutral" | "opportunity", "text": "Point clé en 1 phrase" }
  ],
  "suggestions": [
    { "action": "Action concrète", "reason": "Pourquoi (1 phrase)", "priority": "high" | "medium" | "low" }
  ]
}`;
    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7);
    const currentMonthData = monthlySummary[currentMonth] ?? {
      revenue: 0,
      consumptions: 0
    };
    const lastMonthData = monthlySummary[lastMonth] ?? {
      revenue: 0,
      consumptions: 0
    };
    const trend = lastMonthData.revenue > 0 ? Math.round((currentMonthData.revenue - lastMonthData.revenue) / lastMonthData.revenue * 100) : 0;
    const userPrompt = `Voici les données de ce créateur :

REVENUS :
- Ce mois (${currentMonth}) : ${currentMonthData.revenue.toFixed(2)}€
- Mois précédent (${lastMonth}) : ${lastMonthData.revenue.toFixed(2)}€
- Évolution : ${trend > 0 ? '+' : ''}${trend}%
- Total gagné depuis le début : ${stats?.total_revenue ?? 0}€

CONSOMMATIONS :
- Ce mois : ${currentMonthData.consumptions}
- Prochaine récompense dans : ${stats?.consumptions_to_next_euro ?? 30} consommations

CATALOGUE :
- Recettes publiées : ${stats?.recipe_count ?? 0}
- Mode Fan : ${stats?.is_fan_eligible ? 'Éligible' : `${Math.max(0, 30 - (stats?.recipe_count ?? 0))} recettes pour l'activer`}
- Fans actifs : ${stats?.fan_count ?? 0}

RECETTES RÉCENTES :
${(topRecipes ?? []).map((r, i)=>`${i + 1}. "${r.title}"`).join('\n')}

HISTORIQUE MENSUEL :
${Object.entries(monthlySummary).slice(0, 6).map(([month, data])=>`${month} : ${data.revenue.toFixed(2)}€ (${data.consumptions} consommations)`).join('\n')}

Génère une explication de ces stats pour le créateur.`;
    const result = await callClaude(systemPrompt, userPrompt);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('explain-creator-stats error:', error);
    return new Response(JSON.stringify({
      error: 'service_unavailable',
      message: 'Analyse temporairement indisponible',
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
