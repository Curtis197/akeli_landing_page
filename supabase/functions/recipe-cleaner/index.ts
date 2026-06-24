import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GEMINI_MODEL = 'gemini-3.5-flash';

interface CleanRecipeRequest {
  recipe_id: string;
  commit?: boolean;
}

// Categorized error so the handler can return a non-sensitive error type to the caller.
class CleanerError extends Error {
  constructor(public category: string, message: string) {
    super(message);
    this.name = 'CleanerError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Call Gemini with exponential backoff on rate-limit (429) / server (5xx) / network errors.
async function callGeminiWithRetry(url: string, payload: object, maxRetries = 3): Promise<Response> {
  let lastErr = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) return resp;
      if ((resp.status === 429 || resp.status >= 500) && attempt < maxRetries) {
        lastErr = `status ${resp.status}`;
        await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
        continue;
      }
      return resp; // non-retryable response — let the caller inspect it
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
        continue;
      }
    }
  }
  throw new CleanerError('gemini_failed', `Gemini unreachable after ${maxRetries + 1} attempts: ${lastErr}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Creator-only: require an authenticated creator. No bypass key, no admin backdoor.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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

    // Verify the caller's session and resolve their creator account.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    const creatorId = creator.id;

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
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ownership: a creator may only clean their own recipes.
    if (recipe.creator_id !== creatorId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: this recipe does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await callGeminiWithRetry(geminiUrl, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json'
      }
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`recipe-cleaner: Gemini API ${geminiResponse.status} ${geminiResponse.statusText} - ${errText}`);
      throw new CleanerError('gemini_failed', `Gemini API returned ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const candidate = geminiData.candidates?.[0];
    const finishReason = candidate?.finishReason;
    // STOP = normal completion. MAX_TOKENS = truncated (output too long); SAFETY/RECITATION = blocked.
    if (finishReason && finishReason !== 'STOP') {
      console.error(`recipe-cleaner: Gemini finishReason=${finishReason}`);
      throw new CleanerError('invalid_ai_output', `Gemini did not complete cleanly (${finishReason})`);
    }

    const rawText = candidate?.content?.parts?.[0]?.text ?? '';

    let result;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('recipe-cleaner: unparseable Gemini output:', rawText.slice(0, 500));
      throw new CleanerError('invalid_ai_output', 'Gemini returned unparseable output');
    }

    if (!result || typeof result !== 'object' || !Array.isArray(result.steps)) {
      throw new CleanerError('invalid_ai_output', 'Gemini output is missing a valid steps array');
    }

    let commitResult = null;

    if (commit && Array.isArray(result.steps) && result.steps.length > 0) {
      // Atomic replace: delete + insert run in one transaction inside the RPC, so a
      // mid-insert failure (e.g. a check-constraint violation) rolls back and leaves the
      // recipe's original steps intact. The RPC is service_role-only (see migration).
      const { data: stepsCount, error: rpcError } = await adminClient.rpc('replace_recipe_steps', {
        p_recipe_id: recipe_id,
        p_steps: result.steps
      });

      if (rpcError) {
        console.error('recipe-cleaner: replace_recipe_steps failed:', rpcError.message);
        throw new CleanerError('db_failed', 'Failed to persist cleaned steps');
      }

      commitResult = {
        committed: true,
        steps_count: stepsCount
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
    console.error('recipe-cleaner error:', err);
    const category = err instanceof CleanerError ? err.category : 'internal_server_error';
    // 502 for upstream AI issues, 500 for our own failures. No internal details leak to the caller.
    const status = (category === 'gemini_failed' || category === 'invalid_ai_output') ? 502 : 500;
    return new Response(JSON.stringify({ error: category }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
