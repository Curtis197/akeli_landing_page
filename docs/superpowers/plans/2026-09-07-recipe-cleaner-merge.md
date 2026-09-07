# Recipe Cleaner / AI Correction Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `gemini-correct-text` and `recipe-cleaner` into a single edge function with a preview/apply workflow, wire a "Standardize with AI" review UI into the recipe wizard's Step 3, and retire the unused `gemini-correct-text` function.

**Architecture:** One edge function (`recipe-cleaner`, rewritten), two modes. `mode: "preview"` calls Gemini and returns structured, individually-acceptable proposals keyed to existing step ids (never writes to the DB). `mode: "apply"` takes the creator's fully-resolved final title/description/steps and persists them via the existing `replace_recipe_steps` RPC — no Gemini call, so it isn't rate-limited. A pure client-side function resolves accept/reject decisions into that final payload.

**Tech Stack:** Next.js App Router (TypeScript), Supabase Edge Functions (Deno), Supabase Postgres, Gemini API (`gemini-3.5-flash`), vitest.

**Spec:** `docs/superpowers/specs/2026-09-07-recipe-cleaner-merge-design.md`

## Global Constraints

- Model: `gemini-3.5-flash` everywhere (both functions disagreed before; standardized per user decision).
- Rate limit (`check_and_record_cleaner_call`, 200 calls/creator/24h) applies **only** to `mode: "preview"` — `mode: "apply"` never calls Gemini and is not gated.
- Auto-reordering is never actionable — `evaluation.ordering_issues` stays advisory text, no accept/reject control for it.
- No live/per-keystroke correction — this is a single review action triggered from Step 3, after a draft with ingredients + steps already exists.
- UI copy in the new component is **hardcoded French literals**, not `next-intl` keys — despite CLAUDE.md's stated i18n rule, every existing file in `components/creator/recipe-form/` (Step1Basic, Step3Steps, StepCard, IngredientSubmitModal, SectionHeaderRow) hardcodes French with no `useTranslations`/`getTranslations` import; only `IngredientSearch.tsx` is the outlier. Matching the local convention of the directory this component lives in.
- `supabase/functions/gemini-correct-text/` is deleted from this repo as part of this plan, but the **deployed** function on the shared Supabase project (also used by the Flutter mobile app / nutrition app per prior project notes) must not be deleted via `supabase functions delete` or the dashboard until a human confirms no other app calls it. This plan removes the source and stops redeploying it; it does not delete the live deployment.
- `replace_recipe_steps` currently drops `image_url` on every call (bug, not scope creep — see Task 1). Task 1 fixes this before anything else touches that RPC path.

---

## Task 1: Fix `replace_recipe_steps` to stop silently deleting step photos

**Files:**
- Create: `supabase/migrations/20260907100000_replace_recipe_steps_preserve_image.sql`

**Interfaces:**
- Produces: `replace_recipe_steps(p_recipe_id uuid, p_steps jsonb)` now also persists `image_url` from each step object in `p_steps` (key `"image_url"`). Signature unchanged; callers that don't send `image_url` behave exactly as before (`NULLIF(..., '')` on a missing key yields `NULL`, same as today).

- [ ] **Step 1: Confirm the column exists**

Before writing the migration, confirm `recipe_step.image_url` is a real column (referenced by `components/creator/recipe-form/StepCard.tsx` and `RecipeWizard.tsx`'s `syncSteps`, which already sends `image_url` in the RPC payload — it's just silently dropped server-side). Use the Supabase MCP tools (`list_tables` or `execute_sql` with `select column_name from information_schema.columns where table_name = 'recipe_step'`) to verify before proceeding.

- [ ] **Step 2: Write the migration**

```sql
-- Fix: replace_recipe_steps has never written image_url, so every step save (normal
-- wizard edits via RecipeWizard.tsx's syncSteps, and recipe-cleaner commits) silently
-- deletes all step photos on every save — the INSERT simply never referenced the
-- column, even though callers have always sent it. Discovered while wiring
-- recipe-cleaner's new apply path into the wizard, which calls this RPC more often
-- than before; fixed here since it already damaged user-uploaded content regardless
-- of the AI-cleaner feature.

CREATE OR REPLACE FUNCTION public.replace_recipe_steps(
  p_recipe_id uuid,
  p_steps     jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'replace_recipe_steps: p_steps must be a non-empty JSON array';
  END IF;

  DELETE FROM public.recipe_step WHERE recipe_id = p_recipe_id;

  INSERT INTO public.recipe_step
    (recipe_id, step_number, sort_order, title, content, image_url, timer_seconds, is_section_header)
  SELECT
    p_recipe_id,
    (s->>'step_number')::int,
    (s->>'sort_order')::int,
    NULLIF(s->>'title', ''),
    NULLIF(s->>'content', ''),
    NULLIF(s->>'image_url', ''),
    NULLIF(s->>'timer_seconds', '')::int,
    COALESCE((s->>'is_section_header')::boolean, false)
  FROM jsonb_array_elements(p_steps) AS s;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_recipe_steps(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_recipe_steps(uuid, jsonb) TO service_role;
ALTER FUNCTION public.replace_recipe_steps(uuid, jsonb) OWNER TO postgres;
```

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP `apply_migration` tool (per project convention — never `db push`/`migration up` on this shared project). Name: `replace_recipe_steps_preserve_image`.

- [ ] **Step 4: Manually verify**

Via `execute_sql`, pick any existing recipe with steps, note its current step `image_url` values, call `select replace_recipe_steps(<recipe_id>, <same steps as jsonb, including image_url>)`, then re-select `recipe_step` for that recipe and confirm `image_url` values survived.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260907100000_replace_recipe_steps_preserve_image.sql
git commit -m "$(cat <<'EOF'
fix(recipes): stop replace_recipe_steps from deleting step photos

The RPC's INSERT never referenced image_url even though every caller
(the wizard's normal step save, and recipe-cleaner) has always sent
it — every step save was silently wiping step photos.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rewrite `recipe-cleaner` — merged prompt, preview/apply modes

**Files:**
- Modify: `supabase/functions/recipe-cleaner/index.ts` (full rewrite)

**Interfaces:**
- Consumes: `replace_recipe_steps(p_recipe_id, p_steps)` from Task 1 (now preserves `image_url`), `check_and_record_cleaner_call(p_creator_id, p_limit, p_window_hours)` (existing, unchanged).
- Produces (HTTP contract, consumed by Task 3's client wrappers):
  - `POST` body `{ recipe_id: string, mode: "preview" }` → `200` with `PreviewRecipeCleanResult` shape (see below) or a categorized error (`401`/`403`/`404`/`429`/`502` `gemini_failed`/`502` `invalid_ai_output`).
  - `POST` body `{ recipe_id: string, mode: "apply", title: string, description: string | null, steps: ApplyStepInput[] }` → `200` `{ applied: true, steps_count: number }`, or `207` `{ applied: true, steps_count: number, title_description_error: "steps_saved_title_description_failed" }` if the steps write succeeded but the title/description write failed.
  - `ApplyStepInput`: `{ step_number: number, sort_order: number, title: string | null, content: string | null, image_url: string | null, timer_seconds: number | null, is_section_header: boolean }`.
  - `PreviewRecipeCleanResult`: `{ title_suggestion: {suggested, reason} | null, description_suggestion: {suggested, reason} | null, step_proposals: Array<{step_id, change_type: "reworded"|"split", suggested: Array<{title, content, timer_seconds, is_section_header}>, reason}>, new_step_suggestions: Array<{after_step_id, content, reason}>, evaluation: {ordering_issues, general_observations} }`.

- [ ] **Step 1: Replace the file**

```typescript
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
```

- [ ] **Step 2: Deploy**

Use the Supabase MCP `deploy_edge_function` tool for `recipe-cleaner` with the file content above.

- [ ] **Step 3: Manually verify with curl**

Obtain a real creator session JWT (log into the app locally, read it from browser dev tools' Supabase auth cookie/local storage, or via `supabase.auth.getSession()` in a console). Pick a `recipe_id` that creator owns and that has ≥3 steps.

```bash
curl -s -X POST "https://njzqcftjzskwcpforwzf.supabase.co/functions/v1/recipe-cleaner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CREATOR_JWT>" \
  -d '{"recipe_id": "<RECIPE_ID>", "mode": "preview"}' | jq .
```

Confirm the response matches `PreviewRecipeCleanResult` shape (all four top-level keys present, `step_proposals`/`new_step_suggestions` are arrays). Then apply with everything accepted at face value to confirm the apply path works:

```bash
curl -s -X POST "https://njzqcftjzskwcpforwzf.supabase.co/functions/v1/recipe-cleaner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CREATOR_JWT>" \
  -d '{"recipe_id": "<RECIPE_ID>", "mode": "apply", "title": "<current title>", "description": null, "steps": [...]}' | jq .
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/recipe-cleaner/index.ts
git commit -m "$(cat <<'EOF'
feat(recipe-cleaner): merge gemini-correct-text into preview/apply modes

Adds title/description correction and per-item step proposals keyed
to stable step ids, carries over gemini-correct-text's non-judgment
guardrails, and splits the Gemini call (preview) from persistence
(apply) so applying accepted suggestions never touches Gemini or the
rate limit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Remove `gemini-correct-text`, add typed client wrappers

**Files:**
- Delete: `supabase/functions/gemini-correct-text/index.ts`
- Modify: `lib/edge-functions.ts:30-44` (remove `correctText`, add new exports)

**Interfaces:**
- Produces: `previewRecipeClean(recipeId: string): Promise<PreviewRecipeCleanResult>`, `applyRecipeClean(recipeId: string, payload: {title, description, steps: ApplyStepInput[]}): Promise<ApplyRecipeCleanResult>`, plus the exported types `PreviewRecipeCleanResult`, `RecipeCleanStepProposal`, `RecipeCleanNewStepSuggestion`, `ApplyRecipeCleanResult` — consumed by Task 4 (resolve function) and Task 5 (review component).

- [ ] **Step 1: Delete the old function**

```bash
git rm -r supabase/functions/gemini-correct-text
```

- [ ] **Step 2: Replace the `correctText` block in `lib/edge-functions.ts`**

Remove lines 30-44 (the `// ─── Gemini: Spell correction ───` block and `correctText` function) and replace with:

```typescript
// ─── Gemini: Recipe standardization (preview/apply) ──────────────────────────
export interface RecipeCleanSuggestion {
  suggested: string
  reason: string
}

export interface RecipeCleanStepProposal {
  step_id: string
  change_type: 'reworded' | 'split'
  suggested: Array<{
    title: string | null
    content: string | null
    timer_seconds: number | null
    is_section_header: boolean
  }>
  reason: string | null
}

export interface RecipeCleanNewStepSuggestion {
  after_step_id: string | null
  content: string
  reason: string
}

export interface PreviewRecipeCleanResult {
  title_suggestion: RecipeCleanSuggestion | null
  description_suggestion: RecipeCleanSuggestion | null
  step_proposals: RecipeCleanStepProposal[]
  new_step_suggestions: RecipeCleanNewStepSuggestion[]
  evaluation: {
    ordering_issues: string | null
    general_observations: string | null
  }
}

export async function previewRecipeClean(recipeId: string): Promise<PreviewRecipeCleanResult> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('recipe-cleaner', {
    body: { recipe_id: recipeId, mode: 'preview' },
  })
  if (error) throw error
  return data as PreviewRecipeCleanResult
}

export interface RecipeCleanApplyStep {
  step_number: number
  sort_order: number
  title: string | null
  content: string | null
  image_url: string | null
  timer_seconds: number | null
  is_section_header: boolean
}

export interface ApplyRecipeCleanResult {
  applied: boolean
  steps_count: number
  title_description_error?: string
}

export async function applyRecipeClean(
  recipeId: string,
  payload: { title: string; description: string | null; steps: RecipeCleanApplyStep[] }
): Promise<ApplyRecipeCleanResult> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('recipe-cleaner', {
    body: { recipe_id: recipeId, mode: 'apply', ...payload },
  })
  if (error) throw error
  return data as ApplyRecipeCleanResult
}
```

- [ ] **Step 3: Verify no leftover references**

```bash
grep -rn "correctText\|gemini-correct-text" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .
```

Expected: no matches outside `docs/` (design docs mentioning it historically are fine).

- [ ] **Step 4: Typecheck**

```bash
npm run build
```

Expected: succeeds (this confirms nothing else imported the removed `correctText`).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/gemini-correct-text lib/edge-functions.ts
git commit -m "$(cat <<'EOF'
refactor: remove unused gemini-correct-text, add recipe-cleaner wrappers

correctText() was never called from any component. Replaced with
previewRecipeClean()/applyRecipeClean() matching the merged
recipe-cleaner's preview/apply contract.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**Caution (not a code step):** this deletes the function from the repo only. Do not run `supabase functions delete gemini-correct-text` against the live project until a human has confirmed no other app on the shared Supabase project (the Flutter mobile app / nutrition app) calls it.

---

## Task 4: Pure resolve function (accept/reject → final steps array)

**Files:**
- Create: `lib/utils/recipe-cleaner-resolve.ts`
- Test: `lib/utils/recipe-cleaner-resolve.test.ts`

**Interfaces:**
- Consumes: `StepItem` from `@/lib/validations/recipe.schema` (existing), `RecipeCleanStepProposal` / `RecipeCleanNewStepSuggestion` from `@/lib/edge-functions` (Task 3).
- Produces: `resolveCleanedSteps(currentSteps: StepItem[], stepProposals: RecipeCleanStepProposal[], newStepSuggestions: RecipeCleanNewStepSuggestion[], decisions: ResolveDecisions): StepItem[]` and the `ResolveDecisions` type — consumed by Task 5's `RecipeCleanerReview.tsx`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/utils/recipe-cleaner-resolve.test.ts
import { describe, it, expect } from "vitest";
import { resolveCleanedSteps } from "./recipe-cleaner-resolve";
import type { RecipeCleanStepProposal, RecipeCleanNewStepSuggestion } from "@/lib/edge-functions";
import type { StepItem } from "@/lib/validations/recipe.schema";

const baseSteps: StepItem[] = [
  { id: "s1", step_number: 1, content: "Laver et couper les légumes.", sort_order: 0, is_section_header: false, ingredient_ids: [] },
  { id: "s2", step_number: 2, content: "Faire chauffer l'huile.", sort_order: 1, is_section_header: false, ingredient_ids: [] },
  { id: "s3", step_number: 3, content: "Ajouter le poulet.", sort_order: 2, is_section_header: false, ingredient_ids: [] },
];

describe("resolveCleanedSteps", () => {
  it("returns the original steps unchanged when nothing is accepted", () => {
    const proposals: RecipeCleanStepProposal[] = [
      { step_id: "s1", change_type: "reworded", suggested: [{ title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false }], reason: "typo" },
    ];
    const result = resolveCleanedSteps(baseSteps, proposals, [], {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toEqual(baseSteps);
  });

  it("replaces a step's content when its proposal is accepted, carrying over its photo", () => {
    const stepsWithPhoto: StepItem[] = [
      { ...baseSteps[0], image_url: "https://example.com/s1.jpg" },
      baseSteps[1],
      baseSteps[2],
    ];
    const proposals: RecipeCleanStepProposal[] = [
      { step_id: "s1", change_type: "reworded", suggested: [{ title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false }], reason: "typo" },
    ];
    const result = resolveCleanedSteps(stepsWithPhoto, proposals, [], {
      acceptedStepProposalIds: new Set(["s1"]),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(3);
    expect(result[0].content).toBe("Laver les légumes.");
    expect(result[0].id).not.toBe("s1");
    expect(result[0].image_url).toBe("https://example.com/s1.jpg");
  });

  it("splits one step into two when a split proposal is accepted, keeping the photo on the first", () => {
    const stepsWithPhoto: StepItem[] = [
      { ...baseSteps[0], image_url: "https://example.com/s1.jpg" },
      baseSteps[1],
      baseSteps[2],
    ];
    const proposals: RecipeCleanStepProposal[] = [
      {
        step_id: "s1",
        change_type: "split",
        suggested: [
          { title: null, content: "Laver les légumes.", timer_seconds: null, is_section_header: false },
          { title: null, content: "Couper les légumes en dés.", timer_seconds: null, is_section_header: false },
        ],
        reason: "compound step",
      },
    ];
    const result = resolveCleanedSteps(stepsWithPhoto, proposals, [], {
      acceptedStepProposalIds: new Set(["s1"]),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.step_number)).toEqual([1, 2, 3, 4]);
    expect(result[0].content).toBe("Laver les légumes.");
    expect(result[0].image_url).toBe("https://example.com/s1.jpg");
    expect(result[1].content).toBe("Couper les légumes en dés.");
    expect(result[1].image_url).toBeUndefined();
  });

  it("inserts an accepted new-step suggestion after the given step", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: "s2", content: "Ajouter le piment.", reason: "ingredient piment never used" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set([0]),
    });

    expect(result).toHaveLength(4);
    expect(result[2].content).toBe("Ajouter le piment.");
    expect(result.map((s) => s.step_number)).toEqual([1, 2, 3, 4]);
  });

  it("inserts an accepted new-step suggestion at the start when after_step_id is null", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: null, content: "Préchauffer le four.", reason: "missing prep step" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set([0]),
    });

    expect(result[0].content).toBe("Préchauffer le four.");
    expect(result).toHaveLength(4);
  });

  it("ignores rejected new-step suggestions", () => {
    const suggestions: RecipeCleanNewStepSuggestion[] = [
      { after_step_id: "s1", content: "Ajouter le piment.", reason: "ingredient piment never used" },
    ];
    const result = resolveCleanedSteps(baseSteps, [], suggestions, {
      acceptedStepProposalIds: new Set(),
      acceptedNewStepIndexes: new Set(),
    });

    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- recipe-cleaner-resolve`
Expected: FAIL — `Cannot find module './recipe-cleaner-resolve'` (and `@/lib/edge-functions` exports not yet present until Task 3 is done — this task assumes Task 3 is already merged).

- [ ] **Step 3: Implement**

```typescript
// lib/utils/recipe-cleaner-resolve.ts
import type { StepItem } from "@/lib/validations/recipe.schema";
import type { RecipeCleanStepProposal, RecipeCleanNewStepSuggestion } from "@/lib/edge-functions";

export interface ResolveDecisions {
  acceptedStepProposalIds: Set<string>;
  acceptedNewStepIndexes: Set<number>;
}

export function resolveCleanedSteps(
  currentSteps: StepItem[],
  stepProposals: RecipeCleanStepProposal[],
  newStepSuggestions: RecipeCleanNewStepSuggestion[],
  decisions: ResolveDecisions
): StepItem[] {
  const proposalByStepId = new Map(stepProposals.map((p) => [p.step_id, p]));

  const newStepsAfter = new Map<string | null, RecipeCleanNewStepSuggestion[]>();
  newStepSuggestions.forEach((suggestion, index) => {
    if (!decisions.acceptedNewStepIndexes.has(index)) return;
    const key = suggestion.after_step_id;
    const list = newStepsAfter.get(key) ?? [];
    list.push(suggestion);
    newStepsAfter.set(key, list);
  });

  const newStepFromSuggestion = (s: RecipeCleanNewStepSuggestion): StepItem => ({
    id: crypto.randomUUID(),
    step_number: 0,
    sort_order: 0,
    title: undefined,
    content: s.content,
    image_url: undefined,
    timer_seconds: undefined,
    is_section_header: false,
    ingredient_ids: [],
  });

  const result: StepItem[] = [];

  for (const suggestion of newStepsAfter.get(null) ?? []) {
    result.push(newStepFromSuggestion(suggestion));
  }

  for (const step of currentSteps) {
    const proposal = proposalByStepId.get(step.id);
    if (proposal && decisions.acceptedStepProposalIds.has(step.id)) {
      proposal.suggested.forEach((s, i) => {
        result.push({
          id: crypto.randomUUID(),
          step_number: 0,
          sort_order: 0,
          title: s.title ?? undefined,
          content: s.content ?? undefined,
          // Only the first resulting step keeps the original's photo/ingredient tags —
          // a split has no way to know which of the N new steps the photo belongs to.
          image_url: i === 0 ? step.image_url : undefined,
          timer_seconds: s.timer_seconds ?? undefined,
          is_section_header: s.is_section_header,
          ingredient_ids: i === 0 ? step.ingredient_ids : [],
        });
      });
    } else {
      result.push(step);
    }

    for (const suggestion of newStepsAfter.get(step.id) ?? []) {
      result.push(newStepFromSuggestion(suggestion));
    }
  }

  // Renumber, mirroring Step3Steps.tsx's updateSteps.
  let stepNum = 0;
  return result.map((s, i) => {
    if (!s.is_section_header) stepNum++;
    return { ...s, sort_order: i, step_number: s.is_section_header ? 0 : stepNum };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- recipe-cleaner-resolve`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/recipe-cleaner-resolve.ts lib/utils/recipe-cleaner-resolve.test.ts
git commit -m "$(cat <<'EOF'
feat(recipes): add pure resolve function for AI cleaner accept/reject

Merges accepted step proposals and new-step suggestions into the
current step list by stable step id rather than diffing free text,
so accept/reject stays deterministic even when a proposal splits one
step into several.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `RecipeCleanerReview.tsx` modal component

**Files:**
- Create: `components/creator/recipe-form/RecipeCleanerReview.tsx`

**Interfaces:**
- Consumes: `previewRecipeClean`, `applyRecipeClean`, `PreviewRecipeCleanResult` from `@/lib/edge-functions` (Task 3); `resolveCleanedSteps` from `@/lib/utils/recipe-cleaner-resolve` (Task 4); `StepItem` from `@/lib/validations/recipe.schema`.
- Produces: `<RecipeCleanerReview recipeId currentTitle currentDescription currentSteps onApplied onClose />` — consumed by Task 6's `Step3Steps.tsx`. `onApplied: (result: { title: string; description: string; steps: StepItem[] }) => void`.

- [ ] **Step 1: Write the component**

```tsx
// components/creator/recipe-form/RecipeCleanerReview.tsx
"use client";

import { useEffect, useState } from "react";
import { previewRecipeClean, applyRecipeClean } from "@/lib/edge-functions";
import type { PreviewRecipeCleanResult } from "@/lib/edge-functions";
import { resolveCleanedSteps } from "@/lib/utils/recipe-cleaner-resolve";
import type { StepItem } from "@/lib/validations/recipe.schema";

interface RecipeCleanerReviewProps {
  recipeId: string;
  currentTitle: string;
  currentDescription: string;
  currentSteps: StepItem[];
  onApplied: (result: { title: string; description: string; steps: StepItem[] }) => void;
  onClose: () => void;
}

export default function RecipeCleanerReview({
  recipeId,
  currentTitle,
  currentDescription,
  currentSteps,
  onApplied,
  onClose,
}: RecipeCleanerReviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRecipeCleanResult | null>(null);

  const [acceptTitle, setAcceptTitle] = useState(true);
  const [acceptDescription, setAcceptDescription] = useState(true);
  const [acceptedStepProposalIds, setAcceptedStepProposalIds] = useState<Set<string>>(new Set());
  const [acceptedNewStepIndexes, setAcceptedNewStepIndexes] = useState<Set<number>>(new Set());

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    previewRecipeClean(recipeId)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        // Corrections default accepted; insertions (new content the creator didn't
        // write) default rejected — the creator opts in explicitly to anything new.
        setAcceptedStepProposalIds(new Set(result.step_proposals.map((p) => p.step_id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Erreur lors de l'analyse IA");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const toggleStepProposal = (stepId: string) => {
    setAcceptedStepProposalIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const toggleNewStep = (index: number) => {
    setAcceptedNewStepIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const hasNoSuggestions =
    !!preview &&
    !preview.title_suggestion &&
    !preview.description_suggestion &&
    preview.step_proposals.length === 0 &&
    preview.new_step_suggestions.length === 0;

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    setApplyError(null);
    try {
      const finalTitle =
        acceptTitle && preview.title_suggestion ? preview.title_suggestion.suggested : currentTitle;
      const finalDescription =
        acceptDescription && preview.description_suggestion
          ? preview.description_suggestion.suggested
          : currentDescription;
      const finalSteps = resolveCleanedSteps(
        currentSteps,
        preview.step_proposals,
        preview.new_step_suggestions,
        { acceptedStepProposalIds, acceptedNewStepIndexes }
      );

      const result = await applyRecipeClean(recipeId, {
        title: finalTitle,
        description: finalDescription || null,
        steps: finalSteps.map((s) => ({
          step_number: s.step_number,
          sort_order: s.sort_order,
          title: s.title ?? null,
          content: s.content ?? null,
          image_url: s.image_url ?? null,
          timer_seconds: s.timer_seconds ?? null,
          is_section_header: s.is_section_header,
        })),
      });

      if (result.title_description_error) {
        setApplyError(
          "Les étapes ont été mises à jour, mais le titre/description n'a pas pu être sauvegardé. Réessaie."
        );
        return;
      }

      onApplied({ title: finalTitle, description: finalDescription, steps: finalSteps });
      onClose();
    } catch (err: any) {
      setApplyError(err?.message ?? "Échec de l'application des corrections");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            ✨ Standardiser avec l&apos;IA
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Analyse de la recette en cours...</p>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={onClose} className="text-sm text-primary underline">
              Fermer
            </button>
          </div>
        )}

        {!loading && !error && preview && hasNoSuggestions && (
          <p className="text-sm text-muted-foreground">
            Rien à corriger — ta recette est déjà bien standardisée !
          </p>
        )}

        {!loading && !error && preview && !hasNoSuggestions && (
          <div className="space-y-4">
            {preview.title_suggestion && (
              <SuggestionCard
                label="Titre"
                original={currentTitle}
                suggested={preview.title_suggestion.suggested}
                reason={preview.title_suggestion.reason}
                accepted={acceptTitle}
                onToggle={() => setAcceptTitle((v) => !v)}
              />
            )}

            {preview.description_suggestion && (
              <SuggestionCard
                label="Description"
                original={currentDescription}
                suggested={preview.description_suggestion.suggested}
                reason={preview.description_suggestion.reason}
                accepted={acceptDescription}
                onToggle={() => setAcceptDescription((v) => !v)}
              />
            )}

            {preview.step_proposals.map((proposal) => {
              const original = currentSteps.find((s) => s.id === proposal.step_id);
              return (
                <SuggestionCard
                  key={proposal.step_id}
                  label={proposal.change_type === "split" ? "Étape (à diviser)" : "Étape"}
                  original={original?.content ?? ""}
                  suggested={proposal.suggested.map((s) => s.content).filter(Boolean).join(" / ")}
                  reason={proposal.reason}
                  accepted={acceptedStepProposalIds.has(proposal.step_id)}
                  onToggle={() => toggleStepProposal(proposal.step_id)}
                />
              );
            })}

            {preview.new_step_suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={`new-${index}`}
                label="+ Nouvelle étape"
                original={null}
                suggested={suggestion.content}
                reason={suggestion.reason}
                accepted={acceptedNewStepIndexes.has(index)}
                onToggle={() => toggleNewStep(index)}
              />
            ))}

            {(preview.evaluation.ordering_issues || preview.evaluation.general_observations) && (
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Observations de l&apos;IA</p>
                {preview.evaluation.ordering_issues && (
                  <p className="text-xs text-muted-foreground">
                    Ordre des étapes : {preview.evaluation.ordering_issues}
                  </p>
                )}
                {preview.evaluation.general_observations && (
                  <p className="text-xs text-muted-foreground">
                    {preview.evaluation.general_observations}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {applyError && <p className="text-sm text-destructive">{applyError}</p>}

        {!loading && !error && preview && !hasNoSuggestions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {applying ? "Application..." : "Appliquer la sélection"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  label,
  original,
  suggested,
  reason,
  accepted,
  onToggle,
}: {
  label: string;
  original: string | null;
  suggested: string;
  reason: string | null;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {original !== null && (
            <p className="text-sm text-muted-foreground line-through">{original}</p>
          )}
          <p className="text-sm text-foreground">{suggested}</p>
          {reason && <p className="text-xs text-muted-foreground italic">{reason}</p>}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-foreground shrink-0">
          <input
            type="checkbox"
            checked={accepted}
            onChange={onToggle}
            className="rounded border-input"
          />
          Accepter
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: succeeds. (No unit test for this component — it's a thin composition of `previewRecipeClean`/`applyRecipeClean`/`resolveCleanedSteps`, all already tested/typed; verified end-to-end in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add components/creator/recipe-form/RecipeCleanerReview.tsx
git commit -m "$(cat <<'EOF'
feat(recipe-wizard): add AI standardization review modal

Lists title/description/step proposals from recipe-cleaner's preview
call with per-item accept/reject, plus read-only ordering/general
observations, then applies the resolved result.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire the "Standardize with AI" button into Step 3

**Files:**
- Modify: `components/creator/recipe-form/Step3Steps.tsx`
- Modify: `components/creator/recipe-form/RecipeWizard.tsx`

**Interfaces:**
- Consumes: `RecipeCleanerReview` from Task 5.
- Produces: `Step3Steps` gains a new required prop `onPrepareClean: () => Promise<boolean>` (RecipeWizard implements it by calling the existing `saveDraft(formState, 3)` and returning whether it succeeded).

- [ ] **Step 1: Add `handlePrepareClean` in `RecipeWizard.tsx`**

Add this function near `handleNext`/`handlePrev` (after line 345, before `handlePublish`):

```typescript
  // ── Prepare for AI standardization (Step 3) ────────────────────────────────
  // recipe-cleaner reads from the DB, so unsaved edits must be flushed first.
  const handlePrepareClean = async () => {
    const id = await saveDraft(formState, 3);
    return !!id;
  };
```

Then pass it to `Step3Steps` (modify the existing render block around line 493-499):

```tsx
        {currentStep === 3 && (
          <Step3Steps
            data={formState}
            onChange={updateForm}
            draftId={draftId}
            onPrepareClean={handlePrepareClean}
          />
        )}
```

- [ ] **Step 2: Add the button + modal state in `Step3Steps.tsx`**

Add the import at the top:

```typescript
import { useState } from "react";
import RecipeCleanerReview from "./RecipeCleanerReview";
```

(Note: `useId` is already imported from `"react"` — merge into one import: `import { useId, useState } from "react";`.)

Add `onPrepareClean` to the props interface and destructuring:

```typescript
interface Step3Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  draftId: string | null;
  onPrepareClean: () => Promise<boolean>;
}

export default function Step3Steps({ data, onChange, draftId, onPrepareClean }: Step3Props) {
```

Add state and a handler inside the component body (after the existing `const dndId = useId();` line):

```typescript
  const [showCleaner, setShowCleaner] = useState(false);
  const [preparingClean, setPreparingClean] = useState(false);
  const [prepareCleanError, setPrepareCleanError] = useState<string | null>(null);

  const handleOpenCleaner = async () => {
    setPrepareCleanError(null);
    setPreparingClean(true);
    const ok = await onPrepareClean();
    setPreparingClean(false);
    if (ok) setShowCleaner(true);
    else setPrepareCleanError("Impossible de sauvegarder le brouillon avant l'analyse IA. Réessaie.");
  };
```

Add the button after the existing "+ Ajouter une étape / + Section" button row (after line 224, before the closing `</div>` of the component's return):

```tsx
      {draftId && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={handleOpenCleaner}
            disabled={preparingClean}
            className="w-full py-2.5 rounded-lg border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {preparingClean ? "Préparation..." : "✨ Standardiser avec l'IA"}
          </button>
          {prepareCleanError && (
            <p className="text-xs text-destructive">{prepareCleanError}</p>
          )}
        </div>
      )}

      {showCleaner && draftId && (
        <RecipeCleanerReview
          recipeId={draftId}
          currentTitle={data.title}
          currentDescription={data.description}
          currentSteps={data.steps}
          onApplied={(result) => onChange(result)}
          onClose={() => setShowCleaner(false)}
        />
      )}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual browser verification**

```bash
npm run dev
```

Log in as a creator, open `/recipes/new` (or edit an existing draft), fill Step 1 (title/description), Step 2 (≥3 ingredients), Step 3 (≥3 steps, save at least one step photo to confirm Task 1's fix), click "✨ Standardiser avec l'IA". Confirm:
- The modal opens and shows a loading state, then proposals (or the "rien à corriger" empty state).
- Unchecking a step proposal and clicking "Appliquer la sélection" leaves that step's original content in place afterward.
- Accepting a new-step suggestion inserts it at the right position.
- The step that had a photo still has it after applying.
- Closing without applying leaves the recipe untouched.

- [ ] **Step 5: Commit**

```bash
git add components/creator/recipe-form/Step3Steps.tsx components/creator/recipe-form/RecipeWizard.tsx
git commit -m "$(cat <<'EOF'
feat(recipe-wizard): wire AI standardization button into Step 3

Saves the current draft first (recipe-cleaner reads from the DB),
then opens the review modal; applying writes the resolved result
back into the wizard's form state via the existing onChange handler.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update `batch_normalize_recipes.js` to the new contract

**Files:**
- Modify: `batch_normalize_recipes.js`

**Interfaces:**
- Consumes: `recipe-cleaner`'s new `mode: "preview"` / `mode: "apply"` HTTP contract from Task 2.

This script's authentication was already broken before this change: it sends `Authorization: Bearer ${publishableKey}` (the anon/publishable key itself, not a real user session token) plus an `x-bypass-key` header that `recipe-cleaner` has never read (its own comment says "No bypass key, no admin backdoor"). Since `recipe-cleaner` enforces per-creator ownership with no service-role bypass, this script can only ever act on recipes owned by whichever creator a real session JWT belongs to — it cannot bulk-clean recipes across all creators without a deliberate, separate decision to add a service-role/admin path to the edge function (out of scope here; not adding a bypass). This task fixes the contract and makes the auth requirement explicit rather than silently keeping a header that does nothing.

- [ ] **Step 1: Replace the bypass-key requirement with a real creator JWT requirement**

Replace lines 6-11:

```javascript
const cleanerUrl = `${supabaseUrl}/functions/v1/recipe-cleaner`;
const bypassKey = process.env.CLEANER_BYPASS_KEY;
if (!bypassKey) {
  console.error("Missing CLEANER_BYPASS_KEY environment variable. Set it before running this script.");
  process.exit(1);
}
```

with:

```javascript
const cleanerUrl = `${supabaseUrl}/functions/v1/recipe-cleaner`;
// recipe-cleaner enforces per-creator ownership with no service-role bypass, so this
// script can only clean recipes owned by whichever creator this JWT belongs to — it is
// NOT a way to bulk-clean recipes across all creators. Get a JWT by logging into the
// app as that creator and reading the Supabase auth session token.
const creatorJwt = process.env.CREATOR_JWT;
if (!creatorJwt) {
  console.error("Missing CREATOR_JWT environment variable. Set it to a logged-in creator's session token before running this script.");
  process.exit(1);
}
```

- [ ] **Step 2: Fetch `description` too, and add a steps fetcher**

Replace `fetchAllRecipes` (lines 28-43):

```javascript
async function fetchAllRecipes() {
  const url = `${supabaseUrl}/rest/v1/recipe?select=id,title,description`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': publishableKey,
      'Authorization': `Bearer ${publishableKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recipes: status ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

async function fetchRecipeSteps(recipeId) {
  const url = `${supabaseUrl}/rest/v1/recipe_step?recipe_id=eq.${recipeId}&select=id,step_number,sort_order,title,content,image_url,timer_seconds,is_section_header&order=sort_order.asc`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': publishableKey,
      'Authorization': `Bearer ${publishableKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch steps for recipe ${recipeId}: status ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

// Mirrors lib/utils/recipe-cleaner-resolve.ts's "accept everything" case: splices every
// step_proposal's suggested replacement and every new_step_suggestion into the current
// step list, then renumbers. Kept as a standalone plain-JS copy since this script runs
// outside the Next.js/TypeScript build.
function resolveAllAccepted(currentSteps, stepProposals, newStepSuggestions) {
  const proposalByStepId = new Map(stepProposals.map((p) => [p.step_id, p]));
  const newStepsAfter = new Map();
  for (const suggestion of newStepSuggestions) {
    const key = suggestion.after_step_id;
    const list = newStepsAfter.get(key) || [];
    list.push(suggestion);
    newStepsAfter.set(key, list);
  }

  // Only the first resulting step of an accepted proposal keeps the original's photo
  // (mirrors lib/utils/recipe-cleaner-resolve.ts's behavior) — untouched steps keep
  // theirs unconditionally via step.image_url below.
  const toStep = (s, i, originalImageUrl) => ({
    step_number: 0,
    sort_order: 0,
    title: s.title ?? null,
    content: s.content ?? null,
    image_url: i === 0 ? (originalImageUrl ?? null) : null,
    timer_seconds: s.timer_seconds ?? null,
    is_section_header: s.is_section_header
  });

  const newStepFromSuggestion = (s) => ({
    step_number: 0, sort_order: 0, title: null, content: s.content, image_url: null, timer_seconds: null, is_section_header: false
  });

  const result = [];
  for (const suggestion of newStepsAfter.get(null) || []) {
    result.push(newStepFromSuggestion(suggestion));
  }
  for (const step of currentSteps) {
    const proposal = proposalByStepId.get(step.id);
    if (proposal) {
      result.push(...proposal.suggested.map((s, i) => toStep(s, i, step.image_url)));
    } else {
      result.push({
        step_number: step.step_number,
        sort_order: step.sort_order,
        title: step.title,
        content: step.content,
        image_url: step.image_url ?? null,
        timer_seconds: step.timer_seconds,
        is_section_header: step.is_section_header
      });
    }
    for (const suggestion of newStepsAfter.get(step.id) || []) {
      result.push(newStepFromSuggestion(suggestion));
    }
  }

  let stepNum = 0;
  return result.map((s, i) => {
    if (!s.is_section_header) stepNum++;
    return { ...s, sort_order: i, step_number: s.is_section_header ? 0 : stepNum };
  });
}
```

(Note: `fetchRecipeSteps` selects `image_url` and both the pass-through and accepted-proposal branches carry it forward — see pre-flight ruling in the ledger. Only genuinely new content, either a fresh `new_step_suggestions` insertion or the 2nd+ step of a split, has no original photo to carry and stays `null`.)

- [ ] **Step 3: Replace `cleanRecipe` (lines 45-103)**

```javascript
async function cleanRecipe(recipe, index, total) {
  const prefix = `[${index}/${total}]`;
  console.log(`${prefix} Started: "${recipe.title}" (${recipe.id})`);

  const startTime = Date.now();
  try {
    const previewResponse = await fetch(cleanerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publishableKey,
        'Authorization': `Bearer ${creatorJwt}`
      },
      body: JSON.stringify({ recipe_id: recipe.id, mode: 'preview' })
    });

    if (!previewResponse.ok) {
      const errText = await previewResponse.text();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`${prefix} FAILED (preview): "${recipe.title}" in ${duration}s - Status ${previewResponse.status}: ${errText}`);
      return { id: recipe.id, title: recipe.title, success: false, duration_sec: parseFloat(duration), error: `preview status ${previewResponse.status}: ${errText}` };
    }

    const preview = await previewResponse.json();

    if (!commit) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`${prefix} DRY RUN: "${recipe.title}" in ${duration}s. ${preview.step_proposals.length} step proposal(s), ${preview.new_step_suggestions.length} new step(s).`);
      return {
        id: recipe.id,
        title: recipe.title,
        success: true,
        duration_sec: parseFloat(duration),
        evaluation: preview.evaluation,
        step_proposals: preview.step_proposals.length,
        new_step_suggestions: preview.new_step_suggestions.length
      };
    }

    const currentSteps = await fetchRecipeSteps(recipe.id);
    const finalSteps = resolveAllAccepted(currentSteps, preview.step_proposals, preview.new_step_suggestions);
    const finalTitle = preview.title_suggestion ? preview.title_suggestion.suggested : recipe.title;
    const finalDescription = preview.description_suggestion ? preview.description_suggestion.suggested : (recipe.description ?? null);

    const applyResponse = await fetch(cleanerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publishableKey,
        'Authorization': `Bearer ${creatorJwt}`
      },
      body: JSON.stringify({ recipe_id: recipe.id, mode: 'apply', title: finalTitle, description: finalDescription, steps: finalSteps })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!applyResponse.ok) {
      const errText = await applyResponse.text();
      console.error(`${prefix} FAILED (apply): "${recipe.title}" in ${duration}s - Status ${applyResponse.status}: ${errText}`);
      return { id: recipe.id, title: recipe.title, success: false, duration_sec: parseFloat(duration), error: `apply status ${applyResponse.status}: ${errText}` };
    }

    const applyData = await applyResponse.json();
    console.log(`${prefix} SUCCESS: "${recipe.title}" in ${duration}s. Applied ${finalSteps.length} steps.`);
    return {
      id: recipe.id,
      title: recipe.title,
      success: true,
      duration_sec: parseFloat(duration),
      evaluation: preview.evaluation,
      steps_count: finalSteps.length,
      applied: applyData.applied
    };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`${prefix} ERROR: "${recipe.title}" in ${duration}s - Exception: ${err.message}`);
    return { id: recipe.id, title: recipe.title, success: false, duration_sec: parseFloat(duration), error: err.message };
  }
}
```

- [ ] **Step 4: Manual dry-run verification**

```bash
CREATOR_JWT="<a real creator session token>" node batch_normalize_recipes.js
```

(no `--commit`). Confirm it runs without throwing, logs `DRY RUN` lines with proposal counts, and writes `batch_normalization_report.json` with `mode: "dry-run"`. Confirm recipes not owned by that creator's account fail with a `403` in the report rather than crashing the whole run.

- [ ] **Step 5: Commit**

```bash
git add batch_normalize_recipes.js
git commit -m "$(cat <<'EOF'
fix(scripts): update batch_normalize_recipes.js to preview/apply contract

Also drops the x-bypass-key header (recipe-cleaner has never read it)
and documents that this script can only clean recipes owned by
whichever creator's session JWT it's run with — there is no
service-role bulk path, by design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Full end-to-end verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass, including the new `recipe-cleaner-resolve.test.ts` suite.

- [ ] **Step 2: Typecheck + build**

```bash
npm run build
```

Expected: succeeds with no type errors.

- [ ] **Step 3: Full wizard walkthrough**

Using `npm run dev`, as a real creator: create a new recipe draft, go through Steps 1-3 (title with a deliberate typo, description with a deliberate typo, ≥3 ingredients, ≥3 steps including one compound step like "Laver et couper les légumes, puis les faire revenir" and one step with an uploaded photo, leaving at least one ingredient unused in any step). Click "✨ Standardiser avec l'IA":

- Confirm the title/description typo corrections appear and are pre-checked.
- Confirm the compound step is proposed as a split.
- Confirm a new-step suggestion appears for the unused ingredient, pre-unchecked.
- Reject the split, accept the title fix, accept the new-step suggestion, click "Appliquer la sélection".
- Confirm: title updated, the compound step is untouched (rejected), the new step was inserted, the step with a photo still has its photo, step numbers are sequential with no gaps.
- Continue through Steps 4-6 and publish; confirm the published recipe reflects the applied changes.

- [ ] **Step 4: Rate-limit boundary check (spot check only, not exhaustive)**

Confirm in Supabase (`execute_sql`) that only `mode: "preview"` calls inserted a row into `recipe_cleaner_call` during the walkthrough above — the `apply` call should not have added a second row.

- [ ] **Step 5: Report status to the user**

Summarize what was verified and flag anything that didn't work as expected before considering this plan complete.

---

## Self-Review Notes

- **Spec coverage:** preview/apply modes (Task 2), title/description scope (Task 2/3/5), granular accept/reject keyed to step id (Task 4/5), Step 3 trigger placement (Task 6), gemini-correct-text + batch script cleanup (Task 3/7), guardrails + language-from-column (Task 2's prompt), no DB migration *except* the image_url fix — explicitly flagged as a deviation from the spec text, justified and called out rather than silently added.
- **Placeholder scan:** no TBD/TODO; every step has literal code or a literal command.
- **Type consistency:** `RecipeCleanStepProposal`/`RecipeCleanNewStepSuggestion`/`PreviewRecipeCleanResult`/`ApplyRecipeCleanResult` are defined once in Task 3 (`lib/edge-functions.ts`) and imported by name in Task 4 and Task 5 — no redefinition drift. `ApplyStepInput` (edge function, Task 2) and `RecipeCleanApplyStep` (client wrapper, Task 3) have matching field sets (`step_number, sort_order, title, content, image_url, timer_seconds, is_section_header`).
