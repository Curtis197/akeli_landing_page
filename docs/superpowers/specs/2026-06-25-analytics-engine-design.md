# Akeli Creator Analytics Engine — Design Spec

**Date:** 2026-06-25
**Author:** Curtis — Founder Akeli
**Status:** Validated — ready for implementation planning
**Version:** 1.1 — updated 2026-06-25 (9 gaps added from simulation session)

---

## 1. Vision

The Akeli Creator Analytics Engine transforms raw platform data into a **decision-making system** for food creators. A creator should be able to ask any question about their business — "Why did my revenue drop?", "What should I create next?", "Who is my audience really?" — and get a specific, data-backed, actionable answer in seconds.

The engine has three components:
- **SQL function library** — 23 PostgreSQL functions in Supabase for data retrieval and aggregation
- **Python analytics engine** — 49 FastAPI endpoints on Railway for statistical analysis, machine learning, and prediction
- **AI agent** — Claude claude-sonnet-4-6 with tool_use, orchestrating both layers to answer free-form questions and power pre-built insight cards

---

## 2. Architecture

```
Creator Dashboard (Next.js)
        │
        ├── 20 Insight Cards (pre-built, structured display)
        │       └── calls specific tools directly → optional "Explain ✨"
        │
        └── Chat Interface (free-form questions)
                └── message + conversation_history
                        │
                        ▼
            Supabase Edge Function: analytics-agent
                        │
               Claude claude-sonnet-4-6 (tool_use)
               max_tokens: 1024 · max_iterations: 3
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
  Supabase PostgreSQL          Railway FastAPI
  23 SQL functions             49 Python endpoints
  (aggregation, retrieval)     (statistics, ML, prediction)
```

### Request Flow

1. Creator clicks a card or types a question
2. Request hits `analytics-agent` Edge Function with `{ creator_id, message, conversation_history }`
3. Claude receives message + all 63 tool definitions
4. Claude calls whichever tools are relevant — in parallel where possible
5. SQL functions execute via Supabase RPC · Python endpoints execute via HTTP to Railway
6. Tool results return to Claude as `tool_result` blocks
7. Claude synthesizes a natural-language response with one specific actionable recommendation
8. Response streams back to dashboard

### Security Model

`creator_id` is **always injected server-side** from the authenticated session. Claude never receives it as a free parameter to fill. This prevents any prompt injection from accessing another creator's data.

```typescript
// creator_id is ALWAYS overridden — never trusted from Claude's output
const result = await callTool(block.name, {
  ...block.input,
  creator_id  // ← session-derived
})
```

All audience data is aggregated and anonymized. No individual user data is ever returned — minimum cohort size: 10 users.

---

## 3. SQL Function Catalog (Supabase PostgreSQL)

All functions are PostgreSQL RPC functions returning clean JSON.

**Creator-scoped functions** (sections 3.1–3.4) require `creator_id` and scope data to that creator only. All 20 original functions are creator-scoped.

**`platform_wide` parameter:** When a creator has no published recipes yet (new creator, market research mode), pass `platform_wide: true` instead of `creator_id`. Functions that support it scope to the full platform filtered by `region`, `tags`, or `cuisine_type`. Functions 3.5.1–3.5.3 are platform-wide by design and do not accept `creator_id`.

### 3.1 Revenue

```sql
get_revenue_summary(creator_id, period_days)
  Returns: total_revenue, consumption_revenue, fan_revenue,
           prev_period_total, pct_change, avg_per_day,
           breakdown_by_revenue_type

get_revenue_by_recipe(creator_id, period_days, limit)
  Returns: recipe_id, title, cover_image_url,
           revenue, consumptions, revenue_share_pct

get_revenue_timeline(creator_id, period_days, granularity)
  granularity: 'day' | 'week' | 'month'
  Returns: series[{ date, consumption_revenue, fan_revenue, total }]

get_payout_history(creator_id, limit)
  Returns: amount, status, requested_at, completed_at, stripe_payout_id
```

### 3.2 Consumption & Engagement

```sql
get_consumption_summary(creator_id, period_days)
  Returns: total_consumptions, unique_users, unique_recipes_consumed,
           avg_consumptions_per_user, prev_period_total, pct_change

get_consumption_by_recipe(creator_id, period_days)
  Returns: recipe_id, title, consumptions, unique_users,
           avg_session_duration_sec, repeat_rate

get_consumption_timeline(creator_id, period_days, granularity)
  Returns: series[{ date, consumptions, unique_users }]

get_recipe_engagement(recipe_id, creator_id)
  Returns: impressions, opens, open_rate, likes, saves, comments,
           consumptions, impression_to_consumption_rate,
           avg_session_duration_sec,
           ratings: { overall, taste, ease, satiety }

get_drop_off_recipes(creator_id, lookback_days, threshold_pct)
  Returns: recipe_id, title, current_rate, prev_rate, drop_pct
```

### 3.3 Audience

```sql
get_audience_profile(creator_id)
  Returns: goal_distribution, dietary_restrictions_distribution,
           cuisine_preference_distribution, avg_activity_level,
           gender_split, age_buckets

get_fan_stats(creator_id)
  Returns: active_fans, fan_revenue_this_month,
           fans_gained_30d, fans_lost_30d, net_change,
           avg_fan_tenure_days

get_loyal_users(creator_id, min_consumptions, period_days, limit)
  Returns: anonymized cohort — consumption_count, recipes_tried,
           first_consumption_at, last_consumption_at

get_audience_cuisine_overlap(creator_id)
  Returns: region_code, region_name, overlap_count, overlap_pct
```

### 3.4 Catalog

```sql
get_catalog_stats(creator_id)
  Returns: total_recipes, published, drafts, avg_rating,
           avg_consumptions_per_recipe, recipes_with_zero_consumptions,
           pct_translated

get_top_recipes(creator_id, period_days, limit, sort_by)
  sort_by: 'revenue' | 'consumptions' | 'rating' | 'saves' | 'engagement_rate'
  Returns: ranked list with all key metrics per recipe

get_underperforming_recipes(creator_id, period_days)
  Returns: recipe_id, title, consumptions, median_benchmark, gap_pct

get_recipe_ratings_breakdown(recipe_id, creator_id)
  Returns: overall, taste, ease, satiety averages + last 5 comment excerpts

get_recipe_funnel(recipe_id, creator_id, period_days)
  Returns: impressions → opens → saves → meal_plan additions → consumptions
           each stage count + conversion rate between stages

get_catalog_gaps(creator_id)
  Returns: gap_type, description, audience_demand_pct, creator_coverage_pct
```

### 3.5 Platform-Wide Cross-Segment *(added v1.1)*

These functions operate on the full platform — not scoped to a single creator. Used for market research, niche discovery, and audience health queries by creators who have no published recipes yet, or who are researching a new market.

```sql
get_platform_top_recipes_by_region(
  region,              -- e.g. 'central_africa', 'west_africa'
  tags_filter[],       -- optional tag filter e.g. ['cameroun', 'express']
  sort_by,             -- 'consumptions' | 'rating' | 'saves'
  limit,
  include_time_breakdown  -- boolean: include prep/cook/total time columns
)
  Joins: recipe + meal_consumption
  WHERE: r.region = region AND r.tags @> tags_filter
  Returns: ranked recipe list with title, difficulty, prep_time_min,
           cook_time_min, total_time_min, tags, average_rating,
           total_consumptions, unique_users


get_top_recipes_by_segment(
  gender,                  -- 'male' | 'female' | null (any)
  cuisine_preference[],    -- e.g. ['west_africa', 'central_africa']
  max_difficulty,          -- 'easy' | 'medium' | 'hard'
  max_total_time_min,      -- integer cutoff
  meal_type,               -- 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  limit
)
  Joins: recipe + meal_consumption + user_cuisine_preference
         + user_health_profile
  Returns: ranked recipe list with title, region, consumptions,
           unique_users, avg_rating, difficulty, total_time_min,
           matched_tags[]
  Note: requires min cohort of 10 users to return a segment result


get_cohort_recipe_consumption(
  meal_type,           -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  sex,                 -- 'female' | 'male' | null
  weight_kg_min,       -- integer
  weight_kg_max,       -- integer
  weight_goal,         -- 'loss' | 'gain' | 'maintenance' | null
  activity_level,      -- 'sedentary' | 'light' | 'moderate' | 'active' | null
  dietary_restrictions[], -- optional tag filter
  include_macro_data,  -- boolean: join recipe_macro and return macro columns
  limit
)
  Joins: meal_consumption + meal_plan_entry (meal_type filter)
         + recipe + recipe_macro (if include_macro_data)
         + user_health_profile + user_goal
  Returns: ranked recipes for this cohort with optional macro breakdown
           (calories, protein_g, carbs_g, fat_g, fiber_g)
           + cohort_size, cohort_breakfast_averages{}
  Note: requires min cohort of 10 users
```

---

## 4. Python Analytics Engine (Railway FastAPI)

The Railway service connects directly to Supabase via `DATABASE_URL`. Each endpoint fetches its own data, computes, and returns structured JSON. Pure compute layer — nothing persisted on Railway.

Authentication: `Authorization: Bearer RAILWAY_SECRET` header checked on every request.

### 4.1 Niche Research (6 endpoints)

**`POST /analytics/niche-landscape`**
```
Computes: platform-wide demand clusters by cuisine × meal_type × dietary_tag
          supply coverage per niche (creator count, recipe count)
          opportunity_score = demand ÷ supply per niche
Returns:  niches[{
            label, demand_index, supply_index,
            opportunity_score, top_searches[], creator_count
          }]
```

**`POST /analytics/trending-niches`**
```
Computes: 30d vs 90d consumption growth rate per cuisine/tag cluster
          emerging niches (low base, high acceleration)
          declining niches (high base, negative trend)
Returns:  trending[], emerging[], declining[]
          each with: growth_rate, signal_strength, sample_size
```

**`POST /analytics/geographic-niche`**
```
Input:    creator_id
Computes: consumption demand by user_locale × cuisine_type
          diaspora concentration (where is demand for creator's cuisine highest?)
          untapped city/country markets for creator's style
Returns:  demand_by_locale[], untapped_markets[{
            location, demand_score, creator_coverage_pct
          }]
```

**`POST /analytics/seasonal-niche`**
```
Input:    creator_id
Computes: month-by-month consumption patterns per cuisine/tag (all platform history)
          upcoming seasonal peaks (next 60 days)
          creator's current alignment with seasonal demand
Returns:  seasonal_calendar[], upcoming_peaks[],
          creator_alignment_score
```

**`POST /analytics/ingredient-niche`**
```
Computes: ingredients with rising consumption frequency but low recipe coverage
          rare ingredients that outperform average when used
          ingredient co-occurrence clusters (ingredients in top-performing recipe combos)
Returns:  rising_ingredients[], high_impact_ingredients[], ingredient_clusters[]
```

**`POST /analytics/cross-cuisine-niche`**
```
Computes: fusion gaps — cuisine A × cuisine B combinations with demand but no supply
          creator's cuisine overlap with adjacent high-growth cuisines
Returns:  fusion_opportunities[{
            cuisines[], demand_signal, existing_recipes_count, opportunity_score
          }]
```

---

### 4.2 Idea Validation (5 endpoints)

**`POST /analytics/validate-recipe-idea`**
```
Input:    { title, description, cuisine_region, tags[],
            cook_time_min, dietary_tags[], creator_id }
Computes: semantic similarity to existing recipes (vector search) → competition density
          demand signal from search/consumption patterns matching concept
          audience fit score — alignment with creator's own audience profile
          optimal parameters based on niche top performers
          predicted performance range (low/mid/high)
Returns:  competition_density, demand_signal, audience_fit_score,
          predicted_consumptions_30d{ low, mid, high },
          optimization_suggestions[]
```

**`POST /analytics/title-optimization`**
```
Input:    { title_candidates[], cuisine_region, creator_id }
Computes: keyword strength, clarity score, length optimization per title
          similarity to high-performing recipe titles in same niche
          A/B ranking
Returns:  ranked_titles[{ title, score, strengths[], weaknesses[] }]
```

**`POST /analytics/timing-recommendation`**
```
Input:    { recipe_concept, creator_id }
Computes: best day of week and time to publish for maximum first-week traction
          upcoming seasonal alignment (publish before peak, not during)
          creator's audience peak activity windows
          publication frequency gap (is creator underposting?)
Returns:  optimal_publish_window, seasonal_alignment_score,
          frequency_recommendation, urgency_label
```

**`POST /analytics/similar-recipe-benchmark`**
```
Input:    { recipe_id_or_concept, creator_id }
Computes: 5–10 most semantically similar recipes on platform
          their performance distribution (consumptions, revenue, ratings)
          what top performers have in common (tags, cook time, description patterns)
Returns:  similar_recipes[], performance_distribution{},
          success_patterns[], risk_factors[]
```

**`POST /analytics/series-potential`**
```
Input:    { recipe_id, creator_id }
Computes: audience retention when creator publishes recipe sequels
          platform data on recipe series vs standalone performance
          suggested series angles (regional variations, difficulty tiers, seasonal)
Returns:  series_viability_score, retention_lift_estimate, series_suggestions[]
```

---

### 4.3 Recipe Impact Study (8 endpoints) *(+2 in v1.1)*

**`POST /analytics/recipe-lifecycle`**
```
Input:    { recipe_id, creator_id }
Computes: full lifecycle curve: launch → growth → plateau → decline
          current stage + estimated time in stage
          comparison to platform median lifecycle
          revival potential score for dormant recipes
Returns:  lifecycle_stage, days_in_stage, curve_data[],
          vs_platform_median{}, revival_score
```

**`POST /analytics/halo-effect`**
```
Input:    { recipe_id, creator_id }
Computes: correlation: consuming recipe X → consuming other catalog recipes
          which recipes benefit most when this is consumed first
          gateway score — how often is this a user's first recipe from this creator
Returns:  gateway_score,
          downstream_recipes[{ recipe_id, title, correlation_strength }],
          halo_revenue_estimate
```

**`POST /analytics/catalog-correlation`**
```
Input:    { creator_id }
Computes: pairwise consumption correlation matrix across full catalog
          recipe clusters (frequently consumed together)
          recommended cross-promotion pairs
Returns:  correlation_matrix, recipe_clusters[], cross_promotion_pairs[]
```

**`POST /analytics/publishing-frequency-impact`**
```
Input:    { creator_id, lookback_days }
Computes: correlation between publication rate and overall consumption volume
          optimal posting cadence for this audience
          engagement decay curve (how fast engagement drops without new content)
Returns:  optimal_cadence_per_week, engagement_decay_curve[],
          current_cadence_vs_optimal
```

**`POST /analytics/recipe-improvement-roi`**
```
Input:    { recipe_id, creator_id }
Computes: before/after performance comparison if recipe was edited
          rating trajectory after last edit
          statistical significance of improvement
Returns:  pre_edit_metrics{}, post_edit_metrics{},
          lift_pct, significance_score, recommendation
```

**`POST /analytics/catalog-revenue-attribution`**
```
Input:    { creator_id, period_days }
Computes: direct revenue drivers vs catalog health contributors
          revenue concentration risk (% depending on top 3 recipes)
          substitution map (if top recipe drops, what fills the gap)
Returns:  revenue_drivers[], catalog_health_contributors[],
          concentration_risk_score, substitution_map{}
```

**`POST /analytics/active-time-classifier`** *(added v1.1)*
```
Input:    { recipe_id } OR { steps: string[] }
Computes: parses recipe_step content to classify each step as
          active ("mélanger", "couper", "faire revenir", "assaisonner", "dresser")
          vs passive ("laisser mijoter", "enfourner", "faire mariner", "reposer")
          sums active_time_min and passive_time_min from step durations
Returns:  active_time_min, passive_time_min, total_time_min,
          active_time_pct,
          classification: 'express_active'(<15min) | 'medium'(15-30min) | 'long'(>30min)
          steps_classified[{ step, type, duration_min }]

Note: Addresses the discovery that users mentally classify recipes by
      active time, not total time. A 50-min recipe with 10-min active
      time is perceived as "express" by users. This function enables
      accurate express/medium/long labeling on recipe cards.

Data model requirement: add active_time_min column to recipe table.
  Migration: ALTER TABLE recipe ADD COLUMN active_time_min INTEGER;
  Backfill: call this function for all existing recipes at migration time.
  Wizard: expose active_time_min field in Step 1 (Basic Info) — estimated
          by creator, not computed. Computation is the fallback.
```

**`POST /analytics/recipe-time-distribution`** *(added v1.1)*
```
Input:    { region, tags[], platform_wide: true }
Computes: distribution of total_time_min and active_time_min across
          all recipes matching region/tags filter,
          bucketed: express(≤30min), rapide(31-45), moyen(46-75),
                    long(76-120), très long(>120)
          both raw count and consumption-weighted distribution
          gap analysis vs audience cooking_time_preference for
          the same region's audience
Returns:  distribution_buckets{},
          demand_weighted_distribution{},
          supply_vs_demand_gap: { bucket, supply_pct, demand_pct, gap }[],
          median_total_time_min, p25, p75,
          insight: string  (e.g. "58% of audience wants ≤30 min,
                            only 13% of supply is express")
```

---

### 4.4 Audience Study (6 endpoints)

**`POST /analytics/audience-deep-profile`**
```
Input:    { creator_id }
Computes: full behavioral profile (aggregated, anonymized, min cohort 10)
          goal distribution + trend over time
          dietary restriction prevalence + trend
          cooking time tolerance (quick vs long recipe performance split)
          engagement depth distribution
Returns:  goal_distribution{}, goal_trend[],
          dietary_distribution{}, cook_time_preference{},
          engagement_depth_histogram[]
```

**`POST /analytics/audience-evolution`**
```
Input:    { creator_id, lookback_months }
Computes: audience profile changes month over month
          new segments emerged recently
          segments that churned
          early signals of audience drift
Returns:  monthly_snapshots[], new_segments[],
          churned_segments[], drift_alerts[]
```

**`POST /analytics/churn-prediction`**
```
Input:    { creator_id }
Computes: cohorts showing early disengagement signals
          (reduced frequency, longer gaps, fewer recipe varieties)
          churn risk score per cohort (never individual)
          estimated revenue at risk from churning cohorts
          re-engagement actions
Returns:  at_risk_cohorts[{ size, churn_probability, revenue_at_risk }],
          reengagement_actions[]
```

**`POST /analytics/superfan-identification`**
```
Input:    { creator_id }
Computes: cohorts with highest engagement, longest tenure, broadest recipe exploration
          fan mode conversion probability per cohort
          estimated revenue uplift if top cohorts converted
          conversion triggers (what actions typically precede fan mode conversion)
Returns:  superfan_cohort_size, conversion_probability,
          revenue_uplift_estimate, conversion_triggers[]
```

**`POST /analytics/audience-language-profile`**
```
Input:    { creator_id }
Computes: language distribution of audience
          translation coverage gaps vs audience demand
          which recipes have missing translations for key audience languages
Returns:  language_distribution{}, translation_gap_recipes[],
          priority_translations[]
```

**`POST /analytics/dietary-trend-radar`**
```
Input:    { creator_id }
Computes: growing vs declining dietary preferences in creator's audience
          platform-wide dietary trend
          creator's recipe alignment vs emerging dietary demand
Returns:  growing_tags[], declining_tags[],
          creator_alignment{}, opportunity_tags[]
```

---

### 4.5 Potential Audience (5 endpoints)

**`POST /analytics/lookalike-audience`**
```
Input:    { creator_id }
Computes: platform users with similar behavior profiles to current fans
          who have never consumed this creator's recipes
          estimated reachability via similar cuisines
          size of addressable lookalike pool
Returns:  lookalike_pool_size, similarity_distribution{},
          reachable_estimate, overlap_cuisines[]
```

**`POST /analytics/cross-creator-audience`**
```
Input:    { creator_id }
Computes: fans of similar creators who have NOT discovered this creator
          estimated audience expansion via collaborations
Returns:  overlap_creators[{
            similarity_score, shared_fans_pct, exclusive_fans_estimate
          }],
          collaboration_potential_score
```

**`POST /analytics/platform-reach-ceiling`**
```
Input:    { creator_id }
Computes: total addressable audience on platform for creator's cuisine/style
          current penetration rate
          comparable creators at same catalog size — their audience sizes
          projected ceiling at current growth rate
Returns:  addressable_audience_size, current_penetration_pct,
          comparable_benchmarks[], projected_ceiling,
          time_to_ceiling_months
```

**`POST /analytics/diaspora-expansion-map`**
```
Input:    { creator_id }
Computes: geographic distribution of creator's current audience
          platform user density by location for creator's cuisine type
          untapped diaspora markets (high platform users, low creator penetration)
          language alignment per market
Returns:  current_audience_map[],
          untapped_markets[{
            location, platform_users, creator_penetration_pct,
            primary_language, opportunity_score
          }]
```

**`POST /analytics/new-segment-opportunity`**
```
Input:    { creator_id }
Computes: platform user segments not in creator's current audience
          whose behavior overlaps with creator's top-performing recipes
          entry-point recipes most likely to attract each new segment
Returns:  new_segments[{
            label, size, overlap_score, entry_point_recipes[]
          }]
```

---

### 4.6 Competitive Intelligence (3 endpoints)

**`POST /analytics/creator-benchmark`**
```
Input:    { creator_id }
Computes: anonymous comparison vs creators with similar catalog size and cuisine
          percentile ranking: revenue, consumptions, fan count, engagement, retention
          what top-quartile creators do differently (cadence, diversity, tags)
Returns:  percentile_ranks{}, top_quartile_patterns[],
          gap_to_median{}, gap_to_top{}
```

**`POST /analytics/platform-trend-radar`**
```
Input:    { creator_id }
Computes: platform-wide consumption trends 30d vs 90d
          rising cuisines, falling cuisines, breakout recipes
          creator's alignment with platform growth areas
Returns:  rising_cuisines[], falling_cuisines[], breakout_tags[],
          creator_alignment_score, recommended_pivots[]
```

**`POST /analytics/content-gap-vs-top-performers`**
```
Input:    { creator_id }
Computes: top-performing recipes in creator's niche across all creators
          what those recipes have that creator's catalog lacks
          (tags, cook time ranges, dietary coverage, macro profiles)
Returns:  niche_top_performers[], content_gaps[], quick_win_opportunities[]
```

---

### 4.7 Predictive & Strategy (5 endpoints) *(+1 in v1.1)*

**`POST /analytics/revenue-forecast`**
```
Input:    { creator_id, horizon_days } (30 | 60 | 90)
Computes: ARIMA / exponential smoothing forecast on revenue time series
          confidence intervals (low/mid/high scenario)
          key assumptions (fan count stable, current cadence maintained)
          sensitivity analysis (cadence doubles / top recipe drops 50%)
Returns:  forecast[{ date, low, mid, high }],
          key_assumptions[], sensitivity_scenarios[]
```

**`POST /analytics/fan-growth-forecast`**
```
Input:    { creator_id, horizon_days }
Computes: fan count trend + forecast
          milestone predictions (when will creator hit 50/100/500 fans?)
          impact of reaching fan-mode eligibility threshold
Returns:  fan_forecast[], milestone_dates{},
          eligibility_impact_estimate
```

**`POST /analytics/content-calendar`**
```
Input:    { creator_id, horizon_weeks } (4 | 8 | 12)
Computes: week-by-week publishing recommendations
          each slot: recipe type, niche, dietary angle, timing rationale
          seasonal hooks, catalog gaps filled, estimated performance lift
Returns:  calendar[{
            week, recommendation, rationale,
            estimated_lift_pct, seasonal_hook
          }]
```

**`POST /analytics/catalog-strategy-score`**
```
Input:    { creator_id }
Computes: strategic health across 5 dimensions:
          diversity, depth, demand_alignment, translation_coverage, freshness
          score per dimension + combined score
          top 3 highest-leverage actions
Returns:  dimension_scores{}, overall_score, top_actions[]
```

---

## 5. Agent Orchestration (Supabase Edge Function)

### `analytics-agent` Edge Function

```typescript
// supabase/functions/analytics-agent/index.ts

Deno.serve(async (req) => {
  const { creator_id, message, conversation_history } = await req.json()

  // Lightweight creator context for system prompt
  const context = await getCreatorContext(creator_id)

  const systemPrompt = `
    You are the analytics assistant for Akeli creators.
    You help food creators understand their performance and take concrete actions.

    Creator context:
    - Name: ${context.display_name}
    - Published recipes: ${context.recipe_count}
    - Active fans: ${context.fan_count}
    - Revenue this month: €${context.revenue_this_month}
    - Catalog size: ${context.catalog_size} recipes

    Rules:
    - Always end with ONE specific actionable recommendation
    - Cite exact numbers from the data — no vague statements
    - If data is insufficient, say so and explain what would help
    - Be concise — 3–5 sentences unless a detailed breakdown was requested
    - Respond in the same language as the creator's message (FR or EN)
    - Audience insights are always aggregated — never expose individual user data
    - Call multiple tools in parallel when they are independent
  `

  const messages = [...conversation_history, { role: "user", content: message }]
  let iteration = 0

  while (iteration < 3) {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: ALL_TOOLS,
      messages,
    })

    if (response.stop_reason === "end_turn") {
      return Response.json({
        response: extractText(response),
        tools_called: getToolNames(messages)
      })
    }

    const toolResults = await executeToolCalls(response.content, creator_id)
    messages.push({ role: "assistant", content: response.content })
    messages.push({ role: "user", content: toolResults })
    iteration++
  }
})
```

### Tool Execution Router

```typescript
async function callTool(name: string, params: Record<string, unknown>) {
  if (SQL_FUNCTIONS.has(name)) {
    const { data } = await supabase.rpc(name, params)
    return data
  }

  // Python endpoint — name maps to Railway route
  // e.g. "validate_recipe_idea" → POST /analytics/validate-recipe-idea
  const route = name.replace(/_/g, "-")
  const res = await fetch(`${RAILWAY_URL}/analytics/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RAILWAY_SECRET}`
    },
    body: JSON.stringify(params)
  })
  return res.json()
}

// All tool calls in a response execute in parallel
const toolResults = await Promise.all(
  toolUseBlocks.map(block =>
    callTool(block.name, { ...block.input, creator_id })
  )
)
```

---

## 6. Tool Definition Format

Each of the 63 functions is a Claude tool. The `description` is the most critical field — it tells Claude *when* to use each tool, not just *what* it does.

```typescript
{
  name: "validate_recipe_idea",
  description: `Validates a recipe concept before the creator invests time building it.
    Use when the creator describes a recipe idea and wants to know:
    - if there's demand for it
    - how much competition exists
    - whether it fits their audience
    - what performance to expect
    - how to optimize it before publishing.
    Requires at least a title or description — cannot validate a vague concept.`,
  input_schema: {
    type: "object",
    properties: {
      title:           { type: "string" },
      description:     { type: "string" },
      cuisine_region:  { type: "string" },
      tags:            { type: "array", items: { type: "string" } },
      cook_time_min:   { type: "integer" },
      dietary_tags:    { type: "array", items: { type: "string" } }
    },
    required: []
  }
}
```

---

## 7. Pre-built Insight Cards (20 cards)

Each card shows structured data directly. The **"Explain ✨"** button sends the card data + a default prompt to the agent — Claude does not re-fetch the data.

### Revenue (5 cards)

| # | Title | Tools | Display |
|---|---|---|---|
| 1 | Revenue this month | `get_revenue_summary(30)` | 3 KPI chips · % vs last month |
| 2 | Revenue by recipe | `get_revenue_by_recipe(30)` | Ranked list with bar + € |
| 3 | Revenue trend & forecast | `get_revenue_timeline` + `revenue_forecast` | Line chart · trend label · forecast range |
| 4 | Fan vs consumption split | `get_revenue_summary(90)` | Donut chart · stability score |
| 5 | Payout history | `get_payout_history` | Table: date · amount · status badge |

### Consumption (4 cards)

| # | Title | Tools | Display |
|---|---|---|---|
| 6 | Consumption summary | `get_consumption_summary(30)` | Total · unique users · vs last month |
| 7 | Top recipes this week | `get_top_recipes(7, 5, 'consumptions')` | Top 5 with trend arrows |
| 8 | When your fans cook | `consumption_patterns` | 7×24 heatmap · top 3 peak windows |
| 9 | Recipes losing traction | `get_drop_off_recipes` + `drop_off_diagnosis` | Alert list with % drop · diagnosis label |

### Audience (4 cards)

| # | Title | Tools | Display |
|---|---|---|---|
| 10 | Who eats your food | `audience_deep_profile` | Goal breakdown · dietary tags · activity level |
| 11 | Fan mode health | `get_fan_stats` | Fan count · net change · avg tenure |
| 12 | Your audience also eats | `get_audience_cuisine_overlap` | Tag cloud of adjacent cuisines |
| 13 | Your most loyal fans | `get_loyal_users` + `superfan_identification` | Cohort stats · fan mode conversion potential |

### Catalog (4 cards)

| # | Title | Tools | Display |
|---|---|---|---|
| 14 | Catalog health | `get_catalog_stats` + `catalog_strategy_score` | Score gauge · 5 dimension breakdown |
| 15 | Recipe performance scores | `recipe_performance_score` | All recipes with composite score + status (star/rising/stable/declining/dormant) |
| 16 | Underperforming recipes | `get_underperforming_recipes` + `recipe_lifecycle` | List with gap vs median · lifecycle stage |
| 17 | What to create next | `recipe_opportunity` + `trending_niches` | Top 5 opportunity cards with demand + gap |

### Growth (3 cards)

| # | Title | Tools | Display |
|---|---|---|---|
| 18 | Growth vs platform | `growth_trajectory` + `creator_benchmark` | Your rates vs p25/p50/p75 · trajectory label |
| 19 | Retention curve | `cohort_retention` | Cohort table · churn cliff · fan vs standard |
| 20 | Your audience segments | `audience_segments` | 3 segment cards: archetype · size % · revenue % |

---

## 8. Chat Interface

Fixed **"Ask ✨"** button on all dashboard pages opens a slide-over panel.

**Suggested prompts** shown when empty:
```
"Which recipe should I focus on this month?"
"Why are my fans not growing?"
"What should I create next?"
"Is my revenue stable or fragile?"
"Who is my audience really?"
```

**"Explain ✨" integration:** clicking on any insight card's explain button opens the chat pre-loaded with that card's data already in context — Claude does not re-fetch.

```typescript
const handleExplain = (card: InsightCard, cardData: unknown) => {
  openChat({
    prefillMessage: card.defaultPrompt,
    prefillContext: {
      role: "user",
      content: `Data for "${card.title}": ${JSON.stringify(cardData)}\n\n${card.defaultPrompt}`
    }
  })
}
```

---

## 9. Function Count Summary

| Layer | Domain | Count |
|---|---|---|
| SQL | Revenue | 4 |
| SQL | Consumption & Engagement | 5 |
| SQL | Audience | 4 |
| SQL | Catalog | 7 |
| **SQL Total** | | **20** |
| Python | Original analytics | 8 |
| Python | Niche Research | 6 |
| Python | Idea Validation | 5 |
| Python | Recipe Impact | 6 |
| Python | Audience Study | 6 |
| Python | Potential Audience | 5 |
| Python | Competitive Intelligence | 3 |
| Python | Predictive & Strategy | 4 |
| **Python Total** | | **43** |
| **Grand Total** | | **63** |

---

## 10. Build Sequence

**Phase 1 — Foundation (SQL + basic agent)**
1. Implement all 20 SQL functions as Supabase PostgreSQL RPC functions
2. Deploy `analytics-agent` Edge Function with SQL tools only
3. Build 5 revenue insight cards + chat interface shell
4. Test agent with revenue questions

**Phase 2 — Original Python analytics**
5. Set up Railway FastAPI project structure + auth middleware
6. Implement original 8 Python endpoints (revenue-trend, cohort-retention, recipe-performance-score, consumption-patterns, recipe-opportunity, growth-trajectory, audience-segments, drop-off-diagnosis)
7. Add Python tools to agent
8. Build remaining 15 insight cards

**Phase 3 — Full engine expansion**
9. Implement 35 expanded Python endpoints across 6 new domains
10. Add all tools to agent
11. Build content-calendar, validate-recipe-idea, and niche-landscape as featured tools in the UI
12. Add suggested prompts + "Explain ✨" flow

---

## 11. Open Questions

- Should the content calendar be a dedicated page (not just a chat response)?
- Should recipe idea validation have a dedicated UI (input form + structured output) in addition to being callable from chat?
- Platform percentile benchmarking requires aggregating data across all creators — confirm this is acceptable from a privacy standpoint (all aggregated, no individual creator data exposed to another creator)
- Minimum data thresholds: how many consumptions before a recipe is included in analytics? Suggested: 5 minimum to filter noise
- Railway service: should analytics endpoints be authenticated per-creator via the same Supabase JWT, or is the shared `RAILWAY_SECRET` sufficient?

---

*Document created: 2026-06-25*
*Author: Curtis — Founder Akeli*
*Version: 1.0 — Analytics Engine Design*
