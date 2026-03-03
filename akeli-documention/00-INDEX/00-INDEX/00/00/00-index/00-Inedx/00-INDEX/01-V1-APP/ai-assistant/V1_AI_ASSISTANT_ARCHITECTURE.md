# Architecture de l'Agent IA Akeli - V1

## Vue d'ensemble

L'Agent IA Akeli est un assistant conversationnel intelligent intégré dans l'application mobile Akeli. Il permet aux utilisateurs d'interagir naturellement avec leurs données nutritionnelles, recettes, et meal plans via une interface de chat.

### Objectifs V1

- ✅ Conversations fluides et naturelles
- ✅ Accès intelligent aux données personnelles
- ✅ Réponses personnalisées basées sur le profil utilisateur
- ✅ Performances optimisées (1.5-3s temps de réponse)
- ✅ Coûts maîtrisés (fetch conditionnel)
- ❌ Pas d'actions (modification meal plan, création recettes) → V2

### Principe Fondamental : Architecture Hybride

**Fast Path (50-60% des conversations)** : Patterns simples détectés par regex → Réponse directe
**Smart Path (40-50% des conversations)** : Analyse IA → Fetch conditionnel → Réponse enrichie

---

## Architecture Technique Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION FLUTTER                       │
│                   (Interface Chat Akeli)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST
                            │ /functions/v1/ai-assistant-chat
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                          │
│              ai-assistant-chat/index.ts                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   1. INPUT VALIDATION   │
              │   - user_id             │
              │   - message             │
              │   - conversation_id?    │
              │   - include_history?    │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   2. LOAD MINIMAL       │
              │      CONTEXT            │
              │   - user.first_name     │
              │   - conversation hist   │
              │     (5 last messages)   │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────────┐
              │   3. PATTERN DETECTION          │
              │      (Fast Path Router)         │
              │                                 │
              │   Check against fast patterns:  │
              │   - Greetings                   │
              │   - Confirmations               │
              │   - Thanks                      │
              │   - Simple questions            │
              └─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
    ┌─────────────────┐       ┌─────────────────────┐
    │   FAST PATH     │       │    SMART PATH       │
    │   (~1.5s)       │       │    (~3.0s)          │
    └─────────────────┘       └─────────────────────┘
              │                           │
              │                           ▼
              │               ┌─────────────────────────┐
              │               │ 4. INTENTION ANALYSIS   │
              │               │    (GPT-4o-mini)        │
              │               │                         │
              │               │ Determine:              │
              │               │ - needs_data: bool      │
              │               │ - data_modules: []      │
              │               │ - conversation_type     │
              │               └─────────────────────────┘
              │                           │
              │                           ▼
              │               ┌─────────────────────────┐
              │               │ 5. CONDITIONAL FETCH    │
              │               │    (Parallel queries)   │
              │               │                         │
              │               │ IF needs_data = true:   │
              │               │   Fetch only required   │
              │               │   modules               │
              │               │                         │
              │               │ Modules disponibles:    │
              │               │ - user_profile          │
              │               │ - meal_plan             │
              │               │ - nutrition_stats       │
              │               │ - recipes_favorites     │
              │               │ - recipes_similar       │
              │               │ - recipes_recent        │
              │               │ - shopping_list         │
              │               │ - habits                │
              │               │ - groups                │
              │               └─────────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
              ┌─────────────────────────┐
              │ 6. CONTEXT BUILDER      │
              │                         │
              │ Agrège:                 │
              │ - Minimal context       │
              │ - Fetched data (si any) │
              │ - Conversation history  │
              │                         │
              │ Optimise tokens:        │
              │ - Max 4000 tokens       │
              │ - Priorise récent       │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ 7. RESPONSE GENERATION  │
              │    (GPT-4o-mini)        │
              │                         │
              │ System prompt: Akeli    │
              │ Context: Built context  │
              │ Message: User message   │
              │                         │
              │ Parameters:             │
              │ - max_tokens: 800       │
              │ - temperature: 0.7      │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ 8. RESPONSE PROCESSING  │
              │                         │
              │ - Validate response     │
              │ - Save to DB            │
              │ - Log analytics         │
              │ - Format for app        │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ 9. RETURN TO APP        │
              │                         │
              │ {                       │
              │   response: string,     │
              │   conversation_id: uid, │
              │   tokens_used: number,  │
              │   processing_time_ms    │
              │ }                       │
              └─────────────────────────┘
```

---

## Flux Détaillés

### Fast Path Flow (Conversations Simples)

```
USER MESSAGE: "Salut Akeli !"
                │
                ▼
    ┌───────────────────────┐
    │ Pattern Detection     │
    │ Regex: /^(salut|hey)/ │
    │ MATCH ✓               │
    └───────────────────────┘
                │
                ▼
    ┌───────────────────────────────┐
    │ Direct Response Generation    │
    │ (GPT-4o-mini)                 │
    │                               │
    │ Context:                      │
    │ - user.first_name: "Marie"    │
    │ - last_message (if any)       │
    │                               │
    │ Prompt:                       │
    │ "User said: Salut Akeli !     │
    │  Respond naturally as Akeli"  │
    └───────────────────────────────┘
                │
                ▼
    Response: "Hey Marie ! 😊 Comment ça va aujourd'hui ?"
    
    ⏱️ TOTAL TIME: ~1.2s
    💰 COST: ~$0.0002
```

### Smart Path Flow (Questions Complexes)

```
USER MESSAGE: "Combien de calories j'ai mangé aujourd'hui ?"
                │
                ▼
    ┌───────────────────────┐
    │ Pattern Detection     │
    │ No fast pattern match │
    │ → Smart Path          │
    └───────────────────────┘
                │
                ▼
    ┌─────────────────────────────────────┐
    │ PHASE 1: Intention Analysis         │
    │ (GPT-4o-mini with special prompt)   │
    │                                     │
    │ Prompt:                             │
    │ "Analyze this message and determine │
    │  what data modules are needed"      │
    │                                     │
    │ Input:                              │
    │ - message: "Combien de calories..." │
    │ - user_context: minimal             │
    └─────────────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │ Intention Result (JSON)     │
    │                             │
    │ {                           │
    │   needs_data: true,         │
    │   data_modules: [           │
    │     "nutrition_stats",      │
    │     "meal_plan"             │
    │   ],                        │
    │   conversation_type:        │
    │     "question"              │
    │ }                           │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────────────┐
    │ PHASE 2: Conditional Data Fetch     │
    │ (Parallel SQL queries)              │
    │                                     │
    │ Query 1: nutrition_stats            │
    │ SELECT calories_consumed,           │
    │        calories_target,             │
    │        macros                       │
    │ FROM nutrition_tracking             │
    │ WHERE user_id = $1                  │
    │   AND date = today()                │
    │                                     │
    │ Query 2: meal_plan                  │
    │ SELECT meal_name,                   │
    │        calories,                    │
    │        meal_time                    │
    │ FROM meal_plans                     │
    │ WHERE user_id = $1                  │
    │   AND date = today()                │
    │   AND consumed = true               │
    └─────────────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │ Fetched Data                │
    │                             │
    │ nutrition_stats: {          │
    │   calories_consumed: 1450,  │
    │   calories_target: 2000,    │
    │   protein: 85g,             │
    │   carbs: 180g,              │
    │   fat: 45g                  │
    │ }                           │
    │                             │
    │ meal_plan: [                │
    │   {                         │
    │     name: "Thiéboudienne",  │
    │     calories: 850,          │
    │     time: "12:30"           │
    │   },                        │
    │   {                         │
    │     name: "Smoothie",       │
    │     calories: 200,          │
    │     time: "08:00"           │
    │   }                         │
    │ ]                           │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────────────┐
    │ PHASE 3: Context Building           │
    │                                     │
    │ Formatted context for AI:           │
    │                                     │
    │ "User Profile:                      │
    │  - Name: Marie                      │
    │  - Daily calorie target: 2000 cal   │
    │                                     │
    │  Today's consumption:               │
    │  - Total: 1450 / 2000 cal           │
    │  - Breakfast (08:00): Smoothie      │
    │    200 cal                          │
    │  - Lunch (12:30): Thiéboudienne     │
    │    850 cal                          │
    │  - Remaining: 550 cal               │
    │                                     │
    │  Macros:                            │
    │  - Protein: 85g                     │
    │  - Carbs: 180g                      │
    │  - Fat: 45g"                        │
    └─────────────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────────────┐
    │ PHASE 4: Final Response Generation  │
    │ (GPT-4o-mini)                       │
    │                                     │
    │ System Prompt: Akeli personality    │
    │ Context: Built context above        │
    │ User Message: Original question     │
    │                                     │
    │ max_tokens: 800                     │
    │ temperature: 0.7                    │
    └─────────────────────────────────────┘
                │
                ▼
    Response: "Aujourd'hui tu as consommé 1,450 calories 
               sur tes 2,000 calories quotidiennes. Tu as 
               mangé du thiéboudienne au déjeuner (850 cal) 
               et un smoothie ce matin (200 cal). Il te reste 
               550 cal pour le dîner ! 💪"
    
    ⏱️ TOTAL TIME: ~2.8s
    💰 COST: ~$0.0008
```

---

## Structure de Fichiers

```
supabase/functions/
│
├── ai-assistant-chat/
│   └── index.ts                    # Point d'entrée Edge Function
│
└── _shared/
    │
    ├── patterns/
    │   ├── fast-patterns.ts        # Regex patterns pour fast path
    │   └── pattern-matcher.ts      # Logic de matching
    │
    ├── data-fetchers/
    │   ├── user-profile.ts         # getUserProfile(user_id)
    │   ├── nutrition-data.ts       # getMealPlan(), getNutritionStats()
    │   ├── recipe-data.ts          # getFavorites(), getSimilar(), getRecent()
    │   ├── behavioral-data.ts      # getUserHabits()
    │   └── community-data.ts       # getShoppingList(), getGroups()
    │
    ├── ai-service/
    │   ├── openai-client.ts        # Wrapper OpenAI API
    │   ├── intention-analyzer.ts   # analyzeIntention()
    │   ├── context-builder.ts      # buildContext(), optimizeTokens()
    │   ├── response-generator.ts   # generateResponse()
    │   └── system-prompts.ts       # System prompts constants
    │
    ├── conversation/
    │   ├── history-manager.ts      # getHistory(), saveMessage()
    │   ├── conversation-db.ts      # DB operations
    │   └── types.ts                # Conversation types
    │
    └── utils/
        ├── types.ts                # Types globaux
        ├── validation.ts           # Input validation
        ├── error-handler.ts        # Error handling
        ├── logger.ts               # Structured logging
        └── token-counter.ts        # Token estimation
```

---

## Schéma Base de Données

### Table: `ai_conversations`

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT, -- Auto-generated from first message
  message_count INT DEFAULT 0,
  
  -- Indexes
  INDEX idx_conversations_user (user_id),
  INDEX idx_conversations_updated (updated_at DESC)
);
```

### Table: `ai_messages`

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tokens_used INT,
  processing_time_ms INT,
  
  -- Technical details
  path_type TEXT CHECK (path_type IN ('fast', 'smart')),
  data_modules_fetched TEXT[], -- Array of module names
  intention_analysis JSONB, -- Store intention analysis result
  
  -- Indexes
  INDEX idx_messages_conversation (conversation_id, created_at),
  INDEX idx_messages_user (user_id, created_at DESC)
);
```

### Table: `ai_analytics`

```sql
CREATE TABLE ai_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Metrics
  total_messages INT DEFAULT 0,
  fast_path_count INT DEFAULT 0,
  smart_path_count INT DEFAULT 0,
  
  total_tokens_used INT DEFAULT 0,
  avg_processing_time_ms INT,
  
  -- Most used modules
  modules_usage JSONB, -- { "meal_plan": 5, "nutrition_stats": 3, ... }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, date),
  INDEX idx_analytics_user_date (user_id, date DESC)
);
```

---

## Modules de Données

### Module 1: `user_profile`

**Quand l'utiliser :**
- Questions sur objectifs personnels
- Demandes de recommandations personnalisées
- Questions sur préférences alimentaires

**Données retournées :**
```typescript
{
  first_name: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals: {
    type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'health';
    target_weight?: number;
    target_date?: string;
  };
  preferences: {
    diet_type?: string;
    allergies: string[];
    dislikes: string[];
    cultural_origin?: string;
  };
  daily_targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}
```

**Estimation tokens :** ~200 tokens

---

### Module 2: `meal_plan`

**Quand l'utiliser :**
- Questions sur repas prévus/consommés
- "Qu'est-ce que je mange aujourd'hui/demain ?"
- Vérification calories restantes

**Données retournées :**
```typescript
{
  date: string;
  meals: [
    {
      id: string;
      name: string;
      recipe_id: string;
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      scheduled_time?: string;
      consumed: boolean;
      consumed_at?: string;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  ];
  daily_totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}
```

**Estimation tokens :** ~400 tokens

---

### Module 3: `nutrition_stats`

**Quand l'utiliser :**
- Questions sur calories consommées
- Progression vers objectifs
- Statistiques nutritionnelles

**Données retournées :**
```typescript
{
  period: 'today' | 'week' | 'month';
  start_date: string;
  end_date: string;
  
  calories: {
    consumed: number;
    target: number;
    remaining: number;
    avg_daily: number;
  };
  
  macros: {
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  
  progress: {
    weight_change?: number;
    days_on_track: number;
    total_days: number;
    compliance_rate: number; // 0-100%
  };
}
```

**Estimation tokens :** ~300 tokens

---

### Module 4: `recipes_favorites`

**Quand l'utiliser :**
- "Quelles sont mes recettes préférées ?"
- Recommandations basées sur goûts
- Recherche de recettes familières

**Données retournées :**
```typescript
{
  recipes: [
    {
      id: string;
      name: string;
      creator_name: string;
      times_consumed: number;
      last_consumed: string;
      avg_rating?: number;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      tags: string[];
    }
  ];
  total_count: number;
  limit: number; // Default: 10
}
```

**Estimation tokens :** ~500 tokens

---

### Module 5: `recipes_similar`

**Quand l'utiliser :**
- Découverte nouvelles recettes
- "Propose-moi une recette"
- Recommandations personnalisées

**Données retournées :**
```typescript
{
  recipes: [
    {
      id: string;
      name: string;
      creator_name: string;
      similarity_score: number; // 0-1
      match_reasons: string[]; // ["similar_to_mafé", "matches_preferences"]
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      tags: string[];
      cultural_origin: string;
    }
  ];
  total_count: number;
  limit: number; // Default: 5
}
```

**Estimation tokens :** ~600 tokens

---

### Module 6: `recipes_recent`

**Quand l'utiliser :**
- "Qu'est-ce que j'ai regardé récemment ?"
- Continuer exploration précédente
- Historique navigation

**Données retournées :**
```typescript
{
  recipes: [
    {
      id: string;
      name: string;
      creator_name: string;
      viewed_at: string;
      saved: boolean;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  ];
  limit: number; // Default: 10
}
```

**Estimation tokens :** ~300 tokens

---

### Module 7: `shopping_list`

**Quand l'utiliser :**
- Questions sur courses à faire
- "Qu'est-ce que je dois acheter ?"
- Aide planification courses

**Données retournées :**
```typescript
{
  list_id: string;
  created_at: string;
  updated_at: string;
  
  items: [
    {
      ingredient_name: string;
      quantity: number;
      unit: string;
      checked: boolean;
      category?: string; // "légumes", "viandes", "épices"
      recipes: string[]; // Recipe names using this ingredient
    }
  ];
  
  total_items: number;
  checked_items: number;
  completion_rate: number; // 0-100%
}
```

**Estimation tokens :** ~400 tokens

---

### Module 8: `habits`

**Quand l'utiliser :**
- Analyse comportementale
- Questions sur routines
- Optimisation horaires repas

**Données retournées :**
```typescript
{
  meal_times: {
    breakfast: { avg_time: string; consistency: number }; // 0-100%
    lunch: { avg_time: string; consistency: number };
    dinner: { avg_time: string; consistency: number };
  };
  
  weekly_patterns: {
    most_active_day: string;
    least_active_day: string;
    avg_meals_per_day: number;
  };
  
  recipe_preferences: {
    most_consumed_type: string;
    avg_prep_time_preference: number; // minutes
    cultural_preference: string[];
  };
  
  tracking_consistency: {
    days_tracked_last_30: number;
    current_streak: number;
    longest_streak: number;
  };
}
```

**Estimation tokens :** ~200 tokens

---

### Module 9: `groups`

**Quand l'utiliser :**
- Questions sur communauté
- Recherche groupes de discussion
- Recommandations sociales

**Données retournées :**
```typescript
{
  recommended_groups: [
    {
      id: string;
      name: string;
      description: string;
      member_count: number;
      activity_level: 'low' | 'medium' | 'high';
      tags: string[];
      match_reasons: string[]; // Why recommended
      joined: boolean;
    }
  ];
  
  user_groups: [
    {
      id: string;
      name: string;
      last_activity: string;
      unread_messages: number;
    }
  ];
  
  total_available: number;
  limit: number; // Default: 5
}
```

**Estimation tokens :** ~300 tokens

---

## Stratégie de Fetch Conditionnel

### Principe de Parallélisation

Tous les modules nécessaires sont fetchés **en parallèle** pour optimiser le temps de réponse.

```typescript
// Pseudo-code

async function fetchRequiredModules(
  modules: DataModule[], 
  user_id: string
): Promise<Record<string, any>> {
  
  const fetchPromises = [];
  
  if (modules.includes('user_profile')) {
    fetchPromises.push(getUserProfile(user_id));
  }
  
  if (modules.includes('meal_plan')) {
    fetchPromises.push(getMealPlan(user_id, 'today'));
  }
  
  if (modules.includes('nutrition_stats')) {
    fetchPromises.push(getNutritionStats(user_id, 'today'));
  }
  
  // ... autres modules
  
  // Execute all queries in parallel
  const results = await Promise.all(fetchPromises);
  
  // Map results to module names
  return mapResultsToModules(modules, results);
}
```

**Temps de fetch :**
- 1 module : ~150ms
- 3 modules : ~300ms (parallèle)
- 5 modules : ~450ms (parallèle)

---

## Gestion des Erreurs

### Catégories d'Erreurs

**1. Erreurs de Validation**
- Message vide
- user_id invalide
- Format conversation_id incorrect

**Action :** Retour 400 Bad Request

---

**2. Erreurs de Fetch DB**
- Query timeout
- Connexion perdue
- Données corrompues

**Action :** 
- Retry 1 fois
- Si échec : Continuer sans ces données
- Logger l'erreur
- Mentionner à l'utilisateur que certaines données ne sont pas disponibles

---

**3. Erreurs OpenAI**
- Rate limit
- Timeout
- Erreur API

**Action :**
- Retry avec backoff exponentiel (3 tentatives)
- Si échec final : Message d'erreur poli
- Logger l'incident

---

**4. Erreurs Inattendues**
- Exception non gérée

**Action :**
- Catch global
- Logger stack trace
- Retour message générique : "Je rencontre un problème technique, réessaye dans quelques instants"

---

## Optimisations de Performance

### 1. Caching Contexte Utilisateur

**Problème :** Fetcher le profil à chaque message = lourd

**Solution :** Cache en mémoire (Edge Function) avec TTL

```typescript
// Cache simple en mémoire
const userProfileCache = new Map<string, {
  data: UserProfile;
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedUserProfile(user_id: string) {
  const cached = userProfileCache.get(user_id);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  const fresh = await getUserProfile(user_id);
  userProfileCache.set(user_id, {
    data: fresh,
    timestamp: Date.now()
  });
  
  return fresh;
}
```

**Gain :** 50-100ms sur profil utilisateur

---

### 2. Index Base de Données

**Indexes critiques à créer :**

```sql
-- Pour ai_messages (historique conversation)
CREATE INDEX idx_messages_conversation_recent 
ON ai_messages(conversation_id, created_at DESC);

-- Pour meal_plans (fetch quotidien)
CREATE INDEX idx_meal_plans_user_date 
ON meal_plans(user_id, date DESC, consumed);

-- Pour recipes (favorites)
CREATE INDEX idx_recipe_consumption_user 
ON recipe_consumption(user_id, consumed_at DESC);

-- Pour nutrition tracking
CREATE INDEX idx_nutrition_user_date 
ON nutrition_tracking(user_id, date DESC);
```

---

### 3. Limite Historique Conversation

**Problème :** Historique long = tokens élevés

**Solution :** Limite intelligente

```typescript
const MAX_HISTORY_MESSAGES = 5; // 5 derniers messages
const MAX_HISTORY_TOKENS = 1000; // Max 1000 tokens d'historique

async function getConversationHistory(
  conversation_id: string
): Promise<Message[]> {
  
  const messages = await db
    .select('*')
    .from('ai_messages')
    .where('conversation_id', conversation_id)
    .orderBy('created_at', 'desc')
    .limit(MAX_HISTORY_MESSAGES);
  
  // Reverse to chronological order
  return messages.reverse();
}
```

---

### 4. Token Estimation Pré-Fetch

**Problème :** Modules peuvent être trop volumineux

**Solution :** Estimer tokens avant de builder le contexte

```typescript
function estimateModuleTokens(module: DataModule): number {
  const ESTIMATES = {
    user_profile: 200,
    meal_plan: 400,
    nutrition_stats: 300,
    recipes_favorites: 500,
    recipes_similar: 600,
    recipes_recent: 300,
    shopping_list: 400,
    habits: 200,
    groups: 300
  };
  
  return ESTIMATES[module] || 300;
}

function selectModulesToFetch(
  requested: DataModule[],
  maxTokens: number = 3000
): DataModule[] {
  
  let totalTokens = 0;
  const selected: DataModule[] = [];
  
  // Priorise modules par importance
  const prioritized = prioritizeModules(requested);
  
  for (const module of prioritized) {
    const moduleTokens = estimateModuleTokens(module);
    
    if (totalTokens + moduleTokens <= maxTokens) {
      selected.push(module);
      totalTokens += moduleTokens;
    }
  }
  
  return selected;
}
```

---

## Métriques & Monitoring

### Métriques Clés à Tracker

**Performance :**
- Temps de réponse moyen (fast path vs smart path)
- Temps de fetch DB moyen
- Temps appel OpenAI moyen
- Distribution fast/smart path (%)

**Utilisation :**
- Nombre de messages par jour
- Modules les plus utilisés
- Conversations actives
- Taux d'erreur

**Coûts :**
- Tokens utilisés par jour
- Coût OpenAI par jour
- Coût moyen par conversation

**Qualité :**
- Taux de satisfaction (si feedback utilisateur)
- Messages d'erreur vs messages réussis
- Retries nécessaires

---

### Logs Structurés

Chaque message génère un log structuré :

```json
{
  "timestamp": "2025-02-21T14:32:15Z",
  "user_id": "uuid-123",
  "conversation_id": "uuid-456",
  "message_id": "uuid-789",
  
  "path_type": "smart",
  "processing_time_ms": 2850,
  
  "phases": {
    "validation": 5,
    "pattern_detection": 10,
    "intention_analysis": 1200,
    "data_fetch": 350,
    "context_building": 50,
    "response_generation": 1200,
    "save_db": 35
  },
  
  "modules_fetched": ["meal_plan", "nutrition_stats"],
  "tokens_used": 450,
  "cost_usd": 0.0008,
  
  "user_message_length": 45,
  "response_length": 180,
  
  "error": null
}
```

---

## Considérations de Sécurité

### 1. Row Level Security (RLS)

Toutes les tables doivent avoir RLS activé :

```sql
-- ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own conversations"
ON ai_conversations FOR ALL
USING (user_id = auth.uid());

-- ai_messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own messages"
ON ai_messages FOR ALL
USING (user_id = auth.uid());
```

---

### 2. Validation Inputs

Toujours valider et sanitiser les inputs utilisateur :

```typescript
function validateMessage(message: string): string {
  // Trim whitespace
  const trimmed = message.trim();
  
  // Check length
  if (trimmed.length === 0) {
    throw new Error('Message cannot be empty');
  }
  
  if (trimmed.length > 2000) {
    throw new Error('Message too long (max 2000 characters)');
  }
  
  // Basic sanitization (remove potential injection)
  const sanitized = trimmed
    .replace(/[<>]/g, '') // Remove HTML tags
    .slice(0, 2000); // Hard limit
  
  return sanitized;
}
```

---

### 3. Rate Limiting

Protection contre abus :

```typescript
// Rate limit: 30 messages par minute par utilisateur
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000; // 1 minute

async function checkRateLimit(user_id: string): Promise<boolean> {
  const count = await db
    .count('*')
    .from('ai_messages')
    .where('user_id', user_id)
    .where('created_at', '>', new Date(Date.now() - RATE_WINDOW));
  
  return count < RATE_LIMIT;
}
```

---

### 4. Filtrage Contenu Sensible

Ne jamais exposer de données sensibles dans les logs ou réponses :

```typescript
function sanitizeForLogging(data: any): any {
  // Remove sensitive fields before logging
  const { 
    password, 
    email, 
    phone, 
    payment_info,
    ...safe 
  } = data;
  
  return safe;
}
```

---

## Évolution V1 → V1.1 (Streaming)

### Architecture Streaming

```
┌─────────────────────────────────┐
│ Edge Function (Streaming)       │
│                                 │
│ response = new ReadableStream() │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ OpenAI Streaming Call           │
│                                 │
│ stream: true                    │
│ onToken: (token) => {           │
│   controller.enqueue(token)     │
│ }                               │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ App Flutter (StreamBuilder)     │
│                                 │
│ Affiche tokens au fur et mesure │
│ "Akeli écrit..." indicator      │
└─────────────────────────────────┘
```

**Avantages :**
- Premier token à ~1.5s
- Perception de réactivité
- UX moderne

**Complexité :**
- Gestion état streaming côté Flutter
- Buffering tokens
- Gestion erreurs mid-stream

**Recommandation :** V1.1 (après validation V1.0)

---

## Roadmap Implémentation

### Phase 1 : Foundation (Semaine 1-2)
- ✅ Structure fichiers
- ✅ Types TypeScript
- ✅ Schéma DB + migrations
- ✅ Fast patterns definitions

### Phase 2 : Data Layer (Semaine 2-3)
- ✅ Data fetchers (9 modules)
- ✅ Tests unitaires fetchers
- ✅ Index DB optimisés

### Phase 3 : AI Layer (Semaine 3-4)
- ✅ OpenAI client wrapper
- ✅ Intention analyzer
- ✅ Context builder
- ✅ Response generator
- ✅ System prompts

### Phase 4 : Integration (Semaine 4-5)
- ✅ Edge Function principale
- ✅ Pattern matching
- ✅ Conditional fetch logic
- ✅ Error handling
- ✅ Logging

### Phase 5 : Testing (Semaine 5-6)
- ✅ Tests end-to-end
- ✅ Performance testing
- ✅ Load testing
- ✅ User acceptance testing

### Phase 6 : Deployment (Semaine 6)
- ✅ Production deployment
- ✅ Monitoring setup
- ✅ Analytics dashboard
- ✅ Documentation finale

---

## Conclusion

Cette architecture hybride offre le meilleur compromis entre :
- **Performance** (1.5-3s selon complexité)
- **Coût** (fetch conditionnel optimisé)
- **Qualité** (réponses personnalisées et pertinentes)
- **Évolutivité** (facile d'ajouter modules et features)

La phase V1.0 se concentre sur la solidité et la fiabilité, avec une voie claire vers V1.1 (streaming) et V2 (actions intelligentes).
