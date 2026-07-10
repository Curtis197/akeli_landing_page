# Akeli Analytics Engine — Function Library

**Version:** 1.3 — 2026-06-25
**Total functions:** 94 (23 SQL + 71 Python)
**Full spec:** `2026-06-25-analytics-engine-design.md`

This document is the developer and agent reference for all 94 callable functions.
Use it to find the right function for a given question, understand dependencies,
and plan which functions to call in parallel.

---

## Quick Reference Index

### SQL Functions (23)

| # | Function | Domain | Scope | One-liner |
|---|---|---|---|---|
| S01 | `get_revenue_summary` | Revenue | creator | Total revenue, period comparison, breakdown by type |
| S02 | `get_revenue_by_recipe` | Revenue | creator | Per-recipe revenue ranking |
| S03 | `get_revenue_timeline` | Revenue | creator | Revenue time series (day/week/month) |
| S04 | `get_payout_history` | Revenue | creator | Payout log with status |
| S05 | `get_consumption_summary` | Consumption | creator | Total consumptions, unique users, period comparison |
| S06 | `get_consumption_by_recipe` | Consumption | creator | Per-recipe consumption ranking with repeat rate |
| S07 | `get_consumption_timeline` | Consumption | creator | Consumption time series |
| S08 | `get_recipe_engagement` | Consumption | creator | Full funnel metrics for one recipe |
| S09 | `get_drop_off_recipes` | Consumption | creator | Recipes with significant consumption decline |
| S10 | `get_audience_profile` | Audience | creator | Goals, dietary, cuisine, gender, age of audience |
| S11 | `get_fan_stats` | Audience | creator | Fan count, revenue, growth, tenure |
| S12 | `get_loyal_users` | Audience | creator | Top-consuming user cohorts (anonymized) |
| S13 | `get_audience_cuisine_overlap` | Audience | creator | Which cuisines audience also consumes |
| S14 | `get_catalog_stats` | Catalog | creator | Recipe counts, ratings, translation coverage |
| S15 | `get_top_recipes` | Catalog | creator | Ranked recipes by any metric |
| S16 | `get_underperforming_recipes` | Catalog | creator | Recipes below consumption median |
| S17 | `get_recipe_ratings_breakdown` | Catalog | creator | Rating breakdown + comment excerpts |
| S18 | `get_recipe_funnel` | Catalog | creator | Impressions → consumptions conversion stages |
| S19 | `get_catalog_gaps` | Catalog | creator | Audience demand vs creator coverage gaps |
| S20 | `get_catalog_snapshot` | Catalog | creator | Full catalog state at a point in time |
| S21 | `get_platform_top_recipes_by_region` | Platform-Wide | platform | Top consumed recipes for a region/tag combo |
| S22 | `get_top_recipes_by_segment` | Platform-Wide | platform | Top recipes for gender × cuisine × difficulty filter |
| S23 | `get_cohort_recipe_consumption` | Platform-Wide | platform | Recipe consumption filtered by health profile |

---

### Python Functions (71)

#### Original Analytics (8)

| # | Endpoint | One-liner |
|---|---|---|
| P01 | `revenue-trend` | Trend decomposition on revenue series |
| P02 | `cohort-retention` | Retention rates by user acquisition cohort |
| P03 | `recipe-performance-score` | Composite score per recipe across all metrics |
| P04 | `consumption-patterns` | When/how often users cook (heatmap data) |
| P05 | `recipe-opportunity` | Gaps in catalog vs audience demand |
| P06 | `growth-trajectory` | Creator growth rate vs platform benchmarks |
| P07 | `audience-segments` | Audience behavioral segmentation (→ K-means v1.2) |
| P08 | `drop-off-diagnosis` | Root cause analysis for declining recipes |

#### Niche Research (6)

| # | Endpoint | One-liner |
|---|---|---|
| P09 | `niche-landscape` | Demand vs supply map for all cuisine niches |
| P10 | `trending-niches` | 30d vs 90d growth rate per niche |
| P11 | `geographic-niche` | Diaspora demand by city/country for creator's cuisine |
| P12 | `seasonal-niche` | Month-by-month demand calendar + upcoming peaks |
| P13 | `ingredient-niche` | Rising ingredients with low recipe coverage |
| P14 | `cross-cuisine-niche` | Fusion gaps — cuisine A × B combos with demand |

#### Idea Validation (5)

| # | Endpoint | One-liner |
|---|---|---|
| P15 | `validate-recipe-idea` | Predict performance before publishing (→ Bootstrap CI v1.2) |
| P16 | `title-optimization` | Rank title candidates by predicted discovery |
| P17 | `timing-recommendation` | Best publish day/time for maximum traction |
| P18 | `similar-recipe-benchmark` | Performance distribution of semantically similar recipes |
| P19 | `series-potential` | Should this recipe become a series? |

#### Recipe Impact (8)

| # | Endpoint | One-liner |
|---|---|---|
| P20 | `recipe-lifecycle` | Current lifecycle stage + revival potential |
| P21 | `halo-effect` | Which catalog recipes benefit when this one is consumed |
| P22 | `catalog-correlation` | Pairwise consumption correlation across catalog |
| P23 | `publishing-frequency-impact` | Cadence vs consumption volume correlation |
| P24 | `recipe-improvement-roi` | Before/after lift from a recipe edit |
| P25 | `catalog-revenue-attribution` | Which recipes drive revenue vs just health |
| P26 | `active-time-classifier` | Classify recipe steps as active vs passive cooking time |
| P27 | `recipe-time-distribution` | Supply vs demand gap in cooking time for a region |

#### Audience Study (6)

| # | Endpoint | One-liner |
|---|---|---|
| P28 | `audience-deep-profile` | Full behavioral profile of creator's audience |
| P29 | `audience-evolution` | Month-by-month audience profile changes |
| P30 | `churn-prediction` | At-risk cohorts + revenue at risk (→ Kaplan-Meier v1.2) |
| P31 | `superfan-identification` | Cohorts most likely to convert to Fan Mode |
| P32 | `audience-language-profile` | Language distribution + translation gaps |
| P33 | `dietary-trend-radar` | Growing vs declining dietary preferences in audience |

#### Potential Audience (5)

| # | Endpoint | One-liner |
|---|---|---|
| P34 | `lookalike-audience` | Platform users similar to fans who haven't discovered creator |
| P35 | `cross-creator-audience` | Fans of similar creators not yet reached |
| P36 | `platform-reach-ceiling` | Total addressable audience + current penetration |
| P37 | `diaspora-expansion-map` | Geographic demand map + untapped diaspora markets |
| P38 | `new-segment-opportunity` | Platform segments that overlap with creator's top recipes |

#### Competitive Intelligence (3)

| # | Endpoint | One-liner |
|---|---|---|
| P39 | `creator-benchmark` | Percentile ranking vs similar creators |
| P40 | `platform-trend-radar` | Rising/falling cuisines + creator alignment |
| P41 | `content-gap-vs-top-performers` | What top performers have that creator's catalog lacks |

#### Predictive & Strategy (5)

| # | Endpoint | One-liner |
|---|---|---|
| P42 | `revenue-forecast` | Revenue forecast 30/60/90d (→ Monte Carlo v1.2) |
| P43 | `fan-growth-forecast` | Fan count trend + milestone predictions |
| P44 | `content-calendar` | Week-by-week publishing recommendations |
| P45 | `catalog-strategy-score` | Strategic health score across 5 dimensions |
| P46 | `session-strategy-synthesis` | Synthesize a multi-turn session into a prioritized action plan |

#### Health & Nutrition (3)

| # | Endpoint | One-liner |
|---|---|---|
| P47 | `macro-recommendation-by-profile` | BMR/TDEE/macro targets for a health profile |
| P48 | `nutrition-gap-analysis` | What cohort actually eats vs what they need |
| P49 | `recipe-compliance-checker` | Does a recipe meet macro targets? What to swap? |

#### Mathematical Analytics (12)

| # | Endpoint | Math | One-liner |
|---|---|---|---|
| P50 | `recipe-matrix-factorization` | SVD | Latent taste profiles from consumption matrix |
| P51 | `catalog-pca` | PCA | Which 2 axes explain consumption variance |
| P52 | `creator-positioning-map` | PCA + clustering | Creator's position on competitive map + white space |
| P53 | `bayesian-recipe-test` | Beta distribution | P(variant B > A) even with small N |
| P54 | `markov-catalog-journey` | Markov chain | Gateway recipes, dead ends, strong chains |
| P55 | `recipe-survival-analysis` | Weibull | Projected recipe half-life + cliff warning |
| P56 | `monte-carlo-revenue-forecast` | Monte Carlo | Full P10–P90 revenue distribution (10k simulations) |
| P57 | `performance-regression` | OLS regression | Which attributes predict consumption + coefficients |
| P58 | `anomaly-detector` | z-score + CUSUM | Real spikes/drops vs random noise |
| P59 | `causal-impact-estimator` | BSTS | Did intervention X actually cause lift Y? |
| P60 | `cohort-survival-curves` | Kaplan-Meier + Cox | Retention curves by segment + churn inflection points |
| P61 | `bootstrap-confidence-intervals` | Bootstrap | Honest confidence intervals for any metric (small-N safe) |

#### Calculus & Optimization (10)

| # | Endpoint | Math | One-liner |
|---|---|---|---|
| P62 | `recipe-performance-velocity` | Derivatives | Speed and direction of recipe growth right now |
| P63 | `marginal-recipe-return` | Marginal analysis | Expected revenue from publishing the next recipe |
| P64 | `revenue-elasticity` | Arc elasticity | Which attribute change gives best consumption return |
| P65 | `recipe-lifetime-value` | Integration | Total past + projected revenue for a recipe |
| P66 | `lifecycle-curve-fitting` | Bass / Gompertz | Adoption curve fit + time-to-peak prediction |
| P67 | `recipe-attribute-optimizer` | Gradient ascent | Optimal attribute values under creator constraints |
| P68 | `content-calendar-optimizer` | Linear programming | Maximize revenue given time + diversity constraints |
| P69 | `catalog-portfolio-optimizer` | Markowitz | Efficient frontier for recipe portfolio risk/return |
| P70 | `macro-meal-optimizer` | Constrained optimization | Best ingredient combo to hit macro targets |
| P71 | `fan-tier-pricing-optimizer` | Price optimization | Optimal tier prices for maximum creator revenue |

---

## Question → Function Mapping

A creator asks a question. The agent should call these functions.

### Revenue questions

| Question | Primary functions | Secondary |
|---|---|---|
| How much did I earn this month? | S01, S02 | S03 |
| Why did my revenue drop? | S01, S03, P08 | P58 (anomaly) |
| What will I earn next month? | P56 (Monte Carlo) | P42 |
| Which recipe makes me the most money? | S02 | P25 |
| How fragile is my revenue? | P56, P69 (portfolio) | P25 |
| What price should I charge for my tiers? | P71 | — |

### Audience questions

| Question | Primary functions | Secondary |
|---|---|---|
| Who is my audience? | P28, S10 | P50 (taste profiles) |
| Is my audience changing? | P29 | P33 |
| Who are my most loyal users? | S12, P31 | P60 (retention) |
| Are fans at risk of leaving? | P30, P60 | — |
| How many people could I reach? | P36 | P34, P35 |
| Where in the world is my audience? | P37, P11 | — |
| What language should I translate into first? | P32 | — |

### Content & catalog questions

| Question | Primary functions | Secondary |
|---|---|---|
| What should I create next? | P05, P09, P38 | P14, P13 |
| Will this recipe idea perform? | P15, P18 | P16 |
| What's the best title for this recipe? | P16 | — |
| When should I publish? | P17 | P12 |
| How is this recipe doing? | S08, P20 | P62 (velocity) |
| Is this drop real or noise? | P58 | P61 |
| How long will this recipe keep earning? | P55, P65 | P66 |
| How do my fans navigate my catalog? | P54 (Markov) | P21 |
| How many recipes should I have? | P63 (marginal) | — |
| How should I position myself vs competitors? | P52 (positioning) | P39 |

### Niche & strategy questions

| Question | Primary functions | Secondary |
|---|---|---|
| Is there demand for my cuisine? | P09, P10, P11 | P36 |
| What's the opportunity score? | P09 | P14 |
| Which recipe attribute matters most? | P57 (regression) | P64 (elasticity) |
| What attribute should I optimize first? | P64 | P67 |
| What's the best publishing schedule? | P68 (LP optimizer) | P44 |
| How healthy is my catalog strategy? | P45 | P51 (PCA) |
| What's the strategic summary of this session? | P46 | — |

### Health & nutrition questions

| Question | Primary functions | Secondary |
|---|---|---|
| What macros for this client profile? | P47 | — |
| What does this cohort actually eat? | S23, P48 | — |
| Does this recipe hit the targets? | P49 | — |
| What ingredients should this recipe use? | P70 (optimizer) | P49 |
| What are women like her eating for breakfast? | S23 | P48 |

---

## Function Dependencies

Some functions are most powerful when called after or alongside others.

```
performance-regression (P57)
  └─ powers → revenue-elasticity (P64)
  └─ powers → recipe-attribute-optimizer (P67)

recipe-survival-analysis (P55)
  └─ powers → recipe-lifetime-value (P65) [extrapolation]
  └─ powers → churn-prediction (P30) [upgrade]

monte-carlo-revenue-forecast (P56)
  └─ powers → catalog-portfolio-optimizer (P69) [variance inputs]
  └─ replaces → revenue-forecast (P42) [upgrade]

catalog-correlation (P22)
  └─ powers → catalog-portfolio-optimizer (P69) [correlation matrix]
  └─ powers → markov-catalog-journey (P54) [transition priors]

bootstrap-confidence-intervals (P61)
  └─ upgrades → validate-recipe-idea (P15) [prediction intervals]
  └─ wraps any scalar metric on request

cohort-survival-curves (P60)
  └─ upgrades → churn-prediction (P30)

macro-recommendation-by-profile (P47)
  └─ powers → nutrition-gap-analysis (P48) [target inputs]
  └─ powers → macro-meal-optimizer (P70) [constraint inputs]
  └─ powers → recipe-compliance-checker (P49) [target inputs]

niche-landscape (P09)
  └─ contextualizes → validate-recipe-idea (P15)
  └─ contextualizes → recipe-attribute-optimizer (P67)
```

---

## Parallel Execution Groups

Functions that are independent and should fire in parallel:

```
Niche discovery session:
  parallel → [ niche-landscape, trending-niches, geographic-niche ]

Recipe launch decision:
  parallel → [ validate-recipe-idea, similar-recipe-benchmark, timing-recommendation ]

Audience deep-dive:
  parallel → [ audience-deep-profile, audience-evolution, dietary-trend-radar ]

Revenue health check:
  parallel → [ get_revenue_summary, get_revenue_timeline, revenue-forecast ]

Full catalog audit:
  parallel → [ get_catalog_stats, catalog-strategy-score, catalog-pca ]
  then     → [ creator-positioning-map ]  -- needs PCA output

Nutrition brief (creator's client):
  parallel → [ macro-recommendation-by-profile, get_cohort_recipe_consumption ]
  then     → [ nutrition-gap-analysis ]   -- needs both outputs
```

---

## Platform-Wide vs Creator-Scoped

Most SQL functions are creator-scoped. Use platform-wide mode when:
- Creator has no published recipes yet (new creator, market research)
- Question is about platform trends, not personal performance
- Comparing against the full market

| Function | How to go platform-wide |
|---|---|
| S21 `get_platform_top_recipes_by_region` | Platform-wide by design |
| S22 `get_top_recipes_by_segment` | Platform-wide by design |
| S23 `get_cohort_recipe_consumption` | Platform-wide by design |
| P09 `niche-landscape` | Always platform-wide |
| P10 `trending-niches` | Always platform-wide |
| P36 `platform-reach-ceiling` | Pass `platform_wide: true` |
| P28 `audience-deep-profile` | Pass `platform_wide: true` |
| P47 `macro-recommendation-by-profile` | No creator context needed |
| P48 `nutrition-gap-analysis` | Pass `cohort_filters` instead of `creator_id` |
| P57 `performance-regression` | Pass `platform_wide: true` for niche-level model |

---

## Security Rules

- `creator_id` is **always injected server-side** from the authenticated session
- Claude never controls data scoping — any `creator_id` in Claude's output is overridden
- Audience functions: minimum cohort of **10 users** before returning any data
- Platform-wide functions: no individual creator data is exposed — only aggregates
- Health & Nutrition functions: no individual user health data is ever returned

---

## Version History

| Version | Date | Changes |
|---|---|---|
| v1.0 | 2026-06-25 | 20 SQL + 43 Python = 63 functions |
| v1.1 | 2026-06-25 | +3 SQL (platform-wide) · +6 Python (time analysis, health & nutrition) = 72 |
| v1.2 | 2026-06-25 | +12 Python (mathematical analytics: linear algebra, probability, statistics) = 84 |
| v1.3 | 2026-06-25 | +10 Python (calculus & optimization: derivatives, integrals, LP, Markowitz) = 94 |

---

*Function Library — Akeli Analytics Engine*
*Author: Curtis — Founder Akeli*
*Maintained alongside: `2026-06-25-analytics-engine-design.md`*
