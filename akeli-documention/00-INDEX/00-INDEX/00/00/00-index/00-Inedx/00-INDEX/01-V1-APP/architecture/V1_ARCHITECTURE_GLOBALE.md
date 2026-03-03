# Akeli V1 — Architecture Globale

> Document de référence système. À lire en premier avant tout développement.
> Ce document décrit l'architecture cible V1 — elle remplace entièrement l'architecture MVP.

**Statut** : Référence V1  
**Date** : Février 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## Vue d'ensemble du système

Akeli V1 est composé de deux surfaces distinctes partageant un backend unique :

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   APPLICATION MOBILE        │     │   WEBSITE CRÉATEUR          │
│   Flutter (iOS + Android)   │     │   Next.js                   │
│                             │     │                             │
│   Consommateurs             │     │   Créateurs de recettes     │
│   → Découverte recettes     │     │   → Création recettes       │
│   → Meal planning           │     │   → Dashboard revenus       │
│   → Suivi nutrition         │     │                             │
│   → Mode Fan                │     │                             │
│   → Communauté              │     │                             │
└────────────┬────────────────┘     └──────────────┬──────────────┘
             │                                     │
             └──────────────┬──────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                   │
│                                                                   │
│   PostgreSQL          Edge Functions        Supabase Auth         │
│   (base de données)   (auth + orchestration)(identité)           │
│                                                                   │
│   Storage             Realtime              pgvector              │
│   (images, médias)    (chat, notifs)        (stockage vecteurs)   │
└──────────────────────────────┬────────────────────────────────────┘
                               │
                               │ HTTP POST
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│               PYTHON SERVICE (Railway)                            │
│                                                                   │
│   Batch nightly uniquement (3h) — jamais appelé au runtime       │
│   → compute_user_vector (50D)   → upsert dans user_vector        │
│   → compute_recipe_vector (50D) → upsert dans recipe_vector      │
│   → Recalcul utilisateurs actifs (7 derniers jours)              │
│   → Exception : appelé une fois à l'onboarding (premier vecteur) │
│                                                                   │
│   Cosine similarity au runtime → pgvector (PostgreSQL, HNSW)     │
└───────────────────────────────────────────────────────────────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  OpenAI     │ │  Gemini     │ │  FCM        │
    │  (AI chat   │ │  (traduction│ │  (push      │
    │  assistant) │ │  langues    │ │  notifs)    │
    │             │ │  africaines)│ │             │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Principes d'architecture V1

**1. Backend unique — Supabase exclusivement**
Zéro Firebase en V1 (sauf FCM pour les push notifications). Une seule source de vérité, une seule authentification, une seule facturation.

**2. Auth Supabase native**
Supabase Auth gère Email, Google et Apple. L'`auth.uid()` est la clé universelle utilisée dans toutes les tables et toutes les RLS policies.

**3. Séparation claire des responsabilités**
- **Flutter (client Supabase)** : queries simples — fetch, filter, sort, inserts directs
- **Fonctions SQL PostgreSQL** : queries complexes — joins, agrégations, transactions atomiques, feed vectorisé (`.rpc()` depuis Flutter)
- **Edge Functions** : logique backend uniquement — appels services externes (Python, OpenAI, FCM, Stripe, Gemini), cron jobs, logique métier critique (revenus, Mode Fan)
- **Python Service (Railway)** : calcul vectoriel, cosine similarity, meal planning algorithmique

L'app Flutter et le website Next.js ne passent par une Edge Function que lorsque c'est strictement nécessaire.

**4. pgvector pour la recommandation au runtime**
La cosine similarity au runtime est gérée par **pgvector avec index HNSW** directement dans PostgreSQL (~3ms pour 2500+ recettes, 0 latence réseau). Les vecteurs sont précalculés et stockés par Python en batch nightly. Python n'est jamais appelé au runtime sauf lors de l'onboarding (génération du premier `user_vector`). Pas d'appel OpenAI pour les recommandations.

**5. Realtime pour le chat**
Les conversations privées et de groupe utilisent Supabase Realtime (websockets). Pas de polling.

**6. RLS partout**
Chaque table a des Row Level Security policies. Aucune donnée n'est accessible sans authentification valide.

---

## Application Mobile Flutter

### Responsabilités
- Interface utilisateur consommateur
- Authentification via Supabase Auth
- Affichage du feed recettes (vectorisé)
- Meal planning (vectorisé)
- Suivi nutrition et poids
- Mode Fan — abonnement créateur
- Chat privé et groupes (Realtime)
- AI assistant in-app
- Paiement abonnement 3€/mois

### State management
Riverpod — providers par domaine fonctionnel. Pas de state global monolithique.

```
providers/
├── auth_provider.dart          → session utilisateur
├── recipe_provider.dart        → feed, filtres, détail
├── meal_plan_provider.dart     → plan actif, historique
├── nutrition_provider.dart     → macros, suivi journalier
├── fan_mode_provider.dart      → abonnement Fan actif
├── chat_provider.dart          → conversations, messages
└── user_profile_provider.dart  → profil santé, préférences
```

### Navigation
GoRouter avec guards d'authentification. Routes protégées redirigent vers `/auth` si session absente.

```
/auth                    → Authentification
/onboarding              → Profil santé initial
/home                    → Feed recettes (tab 1)
/meal-planner            → Meal planner (tab 2)
/community               → Communauté (tab 3)
/profile                 → Profil utilisateur (tab 4)
/recipe/:id              → Détail recette
/chat/:id                → Conversation privée
/group/:id               → Groupe
/fan-mode                → Gestion abonnement Fan
/settings                → Paramètres
/subscription            → Abonnement 3€/mois
```

### Structure dossiers Flutter
```
lib/
├── main.dart
├── core/
│   ├── supabase_client.dart     → initialisation Supabase
│   ├── router.dart              → GoRouter configuration
│   └── theme.dart               → design tokens
├── features/
│   ├── auth/                    → login, signup, onboarding
│   ├── recipes/                 → feed, détail, filtres
│   ├── meal_planner/            → planner, shopping list
│   ├── nutrition/               → tracking, graphes
│   ├── fan_mode/                → abonnement créateur
│   ├── community/               → chat, groupes
│   ├── ai_assistant/            → chat IA
│   ├── profile/                 → profil, paramètres
│   └── subscription/            → paiement
├── shared/
│   ├── widgets/                 → composants réutilisables
│   ├── models/                  → types Dart (generés depuis DB)
│   └── utils/                   → helpers, logger
└── providers/                   → Riverpod providers
```

---

## Website Créateur Next.js

### Responsabilités
- Interface créateur desktop-first
- Authentification partagée (Supabase Auth — même utilisateur que l'app)
- Création et édition de recettes
- Dashboard revenus (mode standard + Mode Fan)
- Gestion du catalogue recettes

### Structure pages Next.js
```
/                        → Landing page (publique)
/auth                    → Connexion créateur
/dashboard               → Vue d'ensemble revenus
/recipes                 → Liste recettes du créateur
/recipes/new             → Créer une recette
/recipes/:id/edit        → Éditer une recette
/settings                → Paramètres compte créateur
```

### Périmètre V1 strict
Le website V1 ne contient pas de features analytics avancées, SEO tool, Niche Finder, ou Pro Tier. Ces features sont V2.

---

## Supabase — Backend Unique

### Modules utilisés

| Module | Usage |
|--------|-------|
| Auth | Identité utilisateurs et créateurs |
| PostgreSQL | Base de données principale |
| Edge Functions | Logique métier (TypeScript/Deno) |
| Storage | Images recettes, avatars, médias |
| Realtime | Chat, notifications temps réel |
| pgvector | Recommandations vectorielles |

### Configuration
```
Variables d'environnement (une seule config) :
SUPABASE_URL          → URL du projet
SUPABASE_ANON_KEY     → Clé publique (client)
SUPABASE_SERVICE_KEY  → Clé service (edge functions)
OPENAI_API_KEY        → Assistant IA
GEMINI_API_KEY        → Traduction langues africaines
FCM_SERVER_KEY        → Push notifications
PYTHON_SERVICE_URL    → https://akeli-engine.railway.app
```

---

## Services Externes

### Python Service (Railway)
**Usage :** Construction des vecteurs uniquement — jamais appelé au runtime (sauf onboarding).
**Stack :** FastAPI + NumPy + psycopg2.
**Batch nightly (3h) :**
- Recalcul `user_vector` pour les utilisateurs actifs (7 derniers jours)
- Calcul `recipe_vector` pour les recettes nouvelles ou modifiées (statut `pending`)
**Exception runtime :** Appelé une seule fois par `complete-onboarding` pour générer le premier `user_vector` d'un nouvel utilisateur.
**Cosine similarity au runtime :** pgvector (index HNSW dans PostgreSQL) — pas Python.
**Voir :** `PYTHON_RECOMMENDATION_ENGINE.md` + `V1_ARCHITECTURE_DECISIONS.md` pour le contexte de cette décision.

### OpenAI
**Usage :** AI assistant conversationnel uniquement.
**Modèle :** GPT-4o-mini (équilibre coût/qualité).
**Appelé par :** Edge Function `ai-assistant-chat`.
**Pas utilisé pour :** Vectorisation (pgvector natif), meal planning (cosine similarity).

### Gemini
**Usage :** Traduction des langues africaines (Wolof, Bambara, Lingala, etc.) non supportées nativement par les LLM standard.
**Appelé par :** Edge Function `translation-service`.
**Phase 1 :** FR, EN, ES, PT (traduction standard).
**Phase 2 :** Langues africaines via Gemini.

### Firebase Cloud Messaging (FCM)
**Usage :** Push notifications iOS et Android uniquement.
**Pas de données stockées dans Firebase** — uniquement canal de livraison.
**Appelé par :** Edge Function `send-push-notification`.

### Stripe
**Usage :** Abonnement utilisateur 3€/mois.
**Intégration :** Webhooks → Edge Function `stripe-webhook` → mise à jour statut abonnement en base.

---

## Flux de données principaux

### Flux 1 — Authentification

```
User ouvre l'app
→ Supabase Auth vérifie session
→ Session valide → app home
→ Session absente → /auth
→ Login/Signup → Supabase Auth
→ JWT généré → stocké localement
→ Toutes les requêtes incluent ce JWT
→ RLS policies vérifient auth.uid()
```

### Flux 2 — Feed recettes (vectorisé)

```
User arrive sur /home
→ Flutter appelle .rpc('recommend_recipes', { user_id, limit, filters })
→ Fonction SQL PostgreSQL : récupère user_vector
→ Si pas de vecteur → fallback popularité (cold start)
→ Fonction SQL : cosine similarity via pgvector (index HNSW, ~3ms)
→ Fonction SQL : boost Mode Fan ×1.5 si actif
→ Retourne liste ordonnée
→ Flutter affiche le feed

Note fraîcheur : user_vector recalculé chaque nuit par Python batch.
Le feed est toujours calculé à l'instant depuis le vecteur stocké.
Maximum 24h de décalage entre comportement réel et recommandations.
```

### Flux 3 — Meal planner (vectorisé)

```
User génère un meal plan
→ Flutter appelle Edge Function generate-meal-plan { days: 7 }
→ Edge Function auth JWT → extrait user_id
→ Edge Function appelle .rpc('generate_meal_plan', { user_id, days, ... })
→ Fonction SQL : récupère user_vector
→ Fonction SQL : cosine similarity pgvector (HNSW) → recettes candidates
→ Fonction SQL : Mode Fan actif → 90% recettes du créateur Fan
→ Fonction SQL : max 9 recettes externes dans le plan du mois
→ Fonction SQL : contraintes macros + diversité (pas 2× la même recette)
→ Fonction SQL : assign_to_meal_slots() → structure N jours
→ Edge Function stocke le plan dans meal_plan + meal_plan_entry
→ Flutter affiche et permet ajustements
```

### Flux 4 — Mode Fan activation

```
User choisit un créateur Fan
→ Vérification : créateur a ≥ 30 recettes
→ Vérification : utilisateur a un abonnement actif
→ Insertion dans fan_subscriptions (statut: pending_next_month)
→ Cron job fin de mois → active le fan_subscription
→ À partir du 1er du mois suivant :
   - 1€ alloué automatiquement au créateur
   - Compteur recettes externes initialisé à 0
   - Feed et meal planner boostent recettes du créateur
```

### Flux 5 — Revenus créateur (automatisé)

```
[Cron job — 1er de chaque mois]
→ Pour chaque abonné Fan actif du créateur → +1€
→ Pour chaque utilisateur standard :
   → Compte les consommations du mois par créateur
   → Si ≥ 90 consommations → +1€ au créateur
→ Agrège les montants par créateur
→ Enregistre dans creator_revenue_log
→ Mise à jour creator_balance
→ [Manuel ou Stripe Connect V2] → Versement
```

### Flux 6 — Chat temps réel

```
User A envoie un message
→ Insert dans chat_messages (PostgreSQL)
→ Supabase Realtime publie l'événement
→ User B reçoit via websocket (subscription active)
→ Notification push si User B hors app (FCM)
```

### Flux 7 — Création recette (website)

```
Créateur remplit le formulaire
→ Upload image → Supabase Storage
→ Submit → Insert dans recipe + recipe_ingredient + recipe_macro
→ Trigger PostgreSQL → marque recipe_vector comme "pending"
→ Python batch nightly → détecte recipes pending → calcule vecteur 50D
→ Upsert dans recipe_vector → recette visible dans le feed app
```

---

## Multilingue

### Architecture i18n
- Fichiers de traduction JSON par langue dans l'app Flutter et le website Next.js
- Langue détectée automatiquement depuis les paramètres système
- Changement manuel possible dans les paramètres

### Phase 1 — Au lancement
| Langue | Code | Support |
|--------|------|---------|
| Français | fr | Natif |
| Anglais | en | Natif |
| Espagnol | es | Natif |
| Portugais | pt | Natif |

### Phase 2 — Post-lancement
| Langue | Code | Support |
|--------|------|---------|
| Wolof | wo | Gemini |
| Bambara | bm | Gemini |
| Lingala | ln | Gemini |
| Arabe | ar | Natif |
| Autres langues africaines | — | Gemini |

---

## Sécurité

**Authentification :** Supabase Auth JWT sur toutes les requêtes.
**Autorisation :** RLS policies sur chaque table — aucune donnée accessible sans auth.uid() valide.
**Edge Functions :** Vérification JWT en entrée de chaque function.
**Storage :** Buckets configurés avec policies — un user ne peut accéder qu'à ses propres fichiers, les recettes sont publiques en lecture.
**Secrets :** Aucune clé API exposée côté client. Toutes les clés sensibles (OpenAI, Gemini, Stripe secret) sont dans les variables d'environnement Edge Functions uniquement.

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_ARCHITECTURE_DECISIONS.md` | **Journal des décisions d'architecture** — fait autorité en cas de contradiction |
| `V1_DATABASE_SCHEMA.md` | Schéma complet de toutes les tables V1 |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue et specs des Edge Functions |
| `PYTHON_RECOMMENDATION_ENGINE.md` | Python Service — batch nightly uniquement (voir ADR-001) |
| `SYSTEM_OVERVIEW_V1.md` | Vue d'ensemble système V1 |
| `FEED_GENERATION.md` | Algorithme feed scrollable |
| `OUTCOME_BASED_METRICS.md` | Métriques outcome recettes et utilisateurs |
| `RECIPE_ADJUSTMENT_ENGINE.md` | Ajustement macros recettes en temps réel |
| `CREATOR_ANALYTICS_DASHBOARD.md` | Dashboard revenus créateurs |
| `ARCHITECTURE_REDESIGN.md` | Détails architecture Flutter (state, routing) |
| `V1_AI_ASSISTANT_ARCHITECTURE.md` | Détails architecture AI assistant |
| `AKELI_MODE_FAN.md` | Spécifications Mode Fan |

---

*Document créé : Février 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Architecture V1 cible*
