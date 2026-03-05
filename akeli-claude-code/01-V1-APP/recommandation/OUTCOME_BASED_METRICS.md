# 📊 Outcome-Based Metrics - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Fondamental

**AKELI n'est pas une app de tracking calorique - c'est une plateforme d'intelligence nutritionnelle adaptive.**

Les métriques outcome-based sont le **cœur du système d'apprentissage** :
- Elles mesurent **ce qui fonctionne réellement** (pas ce qui est théoriquement optimal)
- Elles nourrissent les **vecteurs utilisateur et recette**
- Elles guident les **recommandations algorithmiques**
- Elles valident que le système **améliore la vie des utilisateurs**

### Différence Critique vs Apps Classiques

| Apps Classiques (MyFitnessPal, Yazio) | AKELI |
|---------------------------------------|-------|
| Mesurent inputs (calories loggées) | Mesurent outcomes (résultats réels) |
| Assument discipline utilisateur | Optimisent décisions système |
| Statiques (macros fixes) | Adaptatifs (apprentissage continu) |
| Recettes = contenu | Recettes = instruments mesurables |

---

## 📋 Table des Matières

1. [Recipe Performance Metrics](#recipe-performance-metrics)
2. [User Behavior Patterns](#user-behavior-patterns)
3. [Weekly Momentum Score](#weekly-momentum-score)
4. [Normalisation Per-Meal](#normalisation-per-meal)
5. [Impact sur Vectorisation](#impact-sur-vectorisation)
6. [Architecture Technique](#architecture-technique)

---

## 🍽️ Recipe Performance Metrics

### Objectif

Mesurer **l'efficacité réelle d'une recette** selon plusieurs dimensions :
- **Outcome santé** : impact poids, énergie
- **Adherence** : recette complétée ou abandonnée
- **Satisfaction** : validation utilisateur
- **Retention** : recette encourage ou décourage continuation

### Métriques Calculées

#### 1. Weight Loss Per Meal (Δweight/meal)

**Définition** : Variation de poids moyenne attribuable à une consommation de cette recette.

**Logique de Calcul** :

```python
def compute_weight_loss_per_meal(recipe_id: str, days: int = 7) -> float:
    """
    Calcule la variation de poids moyenne par consommation de recette.
    
    IMPORTANT: On ne peut pas attribuer causalité directe (1 repas → Δweight immédiat)
    On utilise une fenêtre temporelle pour lisser.
    
    Args:
        recipe_id: UUID de la recette
        days: Fenêtre d'analyse (défaut 7 jours)
    
    Returns:
        float: kg perdu moyen par consommation (peut être négatif si gain)
    """
    
    # 1. Récupérer toutes les consommations de cette recette
    consumptions = db.query("""
        SELECT 
            ml.user_id,
            ml.consumed_at,
            ml.portion_modifier
        FROM meal_logs ml
        WHERE ml.recipe_id = ?
        AND ml.status = 'completed'
        ORDER BY ml.user_id, ml.consumed_at
    """, recipe_id)
    
    total_weight_change = 0
    valid_samples = 0
    
    # 2. Pour chaque consommation, calculer Δweight sur fenêtre
    for consumption in consumptions:
        user_id = consumption.user_id
        consumed_at = consumption.consumed_at
        
        # Poids AVANT (moyenne 3 jours précédents)
        weight_before = db.query("""
            SELECT AVG(weight_kg) as avg_weight
            FROM weight_logs
            WHERE user_id = ?
            AND logged_at BETWEEN ? AND ?
        """, user_id, 
            consumed_at - timedelta(days=3),
            consumed_at
        ).avg_weight
        
        # Poids APRÈS (moyenne 3-7 jours suivants)
        weight_after = db.query("""
            SELECT AVG(weight_kg) as avg_weight
            FROM weight_logs
            WHERE user_id = ?
            AND logged_at BETWEEN ? AND ?
        """, user_id,
            consumed_at + timedelta(days=3),
            consumed_at + timedelta(days=7)
        ).avg_weight
        
        # Si on a les deux mesures → contribue au calcul
        if weight_before and weight_after:
            delta = weight_before - weight_after  # Positif = perte
            total_weight_change += delta
            valid_samples += 1
    
    # 3. Moyenne pondérée
    if valid_samples >= 10:  # Seuil minimum de confiance
        return total_weight_change / valid_samples
    else:
        return None  # Pas assez de data → pas de score
```

**Normalisation** :
- Divisé par `valid_samples` = per-meal
- Permet comparaison équitable : 1000 consommations vs 50 consommations

**Limites & Précautions** :
- ⚠️ **Ce n'est PAS causalité** - corrélation temporelle seulement
- ⚠️ Fenêtre 3-7 jours = compromis (trop court = bruit, trop long = dilution)
- ⚠️ Minimum 10 samples sinon score = NULL

---

#### 2. Adherence Rate (Taux de Complétion)

**Définition** : % de fois où la recette est complétée vs abandonnée.

**Logique de Calcul** :

```python
def compute_adherence_rate(recipe_id: str) -> float:
    """
    Mesure la "finissabilité" d'une recette.
    
    Une recette peut être :
    - 'completed': utilisateur a marqué comme terminée
    - 'abandoned': utilisateur a commencé mais pas fini
    - 'skipped': utilisateur a refusé avant de commencer
    
    L'adherence rate mesure uniquement completed vs abandoned
    (skip n'entre pas dans le calcul car jamais commencée)
    """
    
    stats = db.query("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned
        FROM meal_logs
        WHERE recipe_id = ?
        AND status IN ('completed', 'abandoned')
    """, recipe_id)
    
    total = stats.completed + stats.abandoned
    
    if total >= 20:  # Seuil minimum
        return stats.completed / total
    else:
        return None
```

**Interprétation** :
- `adherence_rate > 0.85` → recette très "finissable"
- `adherence_rate < 0.60` → recette problématique (trop complexe ? pas bon ?)

**Usage** :
- Score élevé → boost dans recommandations
- Score bas → investigation (feedback créateur)

---

#### 3. Repeat Rate (Taux de Récurrence)

**Définition** : % d'utilisateurs qui reconsomment la recette dans les 14 jours.

**Logique de Calcul** :

```python
def compute_repeat_rate(recipe_id: str, window_days: int = 14) -> float:
    """
    Mesure l'attractivité long-terme d'une recette.
    
    Une recette avec repeat_rate élevé = "anchor meal"
    → Les gens aiment et reviennent naturellement
    
    Args:
        window_days: Fenêtre pour considérer "repeat" (défaut 14j)
    """
    
    # Utilisateurs ayant consommé la recette
    first_consumers = db.query("""
        SELECT DISTINCT 
            user_id,
            MIN(consumed_at) as first_consumption
        FROM meal_logs
        WHERE recipe_id = ?
        AND status = 'completed'
        GROUP BY user_id
    """, recipe_id)
    
    repeat_count = 0
    
    for consumer in first_consumers:
        # Est-ce que cet utilisateur a reconsommé dans la fenêtre ?
        repeated = db.query("""
            SELECT COUNT(*) as repeat_consumptions
            FROM meal_logs
            WHERE recipe_id = ?
            AND user_id = ?
            AND consumed_at > ?
            AND consumed_at <= ?
            AND status = 'completed'
        """, recipe_id,
            consumer.user_id,
            consumer.first_consumption,
            consumer.first_consumption + timedelta(days=window_days)
        ).repeat_consumptions
        
        if repeated > 0:
            repeat_count += 1
    
    total_users = len(first_consumers)
    
    if total_users >= 30:
        return repeat_count / total_users
    else:
        return None
```

**Interprétation** :
- `repeat_rate > 0.40` → recette "evergreen", les gens l'adoptent
- `repeat_rate < 0.15` → recette "one-shot", pas de fidélisation

---

#### 4. Drop-Off Rate (Taux d'Abandon Plateforme)

**Définition** : % d'utilisateurs qui arrêtent de logger après avoir consommé cette recette.

**Logique de Calcul** :

```python
def compute_drop_off_rate(recipe_id: str, silence_days: int = 7) -> float:
    """
    Mesure si une recette "tue" l'engagement utilisateur.
    
    CRITIQUE: Une recette peut être techniquement "bonne" (macros OK)
    mais décourager continuation (trop complexe, pas satisfaisante, etc.)
    
    Args:
        silence_days: Nombre de jours sans activité = drop-off
    """
    
    consumptions = db.query("""
        SELECT 
            user_id,
            consumed_at
        FROM meal_logs
        WHERE recipe_id = ?
        AND status = 'completed'
        ORDER BY user_id, consumed_at
    """, recipe_id)
    
    drop_off_count = 0
    total_consumptions = len(consumptions)
    
    for consumption in consumptions:
        # Y a-t-il eu activité dans les N jours suivants ?
        next_activity = db.query("""
            SELECT MIN(consumed_at) as next_log
            FROM meal_logs
            WHERE user_id = ?
            AND consumed_at > ?
        """, consumption.user_id, consumption.consumed_at).next_log
        
        if next_activity is None:
            # Aucune activité après → vérifier si c'est récent ou vraiment drop-off
            days_since = (date.today() - consumption.consumed_at.date()).days
            if days_since > silence_days:
                drop_off_count += 1
        else:
            # Il y a eu activité → calculer délai
            delay = (next_activity - consumption.consumed_at).days
            if delay > silence_days:
                drop_off_count += 1
    
    if total_consumptions >= 50:
        return drop_off_count / total_consumptions
    else:
        return None
```

**Interprétation** :
- `drop_off_rate > 0.20` → 🚨 recette toxique pour retention
- `drop_off_rate < 0.05` → ✅ recette saine pour engagement

**Action** :
- Recettes avec drop-off élevé → supprimées du pool recommandations
- Feedback créateur → "Cette recette décourage continuation"

---

#### 5. Satisfaction Score (Validation Utilisateur)

**Définition** : Score de satisfaction explicite (ratings, validations).

**Logique de Calcul** :

```python
def compute_satisfaction_score(recipe_id: str) -> float:
    """
    Aggrège les signaux explicites de satisfaction :
    - Ratings (1-5 étoiles)
    - Validations (👍 simple)
    - Favoris/saved
    """
    
    # Ratings explicites (si feature activée)
    ratings = db.query("""
        SELECT AVG(rating) as avg_rating, COUNT(*) as count
        FROM recipe_ratings
        WHERE recipe_id = ?
    """, recipe_id)
    
    # Validations implicites (thumbs up après consommation)
    validations = db.query("""
        SELECT 
            COUNT(*) FILTER (WHERE validation = 'positive') as positive,
            COUNT(*) FILTER (WHERE validation = 'negative') as negative
        FROM meal_logs
        WHERE recipe_id = ?
        AND validation IS NOT NULL
    """, recipe_id)
    
    # Score composite
    if ratings.count > 0:
        # Si ratings existent, pondération 70-30
        rating_score = ratings.avg_rating / 5.0  # Normaliser 0-1
        validation_score = validations.positive / (validations.positive + validations.negative) if (validations.positive + validations.negative) > 0 else 0.5
        
        return 0.7 * rating_score + 0.3 * validation_score
    elif (validations.positive + validations.negative) >= 10:
        # Seulement validations
        return validations.positive / (validations.positive + validations.negative)
    else:
        return None  # Pas assez de data
```

---

#### 6. Portion Adjustment Average

**Définition** : Moyenne des ajustements de portions (indicateur satisfaction quantité).

**Logique de Calcul** :

```python
def compute_portion_adjustment_avg(recipe_id: str) -> float:
    """
    Mesure si les portions par défaut sont adaptées.
    
    portion_modifier:
    - 1.0 = portion normale
    - 1.2 = +20% (pas assez copieux)
    - 0.8 = -20% (trop copieux)
    
    Un avg proche de 1.0 = portions bien calibrées
    """
    
    adjustments = db.query("""
        SELECT AVG(portion_modifier) as avg_modifier
        FROM meal_logs
        WHERE recipe_id = ?
        AND status = 'completed'
        AND portion_modifier IS NOT NULL
    """, recipe_id)
    
    return adjustments.avg_modifier if adjustments.avg_modifier else 1.0
```

**Interprétation** :
- `avg = 1.0` → parfait
- `avg > 1.15` → recette sous-dimensionnée (utilisateurs augmentent systématiquement)
- `avg < 0.85` → recette sur-dimensionnée

**Action** :
- Feedback créateur → ajuster portions par défaut

---

### Table Agrégée

```sql
CREATE TABLE recipe_performance_metrics (
    recipe_id UUID NOT NULL,
    date DATE NOT NULL,
    
    -- Volumétrie
    total_consumptions INT DEFAULT 0,
    completed_meals INT DEFAULT 0,
    abandoned_meals INT DEFAULT 0,
    unique_users INT DEFAULT 0,
    
    -- Outcomes
    weight_loss_per_meal FLOAT,  -- NULL si < 10 samples
    adherence_rate FLOAT,         -- completed / (completed + abandoned)
    repeat_rate FLOAT,            -- % users qui reconsomment dans 14j
    drop_off_rate FLOAT,          -- % users qui arrêtent après
    
    -- Satisfaction
    satisfaction_score FLOAT,     -- 0-1 composite
    avg_portion_adjustment FLOAT, -- ~1.0 idéalement
    
    -- Metadata
    data_quality_score FLOAT,     -- Confiance dans métriques (basé sur N samples)
    last_computed_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (recipe_id, date)
);

-- Index pour queries fréquentes
CREATE INDEX idx_recipe_perf_date ON recipe_performance_metrics(date DESC);
CREATE INDEX idx_recipe_perf_quality ON recipe_performance_metrics(data_quality_score DESC);
```

---

## 👤 User Behavior Patterns

### Objectif

Comprendre **comment l'utilisateur utilise réellement AKELI** pour :
- Adapter le niveau de guidage (strict vs flexible)
- Détecter utilisateurs à risque de churn
- Personnaliser recommandations au comportement (pas juste préférences)

### Métriques Calculées

#### 1. Meal Logging Consistency

**Définition** : % de jours où l'utilisateur a loggé 3 repas.

**Logique de Calcul** :

```python
def compute_meal_logging_consistency(user_id: str, week_start: date) -> float:
    """
    Mesure la régularité de logging.
    
    Utilisateur très consistant → système peut faire confiance aux données
    Utilisateur sporadique → besoin plus de tolérance, moins de rigidité
    """
    
    week_end = week_start + timedelta(days=7)
    
    # Jours avec au moins 1 repas loggé
    days_with_logs = db.query("""
        SELECT COUNT(DISTINCT DATE(consumed_at)) as active_days
        FROM meal_logs
        WHERE user_id = ?
        AND consumed_at >= ? AND consumed_at < ?
    """, user_id, week_start, week_end).active_days
    
    # Jours avec 3 repas
    days_with_3_meals = db.query("""
        SELECT COUNT(*) as full_days
        FROM (
            SELECT DATE(consumed_at) as log_date, COUNT(*) as meal_count
            FROM meal_logs
            WHERE user_id = ?
            AND consumed_at >= ? AND consumed_at < ?
            GROUP BY DATE(consumed_at)
            HAVING COUNT(*) >= 3
        ) subquery
    """, user_id, week_start, week_end).full_days
    
    return days_with_3_meals / 7.0  # Normaliser sur 7 jours
```

**Interprétation** :
- `> 0.85` → utilisateur très régulier (persona "discipliné")
- `0.40-0.85` → utilisateur modéré (persona "normal")
- `< 0.40` → utilisateur sporadique (persona "flexible")

**Impact Vectorisation** :
- User vector dimension `consistency_level` influencé
- Recommandations adaptées (recettes simples pour sporadiques)

---

#### 2. Plan Adherence Score

**Définition** : % de recettes suggérées par le plan qui sont effectivement consommées.

**Logique de Calcul** :

```python
def compute_plan_adherence_score(user_id: str, week_start: date) -> float:
    """
    Mesure si l'utilisateur suit les suggestions ou improvise.
    
    Adherence élevée → utilisateur fait confiance au système
    Adherence basse → utilisateur veut plus de contrôle
    """
    
    week_end = week_start + timedelta(days=7)
    
    # Recettes suggérées dans le plan
    suggested = db.query("""
        SELECT recipe_id
        FROM meal_plan_slots
        WHERE user_id = ?
        AND planned_date >= ? AND planned_date < ?
    """, user_id, week_start, week_end)
    
    suggested_recipe_ids = [r.recipe_id for r in suggested]
    total_suggestions = len(suggested_recipe_ids)
    
    if total_suggestions == 0:
        return None  # Pas de plan cette semaine
    
    # Recettes effectivement consommées (parmi suggestions)
    consumed_from_plan = db.query("""
        SELECT COUNT(DISTINCT recipe_id) as count
        FROM meal_logs
        WHERE user_id = ?
        AND consumed_at >= ? AND consumed_at < ?
        AND recipe_id = ANY(?)
        AND status = 'completed'
    """, user_id, week_start, week_end, suggested_recipe_ids).count
    
    return consumed_from_plan / total_suggestions
```

**Interprétation** :
- `> 0.80` → "plan follower" (aime structure)
- `0.40-0.80` → "plan aware" (suit partiellement)
- `< 0.40` → "free spirit" (ignore suggestions)

**Action Système** :
- Plan followers → renforcer suggestions, moins de choix
- Free spirits → mode "feed" plutôt que plan strict

---

#### 3. Exploration Rate

**Définition** : % de recettes consommées qui n'étaient PAS dans le plan.

**Logique de Calcul** :

```python
def compute_exploration_rate(user_id: str, week_start: date) -> float:
    """
    Complémentaire du plan_adherence_score.
    
    Exploration élevée = utilisateur curieux, aime découvrir
    Exploration basse = utilisateur prudent, préfère connu
    """
    
    week_end = week_start + timedelta(days=7)
    
    # Total recettes consommées
    total_consumed = db.query("""
        SELECT COUNT(*) as count
        FROM meal_logs
        WHERE user_id = ?
        AND consumed_at >= ? AND consumed_at < ?
        AND status = 'completed'
    """, user_id, week_start, week_end).count
    
    if total_consumed == 0:
        return None
    
    # Recettes hors plan
    off_plan = db.query("""
        SELECT COUNT(*) as count
        FROM meal_logs ml
        WHERE ml.user_id = ?
        AND ml.consumed_at >= ? AND ml.consumed_at < ?
        AND ml.status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM meal_plan_slots mps
            WHERE mps.user_id = ml.user_id
            AND mps.recipe_id = ml.recipe_id
            AND mps.planned_date >= ? AND mps.planned_date < ?
        )
    """, user_id, week_start, week_end, week_start, week_end).count
    
    return off_plan / total_consumed
```

**Interprétation** :
- `> 0.60` → explorateur (boost diversity dans feed)
- `< 0.20` → conservateur (boost recettes familières)

---

#### 4. Swap Frequency

**Définition** : Nombre de fois où l'utilisateur swap une recette suggérée.

**Logique de Calcul** :

```python
def compute_swap_frequency(user_id: str, week_start: date) -> float:
    """
    Mesure l'insatisfaction avec suggestions initiales.
    
    Swap fréquent → système ne comprend pas bien l'utilisateur
    Swap rare → excellent matching
    """
    
    week_end = week_start + timedelta(days=7)
    
    swaps = db.query("""
        SELECT COUNT(*) as swap_count
        FROM meal_plan_swaps
        WHERE user_id = ?
        AND swapped_at >= ? AND swapped_at < ?
    """, user_id, week_start, week_end).swap_count
    
    suggestions = db.query("""
        SELECT COUNT(*) as total
        FROM meal_plan_slots
        WHERE user_id = ?
        AND planned_date >= ? AND planned_date < ?
    """, user_id, week_start, week_end).total
    
    if suggestions > 0:
        return swaps / suggestions
    else:
        return None
```

**Interprétation** :
- `> 0.30` → 🚨 système ne match pas bien
- `< 0.10` → ✅ excellent matching

**Action** :
- Swap élevé → revoir user_vector, améliorer similarité

---

#### 5. Cooking Complexity Tolerance

**Définition** : Moyenne de difficulté des recettes choisies.

**Logique de Calcul** :

```python
def compute_cooking_complexity_tolerance(user_id: str, week_start: date) -> float:
    """
    Mesure le niveau de complexité que l'utilisateur accepte.
    
    Chaque recette a une complexity_score (1-5)
    - 1 = très simple (salade, bowl)
    - 5 = très complexe (sauce mijotée, cuisson longue)
    """
    
    week_end = week_start + timedelta(days=7)
    
    avg_complexity = db.query("""
        SELECT AVG(r.complexity_score) as avg
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE ml.user_id = ?
        AND ml.consumed_at >= ? AND ml.consumed_at < ?
        AND ml.status = 'completed'
    """, user_id, week_start, week_end).avg
    
    return avg_complexity if avg_complexity else 2.5  # Défaut moyen
```

**Impact** :
- User vector dimension `complexity_tolerance`
- Recettes complexes évitées si tolerance < 2.0

---

### Table Agrégée

```sql
CREATE TABLE user_behavior_metrics (
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    
    -- Logging
    days_logged INT,
    meals_logged INT,
    meal_logging_consistency FLOAT,  -- 0-1
    
    -- Adherence
    plan_suggestions INT,
    plan_consumed INT,
    plan_adherence_score FLOAT,      -- 0-1
    
    -- Exploration
    off_plan_recipes INT,
    exploration_rate FLOAT,           -- 0-1
    
    -- Interaction
    swaps_count INT,
    swap_frequency FLOAT,             -- swaps / suggestions
    
    -- Preferences
    avg_recipe_complexity FLOAT,      -- 1-5
    
    -- Metadata
    last_computed_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (user_id, week_start)
);
```

---

## 📈 Weekly Momentum Score

### Objectif

Créer un **score motivationnel** qui :
- Montre progression (ou régression) à l'utilisateur
- Prédit churn 1-2 semaines à l'avance
- Adapte coaching AI agent (encouragement vs alerte)

### Métriques Calculées

#### 1. Consistency Streak

**Définition** : Nombre de jours consécutifs avec plan suivi.

**Logique de Calcul** :

```python
def compute_consistency_streak(user_id: str, as_of_date: date) -> int:
    """
    Combien de jours consécutifs l'utilisateur a suivi son plan.
    
    Réinitialise à 0 dès qu'un jour est "manqué"
    """
    
    # Démarrer d'aujourd'hui et remonter
    current_date = as_of_date
    streak = 0
    
    while True:
        # Ce jour était-il "réussi" ?
        success = db.query("""
            SELECT COUNT(*) as meals
            FROM meal_logs ml
            JOIN meal_plan_slots mps ON mps.recipe_id = ml.recipe_id
            WHERE ml.user_id = ?
            AND DATE(ml.consumed_at) = ?
            AND mps.planned_date = ?
            AND ml.status = 'completed'
        """, user_id, current_date, current_date).meals
        
        if success >= 2:  # Au moins 2 repas du plan
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break  # Streak cassé
        
        if streak > 90:  # Cap pratique
            break
    
    return streak
```

**Interprétation** :
- `streak >= 7` → 🔥 "Vous êtes en feu !"
- `streak = 0` → 😟 "Recommençons ensemble"

---

#### 2. Improvement Velocity

**Définition** : Variation d'adherence semaine N vs semaine N-1.

**Logique de Calcul** :

```python
def compute_improvement_velocity(user_id: str, current_week: date) -> float:
    """
    Mesure si l'utilisateur s'améliore ou régresse.
    
    Positif = amélioration
    Négatif = régression
    """
    
    # Adherence semaine courante
    current_adherence = get_plan_adherence_score(user_id, current_week)
    
    # Adherence semaine précédente
    previous_week = current_week - timedelta(days=7)
    previous_adherence = get_plan_adherence_score(user_id, previous_week)
    
    if current_adherence is not None and previous_adherence is not None:
        return current_adherence - previous_adherence
    else:
        return 0.0  # Pas de changement mesurable
```

**Interprétation** :
- `> +0.10` → 📈 "Progression impressionnante"
- `-0.10 to +0.10` → ➡️ "Stable"
- `< -0.10` → 📉 "Attention, baisse d'adherence"

---

#### 3. Goal Proximity

**Définition** : Distance à l'objectif (% restant).

**Logique de Calcul** :

```python
def compute_goal_proximity(user_id: str) -> float:
    """
    % de progression vers objectif.
    
    Exemple: perte de poids
    - Objectif: -10kg
    - Actuel: -6kg
    - Proximity: 60% (il reste 40%)
    """
    
    user = db.query("""
        SELECT 
            initial_weight_kg,
            target_weight_kg,
            current_weight_kg
        FROM users
        WHERE user_id = ?
    """, user_id)
    
    if user.target_weight_kg:
        total_to_lose = user.initial_weight_kg - user.target_weight_kg
        already_lost = user.initial_weight_kg - user.current_weight_kg
        
        if total_to_lose > 0:
            proximity = already_lost / total_to_lose
            return max(0.0, min(1.0, proximity))  # Clamp 0-1
    
    return 0.5  # Défaut si pas d'objectif poids
```

**Interprétation** :
- `> 0.80` → 🎯 "Presque arrivé !"
- `< 0.20` → "Début du voyage"

---

#### 4. Engagement Trend

**Définition** : Tendance globale engagement (-1, 0, +1).

**Logique de Calcul** :

```python
def compute_engagement_trend(user_id: str, current_week: date) -> int:
    """
    Classification simple de la tendance.
    
    Returns:
        +1: progression
         0: stable
        -1: régression
    """
    
    velocity = compute_improvement_velocity(user_id, current_week)
    consistency = compute_meal_logging_consistency(user_id, current_week)
    
    # Logique de décision
    if velocity > 0.10 and consistency > 0.70:
        return +1  # Clairement en progression
    elif velocity < -0.10 or consistency < 0.30:
        return -1  # Clairement en régression
    else:
        return 0   # Stable
```

---

### Score Composite

```python
def compute_weekly_momentum_score(user_id: str, week_start: date) -> dict:
    """
    Agrège toutes les métriques momentum en un seul objet.
    
    Utilisé pour:
    - Affichage app (motivation)
    - Prédiction churn
    - Adaptation AI coaching
    """
    
    streak = compute_consistency_streak(user_id, week_start + timedelta(days=6))
    velocity = compute_improvement_velocity(user_id, week_start)
    proximity = compute_goal_proximity(user_id)
    trend = compute_engagement_trend(user_id, week_start)
    
    # Score global 0-100
    momentum_score = (
        min(streak * 5, 30) +           # Max 30 points (streak cap 6 jours)
        (velocity + 0.2) * 50 +          # -0.2 to +0.2 → 0 to 20 points
        proximity * 30 +                 # Max 30 points
        (trend + 1) * 10                 # -1,0,+1 → 0,10,20 points
    )
    
    return {
        'momentum_score': max(0, min(100, momentum_score)),
        'consistency_streak': streak,
        'improvement_velocity': velocity,
        'goal_proximity': proximity,
        'engagement_trend': trend,
        'trend_label': {-1: 'declining', 0: 'stable', 1: 'improving'}[trend]
    }
```

---

## 🔢 Normalisation Per-Meal

### Principe Fondamental

**Toutes les métriques outcome doivent être normalisées "par repas"** pour :
- Comparer équitablement recettes populaires vs niches
- Éviter biais volumétrie
- Permettre apprentissage même avec peu de data

### Exemples Comparatifs

#### Sans Normalisation (MAUVAIS)

```
Recette A: 1000 consommations, 800 complétées
Recette B: 50 consommations, 45 complétées

Score brut:
- Recette A: 800 complétées (semble meilleure)
- Recette B: 45 complétées
```

→ Biais évident vers recettes populaires

#### Avec Normalisation Per-Meal (BON)

```
Recette A: adherence_rate = 800/1000 = 0.80
Recette B: adherence_rate = 45/50 = 0.90

→ Recette B est objectivement meilleure !
```

### Application Systématique

Toutes les métriques suivent ce pattern :

```python
metric = sum(individual_outcomes) / number_of_meals
```

Exemples :
- `weight_loss_per_meal = total_Δweight / consumptions`
- `adherence_rate = completed / (completed + abandoned)`
- `repeat_rate = users_who_repeated / total_users`

---

## 🧬 Impact sur Vectorisation

### Comment Metrics → Vectors

Les métriques outcome nourrissent **directement les vecteurs** :

#### Recipe Vector Enrichment

```python
def enrich_recipe_vector_with_outcomes(recipe_id: str) -> np.array:
    """
    Ajoute dimensions outcome au recipe vector
    
    Recipe vector base (30D):
    - Macros (10D): protein, carbs, fats, fiber, etc.
    - Tags (10D): cuisine, difficulty, time, cost
    - Metadata (10D): creator, popularity, etc.
    
    Outcome dimensions (20D):
    - weight_loss_per_meal (scaled)
    - adherence_rate (0-1)
    - repeat_rate (0-1)
    - drop_off_rate (inverted: 1 - rate)
    - satisfaction_score (0-1)
    - portion_stability (deviation from 1.0)
    - ... autres signals
    
    Total: 50D
    """
    
    # Base vector (macros + metadata)
    base_vector = get_recipe_base_vector(recipe_id)  # 30D
    
    # Outcome metrics
    metrics = get_recipe_performance_metrics(recipe_id)
    
    outcome_vector = np.array([
        metrics.weight_loss_per_meal or 0.0,
        metrics.adherence_rate or 0.75,       # Défaut neutre
        metrics.repeat_rate or 0.30,
        1.0 - (metrics.drop_off_rate or 0.10),  # Inverser = "retention"
        metrics.satisfaction_score or 0.70,
        # ... autres outcomes
    ])
    
    # Concaténation
    full_vector = np.concatenate([base_vector, outcome_vector])
    
    return full_vector  # 50D
```

#### User Vector Adjustment

```python
def update_user_vector_with_behavior(user_id: str) -> np.array:
    """
    Met à jour user vector selon comportement observé
    
    User vector (50D):
    - Goals (10D): weight_loss, muscle_gain, etc.
    - Preferences (15D): cuisine, ingredients, etc.
    - Behavior (15D): consistency, exploration, complexity_tolerance
    - Outcomes (10D): actual_weight_trend, adherence_history
    """
    
    # Base preferences
    base_vector = get_user_preferences_vector(user_id)  # 25D
    
    # Behavior patterns (dernières 4 semaines)
    behavior = get_user_behavior_metrics(user_id, weeks=4)
    
    behavior_vector = np.array([
        np.mean([b.meal_logging_consistency for b in behavior]),
        np.mean([b.plan_adherence_score for b in behavior]),
        np.mean([b.exploration_rate for b in behavior]),
        np.mean([b.swap_frequency for b in behavior]),
        behavior[-1].avg_recipe_complexity,  # Most recent
        # ... autres patterns
    ])
    
    # Outcomes réels
    outcomes = get_user_outcomes(user_id)
    outcome_vector = np.array([
        outcomes.weight_velocity,     # kg/semaine
        outcomes.consistency_trend,
        # ...
    ])
    
    full_vector = np.concatenate([base_vector, behavior_vector, outcome_vector])
    
    return full_vector  # 50D
```

### Cosine Similarity Devient Outcome-Aware

```python
def recommend_recipes_outcome_driven(user_id: str, limit: int = 10):
    """
    Recommandation utilisant vectors enrichis avec outcomes
    """
    
    user_vector = update_user_vector_with_behavior(user_id)
    
    # Tous les recipe vectors (avec outcomes)
    recipe_vectors = [
        enrich_recipe_vector_with_outcomes(r.recipe_id)
        for r in get_all_recipes()
    ]
    
    # Cosine similarity
    scores = cosine_similarity(user_vector, recipe_vectors)
    
    # Le matching capture maintenant :
    # - Préférences (macros, tags)
    # - ET outcomes réels (adherence, weight_loss, satisfaction)
    
    top_indices = np.argsort(scores)[-limit:][::-1]
    
    return [recipes[i] for i in top_indices]
```

**Résultat** :
- Recettes avec bons outcomes = boostées naturellement
- Recettes problématiques = descendues automatiquement
- **Pas de règles manuelles** - l'algèbre linéaire fait le travail

---

## 🏗️ Architecture Technique

### Batch Jobs (Cron)

```python
# ==========================================
# NIGHTLY JOB (3h du matin)
# ==========================================

def nightly_analytics_pipeline():
    """
    Exécuté chaque nuit:
    1. Recipe performance metrics (jour précédent)
    2. User vectors update (utilisateurs actifs)
    """
    
    yesterday = date.today() - timedelta(days=1)
    
    print(f"[ANALYTICS] Computing recipe metrics for {yesterday}")
    
    # Recettes ayant eu au moins 1 consommation hier
    active_recipes = db.query("""
        SELECT DISTINCT recipe_id
        FROM meal_logs
        WHERE DATE(consumed_at) = ?
    """, yesterday)
    
    for recipe_id in active_recipes:
        compute_and_store_recipe_metrics(recipe_id, yesterday)
    
    print(f"[ANALYTICS] Updated {len(active_recipes)} recipe metrics")
    
    # Update user vectors (actifs derniers 7j)
    active_users = db.query("""
        SELECT DISTINCT user_id
        FROM meal_logs
        WHERE consumed_at > NOW() - INTERVAL '7 days'
    """)
    
    for user_id in active_users:
        update_user_vector_with_behavior(user_id)
    
    print(f"[ANALYTICS] Updated {len(active_users)} user vectors")


# ==========================================
# WEEKLY JOB (Dimanche 23h)
# ==========================================

def weekly_analytics_pipeline():
    """
    Exécuté chaque dimanche:
    1. User behavior metrics (semaine écoulée)
    2. Weekly momentum scores
    """
    
    last_week_start = get_last_sunday()
    
    print(f"[ANALYTICS] Computing weekly metrics for week {last_week_start}")
    
    active_users = db.query("""
        SELECT DISTINCT user_id
        FROM meal_logs
        WHERE consumed_at >= ? AND consumed_at < ?
    """, last_week_start, last_week_start + timedelta(days=7))
    
    for user_id in active_users:
        # Behavior patterns
        behavior = compute_user_behavior_metrics(user_id, last_week_start)
        store_user_behavior_metrics(behavior)
        
        # Momentum score
        momentum = compute_weekly_momentum_score(user_id, last_week_start)
        store_weekly_momentum(momentum)
    
    print(f"[ANALYTICS] Computed weekly metrics for {len(active_users)} users")
```

### Python Functions API

```python
# analytics.py

from fastapi import FastAPI
from datetime import date, timedelta

app = FastAPI()


@app.post("/analytics/recipe_performance")
def compute_recipe_performance_endpoint(recipe_id: str, target_date: date = None):
    """
    Endpoint pour calcul à la demande (debug, backfill)
    """
    if target_date is None:
        target_date = date.today() - timedelta(days=1)
    
    metrics = compute_recipe_performance_metrics(recipe_id, target_date)
    store_recipe_performance_metrics(metrics)
    
    return metrics


@app.post("/analytics/user_behavior")
def compute_user_behavior_endpoint(user_id: str, week_start: date = None):
    """
    Endpoint pour calcul comportement utilisateur
    """
    if week_start is None:
        week_start = get_last_sunday()
    
    behavior = compute_user_behavior_metrics(user_id, week_start)
    store_user_behavior_metrics(behavior)
    
    return behavior


@app.get("/analytics/momentum/{user_id}")
def get_momentum_score(user_id: str):
    """
    Récupère le momentum score actuel
    Utilisé par app pour affichage
    """
    current_week = get_current_week_start()
    momentum = compute_weekly_momentum_score(user_id, current_week)
    
    return momentum
```

---

## 🎯 Utilisation dans Recommandations

### Flow Complet

```
User ouvre app
    ↓
Edge Function: GET /meal_plan
    ↓
Python Service: meal_plan(user_id, days=7)
    ↓
1. get_user_vector_with_behavior(user_id)
   ├─ Base preferences
   ├─ Recent behavior metrics
   └─ Outcome trends
    ↓
2. get_all_recipe_vectors_with_outcomes()
   ├─ Macros + tags
   └─ Performance metrics (adherence, weight_loss, etc.)
    ↓
3. cosine_similarity(user_vector, recipe_vectors)
    ↓
4. Ranking by similarity score
    ↓
5. Apply filters (diversity, freshness, drop_off < 0.15)
    ↓
6. Generate 7-day plan
    ↓
Return to app
```

**Clé** : Les outcomes sont **invisibles pour l'utilisateur** mais pilotent tout le système.

---

## 📚 Résumé

### Ce que mesure AKELI (vs apps classiques)

| Apps Classiques | AKELI V1 |
|----------------|----------|
| Calories loggées | Weight loss per meal |
| Nombre de repas | Adherence rate |
| Rien | Repeat rate |
| Rien | Drop-off rate |
| Ratings (parfois) | Satisfaction composite |
| Rien | Consistency streak |
| Rien | Plan adherence vs exploration |
| Rien | Momentum score |

### Hiérarchie des Métriques

```
TIER 1 (V1 Septembre 2025)
├─ Recipe Performance Metrics
│  ├─ weight_loss_per_meal
│  ├─ adherence_rate
│  ├─ repeat_rate
│  ├─ drop_off_rate
│  ├─ satisfaction_score
│  └─ portion_adjustment_avg
│
├─ User Behavior Patterns
│  ├─ meal_logging_consistency
│  ├─ plan_adherence_score
│  ├─ exploration_rate
│  ├─ swap_frequency
│  └─ cooking_complexity_tolerance
│
└─ Weekly Momentum Score
   ├─ consistency_streak
   ├─ improvement_velocity
   ├─ goal_proximity
   └─ engagement_trend
```

---

## ✅ Validation Implémentation

Checklist avant déploiement :

- [ ] Tables SQL créées avec indexes
- [ ] Python functions testées unitairement
- [ ] Batch jobs configurés (cron)
- [ ] Seuils minimums validés (N samples)
- [ ] Normalisation per-meal vérifiée
- [ ] Integration avec vectorisation testée
- [ ] API endpoints documentés
- [ ] Monitoring & alertes configurées

---

**FIN DU DOCUMENT**
