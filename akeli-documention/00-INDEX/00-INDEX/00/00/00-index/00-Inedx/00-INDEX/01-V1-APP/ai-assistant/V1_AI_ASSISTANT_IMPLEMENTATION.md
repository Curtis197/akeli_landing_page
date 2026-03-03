# Guide d'Implémentation - Agent IA Akeli V1

## Vue d'ensemble

Ce document est le guide complet pour implémenter l'Agent IA Akeli V1 avec Claude Code. Il contient l'ordre d'implémentation recommandé, les checklist de tests, et le plan de déploiement.

---

## Table des Matières

1. [Prérequis](#prérequis)
2. [Structure du Projet](#structure-du-projet)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Data Layer](#phase-2-data-layer)
5. [Phase 3: AI Layer](#phase-3-ai-layer)
6. [Phase 4: Integration](#phase-4-integration)
7. [Phase 5: Testing](#phase-5-testing)
8. [Phase 6: Deployment](#phase-6-deployment)
9. [Migration V1.1 (Streaming)](#migration-v11-streaming)

---

## Prérequis

### Environnement Requis

**Supabase:**
- Projet Supabase actif
- Accès à Supabase CLI (pour migrations)
- Variables d'environnement configurées

**OpenAI:**
- Clé API OpenAI (GPT-4o-mini access)
- Budget défini (recommandé: $10-20 pour tests)

**Développement:**
- Node.js 18+ (pour tests locaux)
- Deno (pour Edge Functions)
- Git pour version control

### Variables d'Environnement

Créer un fichier `.env.local` :

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Config (optionnel)
AI_MAX_TOKENS=800
AI_TEMPERATURE=0.7
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_WINDOW_MS=60000
```

---

## Structure du Projet

### Arborescence Complète

```
supabase/
│
├── migrations/
│   ├── 20250221000001_create_ai_conversations.sql
│   ├── 20250221000002_create_ai_messages.sql
│   ├── 20250221000003_create_ai_analytics.sql
│   └── 20250221000004_create_indexes.sql
│
└── functions/
    │
    ├── ai-assistant-chat/
    │   ├── index.ts                 # Main Edge Function
    │   └── README.md
    │
    └── _shared/
        │
        ├── types/
        │   ├── index.ts             # Re-export all types
        │   ├── conversation.ts
        │   ├── data-modules.ts
        │   ├── ai-service.ts
        │   └── request-response.ts
        │
        ├── patterns/
        │   ├── fast-patterns.ts     # Pattern definitions
        │   └── pattern-matcher.ts   # Matching logic
        │
        ├── data-fetchers/
        │   ├── index.ts             # Orchestrator
        │   ├── user-profile.ts
        │   ├── nutrition-data.ts
        │   ├── recipe-data.ts
        │   ├── behavioral-data.ts
        │   └── community-data.ts
        │
        ├── ai-service/
        │   ├── openai-client.ts     # OpenAI wrapper
        │   ├── intention-analyzer.ts
        │   ├── context-builder.ts
        │   ├── response-generator.ts
        │   └── system-prompts.ts
        │
        ├── conversation/
        │   ├── history-manager.ts
        │   └── conversation-db.ts
        │
        └── utils/
            ├── validation.ts
            ├── error-handler.ts
            ├── logger.ts
            ├── token-counter.ts
            └── config.ts
```

---

## Phase 1: Foundation

**Durée estimée:** 2-3 jours

### Étape 1.1 - Migrations Base de Données

**Fichier:** `supabase/migrations/20250221000001_create_ai_conversations.sql`

```sql
-- Create conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT,
  message_count INT DEFAULT 0
);

-- Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own conversations
CREATE POLICY "Users can access their own conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid());

-- Create index
CREATE INDEX idx_conversations_user 
  ON ai_conversations(user_id);
CREATE INDEX idx_conversations_updated 
  ON ai_conversations(updated_at DESC);

-- Comment
COMMENT ON TABLE ai_conversations IS 'AI assistant conversation sessions';
```

**Fichier:** `supabase/migrations/20250221000002_create_ai_messages.sql`

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tokens_used INT,
  processing_time_ms INT,
  
  path_type TEXT CHECK (path_type IN ('fast', 'smart')),
  data_modules_fetched TEXT[],
  intention_analysis JSONB
);

-- Enable RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can access their own messages"
  ON ai_messages FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_messages_conversation 
  ON ai_messages(conversation_id, created_at);
CREATE INDEX idx_messages_user 
  ON ai_messages(user_id, created_at DESC);

-- Comment
COMMENT ON TABLE ai_messages IS 'Individual messages in AI conversations';
```

**Fichier:** `supabase/migrations/20250221000003_create_ai_analytics.sql`

```sql
-- Create analytics table
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  total_messages INT DEFAULT 0,
  fast_path_count INT DEFAULT 0,
  smart_path_count INT DEFAULT 0,
  
  total_tokens_used INT DEFAULT 0,
  avg_processing_time_ms INT,
  
  modules_usage JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can access their own analytics"
  ON ai_analytics FOR ALL
  USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_analytics_user_date 
  ON ai_analytics(user_id, date DESC);

-- Comment
COMMENT ON TABLE ai_analytics IS 'Daily analytics for AI assistant usage';
```

**Exécution:**

```bash
# Via Supabase CLI
supabase db push

# Ou via Dashboard Supabase
# SQL Editor > Copier/coller chaque migration
```

**✅ Checklist Étape 1.1:**
- [ ] Tables créées sans erreur
- [ ] RLS activé sur toutes les tables
- [ ] Index créés
- [ ] Policies fonctionnelles (tester avec user)

---

### Étape 1.2 - Types TypeScript

**Fichier:** `supabase/functions/_shared/types/index.ts`

Copier TOUS les types depuis `V1_AI_ASSISTANT_SPECS.md` section "Types TypeScript"

**✅ Checklist Étape 1.2:**
- [ ] Tous les types copiés
- [ ] Pas d'erreur TypeScript
- [ ] Exports correctement définis

---

### Étape 1.3 - Configuration & Utils

**Fichier:** `supabase/functions/_shared/utils/config.ts`

```typescript
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
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY not found');
  }

  return {
    openai: {
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      maxTokens: parseInt(Deno.env.get('AI_MAX_TOKENS') || '800'),
      temperature: parseFloat(Deno.env.get('AI_TEMPERATURE') || '0.7'),
    },
    supabase: {
      url: Deno.env.get('SUPABASE_URL') || '',
      anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
    },
    rateLimit: {
      maxRequests: parseInt(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') || '30'),
      windowMs: parseInt(Deno.env.get('RATE_LIMIT_WINDOW_MS') || '60000'),
    },
    context: {
      maxTokens: 4000,
      maxHistoryMessages: 5,
    },
  };
}
```

**Fichier:** `supabase/functions/_shared/utils/validation.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Validation Schemas"

**Fichier:** `supabase/functions/_shared/utils/error-handler.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Error Handling"

**Fichier:** `supabase/functions/_shared/utils/logger.ts`

```typescript
import { LogEntry } from '../types/index.ts';

export function logConversation(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

export function logError(error: Error, context?: any): void {
  console.error(JSON.stringify({
    error: error.message,
    stack: error.stack,
    context,
  }));
}
```

**Fichier:** `supabase/functions/_shared/utils/token-counter.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Token Estimation"

**✅ Checklist Étape 1.3:**
- [ ] Config charge les variables d'environnement
- [ ] Validation fonctionne (tests unitaires)
- [ ] Error handler défini
- [ ] Logger fonctionnel

---

## Phase 2: Data Layer

**Durée estimée:** 3-4 jours

### Étape 2.1 - Fast Patterns

**Fichier:** `supabase/functions/_shared/patterns/fast-patterns.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Fast Patterns (Regex)"

**Fichier:** `supabase/functions/_shared/patterns/pattern-matcher.ts`

```typescript
import { FAST_PATTERNS, PatternMatch } from './fast-patterns.ts';

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

**Tests unitaires:**

```typescript
// Test localement ou dans Deno
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import { matchFastPattern } from './pattern-matcher.ts';

Deno.test('matchFastPattern - greeting', () => {
  const result = matchFastPattern('Salut !');
  assertEquals(result.matched, true);
  assertEquals(result.pattern_type, 'greeting_casual');
});

Deno.test('matchFastPattern - no match', () => {
  const result = matchFastPattern('Combien de calories ?');
  assertEquals(result.matched, false);
});
```

**✅ Checklist Étape 2.1:**
- [ ] Patterns définis
- [ ] Matcher fonctionnel
- [ ] Tests unitaires passent

---

### Étape 2.2 - Data Fetchers

Implémenter chaque data fetcher selon les requêtes SQL dans `V1_AI_ASSISTANT_SPECS.md`

**Ordre d'implémentation recommandé:**

1. `user-profile.ts` (le plus simple)
2. `nutrition-data.ts` (meal_plan + nutrition_stats)
3. `recipe-data.ts` (favorites, similar, recent)
4. `behavioral-data.ts` (habits)
5. `community-data.ts` (shopping_list, groups)

**Template pour chaque fetcher:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types/index.ts';

export async function getUserProfile(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<UserProfile | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        age,
        weight,
        height,
        gender,
        user_goals (
          goal_type,
          target_weight,
          target_date
        ),
        user_preferences (
          diet_type,
          allergies,
          dislikes,
          cultural_origin
        ),
        user_daily_targets (
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Transform data to UserProfile type
    return transformToUserProfile(data);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

function transformToUserProfile(data: any): UserProfile {
  // Transform DB data to UserProfile type
  return {
    first_name: data.first_name,
    age: data.age,
    weight: data.weight,
    height: data.height,
    gender: data.gender,
    goals: {
      type: data.user_goals?.goal_type || 'maintenance',
      target_weight: data.user_goals?.target_weight,
      target_date: data.user_goals?.target_date,
    },
    preferences: {
      diet_type: data.user_preferences?.diet_type,
      allergies: data.user_preferences?.allergies || [],
      dislikes: data.user_preferences?.dislikes || [],
      cultural_origin: data.user_preferences?.cultural_origin,
    },
    daily_targets: {
      calories: data.user_daily_targets?.calories || 2000,
      protein: data.user_daily_targets?.protein || 120,
      carbs: data.user_daily_targets?.carbs || 200,
      fat: data.user_daily_targets?.fat || 60,
    },
  };
}
```

**Orchestrateur:** `supabase/functions/_shared/data-fetchers/index.ts`

```typescript
import { DataModule } from '../types/index.ts';
import { getUserProfile } from './user-profile.ts';
import { getMealPlan, getNutritionStats } from './nutrition-data.ts';
// ... autres imports

export async function fetchRequiredModules(
  modules: DataModule[],
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<Record<string, any>> {
  
  const fetchPromises: Promise<any>[] = [];
  const moduleNames: DataModule[] = [];
  
  for (const module of modules) {
    switch (module) {
      case 'user_profile':
        fetchPromises.push(getUserProfile(userId, supabaseUrl, supabaseKey));
        moduleNames.push(module);
        break;
      
      case 'meal_plan':
        fetchPromises.push(getMealPlan(userId, 'today', supabaseUrl, supabaseKey));
        moduleNames.push(module);
        break;
      
      case 'nutrition_stats':
        fetchPromises.push(getNutritionStats(userId, 'today', supabaseUrl, supabaseKey));
        moduleNames.push(module);
        break;
      
      // ... autres modules
    }
  }
  
  // Execute all in parallel
  const results = await Promise.all(fetchPromises);
  
  // Map results to module names
  const fetchedData: Record<string, any> = {};
  moduleNames.forEach((name, index) => {
    fetchedData[name] = results[index];
  });
  
  return fetchedData;
}
```

**✅ Checklist Étape 2.2:**
- [ ] getUserProfile implémenté et testé
- [ ] getMealPlan implémenté et testé
- [ ] getNutritionStats implémenté et testé
- [ ] getFavoriteRecipes implémenté et testé
- [ ] getSimilarRecipes implémenté et testé
- [ ] getRecentRecipes implémenté et testé
- [ ] getShoppingList implémenté et testé
- [ ] getUserHabits implémenté et testé
- [ ] getRecommendedGroups implémenté et testé
- [ ] Orchestrateur fetchRequiredModules fonctionne
- [ ] Tests avec données réelles

---

## Phase 3: AI Layer

**Durée estimée:** 3-4 jours

### Étape 3.1 - OpenAI Client

**Fichier:** `supabase/functions/_shared/ai-service/openai-client.ts`

```typescript
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';
import { OpenAIConfig, OpenAIResponse } from '../types/index.ts';

export class OpenAIClient {
  private client: OpenAI;
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }
  
  async chat(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 800,
    temperature: number = 0.7,
    responseFormat?: { type: 'json_object' }
  ): Promise<OpenAIResponse> {
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature,
      response_format: responseFormat,
    });
    
    return response as OpenAIResponse;
  }
}
```

**✅ Checklist Étape 3.1:**
- [ ] Client instancié correctement
- [ ] Test simple (hello world)
- [ ] Gestion erreurs API

---

### Étape 3.2 - System Prompts

**Fichier:** `supabase/functions/_shared/ai-service/system-prompts.ts`

Copier depuis `V1_AI_ASSISTANT_PROMPTS.md`:
- `INTENTION_ANALYSIS_PROMPT`
- `AKELI_SYSTEM_PROMPT`

**✅ Checklist Étape 3.2:**
- [ ] Prompts définis
- [ ] Variables de template identifiées

---

### Étape 3.3 - Intention Analyzer

**Fichier:** `supabase/functions/_shared/ai-service/intention-analyzer.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Intention Analysis Prompt"

**Tests:**

```typescript
// Test avec messages réels
const testCases = [
  {
    message: "Salut !",
    expected: { needs_data: false, conversation_type: 'greeting' }
  },
  {
    message: "Combien de calories aujourd'hui ?",
    expected: { needs_data: true, data_modules: ['nutrition_stats', 'meal_plan'] }
  },
];

// Exécuter et valider
```

**✅ Checklist Étape 3.3:**
- [ ] Analyser implémenté
- [ ] Tests passent
- [ ] JSON parsing fonctionne

---

### Étape 3.4 - Context Builder

**Fichier:** `supabase/functions/_shared/ai-service/context-builder.ts`

Copier les fonctions depuis `V1_AI_ASSISTANT_SPECS.md`:
- `buildContextString`
- `buildHistoryString`
- `optimizeContext`

**✅ Checklist Étape 3.4:**
- [ ] Context builder implémenté
- [ ] Tokens comptés correctement
- [ ] Optimisation fonctionne

---

### Étape 3.5 - Response Generator

**Fichier:** `supabase/functions/_shared/ai-service/response-generator.ts`

Copier depuis `V1_AI_ASSISTANT_SPECS.md` section "Akeli System Prompt"

**✅ Checklist Étape 3.5:**
- [ ] Générateur implémenté
- [ ] Prompt templating fonctionne
- [ ] Réponses naturelles obtenues

---

## Phase 4: Integration

**Durée estimée:** 3-4 jours

### Étape 4.1 - Conversation Manager

**Fichier:** `supabase/functions/_shared/conversation/conversation-db.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { Conversation, Message } from '../types/index.ts';

export async function getOrCreateConversation(
  userId: string,
  conversationId: string | undefined,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (conversationId) {
    // Verify conversation exists and belongs to user
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      return conversationId;
    }
  }
  
  // Create new conversation
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId })
    .select('id')
    .single();
  
  if (error) throw error;
  
  return data.id;
}

export async function saveMessage(
  message: Omit<Message, 'id' | 'created_at'>,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('ai_messages')
    .insert(message)
    .select('id')
    .single();
  
  if (error) throw error;
  
  // Update conversation count and timestamp
  await supabase
    .from('ai_conversations')
    .update({
      updated_at: new Date().toISOString(),
      message_count: supabase.raw('message_count + 1'),
    })
    .eq('id', message.conversation_id);
  
  return data.id;
}
```

**Fichier:** `supabase/functions/_shared/conversation/history-manager.ts`

```typescript
export async function getConversationHistory(
  conversationId: string,
  maxMessages: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<Message[]> {
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, created_at, tokens_used')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(maxMessages);
  
  if (error) throw error;
  
  // Reverse to chronological order
  return (data || []).reverse();
}
```

**✅ Checklist Étape 4.1:**
- [ ] Création conversation fonctionne
- [ ] Sauvegarde message fonctionne
- [ ] Historique récupéré correctement

---

### Étape 4.2 - Main Edge Function

**Fichier:** `supabase/functions/ai-assistant-chat/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '../_shared/utils/config.ts';
import { validateChatRequest, sanitizeMessage } from '../_shared/utils/validation.ts';
import { handleError, ValidationError } from '../_shared/utils/error-handler.ts';
import { matchFastPattern } from '../_shared/patterns/pattern-matcher.ts';
import { analyzeIntention } from '../_shared/ai-service/intention-analyzer.ts';
import { fetchRequiredModules } from '../_shared/data-fetchers/index.ts';
import { buildContext } from '../_shared/ai-service/context-builder.ts';
import { generateResponse } from '../_shared/ai-service/response-generator.ts';
import { getOrCreateConversation, saveMessage } from '../_shared/conversation/conversation-db.ts';
import { getConversationHistory } from '../_shared/conversation/history-manager.ts';
import { OpenAIClient } from '../_shared/ai-service/openai-client.ts';
import { logConversation } from '../_shared/utils/logger.ts';

serve(async (req) => {
  const startTime = Date.now();
  
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
  }
  
  try {
    // 1. Load config
    const config = loadConfig();
    
    // 2. Parse request
    const requestData = await req.json();
    
    // 3. Validate
    const validation = validateChatRequest(requestData);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // 4. Sanitize
    const message = sanitizeMessage(requestData.message);
    const userId = requestData.user_id;
    
    // 5. Get/Create conversation
    const conversationId = await getOrCreateConversation(
      userId,
      requestData.conversation_id,
      config.supabase.url,
      config.supabase.anonKey
    );
    
    // 6. Load minimal context (user first name)
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    const { data: userData } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', userId)
      .single();
    
    const firstName = userData?.first_name || 'l\'utilisateur';
    
    // 7. Load conversation history (if requested)
    let history = [];
    if (requestData.include_history !== false) {
      history = await getConversationHistory(
        conversationId,
        config.context.maxHistoryMessages,
        config.supabase.url,
        config.supabase.anonKey
      );
    }
    
    // 8. Pattern detection (Fast Path)
    const patternMatch = matchFastPattern(message);
    
    let response = '';
    let pathType = 'fast';
    let modulesUsed = [];
    let tokensUsed = 0;
    
    if (patternMatch.matched) {
      // FAST PATH
      const openaiClient = new OpenAIClient(config.openai);
      
      const fastResponse = await openaiClient.chat([
        {
          role: 'system',
          content: `Tu es Akeli. L'utilisateur s'appelle ${firstName}. Réponds de manière courte et amicale.`
        },
        {
          role: 'user',
          content: message
        }
      ], 200, 0.7);
      
      response = fastResponse.choices[0].message.content;
      tokensUsed = fastResponse.usage.total_tokens;
      
    } else {
      // SMART PATH
      pathType = 'smart';
      
      // 9. Intention analysis
      const openaiClient = new OpenAIClient(config.openai);
      const intention = await analyzeIntention(message, openaiClient);
      
      // 10. Conditional fetch
      let fetchedData = {};
      if (intention.needs_data && intention.data_modules.length > 0) {
        fetchedData = await fetchRequiredModules(
          intention.data_modules,
          userId,
          config.supabase.url,
          config.supabase.anonKey
        );
        modulesUsed = intention.data_modules;
      }
      
      // 11. Build context
      const context = buildContext({
        user_info: { first_name: firstName, user_id: userId },
        conversation_history: history,
        fetched_data: fetchedData,
        total_tokens_estimate: 0,
      });
      
      // 12. Generate response
      const finalResponse = await generateResponse(message, context, openaiClient);
      response = finalResponse;
      tokensUsed = 800; // Approximation, adjust based on actual
    }
    
    // 13. Save messages
    await saveMessage({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: message,
      path_type: pathType,
    }, config.supabase.url, config.supabase.anonKey);
    
    const messageId = await saveMessage({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: response,
      tokens_used: tokensUsed,
      processing_time_ms: Date.now() - startTime,
      path_type: pathType,
      data_modules_fetched: modulesUsed,
    }, config.supabase.url, config.supabase.anonKey);
    
    // 14. Log
    logConversation({
      timestamp: new Date().toISOString(),
      user_id: userId,
      conversation_id: conversationId,
      message_id: messageId,
      path_type: pathType,
      processing_time_ms: Date.now() - startTime,
      phases: {
        validation: 0,
        pattern_detection: 0,
        intention_analysis: 0,
        data_fetch: 0,
        context_building: 0,
        response_generation: 0,
        save_db: 0,
      },
      modules_fetched: modulesUsed,
      tokens_used: tokensUsed,
      cost_usd: 0,
      user_message_length: message.length,
      response_length: response.length,
    });
    
    // 15. Return response
    return new Response(
      JSON.stringify({
        response,
        conversation_id: conversationId,
        message_id: messageId,
        tokens_used: tokensUsed,
        processing_time_ms: Date.now() - startTime,
        path_type: pathType,
        modules_used: modulesUsed,
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    const errorResponse = handleError(error);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: error.statusCode || 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
```

**✅ Checklist Étape 4.2:**
- [ ] Edge Function se déploie sans erreur
- [ ] Fast path fonctionne
- [ ] Smart path fonctionne
- [ ] Erreurs gérées correctement

---

## Phase 5: Testing

**Durée estimée:** 2-3 jours

### Tests Unitaires

```bash
# Tests locaux avec Deno
deno test supabase/functions/_shared/patterns/
deno test supabase/functions/_shared/utils/
```

### Tests d'Intégration

**Test 1: Fast Path**

```bash
curl -X POST 'http://localhost:54321/functions/v1/ai-assistant-chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "YOUR_USER_UUID",
    "message": "Salut Akeli !"
  }'
```

**Attendu:** Réponse rapide (~1.5s), path_type: "fast"

---

**Test 2: Smart Path - Nutrition**

```bash
curl -X POST 'http://localhost:54321/functions/v1/ai-assistant-chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "YOUR_USER_UUID",
    "message": "Combien de calories j'\''ai mangé aujourd'\''hui ?"
  }'
```

**Attendu:** 
- path_type: "smart"
- modules_used: ["nutrition_stats", "meal_plan"]
- Réponse personnalisée avec chiffres

---

**Test 3: Smart Path - Recommandation**

```bash
curl -X POST 'http://localhost:54321/functions/v1/ai-assistant-chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "YOUR_USER_UUID",
    "message": "Propose-moi une recette pour ce soir"
  }'
```

**Attendu:**
- path_type: "smart"
- modules_used: ["recipes_similar", "user_profile"]
- Recommandation de recette

---

**Test 4: Historique de Conversation**

```bash
# Message 1
curl -X POST '...' -d '{"user_id": "...", "message": "Salut"}'

# Message 2 (avec conversation_id du précédent)
curl -X POST '...' -d '{
  "user_id": "...", 
  "message": "Qu'\''est-ce que je mange ce soir ?",
  "conversation_id": "CONVERSATION_UUID"
}'
```

**Attendu:** Contexte de conversation maintenu

---

### Checklist Tests Complets

**Fonctionnalité:**
- [ ] Fast path répond correctement (salutations, confirmations, merci)
- [ ] Smart path analyse intention correctement
- [ ] Modules fetchés selon besoin
- [ ] Réponses personnalisées
- [ ] Historique maintenu
- [ ] Limitations V1 respectées (pas d'actions)

**Performance:**
- [ ] Fast path < 2s
- [ ] Smart path < 4s
- [ ] Pas de timeout

**Erreurs:**
- [ ] Message vide refusé
- [ ] user_id invalide refusé
- [ ] Erreur DB gérée
- [ ] Erreur OpenAI gérée
- [ ] Rate limit fonctionnel

**Base de Données:**
- [ ] Conversations créées
- [ ] Messages sauvegardés
- [ ] RLS fonctionnel
- [ ] Timestamps corrects

---

## Phase 6: Deployment

**Durée estimée:** 1 jour

### Déploiement Production

**1. Variables d'environnement:**

Via Supabase Dashboard > Edge Functions > Settings

```
OPENAI_API_KEY=sk-...
AI_MAX_TOKENS=800
AI_TEMPERATURE=0.7
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_WINDOW_MS=60000
```

**2. Déploiement:**

```bash
# Via Supabase CLI
supabase functions deploy ai-assistant-chat

# Vérifier déploiement
supabase functions list
```

**3. Tests Production:**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-assistant-chat' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "USER_UUID",
    "message": "Salut Akeli !"
  }'
```

**4. Monitoring:**

- Vérifier logs dans Supabase Dashboard
- Monitorer coûts OpenAI
- Vérifier métriques performance

**✅ Checklist Deployment:**
- [ ] Variables d'environnement configurées
- [ ] Edge Function déployée
- [ ] Tests production passent
- [ ] Logs visibles
- [ ] Monitoring actif

---

## Migration V1.1 (Streaming)

**Prévu pour:** Après validation V1.0 (1-2 mois)

### Changements Requis

**1. Edge Function - Streaming Response**

```typescript
// Remplacer return Response JSON par ReadableStream

return new Response(
  new ReadableStream({
    async start(controller) {
      // Stream OpenAI response
      const stream = await openaiClient.chatStream(messages);
      
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(new TextEncoder().encode(text));
      }
      
      controller.close();
    }
  }),
  {
    headers: {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': '*',
    }
  }
);
```

**2. Flutter App - StreamBuilder**

```dart
// Utiliser StreamBuilder pour afficher tokens en temps réel
StreamBuilder<String>(
  stream: chatStream,
  builder: (context, snapshot) {
    if (snapshot.hasData) {
      return Text(snapshot.data);
    }
    return CircularProgressIndicator();
  }
)
```

**Bénéfices V1.1:**
- Premier token à ~1.5s
- Perception de rapidité
- UX moderne

---

## Checklist Finale

### Avant Production

- [ ] Toutes les migrations exécutées
- [ ] Tous les modules implémentés
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Fast path < 2s
- [ ] Smart path < 4s
- [ ] Erreurs gérées
- [ ] Logs structurés
- [ ] RLS activé
- [ ] Variables d'env configurées

### Post-Déploiement

- [ ] Tests production OK
- [ ] Monitoring actif
- [ ] Budget OpenAI défini
- [ ] Analytics tracking
- [ ] Feedback utilisateurs collecté
- [ ] Documentation à jour

---

## Support & Maintenance

### Logs à Surveiller

- Temps de réponse moyen
- Taux d'erreur
- Distribution fast/smart path
- Modules les plus utilisés
- Coûts OpenAI

### Métriques Clés

**Performance:**
- P50 response time < 2.5s
- P95 response time < 4s
- Error rate < 1%

**Coûts:**
- < 0.001€ par conversation
- Budget mensuel monitoring

**Engagement:**
- Messages par utilisateur actif
- Taux de rétention conversations

---

## Conclusion

Ce guide fournit un plan complet pour implémenter l'Agent IA Akeli V1. En suivant ces phases dans l'ordre, tu construiras une base solide pour l'assistant IA, prête pour évoluer vers V2 avec des capacités d'actions avancées.

**Prochaines étapes après V1.0:**
1. Collecter feedback utilisateurs
2. Optimiser prompts basés sur usage réel
3. Préparer V1.1 (streaming)
4. Planifier V2 (actions intelligentes)

Bonne implémentation ! 🚀
