import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GEMINI_MODEL = 'gemini-3.5-flash';

interface StepRow {
  id: string;
  step_number: number;
  sort_order: number;
  title: string | null;
  content: string | null;
  timer_seconds: number | null;
  is_section_header: boolean;
}

interface ApplyStepInput {
  step_number: number;
  sort_order: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  timer_seconds: number | null;
  is_section_header: boolean;
  ingredient_ids: string[];
}

interface PreviewRequest {
  recipe_id: string;
  mode: 'preview';
}

interface ApplyRequest {
  recipe_id: string;
  mode: 'apply';
  title: string;
  description: string | null;
  steps: ApplyStepInput[];
}

type CleanerRequest = PreviewRequest | ApplyRequest;

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
      return resp;
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

function buildPrompt(params: {
  language: string;
  title: string;
  description: string | null;
  ingredientsFormatted: string;
  stepsFormatted: string;
}): string {
  const { language, title, description, ingredientsFormatted, stepsFormatted } = params;
  return `Tu es un assistant de correction et de standardisation pour des créateurs de recettes culinaires africaines sur Akeli.

RÈGLES ABSOLUES (s'appliquent à TOUS les champs : titre, description, étapes) :
- Ne jamais commenter la qualité culinaire ou nutritionnelle
- Ne jamais suggérer de modifier les ingrédients ou les quantités pour des raisons de santé
- Ne jamais juger les choix culturels ou traditionnels
- Répondre dans la langue du texte fourni (code langue : ${language})

TITRE ET DESCRIPTION — correction légère UNIQUEMENT :
- Corriger uniquement les fautes d'orthographe et de grammaire évidentes
- Ne jamais reformuler pour le style, ne jamais "améliorer" le ton — seulement corriger les erreurs
- Si aucune erreur, ne renvoie pas de suggestion pour ce champ (null)

ÉTAPES — restructuration :
1. Une action par étape : diviser les étapes complexes en étapes séquentielles à action unique
2. Chaque ingrédient de la liste doit être utilisé dans au moins une étape ; s'il en manque, propose une nouvelle étape via new_step_suggestions plutôt que de l'ignorer
3. Ne jamais inclure de quantités précises (ex: "200g", "2 c.à.s") dans le texte d'une étape — les quantités vivent uniquement dans la liste d'ingrédients, jamais dans les instructions
4. Ne renvoie une entrée dans step_proposals QUE pour les étapes qui ont réellement besoin d'un changement (reformulation ou découpage) — ignore les étapes déjà correctes
5. Estime un minuteur ("timer_seconds") pour les étapes de cuisson/attente actives si pertinent, sinon null

Titre : "${title}"
Description : "${description ?? '(aucune)'}"

Liste d'ingrédients :
${ingredientsFormatted}

Étapes actuelles (avec leur identifiant) :
${stepsFormatted}

Réponds avec un objet JSON strict (et rien d'autre) au format suivant :
{
  "title_suggestion": { "suggested": "string", "reason": "string" } | null,
  "description_suggestion": { "suggested": "string", "reason": "string" } | null,
  "step_proposals": [
    {
      "step_id": "identifiant de l'étape existante",
      "change_type": "reworded" | "split",
      "suggested": [
        { "title": "string ou null", "content": "string ou null", "timer_seconds": number | null, "is_section_header": boolean }
      ],
      "reason": "string ou null"
    }
  ],
  "new_step_suggestions": [
    { "after_step_id": "identifiant ou null pour insérer au début", "content": "string", "reason": "string" }
  ],
  "evaluation": {
    "ordering_issues": "string ou null",
    "general_observations": "string ou null"
  }
}`;
}

function validatePreviewResult(result: unknown): result is {
  title_suggestion: { suggested: string; reason: string } | null;
  description_suggestion: { suggested: string; reason: string } | null;
  step_proposals: Array<{
    step_id: string;
    change_type: 'reworded' | 'split';
    suggested: Array<{ title: string | null; content: string | null; timer_seconds: number | null; is_section_header: boolean }>;
    reason: string | null;
  }>;
  new_step_suggestions: Array<{ after_step_id: string | null; content: string; reason: string }>;
  evaluation: { ordering_issues: string | null; general_observations: string | null };
} {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  if (!('title_suggestion' in r) || !('description_suggestion' in r)) return false;
  if (!Array.isArray(r.step_proposals) || !Array.isArray(r.new_step_suggestions)) return false;
  if (!r.evaluation || typeof r.evaluation !== 'object') return false;
  return true;
}

async function handlePreview(
  adminClient: SupabaseClient,
  creatorId: string,
  recipeId: string
): Promise<Response> {
  // Rate-limit: 200 calls/creator/24h. Only preview calls Gemini, so only preview
  // is gated — apply is a pure DB write and costs nothing to allow freely.
  const { data: allowed, error: rlError } = await adminClient.rpc(
    'check_and_record_cleaner_call', { p_creator_id: creatorId }
  );
  if (rlError) {
    console.error('recipe-cleaner: rate-limit RPC error:', rlError.message);
    throw new CleanerError('internal', 'Rate-limit check failed');
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' }
    });
  }

  const { data: recipe, error: recipeError } = await adminClient
    .from('recipe')
    .select(`
      id, title, description, language,
      recipe_ingredient (
        id, quantity, unit, is_optional, is_section_header, title,
        ingredient:ingredient_id (name_fr, name_en)
      ),
      recipe_step (
        id, step_number, sort_order, title, content, timer_seconds, is_section_header
      )
    `)
    .eq('id', recipeId)
    .single();

  if (recipeError || !recipe) {
    return new Response(JSON.stringify({ error: 'Recipe not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const ingredients = recipe.recipe_ingredient || [];
  const steps = ((recipe.recipe_step ?? []) as StepRow[]).sort((a, b) => a.sort_order - b.sort_order);

  const ingredientsFormatted = ingredients.map((ri: any) => {
    if (ri.is_section_header) return `[SECTION] ${ri.title}`;
    const name = ri.ingredient?.name_fr || ri.ingredient?.name_en || 'Unknown';
    const quantityStr = ri.quantity ? `${ri.quantity} ` : '';
    const unitStr = ri.unit ? `${ri.unit} ` : '';
    return `- ${quantityStr}${unitStr}${name}${ri.is_optional ? ' (facultatif)' : ''}`;
  }).join('\n');

  const stepsFormatted = steps.map((step) => {
    if (step.is_section_header) return `[${step.id}] (Section) ${step.title}`;
    const timerStr = step.timer_seconds ? ` [Timer: ${step.timer_seconds}s]` : '';
    return `[${step.id}] ${step.content}${timerStr}`;
  }).join('\n');

  const prompt = buildPrompt({
    language: recipe.language || 'fr',
    title: recipe.title,
    description: recipe.description,
    ingredientsFormatted,
    stepsFormatted
  });

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
  if (finishReason && finishReason !== 'STOP') {
    console.error(`recipe-cleaner: Gemini finishReason=${finishReason}`);
    throw new CleanerError('invalid_ai_output', `Gemini did not complete cleanly (${finishReason})`);
  }

  const rawText = candidate?.content?.parts?.[0]?.text ?? '';
  let result: unknown;
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleaned);
  } catch {
    console.error('recipe-cleaner: unparseable Gemini output:', rawText.slice(0, 500));
    throw new CleanerError('invalid_ai_output', 'Gemini returned unparseable output');
  }

  if (!validatePreviewResult(result)) {
    throw new CleanerError('invalid_ai_output', 'Gemini output is missing required fields');
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleApply(
  adminClient: SupabaseClient,
  authHeader: string,
  recipeId: string,
  title: string,
  description: string | null,
  steps: ApplyStepInput[]
): Promise<Response> {
  if (!Array.isArray(steps) || steps.length === 0) {
    return new Response(JSON.stringify({ error: 'steps must be a non-empty array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Capture the recipe's existing step-translation locales BEFORE the replace wipes
  // them (recipe_step_translation.step_id CASCADEs when the old steps are deleted).
  const { data: existingSteps } = await adminClient
    .from('recipe_step')
    .select('id')
    .eq('recipe_id', recipeId);
  const existingStepIds = (existingSteps ?? []).map((s: { id: string }) => s.id);
  let priorLocales: string[] = [];
  if (existingStepIds.length > 0) {
    const { data: priorRows } = await adminClient
      .from('recipe_step_translation')
      .select('locale')
      .in('step_id', existingStepIds);
    priorLocales = [...new Set((priorRows ?? []).map((r: { locale: string }) => r.locale))];
  }

  const { data: stepsCount, error: rpcError } = await adminClient.rpc('replace_recipe_steps', {
    p_recipe_id: recipeId,
    p_steps: steps
  });

  if (rpcError) {
    console.error('recipe-cleaner: replace_recipe_steps failed:', rpcError.message);
    throw new CleanerError('db_failed', 'Failed to persist cleaned steps');
  }

  const { data: recipeRow, error: recipeFetchError } = await adminClient
    .from('recipe')
    .select('language')
    .eq('id', recipeId)
    .single();

  const { error: updateError } = await adminClient
    .from('recipe')
    .update({ title, description })
    .eq('id', recipeId);

  if (priorLocales.length > 0 && recipeRow && !recipeFetchError) {
    const trigger = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translate-recipe-steps`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId, source_locale: recipeRow.language, target_locales: priorLocales })
    }).catch((e) => console.error('recipe-cleaner: step re-translation trigger failed:', e));
    const ert = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (ert?.waitUntil) ert.waitUntil(trigger); else await trigger;
  }

  if (updateError) {
    console.error('recipe-cleaner: title/description update failed:', updateError.message);
    return new Response(JSON.stringify({
      applied: true,
      steps_count: stepsCount,
      title_description_error: 'steps_saved_title_description_failed'
    }), {
      status: 207,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ applied: true, steps_count: stepsCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
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

    const body: CleanerRequest = await req.json();
    if (!body.recipe_id) {
      return new Response(JSON.stringify({ error: 'recipe_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: ownedRecipe, error: ownedRecipeError } = await adminClient
      .from('recipe')
      .select('id, creator_id')
      .eq('id', body.recipe_id)
      .single();

    if (ownedRecipeError || !ownedRecipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (ownedRecipe.creator_id !== creatorId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: this recipe does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.mode === 'apply') {
      return await handleApply(adminClient, authHeader, body.recipe_id, body.title, body.description, body.steps);
    }
    return await handlePreview(adminClient, creatorId, body.recipe_id);
  } catch (err) {
    console.error('recipe-cleaner error:', err);
    const category = err instanceof CleanerError ? err.category : 'internal_server_error';
    const status = (category === 'gemini_failed' || category === 'invalid_ai_output') ? 502 : 500;
    return new Response(JSON.stringify({ error: category }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
