# 🔧 Recipe Adjustment Engine - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Fondamental

**Les recettes AKELI ne sont pas statiques - elles sont des objets nutritionnels paramétriques.**

L'adjustment engine permet :
- **Adaptation temps réel** aux besoins utilisateur (+ activité, - gras, etc.)
- **Personnalisation automatique** selon profil et historique
- **Préservation équilibre** (calories constantes, macros cohérents)
- **Apprentissage continu** (quels ajustements fonctionnent ?)

### Différenciateur Critique

| Apps Classiques | AKELI |
|----------------|-------|
| Recettes figées | Recettes paramétriques |
| "Swap entire recipe" | "Reshape ingredients" |
| Pas d'adaptation | Adaptation automatique |
| User fait math | Système fait math |

**Résultat** : Une recette → des milliers de variations personnalisées.

---

## 📋 Table des Matières

1. [Types d'Ajustements](#types-dajustements)
2. [Logique Mathématique](#logique-mathématique)
3. [Implementation Flutter](#implementation-flutter)
4. [Contraintes Nutritionnelles](#contraintes-nutritionnelles)
5. [Database Schema](#database-schema)
6. [Use Cases](#use-cases)

---

## 🔀 Types d'Ajustements

### 1. Dynamic Adjustment (In-App, Temps Réel)

**Définition** : Utilisateur ajuste recette manuellement dans l'app.

**Triggers** :
- "Je vais faire plus de sport demain, augmente les glucides"
- "Je veux moins de gras ce soir"
- "Rends cette recette plus protéinée"
- Slider macros dans UI

**Où** : Flutter app (client-side)

**Stockage** : `adjusted_recipes` table

---

### 2. Static Adjustment (Pre-Calculated)

**Définition** : Variantes pré-calculées par système ou créateur.

**Exemples** :
- Version "low-carb" d'une recette
- Version "high-protein" 
- Version "budget" (ingrédients moins chers)
- Version "quick" (préparation simplifiée)

**Où** : Backend (Python batch)

**Stockage** : `recipe_variants` table

---

### 3. Automatic Adjustment (AI-Suggested)

**Définition** : Système suggère ajustements basés sur historique.

**Exemples** :
- "Users like you succeed with +15% protein in this recipe"
- "You tend to increase portions → we pre-adjusted"

**Où** : Python service (lors recommandation)

**Stockage** : Applied on-the-fly, optionally stored

---

## 🧮 Logique Mathématique

### Principe de Conservation

**RÈGLE ABSOLUE** : Total calories doit rester constant (±5%).

**Pourquoi** :
- Objectif calorique utilisateur ne change pas
- Évite confusion ("pourquoi cette recette a +200 kcal ?")
- Simplifie comparaison recettes

### Groupes d'Ingrédients

Chaque ingrédient appartient à un **macro groupe** :

```python
INGREDIENT_GROUPS = {
    'PROTEIN': ['chicken', 'fish', 'beef', 'eggs', 'tofu', 'legumes'],
    'CARBS': ['rice', 'pasta', 'bread', 'potato', 'quinoa', 'millet'],
    'FATS': ['oil', 'butter', 'nuts', 'avocado', 'cheese'],
    'VEGETABLES': ['tomato', 'onion', 'spinach', 'carrot', ...],
    'FIBER': ['oats', 'beans', 'lentils', ...]
}
```

**Calories par gramme** :
- Protein: 4 kcal/g
- Carbs: 4 kcal/g
- Fats: 9 kcal/g
- Vegetables: ~0.5 kcal/g (moyenne)
- Fiber: 2 kcal/g

---

### Algorithme Ajustement

```python
def adjust_recipe_macros(
    recipe: Recipe,
    adjustments: dict
) -> Recipe:
    """
    Ajuste une recette selon modifications macro souhaitées.
    
    Args:
        recipe: Recette originale
        adjustments: dict like {'carbs': +0.20, 'protein': -0.10}
            → +20% carbs, -10% protein
    
    Returns:
        Recipe ajustée avec calories constantes
    
    STEPS:
    1. Group ingredients by macro type
    2. Apply adjustment factors to each group
    3. Recalculate total calories
    4. Scale ALL ingredients to preserve original calories
    """
    
    # 1. CALCULATE ORIGINAL TOTALS
    original_calories = sum([ing.calories for ing in recipe.ingredients])
    
    # 2. GROUP INGREDIENTS
    grouped = {
        'protein': [],
        'carbs': [],
        'fats': [],
        'vegetables': [],
        'fiber': []
    }
    
    for ingredient in recipe.ingredients:
        group = get_ingredient_group(ingredient.name)
        grouped[group].append(ingredient)
    
    # 3. APPLY ADJUSTMENTS
    for group, factor in adjustments.items():
        if group in grouped:
            for ingredient in grouped[group]:
                # Multiply quantity by (1 + factor)
                ingredient.quantity_g *= (1.0 + factor)
                
                # Recalculate calories
                ingredient.calories = ingredient.quantity_g * ingredient.calories_per_g
    
    # 4. RECALCULATE TOTAL CALORIES
    new_total_calories = sum([ing.calories for ing in recipe.ingredients])
    
    # 5. SCALE TO PRESERVE ORIGINAL CALORIES
    scale_factor = original_calories / new_total_calories
    
    for ingredient in recipe.ingredients:
        ingredient.quantity_g *= scale_factor
        ingredient.calories *= scale_factor
    
    # 6. VALIDATION
    final_calories = sum([ing.calories for ing in recipe.ingredients])
    assert abs(final_calories - original_calories) < 5, "Calories drift too high"
    
    return recipe
```

---

### Exemple Concret

**Recette originale** : Poulet + Riz + Légumes (500 kcal)

```
Poulet (protein): 150g → 150 kcal
Riz (carbs): 80g → 320 kcal
Légumes: 100g → 30 kcal
Total: 500 kcal
```

**User demande** : "+20% protein, -15% carbs"

```python
adjustments = {
    'protein': +0.20,
    'carbs': -0.15
}
```

**Après ajustement (step 3)** :

```
Poulet: 150g × 1.20 = 180g → 180 kcal
Riz: 80g × 0.85 = 68g → 272 kcal
Légumes: 100g (unchanged) → 30 kcal
Total: 482 kcal ❌ (pas égal 500)
```

**Après scaling (step 5)** :

```
scale_factor = 500 / 482 = 1.037

Poulet: 180g × 1.037 = 186.7g → 186.7 kcal
Riz: 68g × 1.037 = 70.5g → 282 kcal
Légumes: 100g × 1.037 = 103.7g → 31.1 kcal
Total: 499.8 kcal ✅
```

**Résultat** :
- Protein ratio: ↑ (+24% vs original)
- Carbs ratio: ↓ (-12% vs original)
- Total calories: ~500 kcal (preserved)

---

## 📱 Implementation Flutter

### UI Component (Slider Macros)

```dart
// lib/widgets/recipe_adjustment_slider.dart

import 'package:flutter/material.dart';

class RecipeAdjustmentSlider extends StatefulWidget {
  final Recipe recipe;
  final Function(Recipe) onAdjusted;
  
  @override
  _RecipeAdjustmentSliderState createState() => _RecipeAdjustmentSliderState();
}

class _RecipeAdjustmentSliderState extends State<RecipeAdjustmentSlider> {
  double proteinAdjustment = 0.0;  // -0.30 to +0.30
  double carbsAdjustment = 0.0;
  double fatsAdjustment = 0.0;
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // PROTEIN SLIDER
        Text('Protéines: ${(proteinAdjustment * 100).toStringAsFixed(0)}%'),
        Slider(
          value: proteinAdjustment,
          min: -0.30,
          max: 0.30,
          divisions: 12,
          label: '${(proteinAdjustment * 100).toStringAsFixed(0)}%',
          onChanged: (value) {
            setState(() {
              proteinAdjustment = value;
            });
          },
        ),
        
        // CARBS SLIDER
        Text('Glucides: ${(carbsAdjustment * 100).toStringAsFixed(0)}%'),
        Slider(
          value: carbsAdjustment,
          min: -0.30,
          max: 0.30,
          divisions: 12,
          onChanged: (value) {
            setState(() {
              carbsAdjustment = value;
            });
          },
        ),
        
        // FATS SLIDER
        Text('Lipides: ${(fatsAdjustment * 100).toStringAsFixed(0)}%'),
        Slider(
          value: fatsAdjustment,
          min: -0.30,
          max: 0.30,
          divisions: 12,
          onChanged: (value) {
            setState(() {
              fatsAdjustment = value;
            });
          },
        ),
        
        SizedBox(height: 16),
        
        // APPLY BUTTON
        ElevatedButton(
          onPressed: _applyAdjustments,
          child: Text('Appliquer'),
        ),
      ],
    );
  }
  
  void _applyAdjustments() {
    final adjustedRecipe = adjustRecipeMacros(
      widget.recipe,
      {
        'protein': proteinAdjustment,
        'carbs': carbsAdjustment,
        'fats': fatsAdjustment,
      }
    );
    
    widget.onAdjusted(adjustedRecipe);
  }
}
```

---

### Core Adjustment Logic (Flutter)

```dart
// lib/services/recipe_adjustment_service.dart

class RecipeAdjustmentService {
  
  /// Ajuste une recette selon facteurs macro
  Recipe adjustRecipeMacros(
    Recipe originalRecipe,
    Map<String, double> adjustments,
  ) {
    // Clone recipe
    Recipe adjusted = originalRecipe.copy();
    
    // 1. Calculate original calories
    double originalCalories = adjusted.ingredients
        .map((ing) => ing.calories)
        .reduce((a, b) => a + b);
    
    // 2. Apply adjustments per group
    for (var ingredient in adjusted.ingredients) {
      String group = _getIngredientGroup(ingredient.name);
      
      if (adjustments.containsKey(group)) {
        double factor = 1.0 + adjustments[group]!;
        ingredient.quantityG *= factor;
        ingredient.calories = ingredient.quantityG * ingredient.caloriesPerG;
      }
    }
    
    // 3. Recalculate total
    double newTotalCalories = adjusted.ingredients
        .map((ing) => ing.calories)
        .reduce((a, b) => a + b);
    
    // 4. Scale to preserve calories
    double scaleFactor = originalCalories / newTotalCalories;
    
    for (var ingredient in adjusted.ingredients) {
      ingredient.quantityG *= scaleFactor;
      ingredient.calories *= scaleFactor;
    }
    
    // 5. Update recipe macros totals
    adjusted.recalculateMacros();
    
    return adjusted;
  }
  
  /// Map ingredient name → macro group
  String _getIngredientGroup(String ingredientName) {
    // Simplified - en production, use comprehensive mapping
    
    final proteinKeywords = ['chicken', 'fish', 'beef', 'egg', 'tofu'];
    final carbsKeywords = ['rice', 'pasta', 'bread', 'potato'];
    final fatsKeywords = ['oil', 'butter', 'avocado', 'nuts'];
    
    String lower = ingredientName.toLowerCase();
    
    if (proteinKeywords.any((kw) => lower.contains(kw))) {
      return 'protein';
    } else if (carbsKeywords.any((kw) => lower.contains(kw))) {
      return 'carbs';
    } else if (fatsKeywords.any((kw) => lower.contains(kw))) {
      return 'fats';
    } else {
      return 'vegetables';  // Default
    }
  }
}
```

---

### Save Adjusted Recipe

```dart
// lib/services/adjusted_recipe_repository.dart

class AdjustedRecipeRepository {
  final SupabaseClient supabase;
  
  /// Store adjusted recipe in database
  Future<String> saveAdjustedRecipe({
    required String userId,
    required String originalRecipeId,
    required Recipe adjustedRecipe,
    required Map<String, double> adjustments,
  }) async {
    
    final response = await supabase
        .from('adjusted_recipes')
        .insert({
          'user_id': userId,
          'original_recipe_id': originalRecipeId,
          'creator_id': adjustedRecipe.creatorId,
          'adjustment_type': 'manual_macro',
          'macro_delta': adjustments,
          'ingredient_quantities': adjustedRecipe.ingredients
              .map((ing) => {
                'ingredient_id': ing.id,
                'quantity_g': ing.quantityG,
                'calories': ing.calories,
              })
              .toList(),
          'total_calories': adjustedRecipe.totalCalories,
          'macros': {
            'protein_g': adjustedRecipe.proteinG,
            'carbs_g': adjustedRecipe.carbsG,
            'fat_g': adjustedRecipe.fatG,
          },
        })
        .select()
        .single();
    
    return response['adjusted_recipe_id'] as String;
  }
  
  /// Retrieve user's adjusted recipes
  Future<List<Recipe>> getUserAdjustedRecipes(String userId) async {
    final response = await supabase
        .from('adjusted_recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    
    return response.map((json) => Recipe.fromAdjustedJson(json)).toList();
  }
}
```

---

## ⚖️ Contraintes Nutritionnelles

### Limites de Sécurité

**CRITIQUE** : Certains ajustements sont dangereux nutritionnellement.

```dart
class NutritionalConstraints {
  
  /// Valide que l'ajustement est nutritionnellement sûr
  static ValidationResult validate(
    Recipe original,
    Recipe adjusted,
  ) {
    List<String> warnings = [];
    List<String> errors = [];
    
    // 1. CALORIES DRIFT
    double caloriesDiff = (adjusted.totalCalories - original.totalCalories).abs();
    if (caloriesDiff > original.totalCalories * 0.05) {
      errors.add('Calories drift > 5% (${caloriesDiff.toStringAsFixed(0)} kcal)');
    }
    
    // 2. MINIMUM PROTEIN
    if (adjusted.proteinG < 10) {
      errors.add('Protein trop bas (< 10g par repas)');
    }
    
    // 3. MINIMUM FAT
    if (adjusted.fatG < 5) {
      warnings.add('Lipides très bas (< 5g) - absorption vitamines compromise');
    }
    
    // 4. MAXIMUM FAT RATIO
    double fatRatio = (adjusted.fatG * 9) / adjusted.totalCalories;
    if (fatRatio > 0.45) {
      warnings.add('Lipides > 45% calories - peut être excessif');
    }
    
    // 5. MINIMUM FIBER
    if (adjusted.fiberG < 3) {
      warnings.add('Fibres faibles (< 3g) - digestion compromise');
    }
    
    // 6. MAXIMUM CARBS (si objectif weight loss)
    // ... autres validations
    
    return ValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
      warnings: warnings,
    );
  }
}

class ValidationResult {
  final bool isValid;
  final List<String> errors;
  final List<String> warnings;
  
  ValidationResult({
    required this.isValid,
    required this.errors,
    required this.warnings,
  });
}
```

---

### Flow Complet avec Validation

```dart
void _applyAdjustments() {
  // 1. Apply adjustment
  final adjusted = adjustRecipeMacros(
    widget.recipe,
    {
      'protein': proteinAdjustment,
      'carbs': carbsAdjustment,
      'fats': fatsAdjustment,
    }
  );
  
  // 2. Validate
  final validation = NutritionalConstraints.validate(
    widget.recipe,
    adjusted,
  );
  
  // 3. Handle validation
  if (!validation.isValid) {
    // ERRORS → block
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Ajustement Impossible'),
        content: Text(validation.errors.join('\n')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
    return;
  }
  
  if (validation.warnings.isNotEmpty) {
    // WARNINGS → confirm
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Attention'),
        content: Text(validation.warnings.join('\n')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Annuler'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _saveAdjustedRecipe(adjusted);
            },
            child: Text('Continuer'),
          ),
        ],
      ),
    );
  } else {
    // ALL GOOD
    _saveAdjustedRecipe(adjusted);
  }
}
```

---

## 🗄️ Database Schema

### Table: adjusted_recipes

```sql
CREATE TABLE adjusted_recipes (
    adjusted_recipe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    user_id UUID NOT NULL REFERENCES users(user_id),
    original_recipe_id UUID NOT NULL REFERENCES recipes(recipe_id),
    creator_id UUID NOT NULL REFERENCES creators(creator_id),
    
    -- Adjustment metadata
    adjustment_type VARCHAR(50) NOT NULL,  -- manual_macro, ai_suggested, static_variant
    adjustment_source VARCHAR(50),          -- app_slider, ai_agent, batch_job
    
    -- What changed
    macro_delta JSONB,  -- e.g. {"protein": +0.20, "carbs": -0.15}
    /*
    Example:
    {
      "protein": 0.20,
      "carbs": -0.15,
      "fats": 0.05
    }
    */
    
    -- Adjusted ingredients
    ingredient_quantities JSONB NOT NULL,
    /*
    Example:
    [
      {
        "ingredient_id": "uuid-123",
        "ingredient_name": "Chicken breast",
        "quantity_g": 186.7,
        "calories": 186.7,
        "protein_g": 35.0,
        "carbs_g": 0,
        "fat_g": 3.5
      },
      ...
    ]
    */
    
    -- Totals
    total_calories FLOAT NOT NULL,
    macros JSONB NOT NULL,
    /*
    {
      "protein_g": 42.5,
      "carbs_g": 58.0,
      "fat_g": 12.3,
      "fiber_g": 6.2
    }
    */
    
    -- Tracking
    times_consumed INT DEFAULT 0,
    last_consumed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_calories CHECK (total_calories > 0 AND total_calories < 2000)
);

CREATE INDEX idx_adjusted_recipes_user ON adjusted_recipes(user_id);
CREATE INDEX idx_adjusted_recipes_original ON adjusted_recipes(original_recipe_id);
CREATE INDEX idx_adjusted_recipes_creator ON adjusted_recipes(creator_id);
```

---

### Table: recipe_variants (Static Pre-Calculated)

```sql
CREATE TABLE recipe_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link
    original_recipe_id UUID NOT NULL REFERENCES recipes(recipe_id),
    
    -- Variant type
    variant_type VARCHAR(50) NOT NULL,  -- low_carb, high_protein, budget, quick
    variant_label VARCHAR(100),          -- "Version Low-Carb", "Version Express"
    
    -- Same structure as adjusted_recipes
    macro_delta JSONB,
    ingredient_quantities JSONB NOT NULL,
    total_calories FLOAT NOT NULL,
    macros JSONB NOT NULL,
    
    -- Metadata
    created_by VARCHAR(50),  -- system, creator, admin
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variants_original ON recipe_variants(original_recipe_id);
CREATE INDEX idx_variants_type ON recipe_variants(variant_type);
```

---

## 🎬 Use Cases

### Use Case 1: User Slider Adjustment

**Scenario** : User voit recette, veut plus de protéines.

```
1. User ouvre recette details
2. Tap "Ajuster macros"
3. Slide protein +20%
4. Preview updated quantities
5. Tap "Appliquer"
6. Flutter:
   ├─ adjustRecipeMacros()
   ├─ validate()
   └─ saveAdjustedRecipe()
7. Recette ajustée ajoutée à "Mes Recettes"
8. Consommation future compte pour créateur (0.033€)
```

---

### Use Case 2: AI-Suggested Adjustment

**Scenario** : Système détecte pattern utilisateur.

```
Python Analytics détecte:
- User augmente toujours protein de +15% sur recettes poulet
- User a objectif muscle gain

→ Lors recommandation:
  Python pre-ajuste automatiquement recettes poulet +15% protein
  
→ User reçoit recette déjà optimisée (invisible)

→ Si user accepte → stored as adjusted_recipe
```

---

### Use Case 3: Creator Static Variants

**Scenario** : Créateur propose variantes pré-définies.

```
Créateur crée recette "Mafé Traditionnel"

Système génère automatiquement variantes:
1. "Mafé Low-Carb" (-30% carbs, +15% protein)
2. "Mafé Budget" (ingrédients moins chers)
3. "Mafé Express" (préparation simplifiée, -20min)

→ Stockées dans recipe_variants

→ User peut choisir variante lors browse

→ Consommation compte toujours pour créateur original
```

---

### Use Case 4: Goal Change Adjustment

**Scenario** : User dit "Je vais courir demain, adapte mon dîner".

```
Flutter App:
1. User tap "J'ai + d'activité demain"
2. AI agent détecte → besoin +carbs
3. Edge Function → Python:
   POST /adjust_recipe_for_activity
   {
     user_id,
     recipe_id,
     activity_increase: 0.30
   }
4. Python:
   ├─ Load recipe
   ├─ Apply {'carbs': +0.25, 'protein': +0.10}
   ├─ Return adjusted
5. App affiche:
   "Nous avons augmenté les glucides de 25% pour supporter votre activité"
6. User accepte → saved
```

---

## 📊 Analytics Adjusted Recipes

### Tracking Efficacité

```python
def analyze_adjustment_effectiveness(user_id: str, period_days: int = 30):
    """
    Mesure si ajustements améliorent outcomes.
    
    Compare:
    - Recettes originales
    - Recettes ajustées
    
    Métriques:
    - Adherence rate
    - Satisfaction
    - Weight loss
    """
    
    # Recettes ajustées consommées
    adjusted = db.query("""
        SELECT 
            ar.adjusted_recipe_id,
            ar.macro_delta,
            ml.status,
            ml.validation
        FROM adjusted_recipes ar
        JOIN meal_logs ml ON ml.recipe_id = ar.adjusted_recipe_id
        WHERE ar.user_id = ?
        AND ml.consumed_at >= NOW() - INTERVAL ? DAY
    """, user_id, period_days)
    
    # Recettes originales (même user, même période)
    original = db.query("""
        SELECT 
            r.recipe_id,
            ml.status,
            ml.validation
        FROM recipes r
        JOIN meal_logs ml ON ml.recipe_id = r.recipe_id
        WHERE ml.user_id = ?
        AND ml.consumed_at >= NOW() - INTERVAL ? DAY
        AND NOT EXISTS (
            SELECT 1 FROM adjusted_recipes ar
            WHERE ar.adjusted_recipe_id = ml.recipe_id
        )
    """, user_id, period_days)
    
    # Calculer adherence
    adjusted_adherence = sum([1 for x in adjusted if x.status == 'completed']) / len(adjusted) if adjusted else 0
    original_adherence = sum([1 for x in original if x.status == 'completed']) / len(original) if original else 0
    
    return {
        'adjusted_adherence': adjusted_adherence,
        'original_adherence': original_adherence,
        'improvement': adjusted_adherence - original_adherence,
        'adjustment_effective': adjusted_adherence > original_adherence
    }
```

---

### Learning Loop

```python
def learn_user_adjustment_preferences(user_id: str):
    """
    Apprend les patterns d'ajustement utilisateur.
    
    Returns: dict avec tendances
    """
    
    adjustments = db.query("""
        SELECT macro_delta
        FROM adjusted_recipes
        WHERE user_id = ?
        AND times_consumed > 0
    """, user_id)
    
    # Aggregate tendances
    total_protein = 0
    total_carbs = 0
    total_fats = 0
    count = 0
    
    for adj in adjustments:
        delta = adj.macro_delta
        total_protein += delta.get('protein', 0)
        total_carbs += delta.get('carbs', 0)
        total_fats += delta.get('fats', 0)
        count += 1
    
    if count > 5:  # Minimum samples
        return {
            'avg_protein_adjustment': total_protein / count,
            'avg_carbs_adjustment': total_carbs / count,
            'avg_fats_adjustment': total_fats / count,
            'sample_size': count,
            'confident': count > 10
        }
    else:
        return None
```

**Usage** :
- Nourrit user_vector (dimension `adjustment_tendency`)
- Pre-ajuste recommandations futures
- Feedback créateurs ("vos recettes sont souvent ajustées +protein")

---

## ⚠️ Limitations & V2

### Limitations V1

**Ce que V1 NE fait PAS** :
- ❌ Substitution ingrédients intelligente ("remplace poulet par tofu")
- ❌ Ajustement coût/budget automatique
- ❌ Ajustement allergènes/contraintes
- ❌ Optimisation temps préparation

**Scope V1** :
- ✅ Ajustement macro groupes (protein, carbs, fats)
- ✅ Conservation calories
- ✅ Validation contraintes sécurité
- ✅ Stockage & tracking

### V2 Extensions (Sept 2026)

**Planned** :
- Ingredient substitution engine ("si allergie X → remplacer par Y")
- Budget optimizer (minimize cost while preserving macros)
- Time optimizer (simplify steps, reduce cook time)
- Taste profile adjustment (more/less spicy, sweet, etc.)
- AI-powered automatic adjustment suggestions

---

## ✅ Checklist Implémentation

### Flutter (In-App)
- [ ] RecipeAdjustmentSlider widget créé
- [ ] adjustRecipeMacros() function testée
- [ ] NutritionalConstraints validation implémentée
- [ ] Save adjusted recipe flow testé
- [ ] UI preview updated quantities

### Database
- [ ] adjusted_recipes table créée
- [ ] recipe_variants table créée
- [ ] Indexes optimisés
- [ ] Constraints validation SQL

### Backend (Python)
- [ ] Adjustment analytics functions
- [ ] Learning loop implémenté
- [ ] Auto-adjustment suggestions

### Creator Impact
- [ ] Consommations ajustées comptent pour payout
- [ ] Feedback loop créateurs (quels ajustements fréquents ?)
- [ ] Static variants generation tool

---

**FIN DU DOCUMENT**
