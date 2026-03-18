import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0';
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
function buildSystemPrompt(recipe, devHistory) {
  const recipeJson = JSON.stringify(recipe, null, 2);
  const historyJson = devHistory.length ? JSON.stringify(devHistory, null, 2) : 'No development history yet — this is the first session.';
  return `You are an expert culinary R&D assistant for Akeli, an African health & nutrition app.
You are working with a creator on one specific recipe. Your role is to help them improve it
through research, conversation, and structured iteration.

You operate in four modes — use whichever fits the conversation:

## BROWSE
When the creator asks to see or understand the recipe, present it clearly:
- Show ingredients grouped by section
- Show steps in order
- Highlight nutritional profile if macros are available
- Show development history timeline if relevant

## INSPIRE
When the creator wants ideas or external inspiration:
- Propose 2-3 concrete adaptation directions based on the conversation
- Reference culinary traditions, techniques, or substitutions relevant to African cuisine
- Always connect inspiration back to this specific recipe
- Never suggest changes that would compromise the health/nutrition profile

## IMPROVE
When the creator wants to apply changes:
- Summarize exactly what will change before confirming
- Be precise: which ingredient, which step, which quantity
- Flag any nutritional impact (positive or negative)
- Remind them the changes will be logged automatically

## LOG
At the end of any meaningful session, you will be asked to generate a log entry.
Produce a JSON object with these fields:
{
  "discussion_summary": "2-4 sentence summary of what was explored and decided",
  "change_summary": "plain text of what changed, or null if nothing applied",
  "changes_made": [{"field": "...", "old_value": "...", "new_value": "..."}] or null,
  "inspiration_source": "web search | conversation | personal experiment | null",
  "inspiration_notes": "what triggered this iteration",
  "outcome_notes": "any tasting notes or observations, or null",
  "status": "applied | draft | pending_test | rejected"
}

---

## Current recipe

${recipeJson}

---

## Development history (previous sessions)

${historyJson}

---

## Rules

- Default language is French for recipe content. Respond in the same language the creator uses.
- Never suggest adding pork or pork derivatives if is_pork_free is true on this recipe.
- Akeli is a health app — always flag changes that significantly increase calories or reduce protein.
- Be direct and precise. This is a professional R&D tool, not a casual chat.
- When proposing changes, always give quantities and units, not vague suggestions.
- Respect the regional identity of the recipe (region field). Fusion is fine if the creator initiates it.`;
}
async function loadRecipeContext(supabase, recipeId, creatorUserId) {
  const { data: recipe, error: recipeError } = await supabase.from('recipe').select(`
      *,
      recipe_macro (*),
      recipe_ingredient (
        id, quantity, unit, is_optional, sort_order, title, is_section_header,
        ingredient:ingredient_id (id, name_fr, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
      ),
      recipe_step (id, step_number, sort_order, title, content, timer_seconds, is_section_header),
      creator:creator_id (id, user_id, display_name)
    `).eq('id', recipeId).single();
  if (recipeError || !recipe) throw new Error('Recipe not found');
  if (recipe.creator?.user_id !== creatorUserId) throw new Error('Unauthorized: this recipe does not belong to you');
  recipe.recipe_ingredient?.sort((a, b)=>a.sort_order - b.sort_order);
  recipe.recipe_step?.sort((a, b)=>a.sort_order - b.sort_order);
  const { data: devHistory } = await supabase.from('recipe_development').select('version, improvement_date, change_summary, discussion_summary, inspiration_source, outcome_rating, status').eq('recipe_id', recipeId).order('version', {
    ascending: true
  });
  return {
    recipe,
    devHistory: devHistory || []
  };
}
async function saveDevLog(supabase, recipeId, logData, macroBefore) {
  const { error } = await supabase.from('recipe_development').insert({
    recipe_id: recipeId,
    improvement_date: new Date().toISOString(),
    discussion_summary: logData.discussion_summary,
    change_summary: logData.change_summary,
    changes_made: logData.changes_made,
    inspiration_source: logData.inspiration_source,
    inspiration_notes: logData.inspiration_notes,
    conversation_log: logData.conversation_log,
    macros_before: macroBefore,
    outcome_notes: logData.outcome_notes,
    status: logData.status || 'draft'
  });
  if (error) throw new Error(`Failed to save dev log: ${error.message}`);
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', {
      status: 401
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', {
      status: 401
    });
    const body = await req.json();
    const { recipe_id, messages, save_log } = body;
    if (!recipe_id) {
      return new Response(JSON.stringify({
        error: 'recipe_id is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { recipe, devHistory } = await loadRecipeContext(supabase, recipe_id, user.id);
    const systemPrompt = buildSystemPrompt(recipe, devHistory);
    if (save_log) {
      await saveDevLog(supabase, recipe_id, {
        ...save_log,
        conversation_log: messages
      }, recipe.recipe_macro);
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({
        error: 'messages array is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m)=>({
          role: m.role,
          content: m.content
        }))
    });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start (controller) {
        for await (const chunk of stream){
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              text: chunk.delta.text
            })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('recipe-dev-chat error:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Internal error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
