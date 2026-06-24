const fs = require('fs');
const path = require('path');

const supabaseUrl = "https://njzqcftjzskwcpforwzf.supabase.co";
const publishableKey = "sb_publishable_2WUTLXygeO3s1FTvBdydwA_24zE-a6R";
const cleanerUrl = `${supabaseUrl}/functions/v1/recipe-cleaner`;
const bypassKey = process.env.CLEANER_BYPASS_KEY;
if (!bypassKey) {
  console.error("Missing CLEANER_BYPASS_KEY environment variable. Set it before running this script.");
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
  const url = `${supabaseUrl}/rest/v1/recipe?select=id,title`;
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

async function cleanRecipe(recipe, index, total) {
  const prefix = `[${index}/${total}]`;
  console.log(`${prefix} Started: "${recipe.title}" (${recipe.id})`);
  
  const payload = {
    recipe_id: recipe.id,
    commit: commit
  };

  const startTime = Date.now();
  try {
    const response = await fetch(cleanerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publishableKey,
        'Authorization': `Bearer ${publishableKey}`,
        'x-bypass-key': bypassKey
      },
      body: JSON.stringify(payload)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`${prefix} FAILED: "${recipe.title}" in ${duration}s - Status ${response.status}: ${errText}`);
      return {
        id: recipe.id,
        title: recipe.title,
        success: false,
        duration_sec: parseFloat(duration),
        error: `Status ${response.status}: ${errText}`
      };
    }

    const data = await response.json();
    console.log(`${prefix} SUCCESS: "${recipe.title}" in ${duration}s. Generated ${data.steps ? data.steps.length : 0} steps.`);
    return {
      id: recipe.id,
      title: recipe.title,
      success: true,
      duration_sec: parseFloat(duration),
      evaluation: data.evaluation,
      steps_count: data.steps ? data.steps.length : 0,
      commit: data.commit
    };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`${prefix} ERROR: "${recipe.title}" in ${duration}s - Exception: ${err.message}`);
    return {
      id: recipe.id,
      title: recipe.title,
      success: false,
      duration_sec: parseFloat(duration),
      error: err.message
    };
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
