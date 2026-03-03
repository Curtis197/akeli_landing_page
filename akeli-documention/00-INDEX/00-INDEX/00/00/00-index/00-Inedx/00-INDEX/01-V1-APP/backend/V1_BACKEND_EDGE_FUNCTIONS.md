# Akeli V1 — Backend Edge Functions

> Catalogue des Edge Functions Supabase V1.
> Les Edge Functions couvrent uniquement la logique backend (auth, orchestration, appels services externes, cron, logique métier complexe).
> Les queries simples et complexes sont gérées directement depuis Flutter via le client Supabase et des fonctions SQL PostgreSQL.
> À fournir tel quel à Claude Code pour l'implémentation.

## Principe d'architecture — Répartition des responsabilités

| Type d'opération | Solution |
|---|---|
| Query simple (fetch, filter, sort, insert) | Client Supabase Flutter directement |
| Query complexe (joins, agrégations, cosine similarity, transactions) | Fonction SQL PostgreSQL + pgvector — appelée via `.rpc()` depuis Flutter |
| Logique backend (services externes, revenus, auth critique, cron) | Edge Function Supabase (Deno/TypeScript) |
| Construction des vecteurs (user + recipe) | Python Service (Railway) — batch nightly uniquement, jamais au runtime |

**Conséquence :** Python n'est plus jamais appelé au runtime. pgvector (index HNSW) gère la cosine similarity directement en PostgreSQL en ~3ms. Python tourne uniquement la nuit pour recalculer les vecteurs.

**Runtime** : Deno (TypeScript)  
**Déploiement** : Supabase Edge Functions  
**Auth** : JWT Supabase vérifié en entrée de chaque fonction  
**Date** : Février 2026

---

## Conventions

- Toutes les fonctions vérifient le JWT Supabase en entrée (sauf webhooks Stripe)
- Réponse standard : `{ data: ..., error: null }` ou `{ data: null, error: "message" }`
- HTTP 400 pour erreurs de validation, 401 pour non authentifié, 500 pour erreurs serveur
- Toutes les fonctions loggent les erreurs avec contexte (user_id, function name, timestamp)
- Les fonctions qui appellent OpenAI ou Gemini ne stockent jamais les clés côté client

---

## Catalogue par domaine

1. [Auth & Profil](#1-auth--profil)
2. [Recettes & Feed](#2-recettes--feed)
3. [Vectorisation](#3-vectorisation)
4. [Meal Planning](#4-meal-planning)
5. [Mode Fan](#5-mode-fan)
6. [Revenus & Cron](#6-revenus--cron)
7. [AI Assistant](#7-ai-assistant)
8. [Communauté](#8-communauté)
9. [Notifications](#9-notifications)
10. [Paiements](#10-paiements)
11. [Traduction](#11-traduction)
12. [Shopping List](#12-shopping-list)

---

## 1. Auth & Profil

### `complete-onboarding`
**Méthode** : POST  
**Auth** : Requise  
**Déclencheur** : Fin du flow onboarding dans l'app

**Description** : Enregistre le profil santé complet de l'utilisateur en une seule transaction — health_profile, goals, restrictions alimentaires, préférences culinaires. Déclenche ensuite `generate-user-vector`.

**Body** :
```typescript
{
  sex: 'male' | 'female' | 'other',
  birth_date: string,          // ISO date
  height_cm: number,
  weight_kg: number,
  target_weight_kg: number,
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
  goals: string[],             // ['weight_loss', 'health', ...]
  dietary_restrictions: string[],
  cuisine_preferences: { region: string, score: number }[]
}
```

**Logique** :
1. Valide tous les champs
2. Upsert `user_health_profile`
3. Supprime + insère `user_goal`
4. Supprime + insère `user_dietary_restriction`
5. Supprime + insère `user_cuisine_preference`
6. Met `onboarding_done = true` dans `user_profile`
7. Appelle `generate-user-vector` en background (non bloquant)

---

## 2. Recettes & Feed

> **Note** : Les queries recettes (feed, détail, recherche, scaling) sont gérées directement depuis Flutter via le client Supabase et des fonctions SQL PostgreSQL. Le feed vectorisé utilise la fonction SQL `recommend_recipes()` appelée via `.rpc()`. Seules les actions avec effet de bord (like) restent ici.

### Fonctions SQL PostgreSQL — Recettes (appelées via `.rpc()` depuis Flutter)

| Fonction SQL | Usage |
|---|---|
| `recommend_recipes(user_id, limit, filters)` | Feed vectorisé — cosine similarity + boost Mode Fan |
| `search_recipes(query, filters, order_by, limit, offset)` | Recherche recettes avec filtres combinés |
| `search_creators(query, limit, offset)` | Recherche créateurs par nom |
| `get_creator_public_profile(creator_id)` | Profil public créateur — stats, recettes, fan_eligible |

---

### `toggle-recipe-like`
**Méthode** : POST  
**Auth** : Requise

**Body** : `{ recipe_id: string }`

**Logique** : Upsert / delete dans `recipe_like` selon l'état actuel.

---

## 3. Vectorisation

> **Décision architecture** : La cosine similarity au runtime est gérée par **pgvector (index HNSW)** directement dans PostgreSQL — ~3ms pour 2500+ recettes, 0 latence réseau. Le **Python Service (Railway)** ne tourne qu'en batch nightly pour construire et stocker les vecteurs. Aucune Edge Function nécessaire pour ce domaine au runtime.

### Fonctions SQL PostgreSQL — Vectorisation

| Fonction SQL | Usage |
|---|---|
| Index HNSW sur `recipe_vector` | Cosine similarity ~3ms sur 2500+ recettes |
| `recommend_recipes(user_id, limit, filters)` | Feed vectorisé — déjà dans section 2 |

### Python Service (Railway) — Batch nightly uniquement

| Job | Schedule | Description |
|---|---|---|
| `nightly_user_vector_update` | Nightly 3h | Recalcule `user_vector` pour utilisateurs actifs (7 derniers jours) |
| `nightly_recipe_vector_update` | Nightly 3h | Recalcule `recipe_vector` pour recettes nouvelles ou modifiées |

**Déclenchement post-onboarding** : après `complete-onboarding`, le `user_vector` est calculé via un **appel HTTP direct** depuis l'Edge Function `complete-onboarding` vers le Python Service — une seule fois, bloquant, pour que le nouvel utilisateur ait un feed personnalisé immédiatement.

---

## 4. Meal Planning

### `generate-meal-plan`
**Méthode** : POST  
**Auth** : Requise

**Description** : Génère un meal plan sur N jours par sélection vectorielle de recettes via pgvector, en respectant les contraintes macro et le Mode Fan si actif.

**Body** :
```typescript
{
  start_date: string,          // ISO date
  days: number,                // 1–14
  meals_per_day: ('breakfast' | 'lunch' | 'dinner' | 'snack')[]
}
```

**Logique** :
1. Calcule les macros cibles journalières depuis `user_health_profile` (TDEE)
2. Appelle `.rpc('generate_meal_plan', { user_id, days, meals_per_day, start_date })` — fonction SQL PostgreSQL qui :
   - Récupère `user_vector`
   - Sélectionne les recettes par cosine similarity pgvector (HNSW)
   - Applique contraintes Mode Fan (90% créateur Fan si actif)
   - Vérifie diversité (pas la même recette deux jours consécutifs)
   - Vérifie équilibre macro par jour
3. Crée `meal_plan` + `meal_plan_entry` en base
4. Retourne le plan structuré

> **Note** : La sélection vectorielle est entièrement gérée par pgvector en PostgreSQL. Pas d'appel Python au runtime.

---

### `log-meal-consumption`
**Méthode** : POST  
**Auth** : Requise

**Description** : Enregistre qu'un utilisateur a consommé un repas. Source de vérité pour les revenus créateurs.

**Body** :
```typescript
{
  meal_plan_entry_id: string,
  servings?: number            // défaut: 1
}
```

**Logique** :
1. Fetch `meal_plan_entry` → récupère `recipe_id`
2. Fetch `recipe` → récupère `creator_id`
3. Vérifie Mode Fan actif de l'utilisateur
4. Si Mode Fan actif et recette hors créateur Fan → vérifie compteur `fan_external_recipe_counter`
5. Insert dans `meal_consumption`
6. Update `meal_plan_entry.is_consumed = true`
7. Trigger PostgreSQL → update `daily_nutrition_log` automatiquement

> **Note** : Le recalcul du `user_vector` n'est plus déclenché ici — il est géré par le batch nightly Python.

---

### `generate-shopping-list`
**Méthode** : POST  
**Auth** : Requise

**Body** : `{ meal_plan_id: string }`

**Logique** :
1. Fetch tous les `meal_plan_entry` du plan avec leurs recettes
2. Agrège les ingrédients par `ingredient_id` en convertissant les unités si nécessaire
3. Crée `shopping_list` + `shopping_list_item`
4. Retourne la liste groupée par catégorie d'ingrédient

> **Note** : L'agrégation multi-recettes avec conversion d'unités justifie une **fonction SQL PostgreSQL** `generate_shopping_list(meal_plan_id)` appelée via `.rpc()` depuis Flutter — pas d'Edge Function nécessaire.

---

## 5. Mode Fan

### `activate-fan-mode`
**Méthode** : POST  
**Auth** : Requise

**Description** : Active ou change le Mode Fan d'un utilisateur. Effectif au 1er du mois suivant.

**Body** : `{ creator_id: string }`

**Logique** :
1. Vérifie que l'utilisateur a un abonnement actif
2. Vérifie que le créateur a `is_fan_eligible = true` (≥ 30 recettes publiées)
3. Vérifie qu'il n'y a pas déjà un abonnement Fan `active` ou `pending`
4. Si Fan existant `active` → le passe à `cancelled`, enregistre dans `fan_subscription_history`
5. Crée nouveau `fan_subscription` avec `status = 'pending'`, `effective_from = 1er du mois suivant`
6. Insert dans `fan_subscription_history`
7. Retourne la date d'entrée en vigueur

---

### `cancel-fan-mode`
**Méthode** : POST  
**Auth** : Requise

**Logique** :
1. Trouve le `fan_subscription` actif de l'utilisateur
2. Met `status = 'cancelled'`, `effective_until = 1er du mois suivant`
3. Insert dans `fan_subscription_history`

---

### `process-fan-mode-transitions` *(cron)*
**Méthode** : POST  
**Auth** : Service key  
**Schedule** : 1er de chaque mois à 00:05 UTC

**Description** : Traite toutes les transitions Mode Fan en attente.

**Logique** :
1. Active tous les `fan_subscription` avec `status = 'pending'` et `effective_from <= today`
2. Désactive tous les `fan_subscription` avec `status = 'cancelled'` et `effective_until <= today`
3. Initialise les `fan_external_recipe_counter` pour le nouveau mois pour tous les abonnés Fan actifs

---

## 6. Revenus & Cron

### `compute-monthly-revenue` *(cron)*
**Méthode** : POST  
**Auth** : Service key  
**Schedule** : 1er de chaque mois à 01:00 UTC (après `process-fan-mode-transitions`)

**Description** : Calcule les revenus de tous les créateurs pour le mois écoulé.

**Logique** :
1. Détermine `month_key` du mois écoulé (ex: `'2026-02'`)
2. Pour chaque créateur actif :
   - Compte les `fan_subscription` actifs sur ce mois → `fan_revenue = count × 1.00`
   - Compte les `meal_consumption` sur ce mois groupées par créateur → `consumption_revenue = floor(count / 90) × 1.00`
3. Insert dans `creator_revenue_log`
4. Update `creator_balance` (balance += total_revenue, total_earned += total_revenue)
5. Log de synthèse pour audit

---

### `get-creator-dashboard`
**Méthode** : GET  
**Auth** : Requise (créateur uniquement)

**Description** : Retourne les données du dashboard créateur — revenus, fans, consommations.

**Params** : `?period=last_3_months` (ou `last_6_months`, `year_to_date`)

**Logique** :
1. Vérifie que l'utilisateur est un créateur (`is_creator = true`)
2. Fetch `creator_revenue_log` pour la période
3. Fetch `creator_balance`
4. Fetch `fan_count` actuel depuis `creator`
5. Fetch consommations en cours du mois actuel (compteur live)
6. Retourne l'ensemble structuré pour le dashboard

---

## 7. AI Assistant

### `ai-assistant-chat`
**Méthode** : POST  
**Auth** : Requise

**Description** : Interface conversationnelle IA. Architecture hybride Fast Path / Smart Path. Voir `V1_AI_ASSISTANT_ARCHITECTURE.md` pour le détail complet.

**Body** :
```typescript
{
  message: string,
  conversation_id?: string    // null pour nouvelle conversation
}
```

**Logique résumée** :
1. Crée ou charge `ai_conversation`
2. Pattern detection → Fast Path si query simple
3. Smart Path → fetch données contextuelles utilisateur (profil, meal plan actif, historique)
4. Appel OpenAI GPT-4o-mini avec contexte enrichi
5. Persist `ai_message` (user + assistant)
6. Retourne la réponse

---

## 8. Communauté

> **Note architecture** : Toutes les opérations communauté sont gérées par des **queries Flutter directes** et des **fonctions SQL PostgreSQL**. Aucune Edge Function n'est nécessaire pour ce domaine.

### Fonctions SQL PostgreSQL — Communauté (appelées via `.rpc()` depuis Flutter)

| Fonction SQL | Usage | Type |
|---|---|---|
| `find_or_create_conversation(user_a_id, user_b_id)` | Cherche ou crée une conversation entre deux users — atomique | Fonction SQL |
| `respond_conversation_request(request_id, action)` | Accepte/refuse une demande + crée conversation si acceptée — atomique | Fonction SQL |
| `join_group(group_id, user_id)` | Vérifie invitation/public + insert membre + update compteur — atomique | Fonction SQL |

### Queries Flutter directes — Communauté

| Opération | Table | Type |
|---|---|---|
| Envoyer une demande de conversation | `conversation_request` insert | Query directe |
| Créer un groupe | `community_group` + `group_member` inserts | Query directe |

### Notifications communauté

Les notifications push déclenchées par les actions communauté (nouvelle demande de conversation, etc.) sont gérées par un **trigger PostgreSQL** sur `conversation_request` qui appelle `send-push-notification` via pg_net — pas d'Edge Function intermédiaire.

---

## 9. Notifications

### `send-push-notification`
**Méthode** : POST  
**Auth** : Service key (appel interne uniquement)

**Body** :
```typescript
{
  user_id: string,
  title: string,
  body: string,
  data?: Record<string, string>
}
```

**Logique** :
1. Fetch `push_token` de l'utilisateur
2. Appel FCM API avec le token
3. Insert dans `notification` (centre de notifications in-app)

---

### `send-meal-reminders` *(cron)*
**Méthode** : POST  
**Auth** : Service key  
**Schedule** : Toutes les heures

**Logique** :
1. Fetch les `meal_reminder` actifs dont l'heure correspond à l'heure courante (±5min, selon timezone utilisateur)
2. Pour chaque reminder → appelle `send-push-notification`

---

## 10. Paiements

### `stripe-webhook`
**Méthode** : POST  
**Auth** : Signature Stripe (pas de JWT Supabase)

**Description** : Reçoit les événements Stripe et met à jour le statut des abonnements.

**Événements traités** :
- `customer.subscription.created` → crée/active `subscription`
- `customer.subscription.updated` → met à jour `subscription.status`
- `customer.subscription.deleted` → `status = 'cancelled'`
- `invoice.payment_failed` → `status = 'past_due'`

**Logique** :
1. Vérifie la signature Stripe
2. Parse l'événement
3. Upsert dans `subscription` selon l'événement
4. Si annulation → vérifie et désactive le Mode Fan actif si applicable

---

### `create-checkout-session`
**Méthode** : POST  
**Auth** : Requise

**Description** : Crée une session Stripe Checkout pour l'abonnement 3€/mois.

**Logique** :
1. Crée ou récupère le `stripe_customer_id`
2. Crée une session Stripe Checkout avec le price ID de l'abonnement mensuel
3. Retourne l'URL de checkout

---

## 11. Traduction

### `translate-content`
**Méthode** : POST  
**Auth** : Service key (appel interne)

**Description** : Traduit du contenu (titres, descriptions de recettes) vers les langues africaines via Gemini.

**Body** :
```typescript
{
  content: string,
  source_language: string,    // 'fr' | 'en'
  target_language: string     // 'wo' | 'bm' | 'ln' | ...
}
```

**Logique** :
1. Appel Gemini API avec prompt de traduction contextualisé (vocabulaire culinaire africain)
2. Retourne la traduction

**Note** : Utilisé en batch lors de la publication de recettes, pas au runtime de l'app.

---

## 12. Shopping List

> **Note** : Les opérations shopping list (`toggle-shopping-item`, consultation) sont des queries simples gérées directement par Flutter. Aucune Edge Function nécessaire pour ce domaine.

---

## Vue récapitulative

### Edge Functions (logique backend uniquement)

| Fonction | Déclencheur | Externe |
|----------|-------------|---------|
| `complete-onboarding` | App — fin onboarding | Python/Railway (once) |
| `toggle-recipe-like` | App — like recette | — |
| `generate-meal-plan` | App — génération plan | — |
| `log-meal-consumption` | App — marquer repas consommé | — |
| `activate-fan-mode` | App — choix créateur Fan | — |
| `cancel-fan-mode` | App — annuler Mode Fan | — |
| `process-fan-mode-transitions` | **Cron** — 1er du mois 00:05 | — |
| `compute-monthly-revenue` | **Cron** — 1er du mois 01:00 | — |
| `ai-assistant-chat` | App — chat IA | OpenAI |
| `send-push-notification` | Interne — triggers PostgreSQL + cron | FCM |
| `send-meal-reminders` | **Cron** — toutes les heures | FCM |
| `stripe-webhook` | **Stripe** | Stripe |
| `create-checkout-session` | App — s'abonner | Stripe |
| `translate-content` | Interne — publication recette | Gemini |

**Total : 14 Edge Functions** — dont 3 cron jobs et 1 webhook externe.
> `complete-onboarding` appelle Python une seule fois à l'inscription pour générer le premier `user_vector`. Tous les recalculs suivants sont en batch nightly.

---

### Fonctions SQL PostgreSQL (appelées via `.rpc()` depuis Flutter)

| Fonction SQL | Domaine |
|---|---|
| `recommend_recipes(user_id, limit, filters)` | Feed vectorisé |
| `search_recipes(query, filters, order_by, limit, offset)` | Recherche recettes |
| `search_creators(query, limit, offset)` | Recherche créateurs |
| `get_creator_public_profile(creator_id)` | Profil public créateur |
| `generate_shopping_list(meal_plan_id)` | Liste de courses |
| `find_or_create_conversation(user_a_id, user_b_id)` | Communauté |
| `respond_conversation_request(request_id, action)` | Communauté |
| `join_group(group_id, user_id)` | Communauté |

---

## Cron Jobs — Récapitulatif

| Fonction | Schedule (UTC) | Description |
|----------|---------------|-------------|
| `send-meal-reminders` | `0 * * * *` | Toutes les heures |
| `process-fan-mode-transitions` | `5 0 1 * *` | 1er du mois à 00:05 |
| `compute-monthly-revenue` | `0 1 1 * *` | 1er du mois à 01:00 |

---

*Document créé : Février 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Backend V1 cible*
