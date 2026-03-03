# Spécifications Techniques - Agent IA Akeli V1

## Vue d'ensemble

Ce document contient toutes les spécifications techniques nécessaires pour implémenter l'Agent IA Akeli V1. Il inclut les types TypeScript, les requêtes SQL, les schemas de validation, et les détails d'implémentation.

---

## Types TypeScript

### Core Types

```typescript
// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tokens_used?: number;
  processing_time_ms?: number;
  path_type?: 'fast' | 'smart';
  data_modules_fetched?: DataModule[];
  intention_analysis?: IntentionAnalysis;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  title?: string;
  message_count: number;
}

export interface ConversationHistory {
  messages: Message[];
  total_count: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
  user_id: string;
  message: string;
  conversation_id?: string;
  include_history?: boolean;
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  message_id: string;
  tokens_used: number;
  processing_time_ms: number;
  path_type: 'fast' | 'smart';
  modules_used?: DataModule[];
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

// ============================================================================
// DATA MODULE TYPES
// ============================================================================

export type DataModule = 
  | 'user_profile'
  | 'meal_plan'
  | 'nutrition_stats'
  | 'recipes_favorites'
  | 'recipes_similar'
  | 'recipes_recent'
  | 'shopping_list'
  | 'habits'
  | 'groups';

export interface UserProfile {
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

export interface MealPlanData {
  date: string;
  meals: Meal[];
  daily_totals: NutritionTotals;
}

export interface Meal {
  id: string;
  name: string;
  recipe_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  scheduled_time?: string;
  consumed: boolean;
  consumed_at?: string;
  nutrition: NutritionInfo;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTotals extends NutritionInfo {}

export interface NutritionStats {
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
    compliance_rate: number;
  };
}

export interface Recipe {
  id: string;
  name: string;
  creator_name: string;
  nutrition: NutritionInfo;
  tags: string[];
  cultural_origin?: string;
}

export interface FavoriteRecipe extends Recipe {
  times_consumed: number;
  last_consumed: string;
  avg_rating?: number;
}

export interface SimilarRecipe extends Recipe {
  similarity_score: number;
  match_reasons: string[];
}

export interface RecentRecipe extends Recipe {
  viewed_at: string;
  saved: boolean;
}

export interface ShoppingList {
  list_id: string;
  created_at: string;
  updated_at: string;
  items: ShoppingItem[];
  total_items: number;
  checked_items: number;
  completion_rate: number;
}

export interface ShoppingItem {
  ingredient_name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category?: string;
  recipes: string[];
}

export interface UserHabits {
  meal_times: {
    breakfast: { avg_time: string; consistency: number };
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
    avg_prep_time_preference: number;
    cultural_preference: string[];
  };
  tracking_consistency: {
    days_tracked_last_30: number;
    current_streak: number;
    longest_streak: number;
  };
}

export interface RecommendedGroups {
  recommended_groups: Group[];
  user_groups: UserGroup[];
  total_available: number;
  limit: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  activity_level: 'low' | 'medium' | 'high';
  tags: string[];
  match_reasons: string[];
  joined: boolean;
}

export interface UserGroup {
  id: string;
  name: string;
  last_activity: string;
  unread_messages: number;
}

// ============================================================================
// INTENTION ANALYSIS TYPES
// ============================================================================

export interface IntentionAnalysis {
  needs_data: boolean;
  data_modules: DataModule[];
  conversation_type: ConversationType;
  urgency?: 'low' | 'medium' | 'high';
  confidence?: number; // 0-1
}

export type ConversationType = 
  | 'greeting'
  | 'question'
  | 'recommendation'
  | 'confirmation'
  | 'feedback'
  | 'complaint'
  | 'general';

// ============================================================================
// AI SERVICE TYPES
// ============================================================================

export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o-mini';
  maxTokens: number;
  temperature: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface BuiltContext {
  user_info: {
    first_name: string;
    user_id: string;
  };
  conversation_history?: Message[];
  fetched_data?: Record<DataModule, any>;
  total_tokens_estimate: number;
}

export interface ContextBuildOptions {
  max_tokens: number;
  prioritize_recent: boolean;
  include_history: boolean;
  max_history_messages: number;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export interface LogEntry {
  timestamp: string;
  user_id: string;
  conversation_id: string;
  message_id: string;
  path_type: 'fast' | 'smart';
  processing_time_ms: number;
  phases: {
    validation: number;
    pattern_detection: number;
    intention_analysis?: number;
    data_fetch?: number;
    context_building: number;
    response_generation: number;
    save_db: number;
  };
  modules_fetched?: DataModule[];
  tokens_used: number;
  cost_usd: number;
  user_message_length: number;
  response_length: number;
  error?: string;
}

// ============================================================================
// PATTERN MATCHING TYPES
// ============================================================================

export interface PatternMatch {
  matched: boolean;
  pattern_type?: string;
  confidence: number;
}

export interface FastPattern {
  name: string;
  regex: RegExp;
  response_template?: string;
}
```

---

## Requêtes SQL

### 1. Conversation Management

```sql
-- ============================================================================
-- CREATE NEW CONVERSATION
-- ============================================================================

INSERT INTO ai_conversations (user_id, title)
VALUES ($1, $2)
RETURNING id, created_at, updated_at;

-- Params: user_id, title (nullable)

-- ============================================================================
-- GET CONVERSATION BY ID
-- ============================================================================

SELECT id, user_id, created_at, updated_at, title, message_count
FROM ai_conversations
WHERE id = $1 AND user_id = $2;

-- Params: conversation_id, user_id

-- ============================================================================
-- UPDATE CONVERSATION TIMESTAMP & COUNT
-- ============================================================================

UPDATE ai_conversations
SET updated_at = NOW(),
    message_count = message_count + 1
WHERE id = $1
RETURNING updated_at, message_count;

-- Params: conversation_id

-- ============================================================================
-- GET CONVERSATION HISTORY (Last 5 messages)
-- ============================================================================

SELECT id, role, content, created_at, tokens_used
FROM ai_messages
WHERE conversation_id = $1
ORDER BY created_at DESC
LIMIT 5;

-- Params: conversation_id
-- Note: Reverse in code to get chronological order

-- ============================================================================
-- SAVE MESSAGE
-- ============================================================================

INSERT INTO ai_messages (
  conversation_id,
  user_id,
  role,
  content,
  tokens_used,
  processing_time_ms,
  path_type,
  data_modules_fetched,
  intention_analysis
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, created_at;

-- Params: conversation_id, user_id, role, content, tokens_used,
--         processing_time_ms, path_type, data_modules_fetched, intention_analysis
```

---

### 2. User Profile Module

```sql
-- ============================================================================
-- GET USER PROFILE
-- ============================================================================

SELECT 
  u.id,
  u.first_name,
  u.age,
  u.weight,
  u.height,
  u.gender,
  
  -- Goals
  g.goal_type,
  g.target_weight,
  g.target_date,
  
  -- Preferences
  p.diet_type,
  p.allergies,
  p.dislikes,
  p.cultural_origin,
  
  -- Daily targets
  t.calories as target_calories,
  t.protein as target_protein,
  t.carbs as target_carbs,
  t.fat as target_fat

FROM users u
LEFT JOIN user_goals g ON u.id = g.user_id
LEFT JOIN user_preferences p ON u.id = p.user_id
LEFT JOIN user_daily_targets t ON u.id = t.user_id
WHERE u.id = $1;

-- Params: user_id
-- Returns: Single row with all user profile data
```

---

### 3. Meal Plan Module

```sql
-- ============================================================================
-- GET MEAL PLAN FOR DATE
-- ============================================================================

SELECT 
  mp.id,
  mp.date,
  mp.meal_type,
  mp.scheduled_time,
  mp.consumed,
  mp.consumed_at,
  
  r.id as recipe_id,
  r.name as recipe_name,
  r.calories,
  r.protein,
  r.carbs,
  r.fat

FROM meal_plans mp
INNER JOIN recipes r ON mp.recipe_id = r.id
WHERE mp.user_id = $1 
  AND mp.date = $2
ORDER BY 
  CASE mp.meal_type
    WHEN 'breakfast' THEN 1
    WHEN 'lunch' THEN 2
    WHEN 'dinner' THEN 3
    WHEN 'snack' THEN 4
  END;

-- Params: user_id, date (format: 'YYYY-MM-DD')
-- Returns: Multiple rows, one per meal

-- ============================================================================
-- GET DAILY TOTALS
-- ============================================================================

SELECT 
  COALESCE(SUM(r.calories), 0) as total_calories,
  COALESCE(SUM(r.protein), 0) as total_protein,
  COALESCE(SUM(r.carbs), 0) as total_carbs,
  COALESCE(SUM(r.fat), 0) as total_fat

FROM meal_plans mp
INNER JOIN recipes r ON mp.recipe_id = r.id
WHERE mp.user_id = $1 
  AND mp.date = $2
  AND mp.consumed = true;

-- Params: user_id, date
-- Returns: Single row with totals
```

---

### 4. Nutrition Stats Module

```sql
-- ============================================================================
-- GET NUTRITION STATS FOR PERIOD
-- ============================================================================

-- For TODAY
SELECT 
  COALESCE(SUM(nt.calories), 0) as consumed_calories,
  COALESCE(SUM(nt.protein), 0) as consumed_protein,
  COALESCE(SUM(nt.carbs), 0) as consumed_carbs,
  COALESCE(SUM(nt.fat), 0) as consumed_fat,
  
  -- Targets (same for all rows, so use MAX)
  MAX(udt.calories) as target_calories,
  MAX(udt.protein) as target_protein,
  MAX(udt.carbs) as target_carbs,
  MAX(udt.fat) as target_fat,
  
  -- Progress
  COUNT(DISTINCT nt.date) as days_tracked,
  COUNT(DISTINCT CASE 
    WHEN nt.calories <= udt.calories THEN nt.date 
  END) as days_on_track

FROM nutrition_tracking nt
CROSS JOIN user_daily_targets udt
WHERE nt.user_id = $1 
  AND udt.user_id = $1
  AND nt.date = CURRENT_DATE;

-- Params: user_id
-- Returns: Single row

-- For WEEK (last 7 days)
SELECT 
  COALESCE(SUM(nt.calories), 0) as consumed_calories,
  COALESCE(AVG(nt.calories), 0) as avg_daily_calories,
  -- ... similar structure
WHERE nt.user_id = $1 
  AND nt.date >= CURRENT_DATE - INTERVAL '7 days'
  AND nt.date <= CURRENT_DATE;

-- ============================================================================
-- GET WEIGHT PROGRESS
-- ============================================================================

SELECT 
  (w_latest.weight - w_start.weight) as weight_change
FROM (
  SELECT weight 
  FROM weight_tracking 
  WHERE user_id = $1 
  ORDER BY date DESC 
  LIMIT 1
) w_latest,
(
  SELECT weight 
  FROM weight_tracking 
  WHERE user_id = $1 
  ORDER BY date ASC 
  LIMIT 1
) w_start;

-- Params: user_id
-- Returns: Single row with weight change (can be negative)
```

---

### 5. Recipes Favorites Module

```sql
-- ============================================================================
-- GET FAVORITE RECIPES (Top 10 by consumption)
-- ============================================================================

SELECT 
  r.id,
  r.name,
  r.calories,
  r.protein,
  r.carbs,
  r.fat,
  r.tags,
  
  u.first_name as creator_name,
  
  COUNT(rc.id) as times_consumed,
  MAX(rc.consumed_at) as last_consumed,
  AVG(rc.rating) as avg_rating

FROM recipes r
INNER JOIN recipe_consumption rc ON r.id = rc.recipe_id
INNER JOIN users u ON r.creator_id = u.id
WHERE rc.user_id = $1
GROUP BY r.id, u.first_name
ORDER BY times_consumed DESC, last_consumed DESC
LIMIT 10;

-- Params: user_id
-- Returns: Up to 10 rows
```

---

### 6. Recipes Similar Module

```sql
-- ============================================================================
-- GET SIMILAR RECIPES (Vector similarity)
-- ============================================================================

-- Note: Cette query nécessite pgvector extension
-- Suppose que tu as une colonne embedding dans recipes table

SELECT 
  r.id,
  r.name,
  r.calories,
  r.protein,
  r.carbs,
  r.fat,
  r.tags,
  r.cultural_origin,
  
  u.first_name as creator_name,
  
  -- Similarity score (cosine similarity)
  1 - (r.embedding <=> up.preference_vector) as similarity_score

FROM recipes r
INNER JOIN users u ON r.creator_id = u.id
CROSS JOIN user_preferences up
WHERE up.user_id = $1
  AND r.id NOT IN (
    -- Exclude already consumed recipes
    SELECT recipe_id FROM recipe_consumption WHERE user_id = $1
  )
ORDER BY similarity_score DESC
LIMIT 5;

-- Params: user_id
-- Returns: Up to 5 rows

-- ALTERNATIVE si pas de vecteurs (simple matching sur tags/origin)

SELECT 
  r.id,
  r.name,
  r.calories,
  r.protein,
  r.carbs,
  r.fat,
  r.tags,
  r.cultural_origin,
  
  u.first_name as creator_name

FROM recipes r
INNER JOIN users u ON r.creator_id = u.id
INNER JOIN user_preferences up ON up.user_id = $1
WHERE (
  -- Match cultural origin
  r.cultural_origin = up.cultural_origin
  -- Match tags
  OR r.tags && up.favorite_tags
)
  -- Exclude allergies
  AND NOT (r.ingredients @> up.allergies)
  -- Exclude consumed
  AND r.id NOT IN (
    SELECT recipe_id FROM recipe_consumption WHERE user_id = $1
  )
ORDER BY RANDOM()
LIMIT 5;

-- Params: user_id
```

---

### 7. Recipes Recent Module

```sql
-- ============================================================================
-- GET RECENTLY VIEWED RECIPES
-- ============================================================================

SELECT 
  r.id,
  r.name,
  r.calories,
  r.protein,
  r.carbs,
  r.fat,
  
  u.first_name as creator_name,
  
  rv.viewed_at,
  EXISTS(
    SELECT 1 FROM saved_recipes sr 
    WHERE sr.recipe_id = r.id AND sr.user_id = $1
  ) as saved

FROM recipe_views rv
INNER JOIN recipes r ON rv.recipe_id = r.id
INNER JOIN users u ON r.creator_id = u.id
WHERE rv.user_id = $1
ORDER BY rv.viewed_at DESC
LIMIT 10;

-- Params: user_id
-- Returns: Up to 10 rows
```

---

### 8. Shopping List Module

```sql
-- ============================================================================
-- GET ACTIVE SHOPPING LIST
-- ============================================================================

SELECT 
  sl.id as list_id,
  sl.created_at,
  sl.updated_at,
  
  sli.ingredient_name,
  sli.quantity,
  sli.unit,
  sli.checked,
  sli.category

FROM shopping_lists sl
INNER JOIN shopping_list_items sli ON sl.id = sli.list_id
WHERE sl.user_id = $1
  AND sl.status = 'active'
ORDER BY sli.category, sli.ingredient_name;

-- Params: user_id
-- Returns: Multiple rows (items)

-- ============================================================================
-- GET SHOPPING LIST STATS
-- ============================================================================

SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE checked = true) as checked_items,
  ROUND(
    (COUNT(*) FILTER (WHERE checked = true)::numeric / COUNT(*)) * 100, 
    0
  ) as completion_rate

FROM shopping_list_items sli
INNER JOIN shopping_lists sl ON sli.list_id = sl.id
WHERE sl.user_id = $1
  AND sl.status = 'active';

-- Params: user_id
-- Returns: Single row
```

---

### 9. User Habits Module

```sql
-- ============================================================================
-- GET MEAL TIME HABITS (Last 30 days)
-- ============================================================================

SELECT 
  meal_type,
  
  -- Average time
  DATE_PART('hour', AVG(consumed_at::time)) as avg_hour,
  DATE_PART('minute', AVG(consumed_at::time)) as avg_minute,
  
  -- Consistency (standard deviation of times)
  EXTRACT(EPOCH FROM STDDEV(consumed_at::time)) / 3600 as time_variance_hours

FROM meal_plans
WHERE user_id = $1
  AND consumed = true
  AND consumed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY meal_type;

-- Params: user_id
-- Returns: Up to 4 rows (breakfast, lunch, dinner, snack)

-- ============================================================================
-- GET WEEKLY PATTERNS
-- ============================================================================

SELECT 
  EXTRACT(DOW FROM date) as day_of_week,
  COUNT(DISTINCT date) as days_count,
  AVG(meals_per_day) as avg_meals

FROM (
  SELECT 
    date,
    COUNT(*) as meals_per_day
  FROM meal_plans
  WHERE user_id = $1
    AND consumed = true
    AND date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY date
) daily_meals
GROUP BY day_of_week
ORDER BY avg_meals DESC;

-- Params: user_id

-- ============================================================================
-- GET TRACKING CONSISTENCY
-- ============================================================================

SELECT 
  COUNT(DISTINCT date) as days_tracked_last_30,
  
  -- Current streak
  (
    SELECT COUNT(*) 
    FROM generate_series(
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE,
      '1 day'::interval
    ) d
    WHERE EXISTS(
      SELECT 1 FROM meal_plans mp
      WHERE mp.user_id = $1 
        AND mp.date = d::date
        AND mp.consumed = true
    )
    AND d::date <= CURRENT_DATE
    AND d::date > (
      SELECT COALESCE(MAX(date), CURRENT_DATE)
      FROM meal_plans
      WHERE user_id = $1
        AND date < CURRENT_DATE
        AND consumed = false
    )
  ) as current_streak

FROM meal_plans
WHERE user_id = $1
  AND consumed = true
  AND date >= CURRENT_DATE - INTERVAL '30 days';

-- Params: user_id
```

---

### 10. Groups Module

```sql
-- ============================================================================
-- GET RECOMMENDED GROUPS
-- ============================================================================

SELECT 
  g.id,
  g.name,
  g.description,
  g.member_count,
  g.activity_level,
  g.tags,
  
  EXISTS(
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = g.id AND gm.user_id = $1
  ) as joined

FROM groups g
WHERE g.tags && (
  SELECT ARRAY_AGG(DISTINCT tag) 
  FROM user_interests 
  WHERE user_id = $1
)
  AND NOT EXISTS(
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = g.id AND gm.user_id = $1
  )
ORDER BY g.member_count DESC, g.activity_level DESC
LIMIT 5;

-- Params: user_id
-- Returns: Up to 5 groups

-- ============================================================================
-- GET USER'S JOINED GROUPS
-- ============================================================================

SELECT 
  g.id,
  g.name,
  COALESCE(MAX(gm_activity.last_message_at), g.updated_at) as last_activity,
  
  COALESCE(
    (SELECT COUNT(*) 
     FROM group_messages gm 
     WHERE gm.group_id = g.id 
       AND gm.created_at > COALESCE(gmr.last_read_at, '1970-01-01')
    ), 
    0
  ) as unread_messages

FROM groups g
INNER JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN group_member_reads gmr ON g.id = gmr.group_id AND gmr.user_id = $1
LEFT JOIN LATERAL (
  SELECT MAX(created_at) as last_message_at
  FROM group_messages
  WHERE group_id = g.id
) gm_activity ON true
WHERE gm.user_id = $1
ORDER BY last_activity DESC
LIMIT 10;

-- Params: user_id
```

---

## Fast Patterns (Regex)

```typescript
// ============================================================================
// FAST PATTERN DEFINITIONS
// ============================================================================

export const FAST_PATTERNS: FastPattern[] = [
  
  // GREETINGS
  {
    name: 'greeting_casual',
    regex: /^(salut|hey|coucou|yo|wesh)\s*(!|\?)?$/i,
  },
  {
    name: 'greeting_formal',
    regex: /^(bonjour|bonsoir)\s*(akeli)?\s*(!|\?)?$/i,
  },
  {
    name: 'how_are_you',
    regex: /^(comment|ça)\s+(va|vas)\s*\?*$/i,
  },
  
  // CONFIRMATIONS
  {
    name: 'yes',
    regex: /^(oui|ouais|ok|d'accord|dac|okay|yes)\s*(!|\.)?\s*$/i,
  },
  {
    name: 'no',
    regex: /^(non|nope|nan)\s*(!|\.)?\s*$/i,
  },
  
  // THANKS
  {
    name: 'thanks',
    regex: /^(merci|merci beaucoup|thanks|thank you)\s*(akeli)?\s*(!|\.)?\s*$/i,
  },
  {
    name: 'appreciation',
    regex: /^(super|génial|cool|parfait|nickel|top)\s*(!|\.)?\s*$/i,
  },
  
  // GOODBYES
  {
    name: 'goodbye',
    regex: /^(au revoir|bye|salut|à plus|à bientôt|ciao)\s*(!|\.)?\s*$/i,
  },
  
  // SIMPLE QUESTIONS (no data needed)
  {
    name: 'who_are_you',
    regex: /^(qui es-tu|c'est quoi akeli|qu'est-ce que.*akeli)\s*\?*$/i,
  },
  {
    name: 'what_can_you_do',
    regex: /^(que peux-tu faire|tu peux faire quoi|tu fais quoi)\s*\?*$/i,
  },
];

// ============================================================================
// PATTERN MATCHING FUNCTION
// ============================================================================

export function matchFastPattern(message: string): PatternMatch {
  const normalized = message.trim().toLowerCase();
  
  for (const pattern of FAST_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      return {
        matched: true,
        pattern_type: pattern.name,
        confidence: 1.0,
      };
    }
  }
  
  return {
    matched: false,
    confidence: 0.0,
  };
}
```

---

## Intention Analysis Prompt

```typescript
// ============================================================================
// INTENTION ANALYSIS SYSTEM PROMPT
// ============================================================================

export const INTENTION_ANALYSIS_PROMPT = `Tu es un analyseur d'intention pour Akeli, une app de nutrition.

TÂCHE: Analyser le message de l'utilisateur et déterminer:
1. Si des données sont nécessaires pour répondre (needs_data: true/false)
2. Quels modules de données sont nécessaires (data_modules: [])
3. Le type de conversation (conversation_type)

MODULES DISPONIBLES:
- user_profile: Profil utilisateur (objectifs, préférences, allergies)
- meal_plan: Planning de repas (aujourd'hui/semaine)
- nutrition_stats: Statistiques nutritionnelles (calories, macros, progression)
- recipes_favorites: Recettes favorites de l'utilisateur
- recipes_similar: Recommandations de recettes similaires
- recipes_recent: Recettes récemment consultées
- shopping_list: Liste de courses
- habits: Habitudes alimentaires (heures repas, fréquences)
- groups: Groupes de discussion recommandés

TYPES DE CONVERSATION:
- greeting: Salutations
- question: Question nécessitant une réponse factuelle
- recommendation: Demande de suggestion/conseil
- confirmation: Confirmation/validation (oui, non, ok)
- feedback: Retour positif/négatif
- complaint: Plainte/problème
- general: Conversation générale

RÈGLES:
1. Si message = salutation simple → needs_data: false, data_modules: []
2. Si question sur calories/nutrition → needs_data: true, include nutrition_stats et meal_plan
3. Si demande de recette → needs_data: true, include recipes_similar
4. Si question sur profil/objectifs → needs_data: true, include user_profile
5. Ne retourne QUE les modules strictement nécessaires

RETOURNE UNIQUEMENT UN JSON (pas de texte avant/après):
{
  "needs_data": boolean,
  "data_modules": string[],
  "conversation_type": string,
  "confidence": number
}

MESSAGE UTILISATEUR:`;

// ============================================================================
// INTENTION ANALYSIS FUNCTION
// ============================================================================

export async function analyzeIntention(
  message: string,
  openaiClient: OpenAI
): Promise<IntentionAnalysis> {
  
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: INTENTION_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: message,
      },
    ],
    max_tokens: 200,
    temperature: 0.3, // Low temperature for consistency
    response_format: { type: 'json_object' },
  });
  
  const result = JSON.parse(response.choices[0].message.content);
  
  return {
    needs_data: result.needs_data,
    data_modules: result.data_modules || [],
    conversation_type: result.conversation_type,
    confidence: result.confidence || 0.8,
  };
}
```

---

## Akeli System Prompt

```typescript
// ============================================================================
// AKELI RESPONSE SYSTEM PROMPT
// ============================================================================

export const AKELI_SYSTEM_PROMPT = `Tu es Akeli, l'assistant IA de l'application Akeli.

IDENTITÉ:
- Tu es amical, bienveillant et motivant
- Tu tutoies toujours l'utilisateur
- Tu utilises un ton naturel et conversationnel
- Tu es expert en nutrition et cuisine africaine
- Ton nom est Akeli (le nom de l'application)

MISSION:
- Aider l'utilisateur à atteindre ses objectifs santé
- Répondre à ses questions sur nutrition, recettes, meal planning
- Être personnalisé grâce aux données de l'utilisateur
- Motiver et encourager l'utilisateur dans son parcours

RÈGLES DE CONVERSATION:
1. Reste naturel et fluide - ne récite pas des données comme un robot
2. Utilise les données UNIQUEMENT si elles sont fournies dans le contexte
3. Si tu n'as pas les données nécessaires, dis-le honnêtement
4. Pour les conversations simples (salutations, questions générales), réponds naturellement sans données
5. IMPORTANT: Pour V1, tu ne peux PAS:
   - Modifier le meal plan
   - Créer de recettes
   - Faire des actions (ajout, suppression, modification)
   → Tu peux seulement discuter, conseiller, et informer
   → Si l'utilisateur demande une action, explique poliment que tu pourras le faire en V2

SPÉCIFICITÉS CULTURELLES:
- Tu connais et valorises la cuisine africaine (thiéboudienne, mafé, garba, alloco, attiéké, etc.)
- Tu adaptes les conseils nutritionnels au contexte de la diaspora africaine en France
- Tu respectes les traditions culinaires tout en aidant aux objectifs santé
- Tu comprends les défis spécifiques (accès aux ingrédients, adaptation des recettes)

STYLE DE RÉPONSE:
- Réponds en 2-4 phrases maximum sauf si question très complexe
- Utilise des emojis avec parcimonie (1-2 par réponse max, et uniquement quand approprié)
- Termine parfois par une question pour maintenir l'engagement
- Évite le jargon technique, vulgarise les concepts
- Sois précis avec les chiffres nutritionnels quand tu les as
- Contextualise toujours les données (ex: "Tu as mangé 1,450 cal sur tes 2,000 cal" plutôt que juste "1,450 cal")

EXEMPLES DE BONNES RÉPONSES:

Q: "Salut Akeli !"
R: "Hey ! 😊 Comment ça va aujourd'hui ? Tu veux qu'on parle de tes repas ou tu as une question ?"

Q: "Combien de calories j'ai mangé aujourd'hui ?"
R: "Aujourd'hui tu as consommé 1,450 calories sur tes 2,000 calories quotidiennes. Tu as mangé du thiéboudienne au déjeuner (850 cal) et un smoothie ce matin (200 cal). Il te reste 550 cal pour le dîner ! 💪"

Q: "Propose-moi une recette ce soir"
R: "Vu que tu aimes le mafé et qu'il te reste 600 calories, je te suggère le Poulet Yassa ! C'est léger (480 cal), plein de saveurs, et ça respecte ton objectif perte de poids. Tu veux que je l'ajoute à ton meal plan ?"

Q: "Oui ajoute-le !"
R: "Pour l'instant je peux juste te le recommander, mais en V2 je pourrai l'ajouter directement ! 😊 Va dans l'onglet Meal Plan et ajoute le Poulet Yassa manuellement. Besoin d'autre chose ?"

DONNÉES CONTEXTUELLES (si fournies):
{context}

CONVERSATION PRÉCÉDENTE (si applicable):
{history}

MESSAGE ACTUEL DE L'UTILISATEUR:
{message}

Réponds en français de manière naturelle et personnalisée.`;

// ============================================================================
// RESPONSE GENERATION FUNCTION
// ============================================================================

export async function generateResponse(
  message: string,
  context: BuiltContext,
  openaiClient: OpenAI
): Promise<string> {
  
  // Build context string
  const contextStr = buildContextString(context);
  
  // Build history string
  const historyStr = buildHistoryString(context.conversation_history);
  
  // Replace placeholders in system prompt
  const systemPrompt = AKELI_SYSTEM_PROMPT
    .replace('{context}', contextStr)
    .replace('{history}', historyStr)
    .replace('{message}', message);
  
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: message,
      },
    ],
    max_tokens: 800,
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}

// ============================================================================
// HELPER: BUILD CONTEXT STRING
// ============================================================================

function buildContextString(context: BuiltContext): string {
  if (!context.fetched_data || Object.keys(context.fetched_data).length === 0) {
    return "Aucune donnée spécifique fournie pour cette conversation.";
  }
  
  let contextStr = "";
  
  // User Profile
  if (context.fetched_data.user_profile) {
    const profile = context.fetched_data.user_profile;
    contextStr += `\nPROFIL UTILISATEUR:
- Nom: ${profile.first_name}
- Objectif: ${profile.goals.type}
- Cibles quotidiennes: ${profile.daily_targets.calories} cal, ${profile.daily_targets.protein}g protéines
- Allergies: ${profile.preferences.allergies.join(', ') || 'Aucune'}
- Origine culturelle: ${profile.preferences.cultural_origin || 'Non spécifiée'}
`;
  }
  
  // Meal Plan
  if (context.fetched_data.meal_plan) {
    const mealPlan = context.fetched_data.meal_plan;
    contextStr += `\nMEAL PLAN (${mealPlan.date}):
`;
    mealPlan.meals.forEach((meal: Meal) => {
      contextStr += `- ${meal.meal_type} (${meal.scheduled_time || 'non planifié'}): ${meal.name} - ${meal.nutrition.calories} cal${meal.consumed ? ' ✓ consommé' : ''}\n`;
    });
    contextStr += `Total: ${mealPlan.daily_totals.calories} cal, ${mealPlan.daily_totals.protein}g protéines
`;
  }
  
  // Nutrition Stats
  if (context.fetched_data.nutrition_stats) {
    const stats = context.fetched_data.nutrition_stats;
    contextStr += `\nSTATISTIQUES NUTRITIONNELLES (${stats.period}):
- Calories: ${stats.calories.consumed}/${stats.calories.target} (reste: ${stats.calories.remaining})
- Protéines: ${stats.macros.protein.consumed}g/${stats.macros.protein.target}g
- Progression: ${stats.progress.days_on_track}/${stats.progress.total_days} jours on track (${stats.progress.compliance_rate}%)
`;
  }
  
  // Recipes
  if (context.fetched_data.recipes_similar) {
    const recipes = context.fetched_data.recipes_similar;
    contextStr += `\nRECETTES RECOMMANDÉES:\n`;
    recipes.recipes.slice(0, 3).forEach((recipe: SimilarRecipe) => {
      contextStr += `- ${recipe.name} (${recipe.calories} cal) - ${recipe.match_reasons.join(', ')}\n`;
    });
  }
  
  // Add other modules as needed...
  
  return contextStr;
}

// ============================================================================
// HELPER: BUILD HISTORY STRING
// ============================================================================

function buildHistoryString(history?: Message[]): string {
  if (!history || history.length === 0) {
    return "Pas d'historique de conversation.";
  }
  
  let historyStr = "";
  
  history.forEach((msg) => {
    const role = msg.role === 'user' ? 'Utilisateur' : 'Akeli';
    historyStr += `${role}: ${msg.content}\n`;
  });
  
  return historyStr;
}
```

---

## Validation Schemas

```typescript
// ============================================================================
// INPUT VALIDATION
// ============================================================================

export function validateChatRequest(req: ChatRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // user_id
  if (!req.user_id) {
    errors.push('user_id is required');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user_id)) {
    errors.push('user_id must be a valid UUID');
  }
  
  // message
  if (!req.message) {
    errors.push('message is required');
  } else if (typeof req.message !== 'string') {
    errors.push('message must be a string');
  } else {
    const trimmed = req.message.trim();
    if (trimmed.length === 0) {
      errors.push('message cannot be empty');
    }
    if (trimmed.length > 2000) {
      errors.push('message too long (max 2000 characters)');
    }
  }
  
  // conversation_id (optional)
  if (req.conversation_id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.conversation_id)) {
      errors.push('conversation_id must be a valid UUID');
    }
  }
  
  // include_history (optional, defaults to true)
  if (req.include_history !== undefined && typeof req.include_history !== 'boolean') {
    errors.push('include_history must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SANITIZATION
// ============================================================================

export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, 2000); // Hard limit
}
```

---

## Token Estimation

```typescript
// ============================================================================
// TOKEN COUNTING (Approximation)
// ============================================================================

// Rough approximation: 1 token ≈ 4 characters for English
// For French, slightly more: 1 token ≈ 3.5 characters

export function estimateTokens(text: string): number {
  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  // French: ~3.5 chars per token
  return Math.ceil(cleaned.length / 3.5);
}

// ============================================================================
// CONTEXT SIZE MANAGEMENT
// ============================================================================

export function optimizeContext(
  context: BuiltContext,
  maxTokens: number = 4000
): BuiltContext {
  
  let currentTokens = 0;
  
  // Calculate current token usage
  if (context.fetched_data) {
    Object.values(context.fetched_data).forEach((data) => {
      currentTokens += estimateTokens(JSON.stringify(data));
    });
  }
  
  if (context.conversation_history) {
    context.conversation_history.forEach((msg) => {
      currentTokens += estimateTokens(msg.content);
    });
  }
  
  // If under limit, return as-is
  if (currentTokens <= maxTokens) {
    return context;
  }
  
  // Otherwise, trim history first
  const optimized = { ...context };
  
  while (currentTokens > maxTokens && optimized.conversation_history && optimized.conversation_history.length > 1) {
    // Remove oldest message (keep at least 1)
    const removed = optimized.conversation_history.shift();
    if (removed) {
      currentTokens -= estimateTokens(removed.content);
    }
  }
  
  return optimized;
}
```

---

## Error Handling

```typescript
// ============================================================================
// ERROR TYPES
// ============================================================================

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
}

export class DatabaseError extends Error {
  code = 'DATABASE_ERROR';
  statusCode = 500;
}

export class OpenAIError extends Error {
  code = 'OPENAI_ERROR';
  statusCode = 503;
}

export class RateLimitError extends Error {
  code = 'RATE_LIMIT_ERROR';
  statusCode = 429;
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

export function handleError(error: Error): ErrorResponse {
  console.error('Error:', error);
  
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: error.code,
      details: null,
    };
  }
  
  if (error instanceof RateLimitError) {
    return {
      error: 'Tu as envoyé trop de messages. Attends quelques instants avant de réessayer.',
      code: error.code,
    };
  }
  
  if (error instanceof OpenAIError) {
    return {
      error: 'Je rencontre un problème technique. Réessaye dans quelques instants.',
      code: error.code,
    };
  }
  
  if (error instanceof DatabaseError) {
    return {
      error: 'Impossible de récupérer tes données. Vérifie ta connexion.',
      code: error.code,
    };
  }
  
  // Unknown error
  return {
    error: 'Une erreur inattendue est survenue. Réessaye plus tard.',
    code: 'UNKNOWN_ERROR',
  };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Rate Limiting

```typescript
// ============================================================================
// RATE LIMIT IMPLEMENTATION
// ============================================================================

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 messages per minute

// In-memory store (for Edge Function)
// Note: Resets on cold start, but acceptable for this use case
const rateLimitStore = new Map<string, {
  count: number;
  resetAt: number;
}>();

export async function checkRateLimit(user_id: string): Promise<boolean> {
  const now = Date.now();
  const userLimit = rateLimitStore.get(user_id);
  
  if (!userLimit || now > userLimit.resetAt) {
    // Reset or initialize
    rateLimitStore.set(user_id, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  // Increment
  userLimit.count++;
  return true;
}

// ============================================================================
// CLEANUP OLD ENTRIES (Optional, for memory management)
// ============================================================================

setInterval(() => {
  const now = Date.now();
  for (const [user_id, limit] of rateLimitStore.entries()) {
    if (now > limit.resetAt) {
      rateLimitStore.delete(user_id);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## Cost Calculation

```typescript
// ============================================================================
// COST TRACKING
// ============================================================================

// OpenAI GPT-4o-mini pricing (Feb 2025)
const COST_PER_1M_INPUT_TOKENS = 0.15; // $0.15
const COST_PER_1M_OUTPUT_TOKENS = 0.60; // $0.60

export function calculateCost(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
  
  return inputCost + outputCost;
}

// ============================================================================
// EXAMPLE
// ============================================================================

// Conversation avec fetch de données:
// - Input: 1200 tokens (context + message)
// - Output: 450 tokens (response)
// Cost = (1200/1M * 0.15) + (450/1M * 0.60)
//      = 0.00018 + 0.00027
//      = $0.00045
//      ≈ 0.0004€ (avec taux de change)

// 1000 conversations = ~0.40€
```

---

## Logging Structure

```typescript
// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

export interface LogEntry {
  timestamp: string;
  user_id: string;
  conversation_id: string;
  message_id: string;
  path_type: 'fast' | 'smart';
  processing_time_ms: number;
  phases: {
    validation: number;
    pattern_detection: number;
    intention_analysis?: number;
    data_fetch?: number;
    context_building: number;
    response_generation: number;
    save_db: number;
  };
  modules_fetched?: DataModule[];
  tokens_used: number;
  cost_usd: number;
  user_message_length: number;
  response_length: number;
  error?: string;
}

export function logConversation(entry: LogEntry): void {
  // Structured logging (JSON)
  console.log(JSON.stringify(entry));
  
  // Optional: Send to analytics service (Supabase, PostHog, etc.)
  // await analyticsService.track(entry);
}
```

---

## Configuration

```typescript
// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export interface Config {
  openai: {
    apiKey: string;
    model: 'gpt-4o-mini';
    maxTokens: number;
    temperature: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  context: {
    maxTokens: number;
    maxHistoryMessages: number;
  };
}

export function loadConfig(): Config {
  return {
    openai: {
      apiKey: Deno.env.get('OPENAI_API_KEY') || '',
      model: 'gpt-4o-mini',
      maxTokens: 800,
      temperature: 0.7,
    },
    supabase: {
      url: Deno.env.get('SUPABASE_URL') || '',
      anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
    },
    rateLimit: {
      maxRequests: 30,
      windowMs: 60 * 1000,
    },
    context: {
      maxTokens: 4000,
      maxHistoryMessages: 5,
    },
  };
}
```

---

## Tests Recommandés

### Unit Tests

```typescript
// Pattern Matching
describe('matchFastPattern', () => {
  it('should match simple greeting', () => {
    const result = matchFastPattern('Salut !');
    expect(result.matched).toBe(true);
    expect(result.pattern_type).toBe('greeting_casual');
  });
  
  it('should not match complex question', () => {
    const result = matchFastPattern('Combien de calories j\'ai mangé ?');
    expect(result.matched).toBe(false);
  });
});

// Validation
describe('validateChatRequest', () => {
  it('should validate correct request', () => {
    const req = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Hello',
    };
    const result = validateChatRequest(req);
    expect(result.valid).toBe(true);
  });
  
  it('should reject empty message', () => {
    const req = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      message: '',
    };
    const result = validateChatRequest(req);
    expect(result.valid).toBe(false);
  });
});

// Token Estimation
describe('estimateTokens', () => {
  it('should estimate tokens correctly', () => {
    const text = 'Bonjour, comment allez-vous ?';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(15);
  });
});
```

### Integration Tests

```typescript
// End-to-end conversation flow
describe('AI Assistant E2E', () => {
  it('should handle simple greeting', async () => {
    const response = await fetch('/functions/v1/ai-assistant-chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        message: 'Salut Akeli !',
      }),
    });
    
    const data = await response.json();
    expect(data.response).toContain('Hey');
    expect(data.path_type).toBe('fast');
  });
  
  it('should fetch meal plan data', async () => {
    const response = await fetch('/functions/v1/ai-assistant-chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        message: 'Qu\'est-ce que je mange aujourd\'hui ?',
      }),
    });
    
    const data = await response.json();
    expect(data.path_type).toBe('smart');
    expect(data.modules_used).toContain('meal_plan');
  });
});
```

---

## Conclusion

Ce document contient toutes les spécifications techniques nécessaires pour implémenter l'Agent IA Akeli V1. Les types TypeScript, requêtes SQL, et fonctions sont prêts à être utilisés directement par Claude Code pour l'implémentation.

**Prochaine étape:** Créer le document `V1_AI_ASSISTANT_PROMPTS.md` avec tous les prompts et exemples de conversations.
