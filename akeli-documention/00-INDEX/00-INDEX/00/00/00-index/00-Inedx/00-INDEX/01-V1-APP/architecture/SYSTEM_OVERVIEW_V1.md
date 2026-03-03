# 🏗️ AKELI V1 - System Overview & Architecture

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Vue d'Ensemble Système - Implémentation Septembre 2025

---

## 🎯 Executive Summary

### Vision Une Phrase

**AKELI est la première plateforme d'intelligence nutritionnelle adaptive qui optimise les résultats réels plutôt que de tracker les calories.**

### Différenciateur Fondamental

| Dimension | Apps Classiques | AKELI V1 |
|-----------|----------------|----------|
| **Paradigme** | Tracking manuel | Optimisation automatique |
| **Mesure** | Inputs (calories loggées) | Outcomes (résultats réels) |
| **Adaptation** | Statique (macros fixes) | Dynamique (apprentissage continu) |
| **Économie** | Pub ou subscription simple | Économie créateur outcome-driven |
| **Intelligence** | Règles manuelles | Algèbre linéaire + métriques |
| **Moat** | Features | Données + réseau créateurs |

### Piliers Stratégiques

```
┌─────────────────────────────────────────────────────┐
│                 INTELLIGENCE                        │
│  • Vectorisation (cosine similarity)               │
│  • Outcome metrics (per-meal)                      │
│  • Apprentissage continu                           │
│  • Adaptation automatique                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ × (synergy)
                  │
┌─────────────────┴───────────────────────────────────┐
│                MONÉTISATION                         │
│  • 0.033€ par repas consommé                       │
│  • Payout outcome-driven                           │
│  • Créateurs = nutrition engineers                 │
│  • Flywheel organique                              │
└─────────────────────────────────────────────────────┘

= Plateforme Nutrition Intelligence (pas app tracking)
```

---

## 🏛️ Architecture Globale

### Vue Système Complet

```
┌────────────────────────────────────────────────────────────────────┐
│                        USER LAYER (Flutter)                        │
│  • Mobile app (iOS/Android)                                        │
│  • Meal plan view, Feed scroll, Recipe adjustment                 │
│  • Real-time UI, Offline-friendly                                 │
└────────────┬───────────────────────────────────────────────────────┘
             │
             │ HTTPS
             │
┌────────────┴───────────────────────────────────────────────────────┐
│                   EDGE LAYER (Supabase Edge Functions)             │
│  • Authentication & Authorization                                  │
│  • Request validation                                              │
│  • Orchestration (calls Python service)                           │
│  • Response formatting                                             │
└────────────┬───────────────────────────────────────────────────────┘
             │
             │ HTTP POST
             │
┌────────────┴───────────────────────────────────────────────────────┐
│              INTELLIGENCE LAYER (Python - Railway)                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────┐             │
│  │  Recommendation Engine                           │             │
│  │  • compute_user_vector (50D)                     │             │
│  │  • load_recipe_vectors (N × 50D)                 │             │
│  │  • cosine_similarity (NumPy)                     │             │
│  │  • apply_filters (diversity, freshness, safety)  │             │
│  │  • meal_plan() / feed() / recommended_recipes()  │             │
│  └──────────────────────────────────────────────────┘             │
│                                                                    │
│  ┌──────────────────────────────────────────────────┐             │
│  │  Analytics Engine                                │             │
│  │  • Recipe performance metrics                    │             │
│  │  • User behavior patterns                        │             │
│  │  • Creator analytics                             │             │
│  │  • Outcome-based learning                        │             │
│  └──────────────────────────────────────────────────┘             │
│                                                                    │
└────────────┬───────────────────────────────────────────────────────┘
             │
             │ SQL Queries
             │
┌────────────┴───────────────────────────────────────────────────────┐
│                  DATA LAYER (PostgreSQL + pgvector)                │
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Core Tables    │  │  Vector Tables  │  │  Metrics Tables  │  │
│  ├─────────────────┤  ├─────────────────┤  ├──────────────────┤  │
│  │ • users         │  │ • user_vectors  │  │ • recipe_perf    │  │
│  │ • recipes       │  │ • recipe_vectors│  │ • user_behavior  │  │
│  │ • creators      │  │                 │  │ • creator_perf   │  │
│  │ • meal_logs     │  │                 │  │ • weekly_momentum│  │
│  │ • adjusted_rec  │  │                 │  │                  │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flows Critiques

### Flow 1: Meal Plan Generation

```
USER taps "Generate meal plan"
    ↓
Flutter App
    ↓ POST /functions/v1/generate-meal-plan
    ↓ { days: 7 }
    ↓
Edge Function (Supabase)
    ├─ Auth: Validate JWT token
    ├─ Extract user_id from session
    └─ POST https://python.railway.app/meal_plan
       { user_id, days: 7 }
    ↓
Python Service (Railway)
    ├─ Step 1: get_or_compute_user_vector(user_id)
    │   ├─ Check cache (user_vectors table)
    │   ├─ If fresh (< 24h) → return cached
    │   └─ Else → compute_user_vector() → store → return
    │
    ├─ Step 2: load_recipe_vectors()
    │   ├─ Check in-memory cache (1h TTL)
    │   └─ Load from recipe_vectors table (N × 50D matrix)
    │
    ├─ Step 3: _compute_recommendations()
    │   ├─ cosine_similarity(user_vec, recipe_matrix)
    │   ├─ apply_filters(diversity, safe_only, balance)
    │   └─ top N recipes (21 for 7 days × 3 meals)
    │
    └─ Step 4: assign_to_meal_slots()
        └─ Structure by day/meal_type
    ↓ Return JSON
    ↓
Edge Function
    ├─ Optional: Store in meal_plans table
    ├─ Format response
    └─ Return to app
    ↓
Flutter App
    └─ Display meal plan UI

⏱️ Total latency: 100-200ms
```

---

### Flow 2: Nightly Analytics Update

```
CRON Job (3h du matin) - Railway / GitHub Actions
    ↓
┌───────────────────────────────────────────────────┐
│  Batch Job 1: Recipe Performance Metrics          │
│                                                   │
│  FOR each recipe with consumptions yesterday:    │
│    ├─ compute_weight_loss_per_meal()             │
│    ├─ compute_adherence_rate()                   │
│    ├─ compute_repeat_rate()                      │
│    ├─ compute_drop_off_rate()                    │
│    ├─ compute_satisfaction_score()               │
│    └─ store in recipe_performance_metrics        │
│                                                   │
│  Updated: ~500-1000 recipes/night                │
└───────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────┐
│  Batch Job 2: User Vectors Update                │
│                                                   │
│  FOR each user active in last 7 days:            │
│    ├─ compute_user_vector(user_id)               │
│    │   ├─ Goals (static profile)                 │
│    │   ├─ Preferences (learned)                  │
│    │   ├─ Behavior (last 4 weeks metrics)        │
│    │   └─ Outcomes (weight trend, adherence)     │
│    └─ upsert into user_vectors table             │
│                                                   │
│  Updated: ~2000-5000 users/night                 │
└───────────────────────────────────────────────────┘
    ↓
Recipe vectors → enriched with fresh outcomes
User vectors → reflect latest behavior

Next day recommendations → automatically improved ✨
```

---

### Flow 3: Recipe Adjustment (In-App)

```
USER views recipe → taps "Adjust macros"
    ↓
Flutter UI: RecipeAdjustmentSlider
    ├─ Protein slider: -30% to +30%
    ├─ Carbs slider: -30% to +30%
    └─ Fats slider: -30% to +30%
    ↓
USER adjusts → taps "Apply"
    ↓
Flutter: adjustRecipeMacros()
    ├─ Step 1: Group ingredients by macro type
    │   ├─ PROTEIN: [chicken, eggs, tofu...]
    │   ├─ CARBS: [rice, pasta, bread...]
    │   ├─ FATS: [oil, butter, nuts...]
    │   └─ VEGETABLES: [tomato, spinach...]
    │
    ├─ Step 2: Apply adjustment factors
    │   FOR each ingredient:
    │     quantity_g *= (1.0 + adjustment[group])
    │
    ├─ Step 3: Recalculate total calories
    │   new_total = sum(ingredient.calories)
    │
    ├─ Step 4: Scale to preserve original calories
    │   scale_factor = original_total / new_total
    │   FOR each ingredient:
    │     quantity_g *= scale_factor
    │
    └─ Step 5: Validate nutritional constraints
        ├─ Calories drift < 5% ? ✓
        ├─ Protein > 10g ? ✓
        ├─ Fat > 5g ? ✓
        └─ Fiber > 3g ? ✓
    ↓
IF validation OK:
    ↓
    Flutter: saveAdjustedRecipe()
        ↓ POST /rest/v1/adjusted_recipes
        ↓
    Supabase: INSERT into adjusted_recipes
        ├─ user_id
        ├─ original_recipe_id
        ├─ macro_delta: {protein: +0.20, carbs: -0.15}
        ├─ ingredient_quantities: [...]
        └─ total_calories, macros
    ↓
    Flutter: Navigate to "Mes Recettes"
        └─ Display adjusted recipe

⏱️ Total: < 100ms (all client-side until save)
```

---

## 📊 Core Tables Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                    │
│  • user_id (PK)                                                 │
│  • email, profile                                               │
│  • primary_goal, target_weight                                  │
│  • created_at                                                   │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ 1:1
         ↓
    ┌────────────────┐
    │  user_vectors  │
    │  • user_id (FK)│
    │  • vector(50D) │
    │  • last_computed│
    └────────────────┘
         │
         │ 1:N
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MEAL_LOGS                                  │
│  • meal_log_id (PK)                                             │
│  • user_id (FK) ────────────────────┐                           │
│  • recipe_id (FK) ──────────┐       │                           │
│  • consumed_at              │       │                           │
│  • status (completed/abandoned)     │                           │
│  • portion_modifier         │       │                           │
│  • validation (positive/negative)   │                           │
└─────────────────────────────┼───────┼───────────────────────────┘
                              │       │
                              │       │ N:1
                              │       ↓
                              │  ┌──────────────────────────────┐
                              │  │   user_behavior_metrics      │
                              │  │   • user_id, week_start (PK) │
                              │  │   • consistency, adherence   │
                              │  │   • exploration, swaps       │
                              │  └──────────────────────────────┘
                              │
                              │ N:1
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        RECIPES                                  │
│  • recipe_id (PK)                                               │
│  • creator_id (FK) ────────────┐                                │
│  • title, ingredients           │                                │
│  • macros (protein/carbs/fat)   │                                │
│  • cooking_time, difficulty     │                                │
│  • created_at                   │                                │
└────────┬────────────────────────┼─────────────────────────────────┘
         │                        │
         │ 1:1                    │ N:1
         ↓                        ↓
    ┌────────────────┐      ┌──────────────────────────────┐
    │ recipe_vectors │      │         CREATORS             │
    │ • recipe_id(FK)│      │  • creator_id (PK)           │
    │ • vector(50D)  │      │  • name, profile             │
    └────────────────┘      │  • total_recipes, avg_perf   │
         │                  └────────┬─────────────────────┘
         │                           │
         │ 1:N                       │ 1:N
         ↓                           ↓
┌────────────────────────────────────────────────────────────────┐
│              recipe_performance_metrics                        │
│  • recipe_id, date (PK)                                        │
│  • weight_loss_per_meal                                        │
│  • adherence_rate, repeat_rate, drop_off_rate                 │
│  • satisfaction_score                                          │
└────────────────────────────────────────────────────────────────┘
                                    │
                                    │ N:1 aggregation
                                    ↓
                          ┌──────────────────────────────┐
                          │  creator_performance_metrics │
                          │  • creator_id, month (PK)    │
                          │  • total_revenue             │
                          │  • unique_users_reached      │
                          │  • growth_rate               │
                          └──────────────────────────────┘
```

---

## 🧮 Vector Spaces

### User Vector (50 Dimensions)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VECTOR (50D)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [0-9]   GOALS (10D)                                        │
│          ├─ weight_loss_intent (0-1)                        │
│          ├─ muscle_gain_intent (0-1)                        │
│          ├─ activity_level (0-1)                            │
│          ├─ goal_proximity (0-1)                            │
│          └─ ... 6 autres                                    │
│                                                             │
│  [10-24] PREFERENCES (15D)                                  │
│          ├─ protein_preference (ratio)                      │
│          ├─ carb_preference (ratio)                         │
│          ├─ cuisine_african (0-1)                           │
│          ├─ cooking_time_tolerance (0-1)                    │
│          ├─ cost_sensitivity (0-1)                          │
│          └─ ... 10 autres                                   │
│                                                             │
│  [25-39] BEHAVIOR (15D)                                     │
│          ├─ meal_logging_consistency (0-1)                  │
│          ├─ plan_adherence_score (0-1)                      │
│          ├─ exploration_rate (0-1)                          │
│          ├─ swap_frequency (0-1)                            │
│          ├─ cooking_complexity_tolerance (1-5 normalized)   │
│          └─ ... 10 autres                                   │
│                                                             │
│  [40-49] OUTCOMES (10D)                                     │
│          ├─ actual_weight_velocity (kg/week)                │
│          ├─ adherence_trend (Δ last 4 weeks)                │
│          ├─ satisfaction_history (avg)                      │
│          ├─ drop_off_risk (0-1)                             │
│          └─ ... 6 autres                                    │
│                                                             │
│  ⚠️ NORMALIZED: L2 norm = 1.0 (for cosine similarity)       │
└─────────────────────────────────────────────────────────────┘
```

### Recipe Vector (50 Dimensions)

```
┌─────────────────────────────────────────────────────────────┐
│                   RECIPE VECTOR (50D)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [0-9]   MACROS (10D)                                       │
│          ├─ protein_ratio (0-1)                             │
│          ├─ carb_ratio (0-1)                                │
│          ├─ fat_ratio (0-1)                                 │
│          ├─ fiber_density (g/100g normalized)               │
│          ├─ calories_per_100g (normalized)                  │
│          └─ ... 5 autres                                    │
│                                                             │
│  [10-19] METADATA (10D)                                     │
│          ├─ cooking_time_hours (0-1)                        │
│          ├─ difficulty_score (1-5 normalized)               │
│          ├─ cost_per_serving (normalized)                   │
│          ├─ preparation_steps (normalized)                  │
│          ├─ cuisine_type (encoded)                          │
│          └─ ... 5 autres                                    │
│                                                             │
│  [20-39] OUTCOMES (20D) ⭐ CRITIQUE                         │
│          ├─ weight_loss_per_meal (from metrics)             │
│          ├─ adherence_rate (0-1)                            │
│          ├─ repeat_rate (0-1)                               │
│          ├─ drop_off_rate_inverted (1 - rate)               │
│          ├─ satisfaction_score (0-1)                        │
│          ├─ portion_stability (0-1)                         │
│          └─ ... 14 autres outcome signals                   │
│                                                             │
│  [40-49] CREATOR (10D)                                      │
│          ├─ creator_reliability (avg performance)           │
│          ├─ recipe_age_days (normalized)                    │
│          ├─ total_consumptions (log scale)                  │
│          └─ ... 7 autres                                    │
│                                                             │
│  ⚠️ NORMALIZED: L2 norm = 1.0                               │
└─────────────────────────────────────────────────────────────┘
```

### Cosine Similarity Magic

```
user_vector:   [0.12, 0.45, 0.23, ... , 0.18]  (50D)
                        ×
recipe_matrix: [[0.34, 0.12, 0.56, ... , 0.21],  ← Recipe 1
                [0.08, 0.78, 0.14, ... , 0.45],  ← Recipe 2
                ...
                [0.23, 0.34, 0.67, ... , 0.12]]  ← Recipe N
                        ↓
scores:        [0.82, 0.56, ... , 0.91]

Top 10 recipes = argmax(scores)

⏱️ Complexity: O(N × D) = O(2500 × 50) = ~125k ops
   NumPy optimized → 1-2ms
```

---

## 💰 Economic Model

### Revenue Distribution (Per User)

```
User pays: 10€/month
    ↓
┌───────────────────────────────────────────────┐
│  Distribution                                 │
├───────────────────────────────────────────────┤
│  App Store (30%)          3.00€               │
│  Creators (30%)           3.00€ ──┐           │
│  Referral (10%)           1.00€   │           │
│  Taxes (10%)              1.00€   │           │
│  Infrastructure (10%)     1.00€   │           │
│  Platform Margin (10%)    1.00€   │           │
└───────────────────────────────────┼───────────┘
                                    │
                    ┌───────────────┘
                    ↓
        Creator Pool: 3€/user/month
                    ↓
        User eats: 90 meals/month (3/day × 30)
                    ↓
        Payout per meal: 3€ ÷ 90 = 0.033€
                    ↓
    ┌───────────────────────────────────────┐
    │  Creator Revenue Example              │
    ├───────────────────────────────────────┤
    │  1 recipe × 300 users × 4 times/month │
    │  = 1,200 consumptions                 │
    │  = 1,200 × 0.033€                     │
    │  = 39.60€/month                       │
    │                                       │
    │  5 recipes performing                 │
    │  = ~200€/month possible               │
    └───────────────────────────────────────┘
```

### Scaling Economics

```
Platform Size → Creator Opportunity

┌─────────────┬──────────────┬────────────────────┐
│  Users      │  Top Creator │  Platform Revenue  │
├─────────────┼──────────────┼────────────────────┤
│  10,000     │  ~500€/mo    │  20,000€/mo        │
│  100,000    │  ~5,000€/mo  │  200,000€/mo       │
│  500,000    │  ~25,000€/mo │  1,000,000€/mo     │
│  1,000,000  │  ~50,000€/mo │  2,000,000€/mo     │
└─────────────┴──────────────┴────────────────────┘

At 100k users:
- Top creators earn full-time income (Europe)
- Platform sustainable & profitable
- Network effects kick in

At 1M users:
- Top creators = professional nutrition businesses
- Platform = €2M/month revenue
- Defensible moat (data + creators locked in)
```

---

## 🔄 Feedback Loops

### Intelligence Loop (Self-Improving)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   1. Recommend recipes (cosine similarity)         │
│        ↓                                            │
│   2. User consumes (or skips)                      │
│        ↓                                            │
│   3. Log interaction (meal_logs)                   │
│        ↓                                            │
│   4. Measure outcomes (weight, adherence, etc.)    │
│        ↓                                            │
│   5. Update metrics (recipe_performance_metrics)   │
│        ↓                                            │
│   6. Enrich vectors (recipe_vectors ← outcomes)    │
│        ↓                                            │
│   7. Better recommendations (loop back to 1)       │
│        ↑                                            │
│        └────────────────────────────────────────────┘
│
│  Result: System learns what ACTUALLY works
│          (not what theoretically should work)
└─────────────────────────────────────────────────────┘
```

### Creator Economy Loop (Flywheel)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   1. Creator publishes recipe                     │
│        ↓                                           │
│   2. Algorithm recommends to matched users        │
│        ↓                                           │
│   3. Users consume → creator earns (0.033€/meal)  │
│        ↓                                           │
│   4. Good outcomes → recipe boosted in ranking    │
│        ↓                                           │
│   5. More users consume → more revenue            │
│        ↓                                           │
│   6. Creator optimizes recipe (feedback loop)     │
│        ↓                                           │
│   7. Better recipe → better outcomes              │
│        ↓                                           │
│   8. Even more recommendations                    │
│        ↑                                           │
│        └───────────────────────────────────────────┘
│
│  Result: Quality > Virality
│          (outcome-driven, not views-driven)
└────────────────────────────────────────────────────┘
```

---

## ⚡ Performance Targets V1

### Latency

```
┌──────────────────────────┬─────────────┬──────────┐
│  Operation               │  Target     │  Actual  │
├──────────────────────────┼─────────────┼──────────┤
│  Meal plan generation    │  < 200ms    │  ~150ms  │
│  Feed scroll (cached)    │  < 50ms     │  ~30ms   │
│  Recipe adjustment       │  < 100ms    │  ~50ms   │
│  User vector compute     │  < 500ms    │  ~300ms  │
│  Cosine similarity (2.5k)│  < 5ms      │  ~2ms    │
└──────────────────────────┴─────────────┴──────────┘
```

### Batch Jobs

```
┌──────────────────────────┬─────────────┬──────────┐
│  Job                     │  Frequency  │  Duration│
├──────────────────────────┼─────────────┼──────────┤
│  Recipe metrics update   │  Daily 3am  │  ~5min   │
│  User vectors update     │  Daily 3am  │  ~10min  │
│  Weekly behavior metrics │  Sunday 11pm│  ~15min  │
│  Creator dashboards      │  Monthly 1st│  ~30min  │
└──────────────────────────┴─────────────┴──────────┘
```

### Scalability

```
Current Design Supports:
├─ Users: up to 100,000 without architecture change
├─ Recipes: up to 10,000 without performance issue
├─ Creators: up to 5,000
└─ Daily consumptions: up to 300,000 meal logs/day

Beyond these limits → optimizations needed:
├─ Vector database (FAISS, Pinecone)
├─ Batch precomputation (feed/recommendations)
├─ Horizontal scaling (Python workers)
└─ Caching layer (Redis)
```

---

## 🎯 V1 Scope Summary

### ✅ Inclus V1 (Septembre 2025)

**Intelligence**
- ✅ User vectorization (50D)
- ✅ Recipe vectorization (50D)
- ✅ Cosine similarity recommendations
- ✅ Outcome-based metrics (recipe performance, user behavior)
- ✅ Hybrid caching (24h user vectors)
- ✅ Nightly batch jobs

**Features**
- ✅ Meal plan generation (7 jours)
- ✅ Feed scrollable (200 recettes)
- ✅ Recommended recipes (top 50)
- ✅ Recipe adjustment (dynamic in-app)
- ✅ Similar users lookup

**Economy**
- ✅ Creator payout (0.033€/meal)
- ✅ Creator dashboard (revenue, portfolio, audience)
- ✅ Automated insights & monthly emails

**Tech**
- ✅ Flutter app (mobile iOS/Android)
- ✅ Supabase (PostgreSQL + Edge Functions + Auth)
- ✅ Python service (Railway)
- ✅ pgvector extension

---

### ❌ Exclus V1 → V2 (Sept 2026)

**Advanced Analytics**
- ❌ PCA pour impact dimensions
- ❌ Statistical inference avancée
- ❌ Causal analysis
- ❌ Predictive modeling

**B2B Intelligence**
- ❌ Professional dashboards (50€/month)
- ❌ Cohort analysis
- ❌ Exportable reports
- ❌ Program testing tools

**Recipe Features**
- ❌ Ingredient substitution engine
- ❌ Budget optimizer
- ❌ Allergy/constraint auto-adjust
- ❌ Time optimizer

**Scale Optimizations**
- ❌ Vector database (FAISS)
- ❌ ANN (approximate nearest neighbor)
- ❌ Redis caching layer
- ❌ Horizontal scaling

---

## 📈 Success Metrics V1

### North Star Metric

**Weekly Active Users with ≥70% Plan Adherence**

### Supporting Metrics

```
User Success:
├─ Plan adherence rate: target >70%
├─ Weekly consistency: target >60%
├─ Drop-off rate: target <10%
└─ Goal proximity improvement: target +5% monthly

Creator Success:
├─ Active creators (≥1 recipe >50 consumptions): target 100+
├─ Avg creator monthly revenue: target 50€+
├─ Recipe launch success rate: target >40%
└─ Portfolio quality (Pareto < 0.90): target balance

Platform Health:
├─ Recommendation acceptance rate: target >60%
├─ Swap frequency: target <15%
├─ User vector freshness: target 95% <48h old
└─ Recipe performance data coverage: target >80%
```

---

## 🚀 Launch Checklist

### Pre-Launch (Before Sept 2025)

**Development**
- [ ] Core Python engine tested (1000+ test cases)
- [ ] Flutter app E2E tested (iOS + Android)
- [ ] Edge Functions deployed & monitored
- [ ] Database migrations validated
- [ ] Batch jobs scheduled & tested

**Data**
- [ ] ≥500 recipes vectorized
- [ ] ≥50 creators onboarded
- [ ] Seed user vectors (beta testers)
- [ ] Ingredient group mapping complete

**Infrastructure**
- [ ] Railway production deployment
- [ ] Supabase production instance
- [ ] Monitoring & alerting configured
- [ ] Backup & recovery tested
- [ ] GDPR compliance validated

**Legal & Business**
- [ ] Creator contracts finalized
- [ ] CGU/CGV validées
- [ ] Payment infrastructure ready
- [ ] App Store submissions approved

---

## 📚 Documentation Index

### Technical Docs (V1)

1. **OUTCOME_BASED_METRICS.md** - Analytics core
2. **CREATOR_ANALYTICS_DASHBOARD.md** - Creator economy
3. **PYTHON_RECOMMENDATION_ENGINE.md** - Intelligence layer
4. **RECIPE_ADJUSTMENT_ENGINE.md** - Personalization

### Architecture Docs (Existing)

5. **User_Vectorization_and_EGR_Matrix.md** - Vector strategy (V2 vision)
6. **V1_VECTORIZATION_MEAL_PLANNER.md** - V1 implementation plan

### Planning Docs

7. **V1_OBJECTIFS_IMPLEMENTATION.md** - V1 goals
8. **V1_CONTRAINTES_FLUTTERFLOW.md** - FlutterFlow limits (migration rationale)

---

## 🎯 Vision Long-Terme

### 2025 (V1 Launch)
- Foundation: Intelligence + Monétisation
- Market: Diaspora africaine Europe
- Scale: 10k users, 500 recipes, 100 creators

### 2026 (V2)
- Advanced analytics (PCA, causality)
- B2B intelligence platform
- Market expansion: Anglophone (Nigeria, US, UK)
- Scale: 100k users, 5k recipes, 1k creators

### 2027+ (V3)
- Beauty & wellness expansion
- AI-powered coaching
- Predictive health intelligence
- Global platform (multi-cuisine, multi-market)

---

**FIN DU DOCUMENT**

---

*Ce document fournit une vue d'ensemble complète du système AKELI V1. Pour les détails techniques d'implémentation, consulter les documents spécifiques listés dans l'index.*
