import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GEMINI_MODEL = 'gemini-3.5-flash';
const VALID_LOCALES = ['fr', 'en', 'es', 'pt', 'wo', 'bm', 'ln', 'ar'];

class FnError extends Error {
  constructor(public category: string, message: string) {
    super(message);
    this.name = 'FnError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Gemini with exponential backoff on rate-limit / server / network errors.
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
  throw new FnError('gemini_failed', `Gemini unreachable after ${maxRetries + 1} attempts: ${lastErr}`);
}

interface StepRow {
  id: string;
  step_number: number;
  sort_order: number;
  title: string | null;
  content: string | null;
  is_section_header: boolean;
}

// Translate every step of a recipe to one target locale in a single Gemini call.
async function translateSteps(
  steps: StepRow[],
  sourceLocale: string,
  targetLocale: string,
  apiKey: string
): Promise<Array<{ id: string; title: string | null; content: string | null }>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const input = steps.map((s) => ({
    id: s.id,
    is_section_header: s.is_section_header,
    title: s.title,
    content: s.content
  }));

  const prompt = `Tu es un traducteur spécialisé en cuisine africaine et de la diaspora.
Traduis les étapes d'une recette de ${sourceLocale} vers ${targetLocale}.

RÈGLES :
- Conserver les noms propres de plats (Thiéboudienne, Mafé, Attiéké, Jollof...).
- Langage naturel, pas robotique. Ne JAMAIS ajouter, supprimer, fusionner ou réordonner d'étapes.
- Ne jamais commenter la valeur nutritionnelle ni suggérer de modifications.
- En-tête de section (is_section_header=true) : traduire "title", laisser "content" à null.
- Étape normale (is_section_header=false) : traduire "content", laisser "title" à null.
- Conserver EXACTEMENT le champ "id" de chaque étape (ne jamais l'inventer ni le modifier).
- Langues africaines (Wolof=wo, Bambara=bm, Lingala=ln) : privilégier les termes locaux.

Étapes (JSON) :
${JSON.stringify(input)}

Réponds avec un objet JSON STRICT (rien d'autre) :
{ "steps": [ { "id": "<id inchangé>", "title": <string|null>, "content": <string|null> } ] }`;

  const resp = await callGeminiWithRetry(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' }
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new FnError('gemini_failed', `Gemini ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new FnError('invalid_ai_output', `finishReason=${candidate.finishReason}`);
  }
  const rawText = candidate?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new FnError('invalid_ai_output', 'missing steps array');
  }
  return parsed.steps;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: creator, error: creatorError } = await adminClient
      .from('creator').select('id').eq('user_id', user.id).maybeSingle();
    if (creatorError || !creator) return json({ error: 'Creator account not found' }, 403);
    const creatorId = creator.id;

    const body = await req.json();
    const recipe_id = body.recipe_id;
    const source_locale = body.source_locale;
    const target_locales: string[] = Array.isArray(body.target_locales) ? body.target_locales : [];
    if (!recipe_id || !source_locale) return json({ error: 'recipe_id and source_locale are required' }, 400);

    // Ownership: the caller must own this recipe.
    const { data: recipe, error: recipeError } = await adminClient
      .from('recipe').select('creator_id').eq('id', recipe_id).single();
    if (recipeError || !recipe) return json({ error: 'Recipe not found' }, 404);
    if (recipe.creator_id !== creatorId) {
      return json({ error: 'Unauthorized: this recipe does not belong to you' }, 403);
    }

    const targets = target_locales.filter((l) => VALID_LOCALES.includes(l) && l !== source_locale);
    if (targets.length === 0) return json({ translated: 0, skipped: 'no target locales' }, 200);

    const { data: steps, error: stepsError } = await adminClient
      .from('recipe_step')
      .select('id, step_number, sort_order, title, content, is_section_header')
      .eq('recipe_id', recipe_id)
      .order('sort_order');
    if (stepsError) throw new FnError('db_failed', stepsError.message);
    if (!steps || steps.length === 0) return json({ translated: 0, skipped: 'no steps' }, 200);

    const stepIds = new Set((steps as StepRow[]).map((s) => s.id));
    const apiKey = Deno.env.get('GEMINI_API_KEY')!;
    const nowIso = new Date().toISOString();

    const results = await Promise.allSettled(targets.map(async (locale) => {
      const translated = await translateSteps(steps as StepRow[], source_locale, locale, apiKey);
      const rows = translated
        .filter((t) => t && stepIds.has(t.id))
        .map((t) => ({
          step_id: t.id,
          locale,
          title: t.title ?? null,
          content: t.content ?? null,
          is_auto: true,
          generated_at: nowIso,
          updated_at: nowIso
        }));
      if (rows.length === 0) throw new FnError('invalid_ai_output', `no valid rows for ${locale}`);
      const { error } = await adminClient
        .from('recipe_step_translation')
        .upsert(rows, { onConflict: 'step_id,locale' });
      if (error) throw new FnError('db_failed', `upsert ${locale}: ${error.message}`);
      return locale;
    }));

    const succeeded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value as string] : []));
    const failed = targets.filter((l) => !succeeded.includes(l));
    if (failed.length) {
      console.error('translate-recipe-steps: failed locales', failed,
        results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : [])));
    }
    return json({ translated: succeeded.length, locales: succeeded, failed }, 200);

  } catch (err) {
    console.error('translate-recipe-steps error:', err);
    const category = err instanceof FnError ? err.category : 'internal_server_error';
    const status = (category === 'gemini_failed' || category === 'invalid_ai_output') ? 502 : 500;
    return new Response(JSON.stringify({ error: category }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
