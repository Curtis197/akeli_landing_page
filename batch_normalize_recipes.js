const fs = require('fs');
const path = require('path');

const supabaseUrl = "https://njzqcftjzskwcpforwzf.supabase.co";
const publishableKey = "sb_publishable_2WUTLXygeO3s1FTvBdydwA_24zE-a6R";
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

// Parse CLI Arguments
const args = process.argv.slice(2);
const commit = args.includes('--commit');
let concurrencyLimit = 3;
const concurrencyIndex = args.indexOf('--concurrency');
if (concurrencyIndex !== -1 && args[concurrencyIndex + 1]) {
  concurrencyLimit = parseInt(args[concurrencyIndex + 1], 10) || 3;
}

console.log(`==================================================`);
console.log(`Starting Batch Recipe Normalization`);
console.log(`Mode:        ${commit ? 'LIVE COMMIT (Database changes enabled)' : 'DRY RUN (No database changes)'}`);
console.log(`Concurrency: ${concurrencyLimit} workers`);
console.log(`==================================================\n`);

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
  const url = `${supabaseUrl}/rest/v1/recipe_step?recipe_id=eq.${recipeId}&select=id,step_number,sort_order,title,content,image_url,timer_seconds,is_section_header,ingredient_ids&order=sort_order.asc`;
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
  // and ingredient tags (mirrors lib/utils/recipe-cleaner-resolve.ts's behavior) —
  // untouched steps keep theirs unconditionally via step.image_url/ingredient_ids below.
  const toStep = (s, i, original) => ({
    step_number: 0,
    sort_order: 0,
    // Clamp to is_section_header — Gemini is prompted to keep title/content mutually
    // exclusive but isn't guaranteed to, and a violation trips chk_regular_step_no_title.
    title: s.is_section_header ? (s.title ?? null) : null,
    content: s.is_section_header ? null : (s.content ?? null),
    image_url: i === 0 ? (original.image_url ?? null) : null,
    timer_seconds: s.timer_seconds ?? null,
    is_section_header: s.is_section_header,
    ingredient_ids: i === 0 ? (original.ingredient_ids ?? []) : []
  });

  const newStepFromSuggestion = (s) => ({
    step_number: 0, sort_order: 0, title: null, content: s.content, image_url: null, timer_seconds: null, is_section_header: false, ingredient_ids: []
  });

  const result = [];
  for (const suggestion of newStepsAfter.get(null) || []) {
    result.push(newStepFromSuggestion(suggestion));
  }
  for (const step of currentSteps) {
    const proposal = proposalByStepId.get(step.id);
    if (proposal) {
      result.push(...proposal.suggested.map((s, i) => toStep(s, i, step)));
    } else {
      result.push({
        step_number: step.step_number,
        sort_order: step.sort_order,
        title: step.title,
        content: step.content,
        image_url: step.image_url ?? null,
        timer_seconds: step.timer_seconds,
        is_section_header: step.is_section_header,
        ingredient_ids: step.ingredient_ids ?? []
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

    if (applyData.title_description_error) {
      console.error(`${prefix} PARTIAL: "${recipe.title}" in ${duration}s. Steps applied (${finalSteps.length}), but title/description update failed: ${applyData.title_description_error}`);
      return {
        id: recipe.id,
        title: recipe.title,
        success: false,
        duration_sec: parseFloat(duration),
        evaluation: preview.evaluation,
        steps_count: finalSteps.length,
        error: `partial failure: steps applied but title/description update failed (${applyData.title_description_error})`
      };
    }

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

// Zero-dependency Concurrent Pool implementation
async function runConcurrentPool(recipes) {
  const total = recipes.length;
  const results = [];
  const pool = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < total) {
      const currentIndex = nextIndex++;
      const recipe = recipes[currentIndex];
      const result = await cleanRecipe(recipe, currentIndex + 1, total);
      results[currentIndex] = result;
    }
  }

  // Spawn initial workers up to the concurrency limit
  const activeWorkers = [];
  for (let i = 0; i < Math.min(concurrencyLimit, total); i++) {
    activeWorkers.push(worker());
  }

  // Wait for all workers to complete
  await Promise.all(activeWorkers);
  return results;
}

async function run() {
  try {
    console.log("Fetching recipe list from database...");
    const recipes = await fetchAllRecipes();
    console.log(`Loaded ${recipes.length} recipes.\n`);

    const startTime = Date.now();
    const results = await runConcurrentPool(recipes);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`\n================ SUMMARY ================`);
    console.log(`Total processed: ${results.length}`);
    console.log(`Success:         ${successCount}`);
    console.log(`Failed:          ${failCount}`);
    console.log(`Total duration:  ${totalDuration}s`);
    console.log(`=========================================`);

    const reportPath = path.join(__dirname, 'batch_normalization_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: commit ? 'live' : 'dry-run',
      concurrency: concurrencyLimit,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
        duration_sec: parseFloat(totalDuration)
      },
      results: results
    }, null, 2), 'utf-8');

    console.log(`Report successfully written to: ${reportPath}`);

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal batch execution error:", err);
    process.exit(1);
  }
}

run();
