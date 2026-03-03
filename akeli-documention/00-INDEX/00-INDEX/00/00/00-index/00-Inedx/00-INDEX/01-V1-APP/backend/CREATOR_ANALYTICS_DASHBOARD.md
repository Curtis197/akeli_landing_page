# 💰 Creator Analytics Dashboard - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Économique Fondamental

**AKELI n'est pas juste une app nutrition - c'est une économie créateur outcome-driven.**

Le creator dashboard est le **tableau de bord central** pour :
- **Transparence totale** sur revenus et performance
- **Feedback actionnable** pour optimiser recettes
- **Motivation économique** alignée avec résultats utilisateurs
- **Professionnalisation** des créateurs culinaires

### Différenciateur vs Autres Plateformes

| Autres Plateformes | AKELI |
|-------------------|-------|
| Payé par vues/likes | Payé par consommations réelles |
| Métriques vanité | Métriques outcome |
| Pas de feedback loop | Intelligence actionable |
| Revenue opaque | Transparence totale |
| Contenus = produit | Comportement = produit |

**Résultat** : Les créateurs deviennent des **nutrition engineers**, pas juste des influenceurs.

---

## 📋 Table des Matières

1. [Modèle Économique](#modèle-économique)
2. [Métriques Dashboard](#métriques-dashboard)
3. [Calcul Revenue](#calcul-revenue)
4. [Portfolio Analysis](#portfolio-analysis)
5. [Audience Intelligence](#audience-intelligence)
6. [Feedback Loop](#feedback-loop)
7. [Architecture Technique](#architecture-technique)

---

## 💶 Modèle Économique

### Payout Structure

#### Prix Utilisateur → Distribution

```
Utilisateur paie: 10€/mois
├─ App Store (30%): 3€
├─ Créateurs (30%): 3€
├─ Referral (10%): 1€
├─ Taxes (10%): 1€
└─ Platform (20%): 2€
```

#### Portion Créateurs : 3€/utilisateur/mois

**Consommation utilisateur** :
- 3 repas/jour × 30 jours = **90 repas/mois**

**Payout par repas consommé** :
```
3€ / 90 repas = 0.033€ par repas
```

### Exemple Concret

**Créateur avec 1 recette performante** :

```
300 utilisateurs consomment cette recette 1×/semaine
= 300 users × 4 semaines × 1 repas
= 1,200 consommations/mois

Revenue créateur:
1,200 × 0.033€ = 39.60€/mois
```

**Créateur avec 5 recettes performantes** :

```
Recette A: 300 users × 4 fois/mois = 1,200 × 0.033€ = 39.60€
Recette B: 200 users × 4 fois/mois =   800 × 0.033€ = 26.40€
Recette C: 150 users × 2 fois/mois =   300 × 0.033€ =  9.90€
Recette D: 100 users × 3 fois/mois =   300 × 0.033€ =  9.90€
Recette E:  50 users × 2 fois/mois =   100 × 0.033€ =  3.30€

Total: 89.10€/mois
```

### Scaling Projections

**Plateforme avec 1M utilisateurs** :

```
Recette "hit" (consommée par 1% users, 2×/mois):
= 10,000 users × 8 consommations/mois
= 80,000 × 0.033€
= 2,640€/mois pour cette recette

Créateur top (10 recettes performantes):
= 10 × 1,000€ moyenne
= 10,000€/mois
```

**C'est un revenu à temps plein en Europe.**

---

## 📊 Métriques Dashboard

### 1. Revenue Metrics

#### Total Revenue (Monthly)

**Définition** : Somme de tous les payouts pour le mois.

**Logique de Calcul** :

```python
def compute_creator_total_revenue(creator_id: str, month: date) -> Decimal:
    """
    Calcule le revenu total du créateur pour un mois donné.
    
    Agrège toutes les consommations de toutes ses recettes.
    """
    
    month_start = month.replace(day=1)
    month_end = (month_start + timedelta(days=32)).replace(day=1)
    
    # Toutes les consommations de recettes du créateur
    consumptions = db.query("""
        SELECT COUNT(*) as total_consumptions
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start, month_end)
    
    payout_per_meal = Decimal('0.033')  # €0.033 par repas
    
    return consumptions.total_consumptions * payout_per_meal
```

**Affichage Dashboard** :
```
┌─────────────────────────────┐
│ Revenue Février 2026        │
│ 127.50€                     │
│ +23% vs Janvier             │
└─────────────────────────────┘
```

---

#### Average Meal Value (AMV)

**Définition** : Revenue moyen généré par consommation d'une recette.

**Logique de Calcul** :

```python
def compute_avg_meal_value(creator_id: str, month: date) -> Decimal:
    """
    Mesure la "valeur moyenne" d'un repas du créateur.
    
    Note: Toujours 0.033€ dans modèle actuel, mais utile si:
    - Future: payout variable selon performance
    - Future: recettes "premium" avec payout supérieur
    """
    
    total_revenue = compute_creator_total_revenue(creator_id, month)
    
    consumptions = db.query("""
        SELECT COUNT(*) as total
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start(month), month_end(month))
    
    if consumptions.total > 0:
        return total_revenue / consumptions.total
    else:
        return Decimal('0.00')
```

**Affichage** :
```
┌─────────────────────────────┐
│ Valeur Moyenne par Repas    │
│ 0.033€                      │
└─────────────────────────────┘
```

---

#### Revenue Growth Rate

**Définition** : Variation % de revenue mois N vs mois N-1.

**Logique de Calcul** :

```python
def compute_revenue_growth_rate(creator_id: str, current_month: date) -> float:
    """
    Mesure la croissance économique du créateur.
    
    Positif = croissance
    Négatif = déclin
    """
    
    current_revenue = compute_creator_total_revenue(creator_id, current_month)
    
    previous_month = (current_month.replace(day=1) - timedelta(days=1)).replace(day=1)
    previous_revenue = compute_creator_total_revenue(creator_id, previous_month)
    
    if previous_revenue > 0:
        growth = (current_revenue - previous_revenue) / previous_revenue
        return float(growth)
    elif current_revenue > 0:
        return 1.0  # 100% growth (démarrage)
    else:
        return 0.0
```

**Interprétation** :
- `> +0.20` → 🚀 Croissance forte
- `0.00 to +0.20` → 📈 Croissance modérée
- `< 0.00` → 📉 Déclin (investigation nécessaire)

---

### 2. Portfolio Metrics

#### Active Recipes Count

**Définition** : Nombre de recettes avec >10 consommations dans le mois.

**Logique de Calcul** :

```python
def compute_active_recipes_count(creator_id: str, month: date) -> int:
    """
    Compte les recettes "vivantes" du créateur.
    
    Seuil 10 consommations/mois = minimum pour être "active"
    """
    
    active = db.query("""
        SELECT COUNT(DISTINCT r.recipe_id) as count
        FROM recipes r
        WHERE r.creator_id = ?
        AND EXISTS (
            SELECT 1 FROM meal_logs ml
            WHERE ml.recipe_id = r.recipe_id
            AND ml.status = 'completed'
            AND ml.consumed_at >= ?
            AND ml.consumed_at < ?
            GROUP BY ml.recipe_id
            HAVING COUNT(*) >= 10
        )
    """, creator_id, month_start(month), month_end(month))
    
    return active.count
```

**Affichage** :
```
┌─────────────────────────────┐
│ Recettes Actives            │
│ 7 sur 12 total              │
└─────────────────────────────┘
```

---

#### Portfolio Performance Distribution

**Définition** : Répartition revenue entre recettes (top performers vs long tail).

**Logique de Calcul** :

```python
def compute_portfolio_distribution(creator_id: str, month: date) -> dict:
    """
    Analyse la distribution de performance.
    
    Identifie:
    - Top 20% recettes (80% revenue ?) → Principe Pareto
    - Recettes stagnantes
    - Recettes en déclin
    """
    
    recipe_revenues = db.query("""
        SELECT 
            r.recipe_id,
            r.title,
            COUNT(*) as consumptions,
            COUNT(*) * 0.033 as revenue
        FROM recipes r
        LEFT JOIN meal_logs ml ON ml.recipe_id = r.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
        GROUP BY r.recipe_id, r.title
        ORDER BY revenue DESC
    """, creator_id, month_start(month), month_end(month))
    
    total_revenue = sum([r.revenue for r in recipe_revenues])
    
    # Top 20%
    top_20_count = max(1, int(len(recipe_revenues) * 0.2))
    top_20_revenue = sum([r.revenue for r in recipe_revenues[:top_20_count]])
    
    # Pareto ratio
    pareto_ratio = top_20_revenue / total_revenue if total_revenue > 0 else 0
    
    return {
        'total_recipes': len(recipe_revenues),
        'top_20_percent_count': top_20_count,
        'top_20_percent_revenue': float(top_20_revenue),
        'pareto_ratio': float(pareto_ratio),  # Idéalement ~0.80
        'recipe_breakdown': [
            {
                'recipe_id': r.recipe_id,
                'title': r.title,
                'consumptions': r.consumptions,
                'revenue': float(r.revenue),
                'revenue_share': float(r.revenue / total_revenue) if total_revenue > 0 else 0
            }
            for r in recipe_revenues
        ]
    }
```

**Affichage** :
```
┌───────────────────────────────────────┐
│ Portfolio Distribution                │
│                                       │
│ Top 3 recettes (25% portfolio):      │
│ → 78% du revenue total                │
│                                       │
│ 1. Thiéboudienne      45.30€  (35%)  │
│ 2. Mafé poulet        32.70€  (26%)  │
│ 3. Garba              21.20€  (17%)  │
│                                       │
│ Autres 9 recettes     28.30€  (22%)  │
└───────────────────────────────────────┘
```

**Insight** : Si pareto_ratio > 0.90 → portfolio déséquilibré, besoin diversification.

---

#### Best Performing Recipe

**Définition** : Recette #1 du créateur (combinaison revenue + performance).

**Logique de Calcul** :

```python
def get_best_performing_recipe(creator_id: str, month: date) -> dict:
    """
    Identifie la recette "star" du créateur.
    
    Critères combinés:
    - Revenue absolu (70%)
    - Adherence rate (15%)
    - Repeat rate (15%)
    """
    
    recipes = db.query("""
        SELECT 
            r.recipe_id,
            r.title,
            COUNT(*) as consumptions,
            COUNT(*) * 0.033 as revenue
        FROM recipes r
        LEFT JOIN meal_logs ml ON ml.recipe_id = r.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
        GROUP BY r.recipe_id, r.title
    """, creator_id, month_start(month), month_end(month))
    
    best_recipe = None
    best_score = 0
    
    for recipe in recipes:
        # Récupérer métriques performance
        metrics = get_recipe_performance_metrics(recipe.recipe_id)
        
        # Score composite
        score = (
            (recipe.revenue / 100.0) * 0.70 +  # Revenue normalisé
            (metrics.adherence_rate or 0.75) * 0.15 +
            (metrics.repeat_rate or 0.30) * 0.15
        )
        
        if score > best_score:
            best_score = score
            best_recipe = {
                'recipe_id': recipe.recipe_id,
                'title': recipe.title,
                'revenue': float(recipe.revenue),
                'consumptions': recipe.consumptions,
                'adherence_rate': metrics.adherence_rate,
                'repeat_rate': metrics.repeat_rate,
                'composite_score': score
            }
    
    return best_recipe
```

---

### 3. Audience Metrics

#### Unique Users Reached

**Définition** : Nombre d'utilisateurs uniques ayant consommé ≥1 recette du créateur.

**Logique de Calcul** :

```python
def compute_unique_users_reached(creator_id: str, month: date) -> int:
    """
    Mesure la portée (reach) du créateur.
    """
    
    unique_users = db.query("""
        SELECT COUNT(DISTINCT ml.user_id) as count
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start(month), month_end(month))
    
    return unique_users.count
```

**Affichage** :
```
┌─────────────────────────────┐
│ Portée Utilisateurs         │
│ 342 personnes touchées      │
│ +15% vs mois dernier        │
└─────────────────────────────┘
```

---

#### New Users vs Returning

**Définition** : Breakdown utilisateurs nouveaux vs fidèles.

**Logique de Calcul** :

```python
def compute_user_acquisition_retention(creator_id: str, month: date) -> dict:
    """
    Analyse l'acquisition vs retention.
    
    New user = première consommation recette créateur ce mois
    Returning = avait déjà consommé recette créateur avant
    """
    
    current_users = db.query("""
        SELECT DISTINCT ml.user_id
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start(month), month_end(month))
    
    new_users = []
    returning_users = []
    
    for user_id in [u.user_id for u in current_users]:
        # Avait-il déjà consommé créateur avant ce mois ?
        previous_consumption = db.query("""
            SELECT COUNT(*) as count
            FROM meal_logs ml
            JOIN recipes r ON r.recipe_id = ml.recipe_id
            WHERE r.creator_id = ?
            AND ml.user_id = ?
            AND ml.consumed_at < ?
        """, creator_id, user_id, month_start(month)).count
        
        if previous_consumption > 0:
            returning_users.append(user_id)
        else:
            new_users.append(user_id)
    
    return {
        'new_users': len(new_users),
        'returning_users': len(returning_users),
        'retention_rate': len(returning_users) / len(current_users) if len(current_users) > 0 else 0
    }
```

**Affichage** :
```
┌─────────────────────────────┐
│ Acquisition vs Retention    │
│                             │
│ Nouveaux:  78 (23%)         │
│ Fidèles:  264 (77%)         │
│                             │
│ Taux rétention: 77%         │
└─────────────────────────────┘
```

**Interprétation** :
- `retention_rate > 0.70` → ✅ Audience fidèle
- `retention_rate < 0.40` → ⚠️ Problème rétention

---

#### Audience Goal Distribution

**Définition** : Répartition de l'audience selon objectifs santé.

**Logique de Calcul** :

```python
def compute_audience_goal_distribution(creator_id: str, month: date) -> dict:
    """
    Identifie les segments d'audience du créateur.
    
    Permet au créateur de savoir:
    - Qui consomme mes recettes ?
    - Dois-je créer pour weight_loss ou muscle_gain ?
    """
    
    audience_goals = db.query("""
        SELECT 
            u.primary_goal,
            COUNT(DISTINCT ml.user_id) as user_count,
            SUM(CASE WHEN ml.status = 'completed' THEN 1 ELSE 0 END) as consumptions
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        JOIN users u ON u.user_id = ml.user_id
        WHERE r.creator_id = ?
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
        GROUP BY u.primary_goal
        ORDER BY user_count DESC
    """, creator_id, month_start(month), month_end(month))
    
    total_users = sum([g.user_count for g in audience_goals])
    
    return {
        'goal_breakdown': [
            {
                'goal': g.primary_goal,
                'user_count': g.user_count,
                'user_percentage': g.user_count / total_users if total_users > 0 else 0,
                'consumptions': g.consumptions,
                'avg_consumptions_per_user': g.consumptions / g.user_count if g.user_count > 0 else 0
            }
            for g in audience_goals
        ],
        'dominant_goal': audience_goals[0].primary_goal if audience_goals else None
    }
```

**Affichage** :
```
┌─────────────────────────────────────┐
│ Audience par Objectif               │
│                                     │
│ 🎯 Perte de poids:    58% (198u)   │
│ 💪 Muscle gain:       24%  (82u)   │
│ ⚖️  Maintenance:       18%  (62u)   │
└─────────────────────────────────────┘
```

**Action** : Si 80% audience = weight_loss → créateur devrait optimiser recettes pour cet objectif.

---

### 4. Growth Metrics

#### Consumption Growth Rate

**Définition** : Variation % de consommations mois N vs mois N-1.

**Logique de Calcul** :

```python
def compute_consumption_growth_rate(creator_id: str, current_month: date) -> float:
    """
    Mesure la croissance en volume (pas juste revenue).
    
    Important car:
    - Revenue = consumptions × payout fixe
    - Growth consumptions = growth potential
    """
    
    current_consumptions = db.query("""
        SELECT COUNT(*) as count
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start(current_month), month_end(current_month)).count
    
    previous_month = (current_month.replace(day=1) - timedelta(days=1)).replace(day=1)
    previous_consumptions = db.query("""
        SELECT COUNT(*) as count
        FROM meal_logs ml
        JOIN recipes r ON r.recipe_id = ml.recipe_id
        WHERE r.creator_id = ?
        AND ml.status = 'completed'
        AND ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, creator_id, month_start(previous_month), month_end(previous_month)).count
    
    if previous_consumptions > 0:
        return (current_consumptions - previous_consumptions) / previous_consumptions
    elif current_consumptions > 0:
        return 1.0
    else:
        return 0.0
```

---

#### Recipe Launch Success Rate

**Définition** : % de nouvelles recettes qui deviennent "actives" (>50 consommations dans 30j).

**Logique de Calcul** :

```python
def compute_recipe_launch_success_rate(creator_id: str, period_months: int = 3) -> float:
    """
    Mesure la capacité du créateur à lancer des recettes qui marchent.
    
    Success = recette atteint 50 consommations dans 30j après publication
    """
    
    cutoff_date = date.today() - timedelta(days=period_months * 30)
    
    new_recipes = db.query("""
        SELECT recipe_id, created_at
        FROM recipes
        WHERE creator_id = ?
        AND created_at >= ?
    """, creator_id, cutoff_date)
    
    successful_launches = 0
    
    for recipe in new_recipes:
        # Consommations dans 30j après création
        consumptions_30d = db.query("""
            SELECT COUNT(*) as count
            FROM meal_logs
            WHERE recipe_id = ?
            AND status = 'completed'
            AND consumed_at >= ?
            AND consumed_at < ?
        """, recipe.recipe_id, 
            recipe.created_at,
            recipe.created_at + timedelta(days=30)
        ).count
        
        if consumptions_30d >= 50:
            successful_launches += 1
    
    total_launches = len(new_recipes)
    
    if total_launches > 0:
        return successful_launches / total_launches
    else:
        return None
```

**Interprétation** :
- `> 0.60` → Créateur sait ce qui marche
- `< 0.30` → Besoin améliorer stratégie lancement

---

## 📈 Projections & Scaling

### Revenue Potential Calculator

```python
def calculate_revenue_potential(
    creator_id: str,
    scenario: dict
) -> dict:
    """
    Projections revenue basées sur scénarios.
    
    Scenarios:
    - Conservative: growth +10%/mois
    - Moderate: growth +25%/mois
    - Optimistic: growth +50%/mois
    - Platform scale: si plateforme atteint 100k, 500k, 1M users
    """
    
    current_month_revenue = compute_creator_total_revenue(creator_id, date.today())
    current_users_reached = compute_unique_users_reached(creator_id, date.today())
    
    projections = {}
    
    # Projection croissance organique (6 mois)
    for growth_rate, label in [(0.10, 'conservative'), (0.25, 'moderate'), (0.50, 'optimistic')]:
        revenue_6m = current_month_revenue
        for month in range(6):
            revenue_6m *= (1 + growth_rate)
        
        projections[f'{label}_6_months'] = float(revenue_6m)
    
    # Projection scaling plateforme
    platform_users = scenario.get('platform_users', 10000)  # Current
    creator_penetration = current_users_reached / platform_users if platform_users > 0 else 0.01
    
    for target_platform_size in [100000, 500000, 1000000]:
        projected_users = target_platform_size * creator_penetration
        projected_consumptions = projected_users * (current_month_consumptions / current_users_reached) if current_users_reached > 0 else 0
        projected_revenue = projected_consumptions * Decimal('0.033')
        
        projections[f'platform_{target_platform_size}_users'] = float(projected_revenue)
    
    return {
        'current_monthly_revenue': float(current_month_revenue),
        'current_users_reached': current_users_reached,
        'projections': projections
    }
```

**Affichage Dashboard** :
```
┌───────────────────────────────────────────┐
│ Projections Revenue                       │
│                                           │
│ Actuel:              89.10€/mois          │
│                                           │
│ Dans 6 mois:                              │
│ • Conservateur:     144€  (+10%/mois)    │
│ • Modéré:           341€  (+25%/mois)    │
│ • Optimiste:        759€  (+50%/mois)    │
│                                           │
│ Si plateforme scale:                      │
│ • 100k users:       890€/mois             │
│ • 500k users:     4,450€/mois             │
│ • 1M users:       8,900€/mois             │
└───────────────────────────────────────────┘
```

---

## 💡 Feedback Loop Créateurs

### Performance Insights (Automated)

```python
def generate_creator_insights(creator_id: str, month: date) -> list[dict]:
    """
    Génère des insights automatiques pour le créateur.
    
    Types d'insights:
    - Opportunités (recettes sous-exploitées)
    - Alertes (recettes en déclin)
    - Recommandations (niches à explorer)
    - Benchmarks (vs autres créateurs)
    """
    
    insights = []
    
    # === INSIGHT 1: Recettes sous-performantes ===
    recipes = get_creator_recipes_with_metrics(creator_id, month)
    
    for recipe in recipes:
        if recipe.adherence_rate and recipe.adherence_rate < 0.65:
            insights.append({
                'type': 'alert',
                'severity': 'medium',
                'recipe_id': recipe.recipe_id,
                'recipe_title': recipe.title,
                'message': f"Recette '{recipe.title}' a un taux d'adhérence de {recipe.adherence_rate:.0%} (< 65%). Considérer simplifier la préparation.",
                'metric': 'adherence_rate',
                'value': recipe.adherence_rate
            })
        
        if recipe.drop_off_rate and recipe.drop_off_rate > 0.15:
            insights.append({
                'type': 'alert',
                'severity': 'high',
                'recipe_id': recipe.recipe_id,
                'recipe_title': recipe.title,
                'message': f"Recette '{recipe.title}' cause {recipe.drop_off_rate:.0%} de drop-off. Recette peut décourager utilisateurs.",
                'metric': 'drop_off_rate',
                'value': recipe.drop_off_rate
            })
    
    # === INSIGHT 2: Opportunités audience ===
    audience_dist = compute_audience_goal_distribution(creator_id, month)
    
    if audience_dist['dominant_goal']:
        dominant_goal = audience_dist['dominant_goal']
        dominant_pct = max([g['user_percentage'] for g in audience_dist['goal_breakdown']])
        
        if dominant_pct > 0.60:
            insights.append({
                'type': 'opportunity',
                'message': f"{dominant_pct:.0%} de votre audience a pour objectif '{dominant_goal}'. Créer plus de recettes optimisées pour cet objectif pourrait augmenter engagement.",
                'suggested_action': 'create_targeted_recipes',
                'target_goal': dominant_goal
            })
    
    # === INSIGHT 3: Growth momentum ===
    growth_rate = compute_consumption_growth_rate(creator_id, month)
    
    if growth_rate > 0.30:
        insights.append({
            'type': 'success',
            'message': f"Excellente croissance de {growth_rate:.0%} ce mois ! Continuer sur cette lancée.",
            'metric': 'growth_rate',
            'value': growth_rate
        })
    elif growth_rate < -0.10:
        insights.append({
            'type': 'alert',
            'severity': 'high',
            'message': f"Baisse de {abs(growth_rate):.0%} des consommations ce mois. Analyser causes (nouvelles recettes ? concurrence ?).",
            'metric': 'growth_rate',
            'value': growth_rate
        })
    
    # === INSIGHT 4: Portfolio concentration ===
    portfolio = compute_portfolio_distribution(creator_id, month)
    
    if portfolio['pareto_ratio'] > 0.85:
        insights.append({
            'type': 'recommendation',
            'message': f"85% de votre revenue vient de vos top {portfolio['top_20_percent_count']} recettes. Diversifier portfolio pourrait réduire risque.",
            'suggested_action': 'diversify_portfolio'
        })
    
    return insights
```

**Affichage Email Mensuel** :
```
Bonjour [Créateur],

Voici votre rapport AKELI pour Février 2026:

💰 REVENUE: 127.50€ (+23% vs Janvier)
👥 PORTÉE: 342 utilisateurs

🎯 INSIGHTS CLÉS:

⚠️  Alerte: Recette "Sauce Gombo" a 58% adhérence (< 65%)
    → Conseil: Simplifier étapes préparation

✅  Succès: Croissance +35% ce mois - excellent !

💡 Opportunité: 64% de votre audience veut perdre du poids
    → Créer recettes "low-carb" pourrait booster engagement

📊 TOP 3 RECETTES:
1. Thiéboudienne: 45.30€
2. Mafé poulet: 32.70€
3. Garba: 21.20€

🚀 PROJECTIONS:
Si croissance continue → 341€/mois dans 6 mois
Si plateforme atteint 100k users → ~890€/mois

Continuez comme ça ! 🔥

---
L'équipe AKELI
```

---

## 🏗️ Architecture Technique

### Tables SQL

```sql
-- =============================================
-- TABLE: creator_performance_metrics
-- =============================================

CREATE TABLE creator_performance_metrics (
    creator_id UUID NOT NULL,
    month DATE NOT NULL,
    
    -- Revenue
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_consumptions INT NOT NULL DEFAULT 0,
    avg_meal_value DECIMAL(10,4) NOT NULL DEFAULT 0.033,
    
    -- Portfolio
    total_recipes_count INT,
    active_recipes_count INT,  -- >10 consumptions/month
    best_recipe_id UUID,
    best_recipe_revenue DECIMAL(10,2),
    portfolio_pareto_ratio FLOAT,  -- Top 20% → X% revenue
    
    -- Audience
    unique_users_reached INT,
    new_users INT,
    returning_users INT,
    retention_rate FLOAT,
    
    -- Goals distribution (JSON)
    audience_goal_distribution JSONB,
    
    -- Growth
    consumption_growth_rate FLOAT,
    revenue_growth_rate FLOAT,
    recipe_launch_success_rate FLOAT,
    
    -- Metadata
    last_computed_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (creator_id, month)
);

CREATE INDEX idx_creator_perf_month ON creator_performance_metrics(month DESC);
CREATE INDEX idx_creator_perf_revenue ON creator_performance_metrics(total_revenue DESC);


-- =============================================
-- TABLE: creator_insights
-- =============================================

CREATE TABLE creator_insights (
    insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    month DATE NOT NULL,
    
    insight_type VARCHAR(50),  -- alert, opportunity, success, recommendation
    severity VARCHAR(20),       -- low, medium, high
    
    recipe_id UUID,             -- Si insight lié à recette spécifique
    
    message TEXT NOT NULL,
    metric VARCHAR(50),
    metric_value FLOAT,
    
    suggested_action VARCHAR(100),
    action_metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (creator_id) REFERENCES creators(creator_id)
);

CREATE INDEX idx_insights_creator_month ON creator_insights(creator_id, month DESC);
```

---

### Python Functions API

```python
# creator_analytics.py

from fastapi import FastAPI
from datetime import date
from decimal import Decimal

app = FastAPI()


@app.get("/creator/{creator_id}/dashboard")
def get_creator_dashboard(creator_id: str, month: str = None):
    """
    Endpoint principal dashboard créateur.
    
    Returns: Toutes les métriques agrégées
    """
    
    target_month = date.fromisoformat(month) if month else date.today().replace(day=1)
    
    # Revenue metrics
    total_revenue = compute_creator_total_revenue(creator_id, target_month)
    avg_meal_value = compute_avg_meal_value(creator_id, target_month)
    revenue_growth = compute_revenue_growth_rate(creator_id, target_month)
    
    # Portfolio metrics
    active_recipes = compute_active_recipes_count(creator_id, target_month)
    portfolio_dist = compute_portfolio_distribution(creator_id, target_month)
    best_recipe = get_best_performing_recipe(creator_id, target_month)
    
    # Audience metrics
    unique_users = compute_unique_users_reached(creator_id, target_month)
    acq_retention = compute_user_acquisition_retention(creator_id, target_month)
    goal_dist = compute_audience_goal_distribution(creator_id, target_month)
    
    # Growth metrics
    consumption_growth = compute_consumption_growth_rate(creator_id, target_month)
    launch_success = compute_recipe_launch_success_rate(creator_id, period_months=3)
    
    # Projections
    projections = calculate_revenue_potential(creator_id, {'platform_users': 10000})
    
    # Insights
    insights = generate_creator_insights(creator_id, target_month)
    
    return {
        'creator_id': creator_id,
        'month': str(target_month),
        'revenue': {
            'total': float(total_revenue),
            'avg_meal_value': float(avg_meal_value),
            'growth_rate': revenue_growth
        },
        'portfolio': {
            'active_recipes_count': active_recipes,
            'distribution': portfolio_dist,
            'best_recipe': best_recipe
        },
        'audience': {
            'unique_users': unique_users,
            'new_users': acq_retention['new_users'],
            'returning_users': acq_retention['returning_users'],
            'retention_rate': acq_retention['retention_rate'],
            'goal_distribution': goal_dist
        },
        'growth': {
            'consumption_growth_rate': consumption_growth,
            'launch_success_rate': launch_success
        },
        'projections': projections,
        'insights': insights
    }


@app.get("/creator/{creator_id}/revenue/history")
def get_revenue_history(creator_id: str, months: int = 12):
    """
    Historique revenue sur N mois.
    """
    
    history = []
    current = date.today().replace(day=1)
    
    for i in range(months):
        month = (current - timedelta(days=i*30)).replace(day=1)
        revenue = compute_creator_total_revenue(creator_id, month)
        consumptions = get_month_consumptions(creator_id, month)
        
        history.append({
            'month': str(month),
            'revenue': float(revenue),
            'consumptions': consumptions
        })
    
    return {'history': list(reversed(history))}


@app.post("/creator/{creator_id}/insights/generate")
def generate_insights_endpoint(creator_id: str, month: str = None):
    """
    Force génération insights (normalement batch mensuel).
    """
    
    target_month = date.fromisoformat(month) if month else date.today().replace(day=1)
    insights = generate_creator_insights(creator_id, target_month)
    
    # Store in DB
    for insight in insights:
        store_creator_insight(creator_id, target_month, insight)
    
    return {'insights': insights}
```

---

### Batch Jobs (Cron)

```python
# ==========================================
# MONTHLY JOB (1er du mois, 4h du matin)
# ==========================================

def monthly_creator_analytics_pipeline():
    """
    Exécuté le 1er de chaque mois:
    1. Creator performance metrics (mois écoulé)
    2. Creator insights generation
    3. Email récapitulatif mensuel
    """
    
    last_month = (date.today().replace(day=1) - timedelta(days=1)).replace(day=1)
    
    print(f"[CREATOR ANALYTICS] Computing metrics for {last_month}")
    
    # Tous les créateurs ayant eu ≥1 consommation le mois dernier
    active_creators = db.query("""
        SELECT DISTINCT r.creator_id
        FROM recipes r
        JOIN meal_logs ml ON ml.recipe_id = r.recipe_id
        WHERE ml.consumed_at >= ?
        AND ml.consumed_at < ?
    """, month_start(last_month), month_end(last_month))
    
    for creator_id in active_creators:
        # Compute all metrics
        metrics = {
            'creator_id': creator_id,
            'month': last_month,
            'total_revenue': compute_creator_total_revenue(creator_id, last_month),
            'total_consumptions': get_month_consumptions(creator_id, last_month),
            'avg_meal_value': compute_avg_meal_value(creator_id, last_month),
            'active_recipes_count': compute_active_recipes_count(creator_id, last_month),
            'unique_users_reached': compute_unique_users_reached(creator_id, last_month),
            # ... autres métriques
        }
        
        # Store
        store_creator_performance_metrics(metrics)
        
        # Generate insights
        insights = generate_creator_insights(creator_id, last_month)
        for insight in insights:
            store_creator_insight(creator_id, last_month, insight)
        
        # Send email recap
        send_monthly_creator_email(creator_id, last_month, metrics, insights)
    
    print(f"[CREATOR ANALYTICS] Processed {len(active_creators)} creators")
```

---

## 📧 Email Templates

### Monthly Recap Email

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .metric-card {
            border: 1px solid #e0e0e0;
            padding: 16px;
            margin: 12px 0;
            border-radius: 8px;
        }
        .metric-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 4px;
        }
        .metric-value {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
        }
        .growth-positive { color: #16a34a; }
        .growth-negative { color: #dc2626; }
        
        .insight-alert { background: #fef3c7; border-left: 4px solid #f59e0b; }
        .insight-success { background: #d1fae5; border-left: 4px solid #10b981; }
        .insight-opportunity { background: #dbeafe; border-left: 4px solid #3b82f6; }
    </style>
</head>
<body>
    <h2>Bonjour {{ creator.name }},</h2>
    
    <p>Voici votre rapport AKELI pour <strong>{{ month }}</strong>:</p>
    
    <div class="metric-card">
        <div class="metric-title">💰 Revenue Total</div>
        <div class="metric-value">{{ metrics.total_revenue }}€</div>
        <div class="growth-positive">+{{ metrics.revenue_growth_rate }}% vs mois dernier</div>
    </div>
    
    <div class="metric-card">
        <div class="metric-title">👥 Portée Utilisateurs</div>
        <div class="metric-value">{{ metrics.unique_users }} personnes</div>
    </div>
    
    <h3>🎯 Insights Clés</h3>
    
    {% for insight in insights %}
    <div class="metric-card insight-{{ insight.type }}">
        <strong>{{ insight.type | title }}:</strong> {{ insight.message }}
    </div>
    {% endfor %}
    
    <h3>📊 Top 3 Recettes</h3>
    <ol>
    {% for recipe in top_recipes %}
        <li><strong>{{ recipe.title }}</strong>: {{ recipe.revenue }}€</li>
    {% endfor %}
    </ol>
    
    <h3>🚀 Projections</h3>
    <p>Si votre croissance continue:</p>
    <ul>
        <li>Dans 6 mois (modéré): <strong>{{ projections.moderate_6_months }}€/mois</strong></li>
        <li>Si plateforme atteint 100k users: <strong>{{ projections.platform_100k }}€/mois</strong></li>
    </ul>
    
    <p>Continuez comme ça ! 🔥</p>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
        L'équipe AKELI<br>
        <a href="https://akeli.app/creator/dashboard">Voir dashboard complet</a>
    </p>
</body>
</html>
```

---

## ✅ Checklist Implémentation

- [ ] Tables SQL créées
- [ ] Python functions testées
- [ ] Monthly batch job configuré
- [ ] Email templates validés
- [ ] Dashboard UI créé (frontend)
- [ ] API endpoints documentés
- [ ] Projections validées mathématiquement
- [ ] Insights generation testée avec données réelles
- [ ] RGPD compliance vérifiée (anonymisation)

---

**FIN DU DOCUMENT**
