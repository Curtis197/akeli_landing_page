# Akeli Creator Analytics Engine — Design Spec

**Date:** 2026-06-25
**Author:** Curtis — Founder Akeli
**Status:** Validated — ready for implementation planning
**Version:** 1.3 — updated 2026-06-25 (10 calculus & optimization endpoints added)

---

## 1. Vision

The Akeli Creator Analytics Engine transforms raw platform data into a **decision-making system** for food creators. A creator should be able to ask any question about their business — "Why did my revenue drop?", "What should I create next?", "Who is my audience really?" — and get a specific, data-backed, actionable answer in seconds.

The engine has three components:
- **SQL function library** — 23 PostgreSQL functions in Supabase for data retrieval and aggregation
- **Python analytics engine** — 71 FastAPI endpoints on Railway for statistical analysis, machine learning, and prediction
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
  23 SQL functions             71 Python endpoints
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
**→ Upgrade (v1.2):** Replace point estimate with Bayesian prediction intervals
via `bootstrap-confidence-intervals`. Returns P10/P50/P90 consumption range
with honest uncertainty bounds, especially important for niches with <30 comparable recipes.
No API change — `predicted_consumptions_30d` gains `p10`, `p25`, `p50`, `p75`, `p90` fields.

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
**→ Upgrade (v1.2):** Replace heuristic risk score with Kaplan-Meier survival function
+ Cox proportional hazard model (from `cohort-survival-curves`). Churn probability
becomes a proper survival estimate with time-to-churn distribution, not just a score.

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
**→ Upgrade (v1.2):** Replace ARIMA with `monte-carlo-revenue-forecast`.
Runs 10,000 simulations sampling from distributions of publication rate,
fan acquisition, and recipe decay curves. Returns full P10–P90 distribution
per date, not just 3 scenarios. Existing `low/mid/high` fields map to P25/P50/P75
for backwards compatibility.

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

**`POST /analytics/session-strategy-synthesis`** *(added v1.1)*
```
Input:    { creator_id, session_insights[{ question, tools_called[], key_findings[] }] }
Computes: given all insights produced in a multi-turn session,
          synthesize into a coherent creator action plan
          prioritize by: opportunity_score × ease_of_execution
          cross-reference findings to surface emergent insights
          (e.g. "audience wants quick recipes AND your cuisine averages 74 min
                 → express versions of your classics = uncontested positioning")
Returns:  actions[{
            title,
            rationale,
            opportunity_score,    -- 0–100
            effort_level,         -- 'low' | 'medium' | 'high'
            estimated_monthly_revenue_impact_eur
          }],
          positioning_statement,  -- one-sentence creator differentiator
          session_summary         -- 3-bullet plain-language takeaway

Note: This function makes cross-session reasoning explicit, cacheable,
      and exportable. Powers a "Your Session Summary" card shown at the
      end of an analytics chat session.
```

---

### 4.8 Health & Nutrition (3 endpoints) *(added v1.1)*

New domain surfaced by Q4 of the simulation session. Handles all nutritional science computations — BMR/TDEE/macro calculation, cohort nutritional gap analysis, and recipe compliance checking. Enables creators to build targeted recipes for health-goal segments.

**`POST /analytics/macro-recommendation-by-profile`**
```
Input:    {
            sex,                  -- 'female' | 'male'
            weight_kg_min,
            weight_kg_max,
            age_min,              -- optional, defaults to 25
            age_max,              -- optional, defaults to 45
            height_cm,            -- optional, defaults to 165
            activity_level,       -- 'sedentary' | 'light' | 'moderate' | 'active'
            weight_goal,          -- 'loss' | 'gain' | 'maintenance'
            loss_speed,           -- 'moderate'(500kcal deficit) | 'aggressive'(750kcal)
            meal_type,            -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
            meals_per_day,        -- integer, for meal calorie allocation
            dietary_restrictions[] -- e.g. ['halal', 'lactose_free']
          }
Computes:
  1. BMR range (Mifflin-St Jeor):
       female: BMR = 10×weight + 6.25×height - 5×age - 161
       male:   BMR = 10×weight + 6.25×height - 5×age + 5
  2. TDEE range = BMR × activity_multiplier
       (sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725)
  3. Calorie deficit by loss_speed
  4. Daily calorie target range (min/max)
  5. Meal calorie allocation for meal_type (breakfast ~27%, lunch ~35%, etc.)
  6. Macro split optimized for goal:
       weight_loss:  protein 35%, fat 30%, carbs 35%
       muscle_gain:  protein 40%, fat 25%, carbs 35%
       maintenance:  protein 25%, fat 30%, carbs 45%
  7. Absolute macro targets in grams for the requested meal_type
  8. Fiber target adjusted for gap_to_next_meal (satiety window)
  9. Safety guardrails — flag if computed deficit > 800 kcal/day
Returns:  {
            calorie_range: { min, max },
            macro_targets_g: { protein, fat, carbs },
            macro_pct: { protein, fat, carbs },
            fiber_target_g,
            deficit_kcal,
            safety_notes[],
            basis: { bmr_range{}, tdee_range{}, activity_multiplier }
          }
```

**`POST /analytics/nutrition-gap-analysis`**
```
Input:    { cohort_filters{}, meal_type, macro_targets{} }
Computes: what the filtered cohort ACTUALLY eats (avg from get_cohort_recipe_consumption)
          vs the macro_targets passed in
          gap per macro (protein deficit, carb excess, fiber shortfall, etc.)
          severity classification per gap (critical / moderate / minor)
          which existing platform recipes in the cohort's region close the gap
          which recipe TYPES are most needed to fill the deficit
Returns:  {
            cohort_size,
            current_avg_macros{},
            target_macros{},
            gaps: [{ macro, current_g, target_g, delta_g, severity }],
            closing_recipes[{ title, region, macros{} }],
            missing_recipe_types[{ description, gap_addressed }]
          }
```

**`POST /analytics/recipe-compliance-checker`**
```
Input:    { recipe_id or recipe_concept: string,
            macro_targets{},
            dietary_restrictions[] }
Computes: does this recipe meet the macro targets within a 15% tolerance?
          which constraints it fails (protein too low, carbs too high, etc.)
          suggested ingredient swaps to reach compliance
          (e.g. "replace white rice with cauliflower rice → -18g carbs +2g fiber")
          existing compliant recipes on platform as alternatives
Returns:  {
            compliance_score,       -- 0–100
            is_compliant: boolean,
            failed_constraints[{ constraint, current_value, target_value }],
            modification_suggestions[{ swap, impact_on_macros{} }],
            compliant_alternatives[{ title, region, macros{} }]
          }
```

---

### 4.9 Mathematical Analytics Engine (12 endpoints) *(added v1.2)*

Three mathematical layers that find hidden structure, quantify uncertainty, and separate signal from noise — capabilities the descriptive analytics above cannot provide.

#### Group A — Linear Algebra (3 endpoints)

**`POST /analytics/recipe-matrix-factorization`**
```
Input:    { creator_id, n_factors } (n_factors default: 3)
Computes: SVD decomposition of the user × recipe consumption matrix
          for the creator's full audience.
          Each latent factor = a hidden taste dimension.
          Each user and recipe gets coordinates on these dimensions.
          Factors are labelled automatically from tag co-occurrence
          (e.g. factor 1 loads heavily on 'traditionnel','long','weekend'
                → labelled "nostalgic")
Returns:  latent_factors[{
            id, label, explained_variance_pct,
            top_recipes[],   -- recipes with highest loading on this factor
            top_tags[]       -- tags that define this factor
          }],
          audience_distribution{},   -- % of audience per factor
          unserved_factors[]         -- factors with audience but no recipes
```

**`POST /analytics/catalog-pca`**
```
Input:    { creator_id, region } (region = scope to niche if platform_wide)
Computes: PCA on recipe feature matrix
          features: active_time_min, total_time_min, protein_g, carbs_g,
                    fat_g, fiber_g, difficulty_encoded, tag_vector,
                    cover_quality_score, avg_rating, consumptions_30d
          Identifies PC1 and PC2 — the 2 axes that explain most variance
          in consumption outcomes.
          Computes loading scores: which features drive each axis.
Returns:  pc1{ label, explained_variance_pct, top_loadings[] },
          pc2{ label, explained_variance_pct, top_loadings[] },
          recipes_projected[{ recipe_id, title, pc1_coord, pc2_coord }],
          insight: string  -- e.g. "PC1 = speed (44% variance).
                               You have been optimizing difficulty instead."
```

**`POST /analytics/creator-positioning-map`**
```
Input:    { creator_id }
Computes: runs catalog-pca on each creator in the same niche.
          Projects every creator as a point in the 2D PCA space.
          Computes cluster density: where are creators crowded vs sparse?
          Identifies white-space quadrants with audience demand but
          no creators currently positioned there.
Returns:  creator_position{ pc1, pc2 },
          niche_map[{
            creator_id_anon, pc1, pc2, catalog_size, monthly_consumptions
          }],
          crowded_zones[],
          white_space_zones[{
            pc1_range, pc2_range, audience_demand_pct, creator_count: 0
          }],
          positioning_recommendation: string
```

---

#### Group B — Probability (4 endpoints)

**`POST /analytics/bayesian-recipe-test`**
```
Input:    { recipe_id_a, recipe_id_b, metric, creator_id }
          metric: 'open_rate' | 'save_rate' | 'consumption_rate' | 'rating'
Computes: models each recipe's true metric as a Beta distribution
          Beta(α, β) where α = successes, β = failures
          Samples from both posteriors (100,000 draws)
          Computes P(B > A), expected lift, credible intervals
          Updates continuously as new data arrives — no minimum N required
Returns:  p_b_beats_a,            -- e.g. 0.81
          expected_lift_pct,      -- e.g. +14%
          credible_interval_95{}, -- e.g. [+3%, +28%]
          recommendation,         -- 'commit to B' | 'wait for more data' | 'no difference'
          data_points_a, data_points_b,
          note: 'Bayesian — valid even with small samples'
```

**`POST /analytics/markov-catalog-journey`**
```
Input:    { creator_id, lookback_days }
Computes: builds transition matrix T where T[i][j] =
          P(user consumes recipe j next | just consumed recipe i)
          from all sequential consumption pairs in the lookback window.
          Computes steady-state distribution (long-run recipe popularity).
          Identifies: gateway recipes (high entry probability),
                      dead ends (high absorption — users leave after),
                      loops (high self-transition or short cycles),
                      chains (strong sequential paths A→B→C).
Returns:  transition_matrix{},
          gateway_recipes[{ recipe_id, title, entry_probability }],
          dead_ends[{ recipe_id, title, exit_probability }],
          strong_chains[{ path[], cumulative_probability }],
          steady_state[{ recipe_id, long_run_share_pct }]
```

**`POST /analytics/recipe-survival-analysis`**
```
Input:    { recipe_id, creator_id }
Computes: models time-to-inactivity as a survival problem.
          "Active" = recipe consumed at least once in trailing 7 days.
          Fits Weibull distribution to historical recipe activity data.
          Estimates survival function S(t) = P(still active at week t).
          Computes median half-life and compares to platform distribution.
          Flags recipes in the critical pre-cliff window.
Returns:  survival_curve[{ week, probability_still_active }],
          median_halflife_days,
          platform_median_halflife_days,
          current_survival_probability,
          cliff_warning: boolean,
          estimated_weeks_to_cliff,
          revival_actions[]
```

**`POST /analytics/monte-carlo-revenue-forecast`**
```
Input:    { creator_id, horizon_days, n_simulations } (default 10,000)
Computes: samples stochastic variables from fitted distributions:
            publication_rate ~ Poisson(λ = creator's historical cadence)
            fan_acquisition ~ fitted from creator's fan growth series
            recipe_decay ~ Weibull(shape, scale) per recipe lifecycle data
            seasonal_multiplier ~ drawn from platform calendar patterns
          Runs n_simulations forward paths.
          Aggregates into full revenue distribution per date.
Returns:  forecast[{
            date,
            p10, p25, p50, p75, p90,  -- full distribution
            mean, std
          }],
          volatility_score,   -- width of P10-P90 band / P50 (fragility metric)
          concentration_risk, -- % of P50 revenue from top 1 recipe
          key_drivers[],      -- variables with highest impact on P90-P10 spread
          diversification_impact: {
            current_volatility,
            projected_volatility_if_5_recipes_added
          }
```

---

#### Group C — Statistics (5 endpoints)

**`POST /analytics/performance-regression`**
```
Input:    { creator_id or platform_wide: true, region, outcome_metric }
          outcome_metric: 'consumptions_30d' | 'rating' | 'save_rate' | 'revenue'
Computes: fits OLS multiple regression:
            outcome ~ active_time_min + protein_g + carbs_g + fat_g +
                      difficulty_encoded + halal_tag + cover_quality_score +
                      days_since_publish + recipe_length_steps + tag_count
          Reports: coefficients, standard errors, p-values, R²
          Standardized betas for cross-variable comparison.
          Flags multicollinearity (VIF > 5).
Returns:  coefficients[{
            variable, beta, std_error, p_value, significance,
            standardized_beta, interpretation: string
          }],
          r_squared,
          f_statistic, f_p_value,
          sample_size,
          top_predictors[],   -- sorted by |standardized_beta|
          warning_multicollinearity: boolean
```

**`POST /analytics/anomaly-detector`**
```
Input:    { creator_id, metric, lookback_days }
          metric: 'consumptions' | 'revenue' | 'new_users' | 'fan_count'
Computes: rolling mean μ and std σ over lookback window (30d default)
          z-score for each data point: z = (x - μ) / σ
          CUSUM (cumulative sum) for sustained directional shifts:
            detects trend changes before they cross the 2σ threshold
          Spike classification: positive_spike | negative_spike |
                                 sustained_increase | sustained_decline | normal
Returns:  anomalies[{
            date, value, z_score, classification,
            probability_random: float,  -- P(this is noise)
            context: string             -- e.g. "external traffic spike at 14h32"
          }],
          cusum_alerts[{
            started_at, direction, magnitude, days_sustained
          }],
          current_trend: 'stable' | 'rising' | 'declining' | 'volatile'
```

**`POST /analytics/causal-impact-estimator`**
```
Input:    { recipe_id, creator_id, intervention_date, intervention_label }
          intervention_label: e.g. "added halal tag" | "changed cover" | "lowered difficulty"
Computes: Bayesian structural time series (BSTS) model.
          Pre-intervention period → fits model on recipe's own series
          + control series (similar recipes that were NOT changed).
          Post-intervention → compares actual vs synthetic counterfactual.
          Estimates causal lift = actual - counterfactual.
Returns:  pre_period_avg,
          post_period_actual_avg,
          counterfactual_avg,      -- what would have happened without intervention
          causal_lift_absolute,
          causal_lift_pct,
          credible_interval_95{},
          p_causal: float,         -- probability the lift is real (not seasonal/trend)
          verdict: 'strong_causal_evidence' | 'moderate' | 'inconclusive' | 'no_effect',
          note: 'Requires ≥14 days pre and ≥7 days post intervention data'
```

**`POST /analytics/cohort-survival-curves`**
```
Input:    { creator_id, segment_by }
          segment_by: 'fan_vs_non_fan' | 'first_recipe' | 'acquisition_month'
Computes: Kaplan-Meier survival estimator per segment.
          Event = user goes inactive (0 consumptions for 21 days).
          Censored = user still active at observation end.
          Log-rank test for significance of difference between segments.
          Cox proportional hazard model for covariates if segment_by = 'acquisition_month'.
Returns:  survival_curves[{
            segment_label,
            curve[{ week, survival_probability, ci_lower, ci_upper }],
            median_tenure_weeks,
            at_1month_pct,    -- % still active at 4 weeks
            at_3months_pct
          }],
          log_rank_p_value,     -- is difference between segments significant?
          inflection_weeks[],   -- weeks where survival drops sharply (cliff points)
          fan_vs_nonfan_hr      -- hazard ratio: fans churn at X× lower rate
```

**`POST /analytics/bootstrap-confidence-intervals`**
```
Input:    { creator_id, metric, recipe_id, n_bootstrap } (default 2,000)
          metric: any scalar metric (avg_rating, conversion_rate,
                  consumptions_per_user, revenue_per_recipe, etc.)
Computes: resamples observed data with replacement n_bootstrap times.
          Computes the metric on each resample.
          Reports percentile-based confidence intervals.
          Flags when N is too small for reliable inference (N < 10).
Returns:  observed_value,
          ci_80:  { lower, upper },
          ci_90:  { lower, upper },
          ci_95:  { lower, upper },
          sample_size,
          reliability: 'high'(N≥50) | 'moderate'(N 20-49) | 'low'(N<20),
          recommendation: string,  -- e.g. "Need 38 more ratings for ±0.1 margin"
          note: 'Bootstrap — no distributional assumptions, safe for small N'
```

---

### 4.10 Calculus & Optimization (10 endpoints) *(added v1.3)*

#### Group A — Differential Calculus (3 endpoints)

**`POST /analytics/recipe-performance-velocity`**
```
Input:    { recipe_id, creator_id, lookback_days }
Computes: first derivative  C'(t)  = rate of change of consumptions/week
          second derivative C''(t) = acceleration (+) or deceleration (-)
          polynomial fit to locate inflection point (growth → decline)
          time-to-peak prediction
Returns:  velocity_current,               -- consumptions gained/lost per week
          acceleration,                   -- positive = speeding up
          phase: 'accelerating'|'decelerating'|'plateau'|'declining',
          inflection_date_predicted,
          weeks_to_peak,
          peak_consumptions_predicted,
          recommendation: string          -- e.g. "Act in next 3 weeks to extend plateau"
```

**`POST /analytics/marginal-recipe-return`**
```
Input:    { creator_id }
Computes: MR(n) = R(n) - R(n-1) for n = 1 .. current_catalog_size + 5
          fits diminishing returns curve (logarithmic or power law)
          locates inflection point (steepest MR decline)
          locates saturation point (MR → 0)
Returns:  marginal_return_curve[{ n, marginal_revenue_eur }],
          current_n,
          optimal_catalog_size,          -- n at inflection of MR curve
          saturation_catalog_size,       -- n where MR ≈ 0
          current_marginal_return_eur,   -- revenue expected from next recipe
          curve_type: 'logarithmic'|'power_law'|'linear'
```

**`POST /analytics/revenue-elasticity`**
```
Input:    { creator_id, region }
Computes: arc elasticity per recipe attribute using performance-regression coefficients:
          E(x) = (ΔC / C_avg) / (Δx / x_avg)
          classifies each: elastic (|E|>1) · unit (|E|=1) · inelastic (|E|<1)
Returns:  elasticities[{
            variable, elasticity, classification,
            interpretation: string,
            priority_rank: int
          }],
          top_elastic_variables[],       -- sorted by |E| descending
          insight: string
```

---

#### Group B — Integral Calculus (2 endpoints)

**`POST /analytics/recipe-lifetime-value`**
```
Input:    { recipe_id, creator_id }
Computes: numerical integration of historical C(t) via trapezoidal rule
          extrapolates remaining area using survival curve (recipe-survival-analysis)
          LTV = ∫ C(t) × revenue_per_consumption dt
Returns:  realized_consumptions,
          realized_revenue_eur,
          remaining_consumptions_projected,
          remaining_revenue_projected_eur,
          total_ltv_eur,
          integration_confidence,        -- 'high'|'moderate'|'low' by data density
          revival_ltv_uplift_eur         -- additional LTV if revival actions taken now
```

**`POST /analytics/lifecycle-curve-fitting`**
```
Input:    { recipe_id or region, creator_id }
Computes: fits Bass diffusion model:
            dN/dt = [p + q(N/m)] × (m - N)
            p = innovation coeff (organic discovery rate)
            q = imitation coeff (word-of-mouth within platform)
            m = total market potential (eventual adopters)
          fits Gompertz model for audience growth as fallback
          selects best fit by AIC
Returns:  best_model: 'bass'|'gompertz',
          parameters{},
          time_to_peak_weeks,
          total_addressable_adopters_m,
          current_adoption_pct,
          imitation_coefficient_q,       -- high = spreads organically
          r_squared,
          fitted_curve[{ week, predicted, actual }]
```

---

#### Group C — Optimization (5 endpoints)

**`POST /analytics/recipe-attribute-optimizer`**
```
Input:    { creator_id, constraints{} }
          constraints: {
            max_active_time_min,
            min_protein_g,
            max_calories,
            required_tags[],            -- e.g. ['halal']
            forbidden_tags[],
            max_difficulty: 'easy'|'medium'|'hard'
          }
Computes: gradient ascent on continuous variables (time, macros)
          using performance-regression coefficients as objective function
          exhaustive search on categoricals (difficulty, tags)
          constraints enforced via penalty method
Returns:  optimal_attributes{},
          predicted_consumptions_month1,
          vs_your_current_avg_pct,
          constraint_slack{},
          tradeoffs[{
            constraint, current_value, relax_to, consumption_gain
          }]
```

**`POST /analytics/content-calendar-optimizer`**
```
Input:    { creator_id, horizon_weeks, hours_per_week, constraints{} }
          constraints: {
            min_halal_per_n_weeks,
            max_same_region_consecutive,
            must_include_tags[],
            min_dietary_diversity_score
          }
Computes: linear programming (PuLP)
          decision: x[w][t] = 1 if recipe type t in week w
          objective: maximize Σ expected_revenue[w][t] × x[w][t]
          subject to: one recipe/week · time budget · all constraints
                      weighted by seasonal demand multipliers
Returns:  optimal_calendar[{
            week, recipe_type, niche, dietary_angle,
            expected_revenue_eur, seasonal_hook
          }],
          total_expected_revenue_eur,
          binding_constraints[],
          sensitivity[{ constraint, revenue_lost_per_unit_relaxed }]
```

**`POST /analytics/catalog-portfolio-optimizer`**
```
Input:    { creator_id, target_return_eur, risk_tolerance }
          risk_tolerance: 'low'|'medium'|'high'
Computes: Markowitz mean-variance optimization
          each recipe = asset with expected return + variance (from monte-carlo-revenue-forecast)
          correlation matrix from catalog-correlation
          solves: minimize σ²_portfolio s.t. E[R] ≥ target_return
          traces full efficient frontier
Returns:  current_portfolio{ expected_return_eur, variance, sharpe_ratio },
          efficient_frontier[{ expected_return_eur, variance, recipe_weights{} }],
          recommended_portfolio{},
          recipes_to_add[],
          recipes_to_reduce_exposure[],
          concentration_risk_score
```

**`POST /analytics/macro-meal-optimizer`**
```
Input:    {
            target_macros: { protein_g, carbs_g, fat_g, fiber_g },
            calorie_budget,
            dietary_restrictions[],
            max_active_time_min,
            available_ingredients[],    -- optional constraint
            optimize_for: 'min_calories'|'max_protein'|'max_palatability'
          }
Computes: constrained optimization over ingredient combinations
          objective: minimize calories or maximize protein/palatability
          subject to: macro targets · dietary restrictions · time constraint
          uses ingredient macro database + substitution graph
Returns:  optimal_ingredients[{ name, quantity_g, protein_g, carbs_g, fat_g, fiber_g, kcal }],
          total_macros{},
          total_calories,
          active_time_min,
          constraint_satisfaction{},
          cheaper_alternative{},
          palatability_score
```

**`POST /analytics/fan-tier-pricing-optimizer`**
```
Input:    { creator_id, n_tiers, platform_cut_pct }
Computes: estimates willingness-to-pay distribution from fan conversion data
          and anonymized platform benchmarks
          models churn sensitivity dN/dp per tier
          accounts for inter-tier cannibalization
          solves: maximize Σ p_i × N_i(p_i) × (1 - platform_cut)
          subject to: p_1 < p_2 < p_3, p_i > 0
Returns:  optimal_prices[{ tier, price_eur, expected_subscribers }],
          expected_monthly_tier_revenue_eur,
          current_vs_optimal{},         -- if tiers already configured
          sensitivity[{ tier, price_delta_eur, revenue_impact_eur }],
          competitor_benchmarks[],      -- anonymized
          recommendation: string
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

| Layer | Domain | v1.0 | v1.1 | v1.2 | v1.3 | Total |
|---|---|---|---|---|---|---|
| SQL | Revenue | 4 | — | — | — | 4 |
| SQL | Consumption & Engagement | 5 | — | — | — | 5 |
| SQL | Audience | 4 | — | — | — | 4 |
| SQL | Catalog | 7 | — | — | — | 7 |
| SQL | Platform-Wide Cross-Segment | — | +3 | — | — | 3 |
| **SQL Total** | | **20** | **+3** | **—** | **—** | **23** |
| Python | Original analytics | 8 | — | — | — | 8 |
| Python | Niche Research | 6 | — | — | — | 6 |
| Python | Idea Validation | 5 | — | — | — | 5 |
| Python | Recipe Impact | 6 | +2 | — | — | 8 |
| Python | Audience Study | 6 | — | — | — | 6 |
| Python | Potential Audience | 5 | — | — | — | 5 |
| Python | Competitive Intelligence | 3 | — | — | — | 3 |
| Python | Predictive & Strategy | 4 | +1 | — | — | 5 |
| Python | Health & Nutrition | — | +3 | — | — | 3 |
| Python | Mathematical Analytics | — | — | +12 | — | 12 |
| Python | Calculus & Optimization | — | — | — | +10 | 10 |
| **Python Total** | | **43** | **+6** | **+12** | **+10** | **71** |
| **Grand Total** | | **63** | **+9** | **+12** | **+10** | **94** |

### v1.2 additions summary

| # | Endpoint | Math concept | Replaces / upgrades |
|---|---|---|---|
| 1 | `recipe-matrix-factorization` | SVD | — new capability |
| 2 | `catalog-pca` | PCA | — new capability |
| 3 | `creator-positioning-map` | PCA + clustering | — new capability |
| 4 | `bayesian-recipe-test` | Beta distribution | — new capability |
| 5 | `markov-catalog-journey` | Markov chain | — new capability |
| 6 | `recipe-survival-analysis` | Weibull / survival | powers `churn-prediction` upgrade |
| 7 | `monte-carlo-revenue-forecast` | Monte Carlo | replaces ARIMA in `revenue-forecast` |
| 8 | `performance-regression` | OLS regression | — new capability |
| 9 | `anomaly-detector` | z-score + CUSUM | — new capability |
| 10 | `causal-impact-estimator` | BSTS / DiD | — new capability |
| 11 | `cohort-survival-curves` | Kaplan-Meier + Cox | replaces heuristic in `churn-prediction` |
| 12 | `bootstrap-confidence-intervals` | Bootstrap resampling | upgrades `validate-recipe-idea` outputs |

**4 existing endpoints upgraded (no breaking API changes):**
- `validate-recipe-idea` → Bayesian prediction intervals via `bootstrap-confidence-intervals`
- `churn-prediction` → Kaplan-Meier + Cox via `cohort-survival-curves`
- `revenue-forecast` → Monte Carlo via `monte-carlo-revenue-forecast`
- `audience-segments` → K-means clustering (upgrade in Phase 3 implementation)

### v1.1 additions summary

| # | Gap | Type | Triggered by |
|---|---|---|---|
| 1 | `platform_wide` param on SQL functions | Architecture | Q2, Q3, Q4 — new creators have no data |
| 2 | `get_platform_top_recipes_by_region` | SQL | Q3 — platform recipe ranking by region |
| 3 | `get_top_recipes_by_segment` | SQL | Q2 — gender × cuisine × difficulty cross-filter |
| 4 | `get_cohort_recipe_consumption` | SQL | Q4 — health-profile-filtered meal consumption |
| 5 | `active-time-classifier` | Python | Q3 — active vs passive cooking time |
| 6 | `recipe-time-distribution` | Python | Q3 — supply vs demand gap in cooking time |
| 7 | `session-strategy-synthesis` | Python | All — coherent action plan from multi-turn session |
| 8 | `macro-recommendation-by-profile` | Python | Q4 — BMR/TDEE/macro computation |
| 9 | `nutrition-gap-analysis` | Python | Q4 — what cohort eats vs what they need |
| 10 | `recipe-compliance-checker` | Python | Q4 — recipe meets macro targets? |

**Data model change required (v1.1):**
Add `active_time_min INTEGER` column to `recipe` table. Backfill via `active-time-classifier` at migration time. Expose as an optional field in recipe wizard Step 1.

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
