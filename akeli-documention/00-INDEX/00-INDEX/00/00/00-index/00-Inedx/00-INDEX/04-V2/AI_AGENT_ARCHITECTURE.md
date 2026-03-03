# 🤖 AI Agent Architecture - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Fondamental

**L'AI Agent AKELI n'est pas un chatbot - c'est un nutrition coach intelligent qui AGIT plutôt que de parler.**

Contrairement aux assistants textuels :
- **Action-first** : Modifie meal plans, ajuste recettes, crée listes courses
- **Context-aware** : Connaît historique utilisateur, goals, contraintes
- **Outcome-driven** : Suggère basé sur ce qui FONCTIONNE (data-backed)
- **Proactive** : Anticipe besoins sans être intrusif

### Cas d'Usage Principaux

```
┌─────────────────────────────────────────────────┐
│  1. MEAL PLANNING                               │
│     "Génère mon plan cette semaine"             │
│     → Calls generate_meal_plan()                │
│     → Returns structured 7-day plan             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  2. RECIPE ADJUSTMENTS                          │
│     "Rends ce repas plus protéiné"              │
│     → Calls adjust_recipe_macros()              │
│     → Returns modified recipe                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  3. SUBSTITUTIONS                               │
│     "Je n'ai pas de poulet, par quoi le remplacer?"│
│     → Calls find_substitute_ingredient()        │
│     → Suggests alternatives                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  4. SHOPPING LISTS                              │
│     "Crée ma liste pour cette semaine"          │
│     → Calls generate_shopping_list()            │
│     → Returns categorized list                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  5. ANALYTICS INSIGHTS                          │
│     "Comment je progresse vers mon objectif?"   │
│     → Calls get_user_progress()                 │
│     → Returns trends & insights                 │
└─────────────────────────────────────────────────┘
```

---

## 📋 Table des Matières

1. [Architecture Overview](#architecture-overview)
2. [Function Calling System](#function-calling-system)
3. [Available Functions](#available-functions)
4. [Conversation Management](#conversation-management)
5. [Context & Memory](#context--memory)
6. [Edge Function Integration](#edge-function-integration)
7. [Flutter Implementation](#flutter-implementation)

---

## 🏗️ Architecture Overview

### Stack Technique

```
┌────────────────────────────────────────────────┐
│  Flutter App (Chat UI)                         │
│  • Message input/output                        │
│  • Function result rendering                   │
│  • Streaming responses                         │
└────────────┬───────────────────────────────────┘
             │
             │ WebSocket or REST
             │
┌────────────┴───────────────────────────────────┐
│  Edge Function (Supabase)                      │
│  • Route to AI provider                        │
│  • Auth & validation                           │
│  • Function execution orchestration            │
└────────────┬───────────────────────────────────┘
             │
             ├─ OpenAI API (GPT-4)
             │  • Natural language understanding
             │  • Function calling
             │  • Response generation
             │
             └─ Internal Functions (Supabase/Python)
                • generate_meal_plan
                • adjust_recipe
                • get_user_stats
                • ... (see below)
```

---

### Flow Complet

```
USER: "Génère mon meal plan pour cette semaine, 
       mais je veux plus de protéines"
    ↓
Flutter: Send message to /ai-chat endpoint
    ↓
Edge Function: Receive message
    ├─ Load conversation history (last 10 messages)
    ├─ Load user context (profile, goals, constraints)
    └─ Call OpenAI API
        {
          model: "gpt-4-turbo",
          messages: [
            {role: "system", content: "..."},
            {role: "user", content: "..."}
          ],
          functions: [
            {name: "generate_meal_plan", ...},
            {name: "adjust_recipe_macros", ...}
          ]
        }
    ↓
OpenAI: Analyze request
    ├─ Understand: User wants meal plan + protein boost
    └─ Decision: Call generate_meal_plan with protein_boost=0.20
    ↓
    Return: {
      function_call: {
        name: "generate_meal_plan",
        arguments: {
          days: 7,
          macro_adjustments: {protein: 0.20}
        }
      }
    }
    ↓
Edge Function: Execute function
    ├─ POST to Python service /meal_plan
    │   {
    │     user_id,
    │     days: 7,
    │     macro_adjustments: {protein: 0.20}
    │   }
    │
    └─ Python returns structured meal plan
    ↓
Edge Function: Format result as function response
    └─ Call OpenAI again with function result
        {
          messages: [
            ...,
            {
              role: "function",
              name: "generate_meal_plan",
              content: "{...meal plan data...}"
            }
          ]
        }
    ↓
OpenAI: Generate natural response
    "J'ai généré ton plan pour la semaine avec 20% 
     de protéines en plus. Voici tes repas:"
    ↓
Edge Function: Return to Flutter
    {
      message: "...",
      meal_plan: {...},
      function_called: "generate_meal_plan"
    }
    ↓
Flutter: Render
    ├─ Display AI message
    └─ Render meal plan widget (structured UI)
```

---

## 🔧 Function Calling System

### OpenAI Function Schema

```typescript
// Edge Function: ai-chat/functions.ts

export const AVAILABLE_FUNCTIONS = [
  // === MEAL PLANNING ===
  {
    name: "generate_meal_plan",
    description: "Génère un plan de repas personnalisé pour N jours",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Nombre de jours (1-14)",
        },
        macro_adjustments: {
          type: "object",
          description: "Ajustements macro optionnels (ex: {protein: 0.20})",
          properties: {
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" },
          }
        },
        preferences: {
          type: "object",
          description: "Préférences optionnelles",
          properties: {
            exclude_cuisines: { type: "array", items: { type: "string" } },
            max_cooking_time: { type: "number" },
            budget_per_meal: { type: "number" },
          }
        }
      },
      required: ["days"]
    }
  },

  // === RECIPE ADJUSTMENT ===
  {
    name: "adjust_recipe_macros",
    description: "Ajuste les macros d'une recette spécifique",
    parameters: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "UUID de la recette à ajuster"
        },
        adjustments: {
          type: "object",
          description: "Facteurs d'ajustement (-0.30 à +0.30)",
          properties: {
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" },
          }
        }
      },
      required: ["recipe_id", "adjustments"]
    }
  },

  // === SUBSTITUTION ===
  {
    name: "find_substitute_ingredient",
    description: "Trouve des substituts pour un ingrédient",
    parameters: {
      type: "object",
      properties: {
        ingredient_name: {
          type: "string",
          description: "Nom de l'ingrédient à remplacer"
        },
        recipe_id: {
          type: "string",
          description: "UUID de la recette (pour contexte)"
        },
        reason: {
          type: "string",
          enum: ["allergy", "unavailable", "preference", "budget"],
          description: "Raison de la substitution"
        }
      },
      required: ["ingredient_name", "recipe_id"]
    }
  },

  // === SHOPPING LIST ===
  {
    name: "generate_shopping_list",
    description: "Génère une liste de courses pour le meal plan",
    parameters: {
      type: "object",
      properties: {
        meal_plan_id: {
          type: "string",
          description: "UUID du meal plan"
        },
        group_by: {
          type: "string",
          enum: ["category", "store_section", "recipe"],
          description: "Comment grouper les items"
        }
      },
      required: ["meal_plan_id"]
    }
  },

  // === USER STATS ===
  {
    name: "get_user_progress",
    description: "Récupère les statistiques et progrès utilisateur",
    parameters: {
      type: "object",
      properties: {
        period_days: {
          type: "number",
          description: "Période en jours (7, 30, 90)"
        },
        metrics: {
          type: "array",
          items: { type: "string" },
          description: "Métriques spécifiques (weight, adherence, momentum)"
        }
      },
      required: []
    }
  },

  // === RECIPE SEARCH ===
  {
    name: "search_recipes",
    description: "Cherche des recettes selon critères",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Recherche textuelle"
        },
        filters: {
          type: "object",
          properties: {
            cuisine: { type: "string" },
            max_cooking_time: { type: "number" },
            min_protein_g: { type: "number" },
            max_calories: { type: "number" },
          }
        },
        limit: { type: "number" }
      },
      required: []
    }
  },

  // === SWAP RECIPE ===
  {
    name: "swap_recipe_in_plan",
    description: "Remplace une recette dans le meal plan",
    parameters: {
      type: "object",
      properties: {
        meal_plan_id: { type: "string" },
        day: { type: "number" },
        meal_type: {
          type: "string",
          enum: ["breakfast", "lunch", "dinner"]
        },
        new_recipe_id: { type: "string" }
      },
      required: ["meal_plan_id", "day", "meal_type", "new_recipe_id"]
    }
  }
];
```

---

## 📦 Available Functions

### 1. generate_meal_plan

**Python Implementation** :

```python
# python_service/functions/meal_plan.py

async def generate_meal_plan(
    user_id: str,
    days: int,
    macro_adjustments: dict = None,
    preferences: dict = None
) -> dict:
    """
    Génère meal plan personnalisé.
    
    Called by AI agent via Edge Function.
    """
    
    # Load user vector
    user_vector = get_or_compute_user_vector(user_id)
    
    # Apply macro adjustments if provided
    if macro_adjustments:
        user_vector = adjust_user_vector_for_macros(
            user_vector,
            macro_adjustments
        )
    
    # Load recipes
    recipe_vectors, recipe_ids = load_recipe_vectors()
    
    # Apply preference filters
    if preferences:
        recipe_ids, recipe_vectors = apply_preference_filters(
            recipe_ids,
            recipe_vectors,
            preferences
        )
    
    # Generate recommendations
    recommendations = _compute_recommendations(
        user_vector,
        recipe_vectors,
        recipe_ids,
        filters={'safe_only': True, 'diversity': True},
        limit=days * 3
    )
    
    # Structure into meal plan
    plan = structure_meal_plan(recommendations, days)
    
    return {
        'meal_plan_id': str(uuid.uuid4()),
        'user_id': user_id,
        'days': days,
        'plan': plan,
        'macro_summary': calculate_plan_macros(plan),
        'total_calories_per_day': calculate_avg_calories(plan)
    }
```

---

### 2. adjust_recipe_macros

```python
async def adjust_recipe_macros(
    user_id: str,
    recipe_id: str,
    adjustments: dict
) -> dict:
    """
    Ajuste recette selon facteurs macro.
    """
    
    # Load original recipe
    recipe = get_recipe(recipe_id)
    
    # Apply adjustment logic (see RECIPE_ADJUSTMENT_ENGINE.md)
    adjusted = apply_macro_adjustments(recipe, adjustments)
    
    # Validate
    validation = validate_nutritional_constraints(recipe, adjusted)
    
    if not validation['is_valid']:
        return {
            'error': 'Invalid adjustment',
            'errors': validation['errors']
        }
    
    # Store adjusted recipe
    adjusted_recipe_id = save_adjusted_recipe(
        user_id=user_id,
        original_recipe_id=recipe_id,
        adjusted_recipe=adjusted,
        adjustments=adjustments
    )
    
    return {
        'adjusted_recipe_id': adjusted_recipe_id,
        'original_recipe_id': recipe_id,
        'title': adjusted['title'],
        'macros': {
            'protein_g': adjusted['protein_g'],
            'carbs_g': adjusted['carbs_g'],
            'fat_g': adjusted['fat_g']
        },
        'calories': adjusted['total_calories'],
        'warnings': validation.get('warnings', [])
    }
```

---

### 3. find_substitute_ingredient

```python
async def find_substitute_ingredient(
    user_id: str,
    ingredient_name: str,
    recipe_id: str,
    reason: str
) -> dict:
    """
    Trouve substituts pour ingrédient.
    
    Basé sur:
    - Macro groupe (protein → protein)
    - Disponibilité
    - Coût
    - Préférences utilisateur
    """
    
    # Get ingredient metadata
    ingredient = find_ingredient_by_name(ingredient_name)
    macro_group = get_ingredient_macro_group(ingredient)
    
    # Find substitutes in same macro group
    substitutes = db.query("""
        SELECT 
            i.ingredient_id,
            i.name,
            i.calories_per_100g,
            i.protein_g_per_100g,
            i.cost_per_100g,
            i.availability_score
        FROM ingredients i
        WHERE i.macro_group = ?
        AND i.ingredient_id != ?
        ORDER BY i.availability_score DESC, i.cost_per_100g ASC
        LIMIT 5
    """, macro_group, ingredient.ingredient_id)
    
    # Filter by reason
    if reason == 'budget':
        # Sort by cost
        substitutes.sort(key=lambda x: x['cost_per_100g'])
    elif reason == 'allergy':
        # Load user allergies
        allergies = get_user_allergies(user_id)
        substitutes = [s for s in substitutes if s['name'] not in allergies]
    
    return {
        'original_ingredient': ingredient_name,
        'reason': reason,
        'substitutes': [
            {
                'name': s['name'],
                'macro_match': calculate_macro_similarity(ingredient, s),
                'cost_per_100g': s['cost_per_100g'],
                'availability': s['availability_score']
            }
            for s in substitutes
        ]
    }
```

---

### 4. generate_shopping_list

```python
async def generate_shopping_list(
    user_id: str,
    meal_plan_id: str,
    group_by: str = 'category'
) -> dict:
    """
    Génère liste de courses depuis meal plan.
    """
    
    # Load meal plan
    meal_plan = get_meal_plan(meal_plan_id)
    
    # Aggregate ingredients
    ingredients_needed = {}
    
    for day in meal_plan['plan']:
        for meal in day['meals']:
            recipe = get_recipe(meal['recipe_id'])
            
            for ingredient in recipe['ingredients']:
                key = ingredient['ingredient_id']
                
                if key in ingredients_needed:
                    ingredients_needed[key]['quantity_g'] += ingredient['quantity_g']
                else:
                    ingredients_needed[key] = {
                        'name': ingredient['name'],
                        'quantity_g': ingredient['quantity_g'],
                        'category': ingredient['category'],
                        'store_section': ingredient['store_section']
                    }
    
    # Group by preference
    if group_by == 'category':
        grouped = group_by_category(ingredients_needed)
    elif group_by == 'store_section':
        grouped = group_by_store_section(ingredients_needed)
    else:
        grouped = {'all': list(ingredients_needed.values())}
    
    return {
        'meal_plan_id': meal_plan_id,
        'total_items': len(ingredients_needed),
        'grouped': grouped,
        'estimated_cost': calculate_total_cost(ingredients_needed)
    }
```

---

### 5. get_user_progress

```python
async def get_user_progress(
    user_id: str,
    period_days: int = 30,
    metrics: list = None
) -> dict:
    """
    Statistiques & progrès utilisateur.
    """
    
    if not metrics:
        metrics = ['weight', 'adherence', 'momentum']
    
    results = {}
    
    # Weight progression
    if 'weight' in metrics:
        weight_data = db.query("""
            SELECT date, weight_kg
            FROM weight_logs
            WHERE user_id = ?
            AND date >= NOW() - INTERVAL ? DAY
            ORDER BY date ASC
        """, user_id, period_days)
        
        results['weight'] = {
            'current': weight_data[-1]['weight_kg'] if weight_data else None,
            'start': weight_data[0]['weight_kg'] if weight_data else None,
            'delta': (weight_data[-1]['weight_kg'] - weight_data[0]['weight_kg']) if weight_data else None,
            'trend': calculate_trend(weight_data)
        }
    
    # Adherence
    if 'adherence' in metrics:
        adherence_data = db.query("""
            SELECT 
                AVG(plan_adherence_score) as avg_adherence,
                AVG(meal_logging_consistency) as consistency
            FROM user_behavior_metrics
            WHERE user_id = ?
            AND week_start >= NOW() - INTERVAL ? DAY
        """, user_id, period_days)
        
        results['adherence'] = {
            'score': adherence_data['avg_adherence'],
            'consistency': adherence_data['consistency']
        }
    
    # Momentum
    if 'momentum' in metrics:
        momentum = get_weekly_momentum_score(user_id)
        results['momentum'] = momentum
    
    return results
```

---

## 💬 Conversation Management

### System Prompt

```typescript
// Edge Function: ai-chat/system-prompt.ts

export function buildSystemPrompt(userContext: UserContext): string {
  return `You are AKELI's AI nutrition coach assistant.

CORE PRINCIPLES:
1. Action-first: Prefer calling functions over explaining
2. Data-driven: Reference user's actual progress & metrics
3. Outcome-focused: Suggest based on what works (adherence, results)
4. Concise: Keep responses short unless asked for details

USER CONTEXT:
- Name: ${userContext.name}
- Goal: ${userContext.primary_goal}
- Current weight: ${userContext.current_weight_kg}kg
- Target weight: ${userContext.target_weight_kg}kg
- Dietary constraints: ${userContext.constraints?.join(', ') || 'None'}
- Typical cuisines: ${userContext.preferred_cuisines?.join(', ')}

CURRENT STATS (Last 7 days):
- Adherence: ${userContext.recent_adherence}%
- Consistency: ${userContext.meal_logging_consistency}%
- Weight trend: ${userContext.weight_velocity_kg_per_week}kg/week

AVAILABLE FUNCTIONS:
You can call these functions to take action:
- generate_meal_plan: Create weekly meal plans
- adjust_recipe_macros: Modify recipe macros
- find_substitute_ingredient: Find ingredient alternatives
- generate_shopping_list: Create shopping lists
- get_user_progress: Fetch detailed stats
- search_recipes: Find recipes by criteria
- swap_recipe_in_plan: Replace recipe in plan

CONVERSATION STYLE:
- Direct & actionable
- Use French naturally (user's language)
- Reference data when relevant ("Your adherence is 75%...")
- Ask clarifying questions ONLY when necessary
- When user asks for plan/adjustment → call function immediately

EXAMPLES:
User: "Génère mon plan pour cette semaine"
→ Call generate_meal_plan(days=7) immediately

User: "Je veux plus de protéines"
→ Ask which recipe OR suggest increasing overall protein
→ Then call adjust_recipe_macros() or generate_meal_plan() with adjustments

User: "Comment je progresse?"
→ Call get_user_progress() then summarize key insights
`;
}
```

---

### Conversation History Management

```typescript
// Edge Function: ai-chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
})

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
    const { message, conversation_id } = await req.json()
    
    // 3. LOAD CONVERSATION HISTORY
    const history = await loadConversationHistory(supabase, user.id, conversation_id)
    
    // 4. LOAD USER CONTEXT
    const userContext = await loadUserContext(supabase, user.id)
    
    // 5. BUILD MESSAGES
    const messages = [
      { role: 'system', content: buildSystemPrompt(userContext) },
      ...history,
      { role: 'user', content: message }
    ]
    
    // 6. CALL OPENAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages,
      functions: AVAILABLE_FUNCTIONS,
      function_call: 'auto',
      temperature: 0.7
    })
    
    const assistantMessage = response.choices[0].message
    
    // 7. HANDLE FUNCTION CALL
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments)
      
      // Execute function
      const functionResult = await executeFunction(
        functionName,
        functionArgs,
        user.id,
        supabase
      )
      
      // Call OpenAI again with function result
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          ...messages,
          assistantMessage,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ],
        temperature: 0.7
      })
      
      const finalMessage = finalResponse.choices[0].message
      
      // 8. SAVE TO HISTORY
      await saveToConversationHistory(
        supabase,
        user.id,
        conversation_id,
        message,
        finalMessage.content,
        {
          function_called: functionName,
          function_result: functionResult
        }
      )
      
      return new Response(JSON.stringify({
        message: finalMessage.content,
        function_called: functionName,
        function_result: functionResult
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 8. NO FUNCTION CALL - Just conversation
    await saveToConversationHistory(
      supabase,
      user.id,
      conversation_id,
      message,
      assistantMessage.content
    )
    
    return new Response(JSON.stringify({
      message: assistantMessage.content
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})


// === HELPERS ===

async function loadConversationHistory(
  supabase: any,
  userId: string,
  conversationId?: string
): Promise<any[]> {
  const { data } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId || 'default')
    .order('created_at', { ascending: true })
    .limit(10)  // Last 10 messages
  
  if (!data) return []
  
  return data.flatMap(msg => [
    { role: 'user', content: msg.user_message },
    { role: 'assistant', content: msg.assistant_message }
  ])
}

async function loadUserContext(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select(`
      *,
      user_behavior_metrics (
        plan_adherence_score,
        meal_logging_consistency
      )
    `)
    .eq('user_id', userId)
    .single()
  
  return {
    name: user.name,
    primary_goal: user.primary_goal,
    current_weight_kg: user.current_weight_kg,
    target_weight_kg: user.target_weight_kg,
    constraints: user.dietary_constraints,
    preferred_cuisines: user.preferred_cuisines,
    recent_adherence: user.user_behavior_metrics[0]?.plan_adherence_score * 100,
    meal_logging_consistency: user.user_behavior_metrics[0]?.meal_logging_consistency * 100,
    weight_velocity_kg_per_week: calculateWeightVelocity(user)
  }
}

async function executeFunction(
  functionName: string,
  args: any,
  userId: string,
  supabase: any
) {
  const PYTHON_SERVICE_URL = Deno.env.get('PYTHON_SERVICE_URL')!
  
  // Map function name to endpoint
  const endpointMap = {
    'generate_meal_plan': '/meal_plan',
    'adjust_recipe_macros': '/adjust_recipe',
    'find_substitute_ingredient': '/substitute_ingredient',
    'generate_shopping_list': '/shopping_list',
    'get_user_progress': '/user_progress',
    'search_recipes': '/search_recipes',
    'swap_recipe_in_plan': '/swap_recipe'
  }
  
  const endpoint = endpointMap[functionName]
  
  if (!endpoint) {
    throw new Error(`Unknown function: ${functionName}`)
  }
  
  // Call Python service
  const response = await fetch(`${PYTHON_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...args })
  })
  
  if (!response.ok) {
    throw new Error(`Function execution failed: ${response.statusText}`)
  }
  
  return await response.json()
}
```

---

## 🗄️ Database Schema

### Table: ai_conversations

```sql
CREATE TABLE ai_conversations (
    conversation_id UUID NOT NULL,
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User
    user_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Messages
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    
    -- Function metadata
    function_called VARCHAR(100),
    function_arguments JSONB,
    function_result JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_conversations_user (user_id, conversation_id, created_at),
    INDEX idx_conversations_function (function_called, created_at)
);
```

---

## 📱 Flutter Implementation

### Chat UI Component

```dart
// lib/widgets/ai_chat_widget.dart

import 'package:flutter/material.dart';

class AIChatWidget extends StatefulWidget {
  @override
  _AIChatWidgetState createState() => _AIChatWidgetState();
}

class _AIChatWidgetState extends State<AIChatWidget> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  final String _conversationId = Uuid().v4();
  
  bool _isLoading = false;
  
  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    
    // Add user message to UI
    setState(() {
      _messages.add(ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _isLoading = true;
    });
    
    _controller.clear();
    
    // Call AI chat endpoint
    try {
      final response = await supabase.functions.invoke('ai-chat', body: {
        'message': text,
        'conversation_id': _conversationId,
      });
      
      final data = response.data;
      
      // Add assistant message
      setState(() {
        _messages.add(ChatMessage(
          text: data['message'],
          isUser: false,
          timestamp: DateTime.now(),
          functionCalled: data['function_called'],
          functionResult: data['function_result'],
        ));
        _isLoading = false;
      });
      
      // Render function result if present
      if (data['function_result'] != null) {
        _renderFunctionResult(data['function_called'], data['function_result']);
      }
      
    } catch (e) {
      setState(() {
        _messages.add(ChatMessage(
          text: "Désolé, une erreur s'est produite.",
          isUser: false,
          timestamp: DateTime.now(),
          isError: true,
        ));
        _isLoading = false;
      });
    }
  }
  
  void _renderFunctionResult(String functionName, dynamic result) {
    // Render structured results based on function type
    
    if (functionName == 'generate_meal_plan') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => MealPlanViewPage(mealPlan: result),
        ),
      );
    } else if (functionName == 'generate_shopping_list') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ShoppingListPage(shoppingList: result),
        ),
      );
    }
    // ... other function result renderers
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Messages list
        Expanded(
          child: ListView.builder(
            reverse: true,
            itemCount: _messages.length,
            itemBuilder: (ctx, i) {
              final msg = _messages[_messages.length - 1 - i];
              return ChatBubble(message: msg);
            },
          ),
        ),
        
        // Loading indicator
        if (_isLoading)
          Padding(
            padding: EdgeInsets.all(8),
            child: CircularProgressIndicator(),
          ),
        
        // Input field
        Container(
          padding: EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Demande quelque chose...',
                  ),
                  onSubmitted: _sendMessage,
                ),
              ),
              IconButton(
                icon: Icon(Icons.send),
                onPressed: () => _sendMessage(_controller.text),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String? functionCalled;
  final dynamic functionResult;
  final bool isError;
  
  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.functionCalled,
    this.functionResult,
    this.isError = false,
  });
}
```

---

## ✅ Checklist Implémentation

### Backend (Edge Functions)
- [ ] ai-chat endpoint créé
- [ ] Function calling schema défini
- [ ] System prompt optimisé
- [ ] Conversation history management
- [ ] User context loading
- [ ] Function execution orchestration

### Python Functions
- [ ] generate_meal_plan implemented
- [ ] adjust_recipe_macros implemented
- [ ] find_substitute_ingredient implemented
- [ ] generate_shopping_list implemented
- [ ] get_user_progress implemented
- [ ] search_recipes implemented

### Database
- [ ] ai_conversations table créée
- [ ] Indexes optimisés
- [ ] Cleanup old conversations (>30 days)

### Flutter UI
- [ ] Chat widget implemented
- [ ] Message bubbles styled
- [ ] Function result rendering
- [ ] Loading states
- [ ] Error handling

### Testing
- [ ] Function calling flow testé
- [ ] Multi-turn conversations testées
- [ ] Error scenarios handled
- [ ] Performance optimized (<2s response)

---

**FIN DU DOCUMENT**
