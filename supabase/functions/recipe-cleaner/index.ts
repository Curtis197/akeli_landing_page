import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GEMINI_MODEL = 'gemini-3.5-flash';

interface CleanRecipeRequest {
  recipe_id: string;
  commit?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bypassKey = req.headers.get('x-bypass-key');
    const expectedBypassKey = Deno.env.get('CLEANER_BYPASS_KEY');
    // Bypass only works when CLEANER_BYPASS_KEY is explicitly configured — no hardcoded fallback.
    const isBypassed = expectedBypassKey != null && bypassKey !== null && bypassKey === expectedBypassKey;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader && !isBypassed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase Clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client using service role for db operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let userEmail = '';
    let creatorId = '';

    if (!isBypassed) {
      // Client using user's auth token
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader! } }
      });

      // Get user and verify session
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userEmail = user.email || '';

      // Fetch creator ID corresponding to user
      const { data: creator, error: creatorError } = await adminClient
        .from('creator')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorError || !creator) {
        return new Response(JSON.stringify({ error: 'Creator account not found' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      creatorId = creator.id;
    }

    // Parse request body
    const body: CleanRecipeRequest = await req.json();
    const { recipe_id, commit = false } = body;





    if (!recipe_id) {
      return new Response(JSON.stringify({ error: 'recipe_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch the recipe with ingredients and current steps
    const { data: recipe, error: recipeError } = await adminClient
      .from('recipe')
      .select(`
        id,
        title,
        description,
        creator_id,
        recipe_ingredient (
          id, quantity, unit, is_optional, is_section_header, title,
          ingredient:ingredient_id (name_fr, name_en)
        ),
        recipe_step (
          id, step_number, sort_order, title, content, timer_seconds, is_section_header
        )
      `)
      .eq('id', recipe_id)
      .single();

    if (recipeError || !recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found', details: recipeError?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership if not bypassed
    if (!isBypassed) {
      const isOwner = recipe.creator_id === creatorId;
      const isSupport = userEmail?.endsWith('@a-keli.com') || creatorId === '1a1b225a-1328-4d58-976f-253574410c6f'; // Curtis ID
      
      if (!isOwner && !isSupport) {
        return new Response(JSON.stringify({ error: 'Unauthorized: this recipe does not belong to you' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Sort existing ingredients and steps
    const ingredients = recipe.recipe_ingredient || [];
    const currentSteps = (recipe.recipe_step || []).sort((a, b) => a.sort_order - b.sort_order);

    // Format list of ingredients for the prompt
    const ingredientsFormatted = ingredients.map(ri => {
      if (ri.is_section_header) {
        return `[SECTION HEADER] ${ri.title}`;
      }
      const name = ri.ingredient?.name_fr || ri.ingredient?.name_en || 'Unknown';
      const quantityStr = ri.quantity ? `${ri.quantity} ` : '';
      const unitStr = ri.unit ? `${ri.unit} ` : '';
      return `- ${quantityStr}${unitStr}${name}${ri.is_optional ? ' (facultatif)' : ''}`;
    }).join('\n');

    // Format current steps for the prompt
    const stepsFormatted = currentSteps.map(step => {
      if (step.is_section_header) {
        return `Step ${step.step_number} (Section Header): ${step.title}`;
      }
      const timerStr = step.timer_seconds ? ` [Timer: ${step.timer_seconds}s]` : '';
      return `Step ${step.step_number}: ${step.content}${timerStr}`;
    }).join('\n');

    // Construct Gemini Prompt
    const prompt = `You are an expert culinary R&D assistant for Akeli, an African health & nutrition app.
Your role is to clean, restructure, and improve the instructions (steps) of a given recipe.

You must strictly enforce the following normalization conventions:
1. One action per step: Split complex, multi-sentence steps into sequential, single-action steps. Each step must represent exactly ONE instruction (e.g., "Laver les légumes." and then "Couper les légumes en dés." rather than "Laver et couper les légumes en dés.").
2. Use all ingredients: Every single ingredient listed in the recipe's ingredient list MUST be explicitly used or addressed in the steps. Do not omit any spices, oils, main proteins, or vegetables.
3. Clear and simple language: Rewrite the steps in clear, direct, and simple French. Keep sentences short and punchy.
4. Database constraints:
   - For section headers: "is_section_header" must be true, "title" must be a string (e.g., "Pour la sauce"), and "content" must be null.
   - For normal steps: "is_section_header" must be false, "title" must be null, and "content" must be a non-empty string.
   - Each step must have a unique, sequential "step_number" starting from 1.
   - Each step must have a unique, sequential "sort_order" starting from 0.
   - Estimate and provide a "timer_seconds" (integer) for active cooking or waiting steps if relevant (e.g., "laisser mijoter 20 minutes" -> 1200), otherwise set it to null.

Input data:
Recipe Title: ${recipe.title}
Recipe Description: ${recipe.description || 'No description provided'}

Ingredients list:
${ingredientsFormatted}

Current Steps:
${stepsFormatted}

Return a strict JSON object (and absolutely nothing else, no markdown formatting outside of a JSON code block if needed, but prefer plain JSON) matching this format:
{
  "evaluation": {
    "missing_ingredients": ["list of ingredients that were in the list but missing from current steps"],
    "ordering_issues": "description of any sequencing/ordering issues found in the original steps",
    "general_observations": "observations on spelling, grammar, clarity, or complexity"
  },
  "steps": [
    {
      "step_number": 1,
      "sort_order": 0,
      "title": "Optional Title if section header, otherwise null",
      "content": "Action detail here, or null if section header",
      "timer_seconds": null,
      "is_section_header": false
    }
  ]
}

Ensure the output is valid JSON, and matches all the database check constraints perfectly.`;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;
    console.log("GEMINI_API_KEY loaded: length =", geminiApiKey ? geminiApiKey.length : "undefined");
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText} - ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let result;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse JSON response from Gemini: ${rawText}`);
    }

    let commitResult = null;

    if (commit && result.steps && Array.isArray(result.steps)) {
      // Begin database replacement in a transaction-like way
      // Delete existing steps
      const { error: deleteError } = await adminClient
        .from('recipe_step')
        .delete()
        .eq('recipe_id', recipe_id);

      if (deleteError) {
        throw new Error(`Failed to delete old recipe steps: ${deleteError.message}`);
      }

      // Format steps for insertion
      const stepsToInsert = result.steps.map((step: any) => ({
        recipe_id,
        step_number: step.step_number,
        sort_order: step.sort_order,
        title: step.title || null,
        content: step.content || null,
        timer_seconds: step.timer_seconds || null,
        is_section_header: step.is_section_header || false
      }));

      // Insert new steps
      const { data: insertedSteps, error: insertError } = await adminClient
        .from('recipe_step')
        .insert(stepsToInsert)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert new recipe steps: ${insertError.message}`);
      }

      commitResult = {
        committed: true,
        steps_count: insertedSteps.length
      };
    }

    return new Response(JSON.stringify({
      evaluation: result.evaluation,
      steps: result.steps,
      commit: commitResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const key = Deno.env.get('GEMINI_API_KEY');
    const keyInfo = key ? `key length: ${key.length}, prefix: ${key.substring(0, 5)}...` : 'key is undefined';
    console.error('recipe-cleaner error:', err);
    return new Response(JSON.stringify({
      error: 'internal_server_error',
      message: `${err instanceof Error ? err.message : 'Unknown error'} (Debug: ${keyInfo})`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
