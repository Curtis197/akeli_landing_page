# Akeli V1 — Spécifications IA Website (Gemini + Claude Sonnet)

> Spécifications complètes des intégrations IA du website créateur.
> Distinct de `V1_AI_ASSISTANT_SPECS.md` qui couvre l'assistant conversationnel de l'app Flutter.
> Le website utilise deux APIs IA distinctes avec des rôles bien séparés.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## Vue d'ensemble

Le website utilise deux APIs IA avec des rôles strictement séparés :

| API | Rôle | Budget estimé | Appelée depuis |
|-----|------|---------------|----------------|
| **Gemini API** | Corrections orthographe, traductions recettes | ~$100-150/mois | Edge Functions Supabase |
| **Claude Sonnet API** | Analytics expliqués, insights créateur | ~$50-80/mois | Edge Function Supabase |

**Principe fondamental commun aux deux :**
> L'IA corrige le **technique** (orthographe, cohérence, chiffres).  
> L'IA n'émet **jamais** de jugement éditorial, culturel ou nutritionnel.  
> L'IA ne dit jamais qu'une recette est "mauvaise", "malsaine" ou "à éviter".

---

## PARTIE 1 — Gemini API

### Cas d'usage Gemini

| Use case | Déclencheur | Latence attendue |
|----------|-------------|-----------------|
| Correction orthographe temps réel | Saisie créateur (debounce 2s) | < 1s |
| Validation cohérence quantités | Soumission step ingrédients | < 2s |
| Traduction recette complète | Publication recette | Async (non-bloquant) |

---

### 1.1 Correction orthographe et grammaire

**Déclencheur :** Le créateur saisit du texte dans le wizard (titre, description, étapes).
Appel déclenché avec un debounce de 2 secondes après la dernière frappe.

**Edge Function : `gemini-correct-text`**

```typescript
// supabase/functions/gemini-correct-text/index.ts
// Body attendu :
interface CorrectTextRequest {
  text: string;
  field_type: 'title' | 'description' | 'step' | 'bio';
  source_language: string;  // 'fr' | 'en' | 'wo' | 'bm' | 'ln' | 'ar' | 'es' | 'pt'
}

// Réponse :
interface CorrectTextResponse {
  has_correction: boolean;
  corrected_text: string | null;   // null si pas de correction
  corrections: Correction[];        // liste des corrections détectées
}

interface Correction {
  original: string;
  suggestion: string;
  type: 'spelling' | 'grammar' | 'coherence';
  explanation: string;  // En langue source_language
}
```

**Prompt Gemini — Correction orthographe :**

```
SYSTEM:
Tu es un assistant de correction pour des créateurs de recettes culinaires africaines.
Ton rôle est uniquement de corriger les erreurs techniques (orthographe, grammaire, incohérences).

RÈGLES ABSOLUES :
- Ne jamais commenter la qualité culinaire ou nutritionnelle
- Ne jamais suggérer de modifier les ingrédients ou les quantités pour des raisons de santé
- Ne jamais juger les choix culturels ou traditionnels
- Corriger uniquement les fautes d'orthographe et de grammaire évidentes
- Signaler les incohérences de quantités (ex: "500kg de sel") sans jugement
- Répondre dans la même langue que le texte soumis

FORMAT DE RÉPONSE (JSON strict) :
{
  "has_correction": boolean,
  "corrected_text": "texte corrigé" | null,
  "corrections": [
    {
      "original": "mot original",
      "suggestion": "correction",
      "type": "spelling" | "grammar" | "coherence",
      "explanation": "explication courte en langue source"
    }
  ]
}

USER:
Champ : {field_type}
Langue détectée : {source_language}
Texte à vérifier : "{text}"
```

**Exemples de corrections attendues :**

```
// Entrée créateur (faute d'orthographe)
"mètre le ri dans léo bouillant"

// Réponse Gemini
{
  "has_correction": true,
  "corrected_text": "Mettre le riz dans l'eau bouillante",
  "corrections": [
    { "original": "mètre", "suggestion": "Mettre", "type": "spelling", "explanation": "Verbe 'mettre'" },
    { "original": "ri", "suggestion": "riz", "type": "spelling", "explanation": "Ingrédient 'riz'" },
    { "original": "léo", "suggestion": "l'eau", "type": "spelling", "explanation": "Article + nom 'eau'" }
  ]
}

// Entrée créateur (incohérence quantité)
"Ajouter 500kg de sel"

// Réponse Gemini
{
  "has_correction": true,
  "corrected_text": null,
  "corrections": [
    {
      "original": "500kg de sel",
      "suggestion": "500g de sel",
      "type": "coherence",
      "explanation": "500 kg semble être une erreur de frappe. Tu voulais dire 500g ?"
    }
  ]
}

// Entrée correcte
"Faire revenir les oignons dans l'huile pendant 5 minutes"

// Réponse Gemini
{
  "has_correction": false,
  "corrected_text": null,
  "corrections": []
}
```

**Rendu UI côté Next.js :**
```typescript
// Composant AICorrection.tsx
// Affiché uniquement si has_correction = true

// Cas spelling/grammar → suggestion directe
<div className="ai-correction-widget">
  <span className="label">✨ Suggestion IA :</span>
  <span className="corrected">{correction.corrected_text}</span>
  <button onClick={() => acceptCorrection(corrected_text)}>Accepter</button>
  <button onClick={() => dismissCorrection()}>Ignorer</button>
</div>

// Cas coherence → question non-bloquante
<div className="ai-correction-widget warning">
  <span>⚠️ {correction.corrections[0].explanation}</span>
  <button onClick={() => focusField()}>Modifier</button>
  <button onClick={() => dismissCorrection()}>C'est intentionnel</button>
</div>
```

**Caching :** Résultat mis en cache 5 minutes par (texte_hash, language).
Évite les appels répétés si le créateur ne modifie pas le champ.

```typescript
const cacheKey = `correction:${hash(text)}:${source_language}`;
// Cache dans mémoire Edge Function (scope instance)
```

---

### 1.2 Traduction recette complète

**Déclencheur :** Créateur clique "Publier la recette" dans le Step 6 du wizard.
L'appel est **asynchrone et non-bloquant** — la recette est publiée immédiatement, la traduction arrive dans la foulée.

**Edge Function : `translate-recipe`**

```typescript
// Body :
interface TranslateRecipeRequest {
  recipe_id: string;
  source_locale: string;  // Langue de saisie du créateur ('fr' | 'en' | ...)
}

// Langues cibles (toutes sauf la source) :
const TARGET_LOCALES = ['fr', 'en', 'es', 'pt', 'wo', 'bm', 'ln', 'ar'];
```

**Logique Edge Function :**

```typescript
// supabase/functions/translate-recipe/index.ts
export default async function handler(req: Request) {
  const { recipe_id, source_locale } = await req.json();

  // 1. Charger la recette source
  const { data: recipe } = await supabase
    .from('recipe')
    .select('title, description, instructions')
    .eq('id', recipe_id)
    .single();

  // 2. Déterminer les langues à traduire
  const targets = TARGET_LOCALES.filter(l => l !== source_locale);

  // 3. Traduire en parallèle (Promise.allSettled pour tolérance aux erreurs)
  const results = await Promise.allSettled(
    targets.map(target => translateToLocale(recipe, source_locale, target))
  );

  // 4. Upsert les traductions réussies dans recipe_translation
  for (let i = 0; i < targets.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      await supabase.from('recipe_translation').upsert({
        recipe_id,
        locale: targets[i],
        title: result.value.title,
        description: result.value.description,
        instructions: result.value.instructions,
        is_auto: true,
      }, { onConflict: 'recipe_id,locale' });
    }
    // Si rejected : log l'erreur, pas de blocage
  }
}
```

**Prompt Gemini — Traduction recette :**

```
SYSTEM:
Tu es un traducteur spécialisé en cuisine africaine et de la diaspora.
Traduis avec précision les recettes en respectant les termes culinaires authentiques.

RÈGLES :
- Conserver les noms propres de plats (Thiéboudienne, Mafé, Attiéké, Jollof...)
- Adapter les unités si nécessaire (ex: "une poignée" reste "une poignée", pas de conversion)
- Traduire les instructions en langage naturel, pas en langage robotique
- Ne pas ajouter ni supprimer d'étapes
- Ne jamais commenter la valeur nutritionnelle ou suggérer des modifications
- Pour les langues africaines (Wolof, Bambara, Lingala) : privilégier les termes locaux si disponibles

USER:
Traduis de {source_locale} vers {target_locale} :

TITRE: {recipe.title}

DESCRIPTION: {recipe.description}

INSTRUCTIONS:
{recipe.instructions}

FORMAT JSON STRICT :
{
  "title": "traduction du titre",
  "description": "traduction de la description",
  "instructions": "traduction des instructions"
}
```

**Gestion langues africaines (Wolof, Bambara, Lingala) :**

Pour ces langues, Gemini peut avoir une couverture limitée. Stratégie de fallback :

```typescript
const translateToLocale = async (
  recipe: Recipe,
  source: string,
  target: string
): Promise<Translation> => {
  try {
    return await callGemini(recipe, source, target);
  } catch (error) {
    if (['wo', 'bm', 'ln'].includes(target)) {
      // Fallback : traduire d'abord en FR/EN puis vers la langue africaine
      const intermediate = await callGemini(recipe, source, 'fr');
      return await callGemini(intermediate, 'fr', target);
    }
    throw error;
  }
};
```

**Badge "traduction IA" dans l'interface :**

Quand un utilisateur lit une recette traduite automatiquement, un badge discret indique :
> "Traduit automatiquement — [Corriger]"

Le créateur peut alors corriger la traduction manuellement, ce qui passe `is_auto = false` dans `recipe_translation`.

---

### 1.3 Rate limiting et coûts Gemini

```typescript
// Limites Gemini API (Flash model recommandé pour le cost/perf)
const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash',        // Rapide + économique
  maxOutputTokens: 1024,
  temperature: 0.1,                  // Faible pour traductions précises
};

// Estimation coûts correction orthographe
// ~200 tokens input + ~100 tokens output par correction
// Gemini Flash : ~$0.075/1M input, ~$0.30/1M output
// Coût par correction : ~$0.000045 → négligeable

// Estimation coûts traduction recette complète
// ~500 tokens input + ~500 tokens output par langue
// 7 langues cibles = ~7000 tokens total
// Coût par publication : ~$0.0022 → ~$2.20 pour 1000 publications
```

---

## PARTIE 2 — Claude Sonnet API

### Cas d'usage Claude Sonnet

| Use case | Déclencheur | Fréquence estimée |
|----------|-------------|------------------|
| Explication dashboard | Bouton "Explique-moi mes stats" | À la demande |
| Insight recette | Bouton "Pourquoi cette recette performe ?" | À la demande |
| Suggestion progression | Affiché automatiquement (1x/semaine max) | Périodique |

---

### 2.1 Explication dashboard créateur

**Déclencheur :** Créateur clique "Explique-moi mes stats" sur le dashboard.

**Edge Function : `explain-creator-stats`**

```typescript
// Body :
interface ExplainStatsRequest {
  creator_id: string;
}

// Réponse :
interface ExplainStatsResponse {
  explanation: string;        // Texte markdown léger
  insights: Insight[];        // Points clés extraits
  suggestions: Suggestion[];  // Actions recommandées
}

interface Insight {
  type: 'positive' | 'neutral' | 'opportunity';
  text: string;
}

interface Suggestion {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}
```

**Logique Edge Function :**

```typescript
// supabase/functions/explain-creator-stats/index.ts
export default async function handler(req: Request) {
  const { creator_id } = await req.json();

  // 1. Vérifier auth + is_creator
  const session = await verifyJWT(req);
  const creatorUserId = session.user.id;

  // 2. Charger les données du dashboard
  const { data: stats } = await supabase
    .from('creator_dashboard_stats')
    .select('*')
    .eq('creator_id', creator_id)
    .single();

  // 3. Charger l'historique mensuel (6 mois)
  const { data: monthlyHistory } = await supabase
    .from('creator_revenue_log')
    .select('month_key, total_revenue, consumption_count, fan_count')
    .eq('creator_id', creator_id)
    .order('month_key', { ascending: false })
    .limit(6);

  // 4. Charger les top recettes avec stats
  const { data: topRecipes } = await supabase
    .from('recipe')
    .select(`
      title, is_published, created_at,
      consumptions:meal_consumption(count)
    `)
    .eq('creator_id', creator_id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(10);

  // 5. Construire le contexte pour Claude Sonnet
  const context = buildCreatorContext(stats, monthlyHistory, topRecipes);

  // 6. Appel Claude Sonnet
  const response = await callClaude(context);

  return new Response(JSON.stringify(response));
}
```

**Prompt Claude Sonnet — Explication dashboard :**

```typescript
const SYSTEM_PROMPT = `
Tu es un assistant analytique pour les créateurs de recettes sur Akeli, une plateforme de cuisine africaine et de la diaspora.

TON RÔLE :
- Expliquer les statistiques en langage simple et accessible
- Identifier les recettes qui fonctionnent bien et pourquoi
- Suggérer des actions concrètes et réalistes
- Célébrer les succès, même modestes

RÈGLES ABSOLUES :
- Utiliser un langage simple, sans jargon
- Ne jamais juger la valeur nutritionnelle des recettes
- Ne jamais suggérer de modifier les recettes pour les "rendre plus saines"
- Ne jamais comparer défavorablement le créateur à d'autres
- Parler au créateur comme à un partenaire, pas comme à un élève
- Répondre dans la langue de l'interface (${locale})

FORMAT DE RÉPONSE (JSON strict) :
{
  "explanation": "Explication globale en 2-3 phrases (markdown léger autorisé)",
  "insights": [
    {
      "type": "positive" | "neutral" | "opportunity",
      "text": "Point clé en 1 phrase"
    }
  ],
  "suggestions": [
    {
      "action": "Action concrète à réaliser",
      "reason": "Pourquoi cette action (1 phrase)",
      "priority": "high" | "medium" | "low"
    }
  ]
}
`;

const buildUserPrompt = (context: CreatorContext): string => `
Voici les données de ce créateur pour ce mois :

REVENUS :
- Ce mois : ${context.revenue_current_month}€
- Mois précédent : ${context.revenue_last_month}€
- Évolution : ${context.revenue_trend > 0 ? '+' : ''}${context.revenue_trend}%
- Total gagné depuis le début : ${context.total_earned}€

CONSOMMATIONS :
- Ce mois : ${context.consumptions_current_month}
- Prochaine récompense dans : ${context.consumptions_to_next_euro} consommations

CATALOGUE :
- Recettes publiées : ${context.recipe_count}
- Mode Fan : ${context.is_fan_eligible ? 'Activé' : `${30 - context.recipe_count} recettes pour l'activer`}
- Fans actifs : ${context.fan_count}

TOP RECETTES CE MOIS :
${context.top_recipes.map((r, i) =>
  `${i + 1}. "${r.title}" — ${r.consumption_count} consommations`
).join('\n')}

HISTORIQUE 6 MOIS :
${context.monthly_history.map(m =>
  `${m.month_key} : ${m.total_revenue}€ (${m.consumption_count} consommations, ${m.fan_count} fans)`
).join('\n')}

Génère une explication de ces stats pour le créateur.
`;
```

**Exemples de réponses attendues :**

```json
// Créateur débutant (3 recettes, 0€ ce mois)
{
  "explanation": "Tu viens de commencer et c'est normal que les chiffres soient faibles. Chaque recette publiée augmente ta visibilité.",
  "insights": [
    { "type": "neutral", "text": "3 recettes publiées — tu construis ton catalogue" },
    { "type": "opportunity", "text": "Il te manque 27 recettes pour activer le Mode Fan et gagner 1€/mois par fan" }
  ],
  "suggestions": [
    {
      "action": "Publie 2 recettes cette semaine",
      "reason": "Un catalogue de 10 recettes améliore significativement la recommandation dans l'app",
      "priority": "high"
    },
    {
      "action": "Complète ton profil avec une bio et une spécialité",
      "reason": "Un profil complet augmente les chances d'être découvert dans le catalogue créateurs",
      "priority": "medium"
    }
  ]
}

// Créateur intermédiaire (15 recettes, 3€ ce mois)
{
  "explanation": "**3€ gagnés ce mois**, soit 270 consommations de tes recettes. Ta recette \"Thiéboudienne\" représente la majorité de tes revenus.",
  "insights": [
    { "type": "positive", "text": "\"Thiéboudienne\" : 180 consommations — ta recette phare" },
    { "type": "opportunity", "text": "15 recettes publiées — encore 15 pour activer le Mode Fan" },
    { "type": "neutral", "text": "Légère baisse par rapport au mois dernier (−0.50€)" }
  ],
  "suggestions": [
    {
      "action": "Publie une variante de ta Thiéboudienne (version rapide < 30min)",
      "reason": "Les variantes d'une recette populaire captent souvent la même audience",
      "priority": "high"
    },
    {
      "action": "Vise 30 recettes pour activer le Mode Fan",
      "reason": "Chaque fan te garantit 1€/mois de revenu stable",
      "priority": "medium"
    }
  ]
}

// Créateur avancé (35 recettes, Mode Fan, 12€ ce mois)
{
  "explanation": "**12€ ce mois** : 7€ de fans et 5€ de consommations. Avec 7 fans actifs, ton Mode Fan est bien installé.",
  "insights": [
    { "type": "positive", "text": "7 fans actifs → 7€ garantis chaque mois" },
    { "type": "positive", "text": "\"Mafé\" en forte hausse : +45% de consommations ce mois" },
    { "type": "opportunity", "text": "5 recettes n'ont aucune consommation ce mois — potentiel inexploité" }
  ],
  "suggestions": [
    {
      "action": "Partage tes recettes inactives sur ton compte TikTok ou Instagram",
      "reason": "Chaque partage externe peut générer de nouvelles consommations dans l'app",
      "priority": "high"
    },
    {
      "action": "Vise 10 fans pour dépasser 10€ garantis par mois",
      "reason": "3 fans de plus = +3€/mois stable en plus des consommations",
      "priority": "medium"
    }
  ]
}
```

---

### 2.2 Insight recette individuelle

**Déclencheur :** Créateur clique "Pourquoi cette recette performe ?" sur une recette dans son catalogue.

**Edge Function : `explain-recipe-performance`**

```typescript
// Body :
interface ExplainRecipeRequest {
  recipe_id: string;
  creator_id: string;
}
```

**Prompt Claude Sonnet — Performance recette :**

```typescript
const buildRecipeInsightPrompt = (recipe: Recipe, stats: RecipeStats): string => `
Explique pourquoi cette recette performe bien (ou moins bien) sur Akeli.

RECETTE : "${recipe.title}"
Publiée le : ${recipe.created_at}
Temps de préparation : ${recipe.prep_time_min} min
Temps de cuisson : ${recipe.cook_time_min} min
Difficulté : ${recipe.difficulty}
Région : ${recipe.region}
Tags : ${recipe.tags.join(', ')}
Macros par portion : ${recipe.macros.calories} kcal

PERFORMANCES :
Consommations totales : ${stats.total_consumptions}
Consommations ce mois : ${stats.consumptions_this_month}
Consommations mois précédent : ${stats.consumptions_last_month}
Tendance : ${stats.trend > 0 ? 'En hausse' : stats.trend < 0 ? 'En baisse' : 'Stable'} (${stats.trend}%)

CONTEXTE CATALOGUE :
Position dans le top : ${stats.rank_in_catalog} / ${stats.total_published_recipes}

Génère un insight bref (2-3 phrases max) sur la performance de cette recette.
Ne jamais juger la qualité culinaire. Analyser uniquement les facteurs de découvrabilité
(temps de préparation, tags, région, tendances).
`;
```

**Exemples de réponses attendues :**

```json
// Recette qui performe bien
{
  "explanation": "Ta Thiéboudienne performe car elle combine un temps de préparation raisonnable (45 min) avec des tags très recherchés (#Sénégal #Poisson). Les recettes < 60 min sont davantage ajoutées aux plans alimentaires.",
  "insights": [
    { "type": "positive", "text": "Temps de préparation optimal pour les plans de semaine" },
    { "type": "positive", "text": "Tags alignés avec les recherches dans l'app" }
  ],
  "suggestions": [
    {
      "action": "Publie une version express (< 30 min) pour capter les utilisateurs pressés",
      "reason": "Les variantes rapides d'une recette populaire fonctionnent bien",
      "priority": "medium"
    }
  ]
}

// Recette qui ne performe pas
{
  "explanation": "Cette recette a peu de consommations peut-être à cause de sa durée (90 min). Les recettes > 75 min sont moins souvent ajoutées aux plans de semaine.",
  "insights": [
    { "type": "opportunity", "text": "Durée élevée (90 min) — plutôt adaptée aux week-ends" },
    { "type": "neutral", "text": "Tags peu utilisés dans les recherches actuelles" }
  ],
  "suggestions": [
    {
      "action": "Ajoute le tag #Weekend ou #Festif pour cibler le bon moment",
      "reason": "Les recettes longues trouvent leur audience quand le contexte est clair",
      "priority": "low"
    }
  ]
}
```

---

### 2.3 Configuration et coûts Claude Sonnet

```typescript
// Configuration Claude Sonnet pour les Edge Functions
const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  temperature: 0.3,      // Faible pour des analyses cohérentes
};

// Appel API Claude Sonnet
const callClaude = async (systemPrompt: string, userPrompt: string) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.max_tokens,
      temperature: CLAUDE_CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await response.json();

  // Parser la réponse JSON
  const text = data.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    // Fallback si JSON malformé
    return {
      explanation: text,
      insights: [],
      suggestions: [],
    };
  }
};

// Estimation coûts Claude Sonnet
// ~800 tokens input (contexte stats) + ~400 tokens output (explication)
// Claude Sonnet : ~$3/1M input, ~$15/1M output
// Coût par appel dashboard : ~$0.0084
// 500 appels/mois → ~$4.20/mois
// Total avec insights recettes : ~$50-80/mois estimé
```

---

## PARTIE 3 — Edge Functions communes

### 3.1 Pattern d'appel depuis Next.js

Toutes les Edge Functions IA sont appelées depuis le client Next.js via `supabase.functions.invoke()`.
Le JWT utilisateur est automatiquement inclus.

```typescript
// Depuis un composant Next.js (Client Component)

// Dashboard — explication stats
const explainStats = async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('explain-creator-stats', {
      body: { creator_id: creatorId },
    });
    if (error) throw error;
    setInsight(data);
  } catch (err) {
    toast.error('Analyse temporairement indisponible. Réessaye dans quelques instants.');
  } finally {
    setIsLoading(false);
  }
};

// Wizard — correction orthographe (debounce 2s)
const correctText = useDebouncedCallback(async (text: string, fieldType: string) => {
  if (text.length < 10) return; // Pas de correction sur texte trop court
  const { data } = await supabase.functions.invoke('gemini-correct-text', {
    body: { text, field_type: fieldType, source_language: creatorLocale },
  });
  if (data?.has_correction) setCorrection(data);
}, 2000);

// Publication — traduction (non-bloquant)
const publishRecipe = async (recipeId: string) => {
  await supabase.from('recipe').update({ is_published: true }).eq('id', recipeId);
  // Fire & forget — pas d'await
  supabase.functions.invoke('translate-recipe', {
    body: { recipe_id: recipeId, source_locale: creatorLocale },
  });
  toast.success('Recette publiée ! Traduction en cours...');
  router.push('/recipes');
};
```

---

### 3.2 Gestion des erreurs

```typescript
// Pattern gestion erreurs IA dans les Edge Functions
const handleAIError = (error: unknown, context: string): Response => {
  console.error(`AI Error [${context}]:`, error);

  // Erreur API externe (Gemini ou Claude)
  if (error instanceof APIError) {
    return new Response(JSON.stringify({
      error: 'service_unavailable',
      message: 'Service IA temporairement indisponible',
      retry_after: 30,
    }), { status: 503 });
  }

  // Timeout
  if (error instanceof TimeoutError) {
    return new Response(JSON.stringify({
      error: 'timeout',
      message: 'La requête a pris trop de temps',
    }), { status: 504 });
  }

  // Erreur générique
  return new Response(JSON.stringify({
    error: 'unknown',
    message: 'Erreur inattendue',
  }), { status: 500 });
};
```

**Messages d'erreur côté UI (localisés) :**

```json
// messages/fr.json
{
  "ai": {
    "correction_unavailable": "Correction IA temporairement indisponible",
    "translation_pending": "Traduction en cours, disponible dans quelques minutes",
    "stats_unavailable": "Analyse temporairement indisponible. Réessaye dans quelques instants.",
    "retry": "Réessayer"
  }
}
```

---

### 3.3 Rate limiting

```typescript
// Rate limiting par créateur pour éviter les abus
const RATE_LIMITS = {
  'gemini-correct-text': {
    max: 100,          // 100 corrections par heure (debounce = peu d'appels réels)
    window: 3600,
  },
  'translate-recipe': {
    max: 20,           // 20 publications par heure (largement suffisant)
    window: 3600,
  },
  'explain-creator-stats': {
    max: 5,            // 5 analyses dashboard par heure
    window: 3600,
  },
  'explain-recipe-performance': {
    max: 20,           // 20 insights recette par heure
    window: 3600,
  },
};

// Implémentation dans chaque Edge Function
const checkRateLimit = async (userId: string, functionName: string): Promise<boolean> => {
  const limit = RATE_LIMITS[functionName];
  const key = `rate:${functionName}:${userId}`;
  const now = Math.floor(Date.now() / 1000);

  // Utilise Redis/Upstash si disponible, sinon mémoire Edge Function
  const count = rateLimitStore.get(key)?.count ?? 0;
  if (count >= limit.max) return false;

  rateLimitStore.set(key, { count: count + 1, resetAt: now + limit.window });
  return true;
};
```

---

### 3.4 Variables d'environnement Edge Functions

```bash
# Dans le dashboard Supabase → Edge Functions → Secrets

GEMINI_API_KEY=AIza...           # Clé Gemini API
CLAUDE_API_KEY=sk-ant-...        # Clé Claude Sonnet API

# Ces clés ne sont JAMAIS exposées dans les variables Next.js
# Elles n'existent que dans l'environnement des Edge Functions Supabase
```

---

## Récapitulatif

| Edge Function | API | Déclencheur | Async | Rate limit |
|---------------|-----|-------------|-------|------------|
| `gemini-correct-text` | Gemini Flash | Saisie wizard (debounce 2s) | Non | 100/h |
| `translate-recipe` | Gemini Flash | Publication recette | **Oui** | 20/h |
| `explain-creator-stats` | Claude Sonnet | Bouton dashboard | Non | 5/h |
| `explain-recipe-performance` | Claude Sonnet | Bouton recette | Non | 20/h |

### Ce que l'IA fait ✅
- Corrige l'orthographe et la grammaire
- Signale les incohérences de quantités
- Traduit les recettes en 8 langues
- Explique les statistiques en langage simple
- Suggère des actions concrètes basées sur les données

### Ce que l'IA ne fait jamais ❌
- Juger la valeur nutritionnelle d'une recette
- Suggérer de modifier les ingrédients pour des raisons de santé
- Comparer défavorablement un créateur à un autre
- Filtrer ou rejeter du contenu culturel
- Émettre un jugement éditorial sur les choix culinaires

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Intégration UI (panel IA dashboard, widget correction wizard) |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue complet Edge Functions |
| `V1_AI_ASSISTANT_SPECS.md` | Assistant IA app Flutter (OpenAI — distinct de ce document) |
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Variables d'environnement, stack |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Spécifications IA Website V1*
