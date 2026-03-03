# V1 - Vectorisation Meal Planner

## 📋 Contexte

### Problème V0 : Meal Planner IA Hasardeux

L'application V0 utilise un **meal planner basé sur IA (OpenAI)** qui présente plusieurs problèmes critiques :

❌ **Hasardeux** : Résultats imprévisibles, même input ≠ même output  
❌ **Coûteux** : ~€0.02 par génération (appel OpenAI à chaque fois)  
❌ **Lent** : 500-1000ms de latence (API externe)  
❌ **Non-déterministe** : Impossible de reproduire ou debugger  
❌ **Pas d'apprentissage** : Ne s'améliore pas avec l'usage  
❌ **Non-scalable** : Coûts explosent avec volume utilisateurs  

### Solution V1 : Vectorisation + Cosine Similarity

Remplacer l'IA générative par un **système de recommandation vectoriel** :

✅ **Déterministe** : Mêmes préférences = mêmes recommandations  
✅ **Rapide** : ~50-100ms (calcul PostgreSQL local)  
✅ **Économique** : ~€0.000 par query (vectorisation one-time)  
✅ **Scalable** : Fonctionne avec 10 ou 100,000 recettes  
✅ **Personnalisé** : Vraie adaptation au profil utilisateur  
✅ **Transparent** : On sait pourquoi une recette est recommandée  

---

## 🎯 Objectif

Créer un système de recommandation de recettes basé sur la **similarité vectorielle** entre :
- **Profil utilisateur** (objectifs santé, préférences, historique)
- **Profil recettes** (macros, tags, difficulté, popularité)

**Méthode** : Cosine similarity entre vecteurs utilisateur et recettes.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PROFILE                              │
│  (objectifs, contraintes, préférences, historique)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Edge Function       │
            │  generate-user-vector│
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  user_vectors table  │
            │  vector(50)          │
            └──────────┬───────────┘
                       │
                       │  Cosine Similarity
                       │  (pgvector)
                       │
            ┌──────────┴───────────┐
            │  recipe_vectors      │
            │  vector(50)          │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Edge Function       │
            │  generate-recipe-    │
            │  vector              │
            └──────────┬───────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    RECIPE PROFILE                             │
│  (macros, tags, difficulté, temps, popularité)               │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  PostgreSQL RPC      │
            │  recommend_recipes() │
            └──────────┬───────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              TOP 10 RECETTES RECOMMANDÉES                     │
│  (classées par similarity score 0-1)                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Définition des Vecteurs

### Vecteur Utilisateur (50 dimensions)

```javascript
// Dimensions 0-49 du vecteur utilisateur

[
  // ═══════════════════════════════════════════════════════════
  // OBJECTIFS SANTÉ (5 dimensions : 0-4)
  // ═══════════════════════════════════════════════════════════
  goal_weight_loss,      // 0-1 : Perte de poids
  goal_muscle_gain,      // 0-1 : Prise de masse musculaire
  goal_maintenance,      // 0-1 : Maintien
  goal_health,           // 0-1 : Santé générale
  goal_performance,      // 0-1 : Performance sportive
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES NUTRITIONNELLES (5 dimensions : 5-9)
  // ═══════════════════════════════════════════════════════════
  calorie_target,        // 0-1 : Cible calorique (normalisé 1200-3500)
  protein_target,        // 0-1 : Cible protéines (normalisé 50-250g)
  carbs_preference,      // 0-1 : Préférence glucides
  fat_preference,        // 0-1 : Préférence lipides
  fiber_preference,      // 0-1 : Préférence fibres
  
  // ═══════════════════════════════════════════════════════════
  // PRÉFÉRENCES CULINAIRES - RÉGION (10 dimensions : 10-19)
  // ═══════════════════════════════════════════════════════════
  cuisine_west_africa,   // 0-1 : Afrique de l'Ouest (Sénégal, Côte d'Ivoire, etc.)
  cuisine_central_africa,// 0-1 : Afrique Centrale (Cameroun, Congo, etc.)
  cuisine_east_africa,   // 0-1 : Afrique de l'Est (Kenya, Éthiopie, etc.)
  cuisine_north_africa,  // 0-1 : Afrique du Nord (Maroc, Algérie, etc.)
  cuisine_southern_africa,// 0-1 : Afrique Australe (Afrique du Sud, etc.)
  
  // PRÉFÉRENCES CULINAIRES - CARACTÉRISTIQUES (5 dimensions : 20-24)
  difficulty_easy,       // 0-1 : Recettes faciles préférées
  difficulty_medium,     // 0-1 : Recettes moyennes
  difficulty_hard,       // 0-1 : Recettes complexes
  cooking_time_short,    // 0-1 : Temps court (<30min)
  cooking_time_medium,   // 0-1 : Temps moyen (30-60min)
  
  // ═══════════════════════════════════════════════════════════
  // COMPORTEMENT HISTORIQUE (10 dimensions : 25-34)
  // ═══════════════════════════════════════════════════════════
  avg_calories_consumed, // 0-1 : Moyenne calories repas consommés
  avg_protein_consumed,  // 0-1 : Moyenne protéines consommées
  variety_score,         // 0-1 : Diversité recettes (nb recettes uniques)
  consumption_frequency, // 0-1 : Fréquence utilisation app
  meal_completion_rate,  // 0-1 : % repas planifiés effectivement consommés
  breakfast_preference,  // 0-1 : Préférence petit-déjeuner
  lunch_preference,      // 0-1 : Préférence déjeuner
  dinner_preference,     // 0-1 : Préférence dîner
  snack_preference,      // 0-1 : Préférence snacks
  weekend_cooking,       // 0-1 : Cuisine plus le weekend
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES ALIMENTAIRES (10 dimensions : 35-44)
  // ═══════════════════════════════════════════════════════════
  vegetarian,            // 0-1 : Végétarien
  vegan,                 // 0-1 : Vegan
  pescatarian,           // 0-1 : Pescatarien
  halal,                 // 0-1 : Halal
  kosher,                // 0-1 : Casher
  gluten_free,           // 0-1 : Sans gluten
  lactose_free,          // 0-1 : Sans lactose
  nut_free,              // 0-1 : Sans fruits à coque
  low_sodium,            // 0-1 : Faible sodium
  diabetic_friendly,     // 0-1 : Adapté diabète
  
  // ═══════════════════════════════════════════════════════════
  // RÉSERVÉ EXPANSION FUTURE (5 dimensions : 45-49)
  // ═══════════════════════════════════════════════════════════
  reserved_1,            // 0-1 : Expansion future
  reserved_2,            // 0-1 : Expansion future
  reserved_3,            // 0-1 : Expansion future
  reserved_4,            // 0-1 : Expansion future
  reserved_5,            // 0-1 : Expansion future
]
```

**Total : 50 dimensions**

---

### Vecteur Recette (50 dimensions - aligné avec user)

```javascript
// Dimensions 0-49 du vecteur recette

[
  // ═══════════════════════════════════════════════════════════
  // ADÉQUATION OBJECTIFS SANTÉ (5 dimensions : 0-4)
  // ═══════════════════════════════════════════════════════════
  weight_loss_score,     // 0-1 : Score adéquation perte de poids
  muscle_gain_score,     // 0-1 : Score adéquation prise de masse
  maintenance_score,     // 0-1 : Score adéquation maintien
  health_score,          // 0-1 : Score santé (nutrient density)
  performance_score,     // 0-1 : Score performance sportive
  
  // ═══════════════════════════════════════════════════════════
  // PROFIL NUTRITIONNEL (5 dimensions : 5-9)
  // ═══════════════════════════════════════════════════════════
  calorie_density,       // 0-1 : Densité calorique (normalisé 100-1000 kcal)
  protein_ratio,         // 0-1 : Ratio protéines (% calories totales)
  carbs_ratio,           // 0-1 : Ratio glucides (% calories totales)
  fat_ratio,             // 0-1 : Ratio lipides (% calories totales)
  fiber_content,         // 0-1 : Contenu fibres (normalisé 0-20g)
  
  // ═══════════════════════════════════════════════════════════
  // CUISINE - RÉGION (10 dimensions : 10-19)
  // ═══════════════════════════════════════════════════════════
  cuisine_west_africa,   // 0-1 : Afrique de l'Ouest
  cuisine_central_africa,// 0-1 : Afrique Centrale
  cuisine_east_africa,   // 0-1 : Afrique de l'Est
  cuisine_north_africa,  // 0-1 : Afrique du Nord
  cuisine_southern_africa,// 0-1 : Afrique Australe
  
  // CUISINE - CARACTÉRISTIQUES (5 dimensions : 20-24)
  difficulty_easy,       // 0-1 : Difficulté facile
  difficulty_medium,     // 0-1 : Difficulté moyenne
  difficulty_hard,       // 0-1 : Difficulté difficile
  cooking_time_short,    // 0-1 : Temps court (<30min)
  cooking_time_medium,   // 0-1 : Temps moyen (30-60min)
  
  // ═══════════════════════════════════════════════════════════
  // POPULARITÉ & QUALITÉ (10 dimensions : 25-34)
  // ═══════════════════════════════════════════════════════════
  popularity_score,      // 0-1 : Popularité (basé consumptions)
  rating_avg,            // 0-1 : Note moyenne utilisateurs
  completion_rate,       // 0-1 : % users qui finissent le repas
  save_rate,             // 0-1 : % users qui sauvegardent
  share_rate,            // 0-1 : % users qui partagent
  recency_score,         // 0-1 : Fraîcheur (recette récente)
  creator_reputation,    // 0-1 : Réputation créateur
  photo_quality,         // 0-1 : Qualité photo (si applicable)
  instruction_clarity,   // 0-1 : Clarté instructions
  ingredient_availability,// 0-1 : Disponibilité ingrédients
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES ALIMENTAIRES (10 dimensions : 35-44)
  // ═══════════════════════════════════════════════════════════
  vegetarian,            // 0-1 : Végétarien
  vegan,                 // 0-1 : Vegan
  pescatarian,           // 0-1 : Pescatarien
  halal,                 // 0-1 : Halal
  kosher,                // 0-1 : Casher
  gluten_free,           // 0-1 : Sans gluten
  lactose_free,          // 0-1 : Sans lactose
  nut_free,              // 0-1 : Sans fruits à coque
  low_sodium,            // 0-1 : Faible sodium
  diabetic_friendly,     // 0-1 : Adapté diabète
  
  // ═══════════════════════════════════════════════════════════
  // RÉSERVÉ EXPANSION FUTURE (5 dimensions : 45-49)
  // ═══════════════════════════════════════════════════════════
  reserved_1,            // 0-1 : Expansion future
  reserved_2,            // 0-1 : Expansion future
  reserved_3,            // 0-1 : Expansion future
  reserved_4,            // 0-1 : Expansion future
  reserved_5,            // 0-1 : Expansion future
]
```

**Total : 50 dimensions (alignées sur user vector)**

---

## 🗄️ Database Schema

### Installation pgvector Extension

```sql
-- Activer l'extension pgvector dans Supabase
CREATE EXTENSION IF NOT EXISTS vector;
```

### Table : `user_vectors`

```sql
CREATE TABLE user_vectors (
  -- Primary key
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vecteur (50 dimensions)
  vector vector(50) NOT NULL,
  
  -- Métadonnées
  last_updated timestamptz DEFAULT now(),
  version int DEFAULT 1, -- Pour migration futures
  
  -- Copie dénormalisée pour affichage/debug (optionnel)
  preferences jsonb,
  
  -- Indexes
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche vectorielle
CREATE INDEX idx_user_vectors_vector ON user_vectors 
USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- Index performance
CREATE INDEX idx_user_vectors_updated ON user_vectors(last_updated DESC);

-- RLS Policies
ALTER TABLE user_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vector"
ON user_vectors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own vector"
ON user_vectors FOR UPDATE
USING (user_id = auth.uid());
```

### Table : `recipe_vectors`

```sql
CREATE TABLE recipe_vectors (
  -- Primary key
  recipe_id uuid PRIMARY KEY REFERENCES receipe(id) ON DELETE CASCADE,
  
  -- Vecteur (50 dimensions)
  vector vector(50) NOT NULL,
  
  -- Métadonnées
  last_updated timestamptz DEFAULT now(),
  version int DEFAULT 1,
  
  -- Métadonnées pour debug/affichage
  metadata jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche vectorielle
CREATE INDEX idx_recipe_vectors_vector ON recipe_vectors 
USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- Index performance
CREATE INDEX idx_recipe_vectors_updated ON recipe_vectors(last_updated DESC);

-- RLS Policies
ALTER TABLE recipe_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipe vectors"
ON recipe_vectors FOR SELECT
USING (true);

CREATE POLICY "Only service role can modify recipe vectors"
ON recipe_vectors FOR ALL
USING (false); -- Seulement via service role key
```

---

## ⚙️ Edge Functions

### Edge Function : `generate-user-vector`

**Fichier** : `supabase/functions/generate-user-vector/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserVectorRequest {
  user_id: string;
}

serve(async (req) => {
  try {
    const { user_id }: UserVectorRequest = await req.json()
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // 1. Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // 2. Fetch user consumption history (derniers 100 repas)
    const { data: consumptions } = await supabase
      .from('consumed_meal')
      .select('recipe_id, calorie, protein, carbs, fat, meal_type, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100)
    
    // 3. Build vector
    const vector = buildUserVector(user, consumptions || [])
    
    // 4. Extract preferences for display
    const preferences = extractUserPreferences(user, consumptions || [])
    
    // 5. Upsert vector
    const { error: upsertError } = await supabase
      .from('user_vectors')
      .upsert({
        user_id: user_id,
        vector: vector,
        last_updated: new Date().toISOString(),
        version: 1,
        preferences: preferences
      })
    
    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save vector', details: upsertError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id,
        vector_length: vector.length,
        preferences 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    console.error('Error generating user vector:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

function buildUserVector(user: any, consumptions: any[]): number[] {
  const vector = new Array(50).fill(0)
  
  // ═══════════════════════════════════════════════════════════
  // OBJECTIFS SANTÉ (dimensions 0-4)
  // ═══════════════════════════════════════════════════════════
  const goalType = user.goal_type?.toLowerCase() || 'maintenance'
  if (goalType === 'weight_loss') vector[0] = 1
  if (goalType === 'muscle_gain') vector[1] = 1
  if (goalType === 'maintenance') vector[2] = 1
  if (goalType === 'health') vector[3] = 1
  if (goalType === 'performance') vector[4] = 1
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES NUTRITIONNELLES (dimensions 5-9)
  // ═══════════════════════════════════════════════════════════
  vector[5] = normalize(user.calorie_target || 2000, 1200, 3500)
  vector[6] = normalize(user.protein_target || 120, 50, 250)
  vector[7] = user.carbs_preference || 0.5
  vector[8] = user.fat_preference || 0.5
  vector[9] = user.fiber_preference || 0.5
  
  // ═══════════════════════════════════════════════════════════
  // PRÉFÉRENCES CULINAIRES - Région (dimensions 10-19)
  // ═══════════════════════════════════════════════════════════
  // TODO: À remplir selon preferences user ou tags favoris
  // Pour l'instant, distribué équitablement
  vector[10] = 0.2 // West Africa
  vector[11] = 0.2 // Central Africa
  vector[12] = 0.2 // East Africa
  vector[13] = 0.2 // North Africa
  vector[14] = 0.2 // Southern Africa
  
  // PRÉFÉRENCES CULINAIRES - Caractéristiques (dimensions 20-24)
  vector[20] = user.difficulty_preference === 'easy' ? 1 : 0.3
  vector[21] = user.difficulty_preference === 'medium' ? 1 : 0.4
  vector[22] = user.difficulty_preference === 'hard' ? 1 : 0.1
  vector[23] = user.cooking_time_preference === 'short' ? 1 : 0.5
  vector[24] = user.cooking_time_preference === 'medium' ? 1 : 0.3
  
  // ═══════════════════════════════════════════════════════════
  // COMPORTEMENT HISTORIQUE (dimensions 25-34)
  // ═══════════════════════════════════════════════════════════
  if (consumptions.length > 0) {
    // Calories moyennes
    const avgCalories = consumptions.reduce((sum, c) => sum + (c.calorie || 0), 0) / consumptions.length
    vector[25] = normalize(avgCalories, 200, 1000)
    
    // Protéines moyennes
    const avgProtein = consumptions.reduce((sum, c) => sum + (c.protein || 0), 0) / consumptions.length
    vector[26] = normalize(avgProtein, 10, 60)
    
    // Variety score
    const uniqueRecipes = new Set(consumptions.map(c => c.recipe_id)).size
    vector[27] = normalize(uniqueRecipes, 1, 50)
    
    // Fréquence
    const daysSinceFirst = Math.max(1, 
      (Date.now() - new Date(consumptions[consumptions.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    vector[28] = normalize(consumptions.length / daysSinceFirst, 0, 3) // repas/jour
    
    // Meal type preferences
    const mealTypes = consumptions.reduce((acc, c) => {
      acc[c.meal_type] = (acc[c.meal_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const total = consumptions.length
    vector[30] = (mealTypes['breakfast'] || 0) / total
    vector[31] = (mealTypes['lunch'] || 0) / total
    vector[32] = (mealTypes['dinner'] || 0) / total
    vector[33] = (mealTypes['snack'] || 0) / total
  }
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES ALIMENTAIRES (dimensions 35-44)
  // ═══════════════════════════════════════════════════════════
  vector[35] = user.vegetarian ? 1 : 0
  vector[36] = user.vegan ? 1 : 0
  vector[37] = user.pescatarian ? 1 : 0
  vector[38] = user.halal ? 1 : 0
  vector[39] = user.kosher ? 1 : 0
  vector[40] = user.gluten_free ? 1 : 0
  vector[41] = user.lactose_free ? 1 : 0
  vector[42] = user.nut_free ? 1 : 0
  vector[43] = user.low_sodium ? 1 : 0
  vector[44] = user.diabetic_friendly ? 1 : 0
  
  // Dimensions 45-49 réservées pour expansion future
  
  return vector
}

function extractUserPreferences(user: any, consumptions: any[]) {
  return {
    goal: user.goal_type,
    calorie_target: user.calorie_target,
    protein_target: user.protein_target,
    total_meals_consumed: consumptions.length,
    unique_recipes: new Set(consumptions.map(c => c.recipe_id)).size,
    dietary_restrictions: [
      user.vegetarian && 'vegetarian',
      user.vegan && 'vegan',
      user.halal && 'halal',
      user.gluten_free && 'gluten_free',
    ].filter(Boolean)
  }
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}
```

---

### Edge Function : `generate-recipe-vector`

**Fichier** : `supabase/functions/generate-recipe-vector/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RecipeVectorRequest {
  recipe_id: string;
}

serve(async (req) => {
  try {
    const { recipe_id }: RecipeVectorRequest = await req.json()
    
    if (!recipe_id) {
      return new Response(
        JSON.stringify({ error: 'recipe_id required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // 1. Fetch recipe with all details
    const { data: recipe, error: recipeError } = await supabase
      .from('receipe')
      .select(`
        *,
        macros:receipe_macro(*),
        tags:receipe_tags(tag:tags(name)),
        difficulty:receipe_difficulty(name)
      `)
      .eq('id', recipe_id)
      .single()
    
    if (recipeError || !recipe) {
      return new Response(
        JSON.stringify({ error: 'Recipe not found' }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // 2. Build vector
    const vector = buildRecipeVector(recipe)
    
    // 3. Extract metadata
    const metadata = {
      name: recipe.name,
      calories: recipe.macros?.calorie,
      protein: recipe.macros?.protein,
      tags: recipe.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      difficulty: recipe.difficulty?.name,
      cooking_time: recipe.cooking_time,
      popularity: recipe.meal_consumed || 0
    }
    
    // 4. Upsert vector
    const { error: upsertError } = await supabase
      .from('recipe_vectors')
      .upsert({
        recipe_id: recipe_id,
        vector: vector,
        last_updated: new Date().toISOString(),
        version: 1,
        metadata: metadata
      })
    
    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save vector', details: upsertError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe_id,
        vector_length: vector.length,
        metadata 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    console.error('Error generating recipe vector:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

function buildRecipeVector(recipe: any): number[] {
  const vector = new Array(50).fill(0)
  const macros = recipe.macros
  
  if (!macros) {
    console.warn(`Recipe ${recipe.id} has no macros, returning zero vector`)
    return vector
  }
  
  // ═══════════════════════════════════════════════════════════
  // ADÉQUATION OBJECTIFS SANTÉ (dimensions 0-4)
  // ═══════════════════════════════════════════════════════════
  const totalCal = macros.calorie || 0
  const protein = macros.protein || 0
  const carbs = macros.carbs || 0
  const fat = macros.fat || 0
  
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const totalMacrosCal = proteinCal + carbsCal + fatCal
  
  const proteinRatio = totalMacrosCal > 0 ? proteinCal / totalMacrosCal : 0
  const carbsRatio = totalMacrosCal > 0 ? carbsCal / totalMacrosCal : 0
  const fatRatio = totalMacrosCal > 0 ? fatCal / totalMacrosCal : 0
  
  const calorieDensity = normalize(totalCal, 100, 1000)
  
  // Weight loss score : low calorie + high protein
  vector[0] = (1 - calorieDensity) * 0.5 + proteinRatio * 0.5
  
  // Muscle gain score : high protein + moderate carbs
  vector[1] = proteinRatio * 0.6 + carbsRatio * 0.4
  
  // Maintenance score : balanced macros
  const balance = 1 - Math.abs(proteinRatio - 0.3) - Math.abs(carbsRatio - 0.4) - Math.abs(fatRatio - 0.3)
  vector[2] = Math.max(0, balance)
  
  // Health score : nutrient density (simplifié)
  const fiberScore = normalize(macros.fiber || 0, 0, 20)
  vector[3] = (proteinRatio + fiberScore) / 2
  
  // Performance score : high carbs + moderate protein
  vector[4] = carbsRatio * 0.6 + proteinRatio * 0.4
  
  // ═══════════════════════════════════════════════════════════
  // PROFIL NUTRITIONNEL (dimensions 5-9)
  // ═══════════════════════════════════════════════════════════
  vector[5] = calorieDensity
  vector[6] = proteinRatio
  vector[7] = carbsRatio
  vector[8] = fatRatio
  vector[9] = fiberScore
  
  // ═══════════════════════════════════════════════════════════
  // CUISINE - RÉGION (dimensions 10-19)
  // ═══════════════════════════════════════════════════════════
  const tags = recipe.tags?.map((t: any) => t.tag?.name?.toLowerCase()).filter(Boolean) || []
  
  // West Africa
  if (tags.some((t: string) => 
    t.includes('sénégal') || t.includes('côte') || t.includes('ivoire') || 
    t.includes('mali') || t.includes('burkina') || t.includes('niger')
  )) {
    vector[10] = 1
  }
  
  // Central Africa
  if (tags.some((t: string) => 
    t.includes('cameroun') || t.includes('congo') || t.includes('gabon') || 
    t.includes('tchad') || t.includes('centrafrique')
  )) {
    vector[11] = 1
  }
  
  // East Africa
  if (tags.some((t: string) => 
    t.includes('kenya') || t.includes('éthiopie') || t.includes('tanzania') || 
    t.includes('ouganda') || t.includes('rwanda')
  )) {
    vector[12] = 1
  }
  
  // North Africa
  if (tags.some((t: string) => 
    t.includes('maroc') || t.includes('algérie') || t.includes('tunisie') || 
    t.includes('égypte') || t.includes('libye')
  )) {
    vector[13] = 1
  }
  
  // Southern Africa
  if (tags.some((t: string) => 
    t.includes('afrique du sud') || t.includes('namibie') || t.includes('botswana') || 
    t.includes('zimbabwe') || t.includes('mozambique')
  )) {
    vector[14] = 1
  }
  
  // ═══════════════════════════════════════════════════════════
  // CUISINE - CARACTÉRISTIQUES (dimensions 20-24)
  // ═══════════════════════════════════════════════════════════
  const difficulty = recipe.difficulty?.name?.toLowerCase() || 'medium'
  vector[20] = difficulty === 'easy' ? 1 : 0
  vector[21] = difficulty === 'medium' ? 1 : 0
  vector[22] = difficulty === 'hard' ? 1 : 0
  
  const cookingTime = recipe.cooking_time || 30
  vector[23] = cookingTime < 30 ? 1 : 0
  vector[24] = cookingTime >= 30 && cookingTime < 60 ? 1 : 0
  
  // ═══════════════════════════════════════════════════════════
  // POPULARITÉ & QUALITÉ (dimensions 25-34)
  // ═══════════════════════════════════════════════════════════
  vector[25] = normalize(recipe.meal_consumed || 0, 0, 1000) // popularity
  vector[26] = normalize(recipe.rating_avg || 0, 0, 5) // rating
  
  // Recency score (recettes récentes = score plus élevé)
  if (recipe.created_at) {
    const daysSinceCreation = (Date.now() - new Date(recipe.created_at).getTime()) / (1000 * 60 * 60 * 24)
    vector[30] = Math.max(0, 1 - (daysSinceCreation / 365)) // Décroît sur 1 an
  }
  
  // ═══════════════════════════════════════════════════════════
  // CONTRAINTES ALIMENTAIRES (dimensions 35-44)
  // ═══════════════════════════════════════════════════════════
  vector[35] = tags.some((t: string) => t.includes('végétarien')) ? 1 : 0
  vector[36] = tags.some((t: string) => t.includes('vegan')) ? 1 : 0
  vector[37] = tags.some((t: string) => t.includes('pescatarien')) ? 1 : 0
  vector[38] = tags.some((t: string) => t.includes('halal')) ? 1 : 0
  vector[39] = tags.some((t: string) => t.includes('casher') || t.includes('kosher')) ? 1 : 0
  vector[40] = tags.some((t: string) => t.includes('sans gluten')) ? 1 : 0
  vector[41] = tags.some((t: string) => t.includes('sans lactose')) ? 1 : 0
  vector[42] = tags.some((t: string) => t.includes('sans noix')) ? 1 : 0
  vector[43] = tags.some((t: string) => t.includes('faible sodium')) ? 1 : 0
  vector[44] = tags.some((t: string) => t.includes('diabétique')) ? 1 : 0
  
  // Dimensions 45-49 réservées pour expansion future
  
  return vector
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}
```

---

## 🔍 Fonction de Recommandation

### PostgreSQL Function : `recommend_recipes`

```sql
CREATE OR REPLACE FUNCTION recommend_recipes(
  p_user_id uuid,
  p_limit int DEFAULT 10,
  p_exclude_consumed boolean DEFAULT true
)
RETURNS TABLE (
  recipe_id uuid,
  recipe_name text,
  similarity_score float,
  calories float,
  protein float,
  carbs float,
  fat float,
  cooking_time int,
  difficulty text,
  creator_name text,
  image_url text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_vec AS (
    SELECT vector 
    FROM user_vectors 
    WHERE user_id = p_user_id
  ),
  excluded_recipes AS (
    SELECT DISTINCT recipe_id
    FROM consumed_meal
    WHERE user_id = p_user_id
      AND p_exclude_consumed = true
      AND created_at > now() - interval '30 days' -- Exclure seulement recettes récentes
  )
  SELECT 
    rv.recipe_id,
    r.name as recipe_name,
    1 - (uv.vector <=> rv.vector) as similarity_score, -- Cosine similarity
    rm.calorie as calories,
    rm.protein as protein,
    rm.carbs as carbs,
    rm.fat as fat,
    r.cooking_time,
    rd.name as difficulty,
    p.username as creator_name,
    ri.url as image_url
  FROM user_vec uv
  CROSS JOIN recipe_vectors rv
  JOIN receipe r ON r.id = rv.recipe_id
  LEFT JOIN receipe_macro rm ON rm.receipe_id = rv.recipe_id
  LEFT JOIN receipe_difficulty rd ON rd.id = r.difficulty_id
  LEFT JOIN profiles p ON p.id = r.creator_id
  LEFT JOIN LATERAL (
    SELECT url 
    FROM receipe_image 
    WHERE receipe_id = r.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) ri ON true
  WHERE rv.recipe_id NOT IN (SELECT recipe_id FROM excluded_recipes)
  ORDER BY uv.vector <=> rv.vector ASC -- Plus proche = meilleur match
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Utilisation Flutter

```dart
// lib/services/meal_planner_service.dart

class MealPlannerService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  /// Obtenir recettes recommandées pour l'utilisateur
  Future<List<Recipe>> getRecommendedRecipes({
    int limit = 10,
    bool excludeConsumed = true,
  }) async {
    final userId = _supabase.auth.currentUser!.id;
    
    try {
      final response = await _supabase.rpc('recommend_recipes', 
        params: {
          'p_user_id': userId,
          'p_limit': limit,
          'p_exclude_consumed': excludeConsumed,
        }
      );
      
      return (response as List)
        .map((json) => Recipe.fromJson(json))
        .toList();
        
    } catch (e) {
      print('Error getting recommendations: $e');
      rethrow;
    }
  }
  
  /// Générer meal plan pour la semaine
  Future<Map<String, List<Recipe>>> generateWeeklyMealPlan() async {
    final recommendations = await getRecommendedRecipes(limit: 30);
    
    // Distribuer intelligemment sur 7 jours
    final mealPlan = <String, List<Recipe>>{};
    final daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    for (int i = 0; i < 7; i++) {
      final dayMeals = recommendations.skip(i * 3).take(3).toList();
      mealPlan[daysOfWeek[i]] = dayMeals;
    }
    
    return mealPlan;
  }
}
```

---

## 🔄 Déclenchement Vectorisation

### Quand Générer/Mettre à Jour les Vecteurs ?

#### **User Vector**

**Triggers :**
1. ✅ **Création compte** (après onboarding)
2. ✅ **Modification objectif santé** (goal_type, calorie_target, protein_target)
3. ✅ **Hebdomadaire** (cron job) si utilisateur actif
4. ✅ **Manuel** (bouton "Actualiser recommandations")

**Trigger SQL : Modification Profil**

```sql
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler edge function de manière async
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-user-vector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
    ),
    body := jsonb_build_object('user_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur mise à jour profil
CREATE TRIGGER on_user_profile_update
AFTER UPDATE OF calorie_target, protein_target, goal_type ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();

-- Trigger sur création utilisateur
CREATE TRIGGER on_user_created
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();
```

**Cron Job : Refresh Hebdomadaire**

```sql
-- Activer pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job : tous les dimanches à 2h du matin
SELECT cron.schedule(
  'weekly-user-vector-refresh',
  '0 2 * * 0', -- Dimanche 2h
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-user-vector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
    ),
    body := jsonb_build_object('user_id', id)
  )
  FROM users
  WHERE last_active_at > now() - interval '7 days'; -- Seulement users actifs
  $$
);
```

---

#### **Recipe Vector**

**Triggers :**
1. ✅ **Création recette**
2. ✅ **Modification macros**
3. ✅ **Modification tags**
4. ✅ **Quotidien** (cron job) pour nouvelles recettes

**Trigger SQL : Création/Modification Recette**

```sql
CREATE OR REPLACE FUNCTION trigger_recipe_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-recipe-vector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
    ),
    body := jsonb_build_object('recipe_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur création recette
CREATE TRIGGER on_recipe_created
AFTER INSERT ON receipe
FOR EACH ROW
EXECUTE FUNCTION trigger_recipe_vector_update();

-- Trigger sur modification macros
CREATE TRIGGER on_recipe_macro_updated
AFTER UPDATE ON receipe_macro
FOR EACH ROW
EXECUTE FUNCTION trigger_recipe_vector_update();

-- Trigger sur modification tags
CREATE TRIGGER on_recipe_tags_changed
AFTER INSERT OR UPDATE OR DELETE ON receipe_tags
FOR EACH ROW
EXECUTE FUNCTION trigger_recipe_vector_update();
```

**Cron Job : Nouvelles Recettes Quotidiennes**

```sql
SELECT cron.schedule(
  'daily-new-recipe-vectors',
  '0 3 * * *', -- Tous les jours à 3h
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-recipe-vector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
    ),
    body := jsonb_build_object('recipe_id', r.id)
  )
  FROM receipe r
  LEFT JOIN recipe_vectors rv ON rv.recipe_id = r.id
  WHERE rv.recipe_id IS NULL -- Recettes sans vecteur
     OR rv.last_updated < r.updated_at; -- Vecteur obsolète
  $$
);
```

---

## 📊 Métriques & Monitoring

### Dashboard Supabase : Requêtes SQL Utiles

**1. Nombre de vecteurs générés**
```sql
SELECT 
  'Users' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE last_updated > now() - interval '7 days') as updated_this_week
FROM user_vectors
UNION ALL
SELECT 
  'Recipes' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE last_updated > now() - interval '7 days') as updated_this_week
FROM recipe_vectors;
```

**2. Utilisateurs sans vecteur**
```sql
SELECT 
  u.id,
  u.email,
  u.created_at
FROM users u
LEFT JOIN user_vectors uv ON uv.user_id = u.id
WHERE uv.user_id IS NULL
ORDER BY u.created_at DESC;
```

**3. Recettes sans vecteur**
```sql
SELECT 
  r.id,
  r.name,
  r.created_at,
  p.username as creator
FROM receipe r
LEFT JOIN recipe_vectors rv ON rv.recipe_id = r.id
LEFT JOIN profiles p ON p.id = r.creator_id
WHERE rv.recipe_id IS NULL
ORDER BY r.created_at DESC;
```

**4. Distribution des scores de similarité**
```sql
-- Tester pour un user spécifique
WITH recommendations AS (
  SELECT * FROM recommend_recipes('USER_ID_HERE', 100)
)
SELECT 
  CASE 
    WHEN similarity_score >= 0.9 THEN '0.9-1.0 (Excellent)'
    WHEN similarity_score >= 0.8 THEN '0.8-0.9 (Très bon)'
    WHEN similarity_score >= 0.7 THEN '0.7-0.8 (Bon)'
    WHEN similarity_score >= 0.6 THEN '0.6-0.7 (Moyen)'
    ELSE '0.0-0.6 (Faible)'
  END as score_range,
  COUNT(*) as count
FROM recommendations
GROUP BY score_range
ORDER BY score_range DESC;
```

---

## 🚀 Migration V0 → V1

### Étapes de Migration

#### **Phase 1 : Setup Infrastructure**
1. ✅ Activer extension `pgvector` dans Supabase
2. ✅ Créer tables `user_vectors` et `recipe_vectors`
3. ✅ Déployer edge functions `generate-user-vector` et `generate-recipe-vector`
4. ✅ Créer fonction PostgreSQL `recommend_recipes`

#### **Phase 2 : Génération Initiale (Batch)**
```sql
-- Générer tous les user vectors (one-time)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-user-vector',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}',
      body := jsonb_build_object('user_id', user_record.id)
    );
    
    -- Rate limit : 1 requête par seconde
    PERFORM pg_sleep(1);
  END LOOP;
END $$;

-- Générer tous les recipe vectors (one-time)
DO $$
DECLARE
  recipe_record RECORD;
BEGIN
  FOR recipe_record IN SELECT id FROM receipe LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-recipe-vector',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}',
      body := jsonb_build_object('recipe_id', recipe_record.id)
    );
    
    PERFORM pg_sleep(1);
  END LOOP;
END $$;
```

#### **Phase 3 : Setup Triggers & Cron Jobs**
1. ✅ Créer triggers pour user/recipe updates
2. ✅ Setup cron jobs hebdomadaires/quotidiens
3. ✅ Tester déclenchement automatique

#### **Phase 4 : Migration Frontend Flutter**
1. ✅ Remplacer appels IA meal planner par `recommend_recipes` RPC
2. ✅ Tester interface utilisateur
3. ✅ A/B test si possible (10% users V1 vectorielle, 90% V0 IA)

#### **Phase 5 : Rollout Progressif**
1. ✅ 10% traffic → V1 vectorielle (1 semaine)
2. ✅ 50% traffic → V1 vectorielle (1 semaine)
3. ✅ 100% traffic → V1 vectorielle
4. ✅ Désactiver edge function IA meal planner V0

---

## 💰 Coûts Comparés V0 vs V1

### V0 : Meal Planner IA

**Coûts par génération :**
- Appel OpenAI GPT-4 : ~1000 tokens input + 500 tokens output
- Prix : ~$0.02 par génération

**Volume estimé :**
- 1000 users × 2 générations/semaine = 2000 générations/semaine
- **Coût mensuel : 2000 × 4 × $0.02 = $160/mois**

---

### V1 : Vectorisation

**Coûts one-time (génération vecteurs) :**
- Edge function : gratuit (compute inclus Supabase)
- Pas d'appel IA externe

**Coûts récurrents :**
- Cron jobs : gratuit (pg_cron inclus)
- Storage vecteurs : ~1 KB par vecteur
  - 1000 users + 2000 recettes = 3000 vecteurs
  - 3000 × 1 KB = 3 MB → **négligeable**

**Coût mensuel V1 : ~$0** 🎉

---

**Économies V1 vs V0 : ~$160/mois = $1,920/an**

---

## 📈 Performance Comparée

| Métrique | V0 IA | V1 Vectorielle | Amélioration |
|----------|-------|----------------|--------------|
| **Latence** | 500-1000ms | 50-100ms | **10x plus rapide** |
| **Coût par query** | ~$0.02 | ~$0.000 | **∞x moins cher** |
| **Déterminisme** | ❌ Non | ✅ Oui | **Prévisible** |
| **Scalabilité** | ❌ Coûts explosent | ✅ Linéaire | **Scalable** |
| **Personnalisation** | ⚠️ Limitée | ✅ Profonde | **Meilleure** |

---

## ✅ Checklist Implémentation

### Backend
- [ ] Activer extension pgvector
- [ ] Créer table `user_vectors`
- [ ] Créer table `recipe_vectors`
- [ ] Déployer edge function `generate-user-vector`
- [ ] Déployer edge function `generate-recipe-vector`
- [ ] Créer fonction PostgreSQL `recommend_recipes`
- [ ] Setup triggers user profile update
- [ ] Setup triggers recipe creation/update
- [ ] Setup cron job hebdomadaire users
- [ ] Setup cron job quotidien recipes
- [ ] Générer vecteurs initiaux (batch)

### Frontend Flutter
- [ ] Créer `MealPlannerService` avec méthode `getRecommendedRecipes()`
- [ ] Remplacer appels IA par appels RPC `recommend_recipes`
- [ ] UI : afficher similarity score (optionnel)
- [ ] UI : bouton "Actualiser recommandations" (force refresh vector)
- [ ] Tester avec différents profils users
- [ ] A/B test V0 vs V1 (si possible)

### Monitoring
- [ ] Dashboard Supabase : vecteurs générés
- [ ] Dashboard : users sans vecteur
- [ ] Dashboard : recettes sans vecteur
- [ ] Dashboard : distribution similarity scores
- [ ] Alertes si edge function échoue
- [ ] Métriques performance (latence RPC)

---

## 🔮 Évolution Future (V2)

Cette vectorisation V1 pose les **fondations pour V2** :

### Améliorations V2 Possibles

1. **Dimensions Additionnelles** (50 → 100+ dimensions)
   - Préférences goût (sucré, salé, épicé, amer)
   - Contexte social (repas solo, famille, amis)
   - Saison (recettes d'été vs hiver)
   - Budget (recettes économiques vs premium)

2. **Embeddings Sémantiques (Hybrid Search)**
   - Vectorisation texte (nom recette, description) via OpenAI embeddings
   - Combiner cosine similarity macros + sémantique
   - Recherche intelligente ("plat réconfortant rapide")

3. **Apprentissage Continu**
   - Ajuster poids dimensions selon feedback user
   - Si user skip souvent recettes épicées → réduire poids "spicy"
   - Reinforcement learning léger

4. **Clustering Utilisateurs**
   - Grouper users avec vecteurs similaires
   - Recommendations collaboratives ("users comme toi ont aimé...")

5. **Optimisation Performance**
   - HNSW index au lieu de IVFFlat (recherche plus rapide)
   - Quantization vecteurs (réduire taille mémoire)
   - Caching résultats recommandations fréquentes

---

## 📚 Ressources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Vector Search Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [Cosine Similarity Explained](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Recommendation Systems Overview](https://developers.google.com/machine-learning/recommendation)

---

**Date de création** : 21 février 2025  
**Auteur** : Curtis (Fondateur Akeli)  
**Status** : Spécification V1 - Prêt pour implémentation  
**Priorité** : Haute (remplace meal planner hasardeux V0)
