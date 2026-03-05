# 🧠 Python Recommendation Engine - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Fondamental

**Le moteur de recommandation Python est le cerveau d'AKELI** - il transforme les données brutes en décisions nutritionnelles intelligentes.

Contrairement à la V0 (IA générative hasardeuse), la V1 utilise :
- **Vectorisation** mathématique (cosine similarity)
- **Métriques outcome** (perte de poids, adherence, rétention)
- **Apprentissage continu** (feedback loops)
- **Déterminisme** (mêmes inputs → mêmes outputs)

### Architecture Validée

```
┌─────────────────────────────────────────────┐
│ APP (Flutter)                               │
│ "Génère mon meal plan semaine"             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Edge Function (Supabase)                    │
│ - Auth user                                 │
│ - Validate request                          │
│ - Call Python service via HTTP              │
└──────────────────┬──────────────────────────┘
                   │
                   │ POST https://python.railway.app/meal_plan
                   ▼
┌─────────────────────────────────────────────┐
│ Python Service (Railway)                    │
│                                             │
│ ✓ Cosine similarity (NumPy)                │
│ ✓ User vector (hybrid cache)               │
│ ✓ Recipe vectors (SQL storage)             │
│ ✓ Outcome-aware ranking                    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ PostgreSQL (Supabase)                       │
│ ✓ user_vectors (50D)                       │
│ ✓ recipe_vectors (50D)                     │
│ ✓ pgvector extension                       │
└─────────────────────────────────────────────┘
```

---

## 📋 Table des Matières

1. [Architecture Décisions](#architecture-décisions)
2. [Vectorisation](#vectorisation)
3. [Core Engine](#core-engine)
4. [Public API Functions](#public-api-functions)
5. [Caching Strategy](#caching-strategy)
6. [Deployment Railway](#deployment-railway)
7. [Integration Edge Functions](#integration-edge-functions)

---

## 🏗️ Architecture Décisions

### Décisions Validées (Discussion Curtis)

| Aspect | Choix V1 | Justification |
|--------|----------|---------------|
| **Stockage vecteurs** | PostgreSQL + pgvector | Simple, déjà en place, suffit pour V1 |
| **Calcul user_vector** | Hybrid (cache 24h) | Bon équilibre freshness/performance |
| **Update frequency** | Nightly batch (3h) | Pas besoin real-time V1 |
| **Python granularité** | Mix (core + wrappers) | Clean, évolutif, réutilisable |
| **Hébergement** | Railway | Simple, bon prix, scalable |
| **Flow** | Edge → Python → Edge | Séparation claire responsabilités |

### Pourquoi Python (vs Edge Functions)

**Edge Functions** :
- ✅ Excellent pour : Auth, validation, orchestration
- ❌ Limités pour : Calcul matriciel, NumPy, algèbre linéaire

**Python Service** :
- ✅ NumPy optimisé pour cosine similarity
- ✅ Flexible pour analytics avancées
- ✅ Scaling horizontal facile
- ✅ Debugging & monitoring simples

**Séparation propre** :
```
Edge Function = Traffic Cop
Python Service = Brain
PostgreSQL = Memory
```

---

## 🧬 Vectorisation

### User Vector (50 Dimensions)

#### Structure

```python
USER_VECTOR_SCHEMA = {
    # Goals (10D)
    'weight_loss_intent': float,      # 0-1
    'muscle_gain_intent': float,      # 0-1
    'maintenance_intent': float,      # 0-1
    'energy_optimization': float,     # 0-1
    'health_improvement': float,      # 0-1
    # ... 5 autres goal dimensions
    
    # Preferences (15D)
    'protein_preference': float,      # Ratio préféré
    'carb_preference': float,
    'fat_preference': float,
    'fiber_importance': float,
    'cuisine_african': float,         # 0-1
    'cuisine_european': float,
    'cuisine_asian': float,
    'spiciness_tolerance': float,
    'cooking_time_tolerance': float,  # Heures max
    'cost_sensitivity': float,
    # ... 5 autres preferences
    
    # Behavior (15D)
    'meal_logging_consistency': float,    # From metrics
    'plan_adherence_score': float,
    'exploration_rate': float,
    'swap_frequency': float,
    'cooking_complexity_tolerance': float,
    'portion_adjustment_tendency': float,
    # ... 9 autres behavior signals
    
    # Outcomes (10D)
    'actual_weight_velocity': float,   # kg/semaine
    'adherence_trend': float,
    'satisfaction_history': float,
    'drop_off_risk': float,
    # ... 6 autres outcome signals
}

# Total: 50 dimensions
```

#### Computation Logic

```python
def compute_user_vector(user_id: str) -> np.array:
    """
    Construit le vecteur utilisateur à partir de :
    - Profil statique (goals, contraintes)
    - Historique comportemental (4 dernières semaines)
    - Outcomes réels (poids, adherence)
    
    Returns: np.array de shape (50,)
    """
    
    # 1. GOALS (static profile)
    user_profile = db.query("""
        SELECT 
            primary_goal,
            target_weight_kg,
            current_weight_kg,
            activity_level
        FROM users
        WHERE user_id = ?
    """, user_id)
    
    goal_vector = np.zeros(10)
    
    # Encoder one-hot goals
    if user_profile.primary_goal == 'weight_loss':
        goal_vector[0] = 1.0
    elif user_profile.primary_goal == 'muscle_gain':
        goal_vector[1] = 1.0
    elif user_profile.primary_goal == 'maintenance':
        goal_vector[2] = 1.0
    
    # Activity level normalisé
    activity_map = {'sedentary': 0.2, 'light': 0.4, 'moderate': 0.6, 'active': 0.8, 'very_active': 1.0}
    goal_vector[3] = activity_map.get(user_profile.activity_level, 0.5)
    
    # Goal proximity
    if user_profile.target_weight_kg:
        total_to_lose = abs(user_profile.current_weight_kg - user_profile.target_weight_kg)
        remaining = abs(user_profile.current_weight_kg - user_profile.target_weight_kg)
        goal_vector[4] = 1.0 - (remaining / total_to_lose) if total_to_lose > 0 else 1.0
    
    # ... autres goals
    
    # 2. PREFERENCES (static + learned)
    preferences = db.query("""
        SELECT 
            preferred_protein_ratio,
            preferred_carb_ratio,
            preferred_fat_ratio,
            cuisine_preferences,
            max_cooking_time_minutes,
            budget_per_meal
        FROM user_preferences
        WHERE user_id = ?
    """, user_id)
    
    preference_vector = np.array([
        preferences.preferred_protein_ratio / 100.0,
        preferences.preferred_carb_ratio / 100.0,
        preferences.preferred_fat_ratio / 100.0,
        # ... encoder cuisine preferences (one-hot ou embedding)
        preferences.max_cooking_time_minutes / 120.0,  # Normaliser 0-1 (max 2h)
        preferences.budget_per_meal / 10.0,             # Normaliser 0-1 (max 10€)
        # ... 10 autres dimensions preferences
    ])
    
    # 3. BEHAVIOR (learned from last 4 weeks)
    behavior_metrics = db.query("""
        SELECT 
            AVG(meal_logging_consistency) as consistency,
            AVG(plan_adherence_score) as adherence,
            AVG(exploration_rate) as exploration,
            AVG(swap_frequency) as swaps,
            AVG(avg_recipe_complexity) as complexity
        FROM user_behavior_metrics
        WHERE user_id = ?
        AND week_start >= ?
        ORDER BY week_start DESC
        LIMIT 4
    """, user_id, date.today() - timedelta(weeks=4))
    
    behavior_vector = np.array([
        behavior_metrics.consistency or 0.7,   # Défaut neutre
        behavior_metrics.adherence or 0.6,
        behavior_metrics.exploration or 0.3,
        behavior_metrics.swaps or 0.2,
        (behavior_metrics.complexity or 2.5) / 5.0,  # Normaliser 1-5 → 0-1
        # ... 10 autres behavior dimensions
    ])
    
    # 4. OUTCOMES (learned from actual results)
    outcomes = db.query("""
        SELECT 
            (current_weight_kg - initial_weight_kg) / NULLIF(EXTRACT(EPOCH FROM (NOW() - created_at)) / 604800, 0) as weight_velocity,
            recent_adherence_trend,
            avg_satisfaction
        FROM users
        LEFT JOIN user_outcome_stats ON user_outcome_stats.user_id = users.user_id
        WHERE users.user_id = ?
    """, user_id)
    
    outcome_vector = np.array([
        outcomes.weight_velocity or 0.0,
        outcomes.recent_adherence_trend or 0.0,
        outcomes.avg_satisfaction or 0.7,
        # ... 7 autres outcome dimensions
    ])
    
    # CONCATENATE ALL
    full_vector = np.concatenate([
        goal_vector,        # 10D
        preference_vector,  # 15D
        behavior_vector,    # 15D
        outcome_vector      # 10D
    ])
    
    # Normaliser L2 (pour cosine similarity)
    norm = np.linalg.norm(full_vector)
    if norm > 0:
        full_vector = full_vector / norm
    
    return full_vector  # Shape: (50,)
```

---

### Recipe Vector (50 Dimensions)

#### Structure

```python
RECIPE_VECTOR_SCHEMA = {
    # Macros (10D)
    'protein_ratio': float,
    'carb_ratio': float,
    'fat_ratio': float,
    'fiber_density': float,
    'calories_per_100g': float,
    'satiety_index': float,
    # ... 4 autres macro dimensions
    
    # Metadata (10D)
    'cooking_time_hours': float,
    'difficulty_score': float,      # 1-5
    'cost_per_serving': float,
    'preparation_steps': int,
    'cuisine_type': float,          # Encoded
    'meal_type': float,             # Breakfast/lunch/dinner
    # ... 4 autres metadata
    
    # Outcomes (20D) - CRITIQUE
    'weight_loss_per_meal': float,     # From metrics
    'adherence_rate': float,
    'repeat_rate': float,
    'drop_off_rate_inverted': float,  # 1 - drop_off (invert for similarity)
    'satisfaction_score': float,
    'portion_stability': float,
    # ... 14 autres outcome signals
    
    # Creator (10D)
    'creator_reliability': float,
    'creator_avg_performance': float,
    'recipe_age_days': float,
    'total_consumptions': float,      # Log scale
    # ... 6 autres creator/popularity signals
}

# Total: 50 dimensions
```

#### Computation Logic

```python
def compute_recipe_vector(recipe_id: str) -> np.array:
    """
    Construit le vecteur recette à partir de :
    - Macros & metadata statiques
    - Métriques outcome dynamiques
    - Creator signals
    
    Returns: np.array de shape (50,)
    """
    
    # 1. MACROS
    recipe = db.query("""
        SELECT 
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            fiber_g_per_100g,
            calories_per_100g,
            estimated_satiety_index
        FROM recipes
        WHERE recipe_id = ?
    """, recipe_id)
    
    total_macros = recipe.protein_g + recipe.carbs_g + recipe.fat_g
    
    macro_vector = np.array([
        recipe.protein_g / total_macros if total_macros > 0 else 0.33,
        recipe.carbs_g / total_macros if total_macros > 0 else 0.33,
        recipe.fat_g / total_macros if total_macros > 0 else 0.33,
        recipe.fiber_g / 20.0,  # Normaliser (max ~20g)
        recipe.calories / 500.0,  # Normaliser (max ~500 kcal)
        recipe.satiety_index or 0.5,
        # ... 4 autres
    ])
    
    # 2. METADATA
    metadata = db.query("""
        SELECT 
            cooking_time_minutes,
            difficulty_score,
            estimated_cost_per_serving,
            preparation_steps,
            cuisine_type,
            meal_type
        FROM recipes
        WHERE recipe_id = ?
    """, recipe_id)
    
    metadata_vector = np.array([
        metadata.cooking_time_minutes / 120.0,  # Max 2h
        metadata.difficulty_score / 5.0,        # 1-5 → 0-1
        metadata.estimated_cost / 10.0,         # Max 10€
        metadata.preparation_steps / 20.0,      # Max ~20 steps
        # Encode cuisine_type (one-hot ou embedding)
        # ... 6 autres
    ])
    
    # 3. OUTCOMES (from recipe_performance_metrics)
    outcomes = db.query("""
        SELECT 
            AVG(weight_loss_per_meal) as weight_loss,
            AVG(adherence_rate) as adherence,
            AVG(repeat_rate) as repeat,
            AVG(drop_off_rate) as drop_off,
            AVG(satisfaction_score) as satisfaction,
            AVG(avg_portion_adjustment) as portion_adj
        FROM recipe_performance_metrics
        WHERE recipe_id = ?
        AND date >= ?
        GROUP BY recipe_id
    """, recipe_id, date.today() - timedelta(days=30))
    
    # Defaults si pas assez de data
    outcome_vector = np.array([
        outcomes.weight_loss or 0.0,        # Can be negative
        outcomes.adherence or 0.75,         # Neutral default
        outcomes.repeat or 0.30,
        1.0 - (outcomes.drop_off or 0.10),  # INVERT drop_off
        outcomes.satisfaction or 0.70,
        1.0 - abs((outcomes.portion_adj or 1.0) - 1.0),  # Stability
        # ... 14 autres outcome dimensions
    ])
    
    # 4. CREATOR SIGNALS
    creator_stats = db.query("""
        SELECT 
            c.avg_recipe_performance,
            c.total_recipes,
            r.created_at,
            r.total_consumptions
        FROM recipes r
        JOIN creators c ON c.creator_id = r.creator_id
        WHERE r.recipe_id = ?
    """, recipe_id)
    
    recipe_age_days = (date.today() - creator_stats.created_at.date()).days
    
    creator_vector = np.array([
        creator_stats.avg_recipe_performance or 0.7,
        min(1.0, creator_stats.total_recipes / 50.0),  # Normalize
        min(1.0, recipe_age_days / 365.0),             # Max 1 an
        min(1.0, np.log1p(creator_stats.total_consumptions) / 10.0),  # Log scale
        # ... 6 autres
    ])
    
    # CONCATENATE
    full_vector = np.concatenate([
        macro_vector,      # 10D
        metadata_vector,   # 10D
        outcome_vector,    # 20D
        creator_vector     # 10D
    ])
    
    # Normaliser L2
    norm = np.linalg.norm(full_vector)
    if norm > 0:
        full_vector = full_vector / norm
    
    return full_vector  # Shape: (50,)
```

---

## ⚙️ Core Engine

### Cosine Similarity (Pure NumPy)

```python
import numpy as np

def cosine_similarity(user_vector: np.array, recipe_matrix: np.array) -> np.array:
    """
    Calcule similarité cosinus entre 1 user et N recettes.
    
    Args:
        user_vector: Shape (50,) - vecteur utilisateur normalisé
        recipe_matrix: Shape (N, 50) - matrice recettes normalisées
    
    Returns:
        np.array de shape (N,) - scores similarité [0, 1]
    
    Complexity: O(N × D) où D=50 → très rapide même pour N=10,000
    """
    
    # Dot product (déjà normalisés L2, donc cosine = dot product)
    scores = recipe_matrix @ user_vector  # Matrix multiplication
    
    # Clamp to [0, 1] (théoriquement déjà, mais sécurité)
    scores = np.clip(scores, 0.0, 1.0)
    
    return scores
```

**Performance** :
- 2,500 recettes × 50D = 125,000 multiplications
- NumPy optimisé → **~1-2ms** sur CPU moderne

---

### Recommendation Core Function

```python
def _compute_recommendations(
    user_vector: np.array,
    recipe_vectors: np.array,
    recipe_ids: list,
    filters: dict = {},
    limit: int = 10
) -> list[dict]:
    """
    CORE RECOMMENDATION ENGINE
    
    Pure math, no business logic.
    Utilisé par toutes les fonctions publiques (meal_plan, feed, etc.)
    
    Args:
        user_vector: (50,) utilisateur
        recipe_vectors: (N, 50) toutes recettes
        recipe_ids: list[str] IDs correspondants
        filters: dict de filtres optionnels
        limit: int nombre de résultats
    
    Returns:
        list[dict] avec recipe_id + score
    """
    
    # 1. COSINE SIMILARITY
    scores = cosine_similarity(user_vector, recipe_vectors)
    
    # 2. APPLY FILTERS
    
    # Filter: Diversity (max 2 recipes per creator)
    if filters.get('diversity'):
        scores = apply_diversity_penalty(scores, recipe_ids)
    
    # Filter: Freshness boost (nouvelles recettes +10%)
    if filters.get('freshness'):
        scores = boost_fresh_recipes(scores, recipe_ids, boost=0.10)
    
    # Filter: Drop-off threshold (drop_off > 0.20 → excluded)
    if filters.get('safe_only'):
        scores = filter_high_dropoff(scores, recipe_ids, threshold=0.20)
    
    # Filter: Exploration (inject 20% random)
    if filters.get('exploration'):
        exploration_rate = filters.get('exploration')
        scores = inject_exploration(scores, rate=exploration_rate)
    
    # 3. TOP N
    top_indices = np.argsort(scores)[-limit:][::-1]  # Descending
    
    # 4. RETURN
    return [
        {
            'recipe_id': recipe_ids[i],
            'score': float(scores[i])
        }
        for i in top_indices
    ]


# === FILTER HELPERS ===

def apply_diversity_penalty(scores: np.array, recipe_ids: list) -> np.array:
    """
    Pénalise si >2 recettes du même créateur dans top N.
    """
    creator_counts = {}
    penalized_scores = scores.copy()
    
    # Sort by score first
    sorted_indices = np.argsort(scores)[::-1]
    
    for idx in sorted_indices:
        recipe_id = recipe_ids[idx]
        creator_id = get_recipe_creator_id(recipe_id)
        
        creator_counts[creator_id] = creator_counts.get(creator_id, 0) + 1
        
        # Si >2 recettes de ce créateur, pénaliser
        if creator_counts[creator_id] > 2:
            penalized_scores[idx] *= 0.5  # -50% score
    
    return penalized_scores


def boost_fresh_recipes(scores: np.array, recipe_ids: list, boost: float = 0.10) -> np.array:
    """
    Boost recettes créées dans derniers 7 jours.
    """
    boosted_scores = scores.copy()
    
    for i, recipe_id in enumerate(recipe_ids):
        recipe_age_days = get_recipe_age_days(recipe_id)
        
        if recipe_age_days <= 7:
            boosted_scores[i] *= (1.0 + boost)
    
    return boosted_scores


def filter_high_dropoff(scores: np.array, recipe_ids: list, threshold: float = 0.20) -> np.array:
    """
    Exclut recettes avec drop_off > threshold.
    """
    filtered_scores = scores.copy()
    
    for i, recipe_id in enumerate(recipe_ids):
        drop_off_rate = get_recipe_dropoff_rate(recipe_id)
        
        if drop_off_rate and drop_off_rate > threshold:
            filtered_scores[i] = 0.0  # Exclude
    
    return filtered_scores


def inject_exploration(scores: np.array, rate: float = 0.20) -> np.array:
    """
    Inject X% aléatoire pour éviter filter bubble.
    """
    n = len(scores)
    exploration_count = int(n * rate)
    
    # Sélectionner aléatoirement exploration_count recettes
    random_indices = np.random.choice(n, exploration_count, replace=False)
    
    # Boost leur score
    explored_scores = scores.copy()
    explored_scores[random_indices] *= 1.5
    
    return explored_scores
```

---

## 🎯 Public API Functions

### 1. Meal Plan

```python
def meal_plan(user_id: str, days: int = 7) -> dict:
    """
    Génère un meal plan structuré pour N jours.
    
    Args:
        user_id: UUID utilisateur
        days: Nombre de jours (défaut 7)
    
    Returns:
        dict avec plan structuré par jour/repas
    """
    
    # 1. Get user vector
    user_vector = get_or_compute_user_vector(user_id)
    
    # 2. Load all recipe vectors
    recipe_vectors, recipe_ids = load_recipe_vectors()
    
    # 3. Filters spécifiques meal plan
    filters = {
        'diversity': True,   # Max 2 recipes/creator
        'safe_only': True,   # Exclude high drop-off
        'freshness': False   # Pas de boost freshness (priorité adherence)
    }
    
    # 4. Recommend N × meals_per_day recettes
    meals_per_day = 3
    total_needed = days * meals_per_day
    
    recommendations = _compute_recommendations(
        user_vector,
        recipe_vectors,
        recipe_ids,
        filters,
        limit=total_needed
    )
    
    # 5. Assign to days/meals
    plan = []
    idx = 0
    
    for day in range(1, days + 1):
        day_plan = {
            'day': day,
            'date': (date.today() + timedelta(days=day-1)).isoformat(),
            'meals': []
        }
        
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            if idx < len(recommendations):
                recipe_id = recommendations[idx]['recipe_id']
                score = recommendations[idx]['score']
                
                # Fetch recipe metadata
                recipe = get_recipe_metadata(recipe_id)
                
                day_plan['meals'].append({
                    'meal_type': meal_type,
                    'recipe_id': recipe_id,
                    'recipe_title': recipe.title,
                    'cooking_time_minutes': recipe.cooking_time_minutes,
                    'calories': recipe.calories_per_serving,
                    'macros': {
                        'protein_g': recipe.protein_g,
                        'carbs_g': recipe.carbs_g,
                        'fat_g': recipe.fat_g
                    },
                    'similarity_score': score
                })
                
                idx += 1
        
        plan.append(day_plan)
    
    return {
        'user_id': user_id,
        'plan': plan,
        'generated_at': datetime.now().isoformat()
    }
```

---

### 2. Recommended Recipes (Weekly Update)

```python
def recommended_recipes(user_id: str, limit: int = 50) -> list[dict]:
    """
    Top N recettes recommandées pour l'utilisateur.
    
    Stocké en table, updated weekly.
    Utilisé pour "Recommandations" tab dans app.
    
    Args:
        limit: Nombre de recettes (défaut 50)
    """
    
    user_vector = get_or_compute_user_vector(user_id)
    recipe_vectors, recipe_ids = load_recipe_vectors()
    
    filters = {
        'diversity': True,
        'freshness': True,   # Boost nouvelles recettes
        'safe_only': True
    }
    
    recommendations = _compute_recommendations(
        user_vector,
        recipe_vectors,
        recipe_ids,
        filters,
        limit
    )
    
    # Enrich with metadata
    results = []
    for rec in recommendations:
        recipe = get_recipe_metadata(rec['recipe_id'])
        
        results.append({
            'recipe_id': rec['recipe_id'],
            'title': recipe.title,
            'creator_name': recipe.creator_name,
            'cooking_time_minutes': recipe.cooking_time_minutes,
            'difficulty_score': recipe.difficulty_score,
            'thumbnail_url': recipe.thumbnail_url,
            'similarity_score': rec['score']
        })
    
    return results
```

---

### 3. User Feed (Daily Update)

```python
def user_feed(user_id: str, limit: int = 200) -> list[dict]:
    """
    Feed scrollable TikTok-style.
    
    Updated daily.
    Stocké en table user_feed.
    
    Args:
        limit: Nombre de recettes (défaut 200)
    """
    
    user_vector = get_or_compute_user_vector(user_id)
    recipe_vectors, recipe_ids = load_recipe_vectors()
    
    filters = {
        'diversity': True,
        'freshness': True,
        'exploration': 0.20,  # 20% serendipity
        'safe_only': False    # Allow discovery même si drop-off
    }
    
    recommendations = _compute_recommendations(
        user_vector,
        recipe_vectors,
        recipe_ids,
        filters,
        limit
    )
    
    # Enrich
    results = []
    for rec in recommendations:
        recipe = get_recipe_metadata(rec['recipe_id'])
        
        results.append({
            'recipe_id': rec['recipe_id'],
            'title': recipe.title,
            'creator_name': recipe.creator_name,
            'thumbnail_url': recipe.thumbnail_url,
            'tags': recipe.tags,
            'score': rec['score']
        })
    
    return results
```

---

### 4. Similar Users

```python
def similar_users(user_id: str, limit: int = 10) -> list[dict]:
    """
    Trouve les N utilisateurs les plus similaires.
    
    Utilisé pour:
    - Cold start nouveaux users
    - Collaborative filtering
    - "Users like you ate..."
    """
    
    user_vector = get_or_compute_user_vector(user_id)
    
    # Load all user vectors (exclude self)
    all_users = db.query("""
        SELECT user_id, vector
        FROM user_vectors
        WHERE user_id != ?
        AND last_computed_at > NOW() - INTERVAL '7 days'
    """, user_id)
    
    user_ids = [u.user_id for u in all_users]
    user_matrix = np.array([u.vector for u in all_users])
    
    # Cosine similarity
    scores = cosine_similarity(user_vector, user_matrix)
    
    # Top N
    top_indices = np.argsort(scores)[-limit:][::-1]
    
    return [
        {
            'user_id': user_ids[i],
            'similarity': float(scores[i])
        }
        for i in top_indices
    ]
```

---

## 💾 Caching Strategy

### Hybrid Cache (Validé)

```python
def get_or_compute_user_vector(user_id: str) -> np.array:
    """
    HYBRID CACHE STRATEGY
    
    1. Check if vector exists AND is fresh (< 24h)
    2. If yes → return cached
    3. If no → compute → store → return
    
    Updated nightly batch (3h du matin)
    """
    
    cached = db.query("""
        SELECT vector, last_computed_at
        FROM user_vectors
        WHERE user_id = ?
    """, user_id)
    
    # Check freshness
    if cached and cached.vector is not None:
        age_hours = (datetime.now() - cached.last_computed_at).total_seconds() / 3600
        
        if age_hours < 24:
            # Cache HIT
            return np.array(cached.vector)
    
    # Cache MISS → compute
    user_vector = compute_user_vector(user_id)
    
    # Store/update
    db.upsert("""
        INSERT INTO user_vectors (user_id, vector, last_computed_at, meals_count)
        VALUES (?, ?, NOW(), ?)
        ON CONFLICT (user_id) DO UPDATE
        SET vector = EXCLUDED.vector,
            last_computed_at = EXCLUDED.last_computed_at
    """, user_id, user_vector.tolist(), get_user_meal_count(user_id))
    
    return user_vector


def load_recipe_vectors() -> tuple[np.array, list]:
    """
    Load ALL recipe vectors into memory.
    
    Cache in-memory (application level) for 1 hour.
    
    Returns:
        (recipe_matrix, recipe_ids)
    """
    
    # Check in-memory cache
    cache_key = 'recipe_vectors_cache'
    cached = app_cache.get(cache_key)
    
    if cached and (datetime.now() - cached['timestamp']).seconds < 3600:
        return cached['matrix'], cached['ids']
    
    # Load from DB
    recipes = db.query("""
        SELECT recipe_id, vector
        FROM recipe_vectors
        WHERE vector IS NOT NULL
        ORDER BY recipe_id
    """)
    
    recipe_ids = [r.recipe_id for r in recipes]
    recipe_matrix = np.array([r.vector for r in recipes])
    
    # Cache
    app_cache.set(cache_key, {
        'matrix': recipe_matrix,
        'ids': recipe_ids,
        'timestamp': datetime.now()
    })
    
    return recipe_matrix, recipe_ids
```

---

## 🚂 Deployment Railway

### Project Structure

```
akeli-python-engine/
├── main.py              # FastAPI app
├── engine/
│   ├── __init__.py
│   ├── vectorization.py     # compute_user_vector, compute_recipe_vector
│   ├── recommendation.py    # Core engine + public functions
│   ├── similarity.py        # cosine_similarity, filters
│   └── database.py          # DB helpers
├── requirements.txt
├── railway.toml
└── .env
```

### main.py (FastAPI)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import date
import numpy as np

from engine.recommendation import (
    meal_plan,
    recommended_recipes,
    user_feed,
    similar_users
)

app = FastAPI(title="AKELI Recommendation Engine")


# === HEALTH CHECK ===

@app.get("/health")
def health_check():
    """Railway health check"""
    return {"status": "ok", "service": "akeli-recommendation-engine"}


# === REQUEST MODELS ===

class MealPlanRequest(BaseModel):
    user_id: str
    days: int = 7

class RecommendRequest(BaseModel):
    user_id: str
    limit: int = 50

class FeedRequest(BaseModel):
    user_id: str
    limit: int = 200

class SimilarUsersRequest(BaseModel):
    user_id: str
    limit: int = 10


# === ENDPOINTS ===

@app.post("/meal_plan")
def api_meal_plan(request: MealPlanRequest):
    """
    Génère meal plan 7 jours.
    
    Called by: Edge Function
    """
    try:
        plan = meal_plan(request.user_id, request.days)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommended_recipes")
def api_recommended_recipes(request: RecommendRequest):
    """
    Top N recettes recommandées.
    
    Called by: Edge Function (weekly batch)
    """
    try:
        recipes = recommended_recipes(request.user_id, request.limit)
        return {"recipes": recipes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/user_feed")
def api_user_feed(request: FeedRequest):
    """
    Feed scrollable 200 recettes.
    
    Called by: Edge Function (daily batch)
    """
    try:
        feed = user_feed(request.user_id, request.limit)
        return {"feed": feed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similar_users")
def api_similar_users(request: SimilarUsersRequest):
    """
    Utilisateurs similaires.
    
    Called by: Edge Function (on-demand)
    """
    try:
        users = similar_users(request.user_id, request.limit)
        return {"similar_users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === RUN ===

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### requirements.txt

```txt
fastapi==0.104.1
uvicorn==0.24.0
numpy==1.26.2
psycopg2-binary==2.9.9
pgvector==0.2.3
pydantic==2.5.0
python-dotenv==1.0.0
```

---

### railway.toml

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[env]
PORT = "8000"
```

---

### Environment Variables (.env)

```bash
# PostgreSQL (Supabase)
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Railway
PORT=8000

# AKELI Config
CACHE_TTL_HOURS=1
USER_VECTOR_TTL_HOURS=24
```

---

## 🔗 Integration Edge Functions

### Supabase Edge Function (TypeScript)

```typescript
// supabase/functions/generate-meal-plan/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PYTHON_SERVICE_URL = Deno.env.get('PYTHON_SERVICE_URL') || 'https://akeli-engine.railway.app'

serve(async (req) => {
  try {
    // 1. AUTH
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    
    // 2. PARSE REQUEST
    const { days = 7 } = await req.json()
    
    // 3. CALL PYTHON SERVICE
    const response = await fetch(`${PYTHON_SERVICE_URL}/meal_plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        days: days
      })
    })
    
    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`)
    }
    
    const mealPlan = await response.json()
    
    // 4. STORE MEAL PLAN (optional)
    await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        plan: mealPlan.plan,
        generated_at: mealPlan.generated_at
      })
    
    // 5. RETURN
    return new Response(
      JSON.stringify(mealPlan),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

### Flow Complet

```
USER (Flutter App)
    ↓
    POST /functions/v1/generate-meal-plan
    Headers: { Authorization: Bearer <token> }
    Body: { days: 7 }
    ↓
EDGE FUNCTION (Supabase)
    ├─ Auth user via JWT
    ├─ Validate request
    └─ POST https://akeli-engine.railway.app/meal_plan
       Body: { user_id, days }
    ↓
PYTHON SERVICE (Railway)
    ├─ get_or_compute_user_vector(user_id)
    │   └─ Check cache (< 24h ?) → return or compute
    ├─ load_recipe_vectors() → (N, 50) matrix
    ├─ _compute_recommendations(user_vec, recipes, filters)
    │   ├─ cosine_similarity()
    │   ├─ apply_filters()
    │   └─ top N
    ├─ assign_to_meal_slots()
    └─ return JSON
    ↓
EDGE FUNCTION
    ├─ Store in meal_plans table (optional)
    ├─ Format response
    └─ return to app
    ↓
USER (Flutter App)
    └─ Display meal plan
```

**Latency totale** : ~100-200ms
- Edge auth: 20ms
- Python compute: 50-100ms
- Network: 30-50ms

---

## 📊 Batch Jobs (Nightly)

### User Vector Update

```python
# cron_jobs/nightly_vector_update.py

def nightly_user_vector_update():
    """
    Exécuté chaque nuit à 3h du matin.
    
    Recalcule user_vectors pour utilisateurs actifs (7 derniers jours).
    """
    
    print("[CRON] Starting nightly user vector update")
    
    # Users with ≥1 meal logged in last 7 days
    active_users = db.query("""
        SELECT DISTINCT user_id
        FROM meal_logs
        WHERE consumed_at > NOW() - INTERVAL '7 days'
    """)
    
    updated_count = 0
    
    for user_id in [u.user_id for u in active_users]:
        try:
            # Compute fresh vector
            user_vector = compute_user_vector(user_id)
            
            # Store
            db.upsert("""
                INSERT INTO user_vectors (user_id, vector, last_computed_at)
                VALUES (?, ?, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET vector = EXCLUDED.vector,
                    last_computed_at = NOW()
            """, user_id, user_vector.tolist())
            
            updated_count += 1
            
        except Exception as e:
            print(f"[ERROR] Failed to update vector for {user_id}: {e}")
    
    print(f"[CRON] Updated {updated_count} user vectors")


# Trigger via Railway Cron ou GitHub Actions
if __name__ == "__main__":
    nightly_user_vector_update()
```

---

## ✅ Checklist Implémentation

### Development
- [ ] Core engine implémenté (cosine similarity, filters)
- [ ] Public API functions testées (meal_plan, feed, etc.)
- [ ] User vector computation validée
- [ ] Recipe vector computation validée
- [ ] Caching strategy implémentée

### Database
- [ ] Tables user_vectors, recipe_vectors créées
- [ ] pgvector extension activée
- [ ] Indexes sur last_computed_at

### Deployment
- [ ] Railway project créé
- [ ] Environment variables configurées
- [ ] Health check endpoint testé
- [ ] Python service accessible via HTTPS

### Integration
- [ ] Edge Functions créées (meal_plan, feed, etc.)
- [ ] Auth flow validé
- [ ] Error handling testé
- [ ] Latency mesurée (< 200ms)

### Monitoring
- [ ] Logs Railway configurés
- [ ] Alertes erreurs 500
- [ ] Métriques latency trackées

---

**FIN DU DOCUMENT**
