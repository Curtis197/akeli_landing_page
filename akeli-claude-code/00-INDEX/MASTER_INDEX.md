# AKELI — Documentation Master Index

> **Document de référence unique pour l'ensemble du projet Akeli.**  
> Toute nouvelle documentation doit être enregistrée ici avant d'être considérée comme active.

> ⚠️ **En cas de contradiction entre deux documents, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.** Il log toutes les décisions d'architecture prises en cours de documentation et supersède les docs sources sur les points listés.

**Dernière mise à jour** : Mars 2026 — Documentation technique V1 Website complète (6 documents). Section 4 mise à jour.  
**Auteur** : Curtis — Fondateur Akeli  
**Statut projet** : V0 en production (App Store + Google Play) — V1 en cours de documentation

---

## État du Projet

| Version | Périmètre | Statut |
|---------|-----------|--------|
| V0 — MVP | App Flutter (FlutterFlow) + Website créateur basique | ✅ En production |
| V1 — App | Réécriture native Flutter (Claude Code) | 📝 Documentation en cours |
| V1 — Website | Next.js — 3 surfaces + espace créateur complet | ✅ **Documenté — Prêt pour Claude Code** |
| V2 | Features avancées créateurs + B2B intelligence | 🗓️ Sept 2026 |

---

## 1. Vision & Contexte

Documents fondateurs du projet. À relire en cas de doute stratégique.

| Document | Description | Statut |
|----------|-------------|--------|
| `Vision_personnel` | Vision personnelle de Curtis — pourquoi Akeli existe, ambitions, principes | ✅ Actif |

---

## 2. Audit MVP — V0

Inventaire complet de ce qui a été construit et de ses limites. Sert de référence pour comprendre ce que V1 corrige.

| Document | Description | Statut |
|----------|-------------|--------|
| `TECHNICAL_AUDIT.md` | Dette technique : composants dupliqués, typos API, code de test en prod, anti-patterns app state | ✅ Actif |
| `ARCHITECTURE_ANALYSIS.md` | Double backend Firebase + Supabase, catalogue 25 edge functions, inventaire 81 tables | ✅ Actif |

---

## 3. V1 — Application Flutter

Réécriture complète en Flutter natif via Claude Code. Objectif : base solide, maintenable, scalable.

### 3a. Architecture & Principes

| Document | Description | Statut |
|----------|-------------|--------|
| `V1_ARCHITECTURE_DECISIONS.md` | **Journal des décisions d'architecture** — fait autorité en cas de contradiction. ADR-001 (pgvector vs Python runtime), ADR-002 (suppression Edge Functions query), ADR-003 (feed batch nightly), ADR-004 (onglets Recettes/Créateurs) | ✅ Actif — **Lire en premier** |
| `V1_ARCHITECTURE_GLOBALE.md` | Architecture système complète V1 — 4 couches (Flutter, Supabase, Python Railway, PostgreSQL), flux de données, services externes | ✅ Actif |
| `SYSTEM_OVERVIEW_V1.md` | Vue d'ensemble executive — différenciateurs, piliers stratégiques, scope V1 vs V2, métriques de succès | ✅ Actif |
| `V1_CONTRAINTES_FLUTTERFLOW.md` | Pourquoi FlutterFlow est abandonné — limitations techniques documentées | ✅ Actif |
| `V1_OBJECTIFS_IMPLEMENTATION.md` | Objectifs V1, métriques de succès, roadmap par feature | ✅ Actif |
| `ARCHITECTURE_REDESIGN.md` | Architecture cible Flutter : state management par slices, structure dossiers, cleanup | ✅ Actif |
| `FEATURE_SPEC.md` | Inventaire feature par feature — ce qu'on garde, coupe, complète ou redesigne | ✅ Actif |
| `DESIGN_SYSTEM.md` | Tokens design, typographie, inventaire composants V1 | ✅ Actif |

### 3b. Backend & Base de données

| Document | Description | Statut |
|----------|-------------|--------|
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue des 14 Edge Functions Supabase — logique backend uniquement (hors queries). Inclut 8 fonctions SQL PostgreSQL via `.rpc()`. 3 cron jobs, 1 webhook Stripe | ✅ Actif |
| `V1_DATABASE_SCHEMA.md` | Schéma complet PostgreSQL V1 — toutes les tables, RLS policies, indexes, triggers | ✅ Actif |
| `CREATOR_ANALYTICS_DASHBOARD.md` | Dashboard revenus créateurs — modèle économique, métriques, calcul revenue, portfolio analysis | ✅ Actif |

### 3c. Pages — Spécifications (22 pages)

| Document | Pages couvertes | Statut |
|----------|-----------------|--------|
| `INDEX.md` | Carte de navigation globale, règles communes à toutes les pages | ✅ Actif |
| `CORE_PAGES.md` | Home, Meal Planner, Meal Detail, Diet Plan, Shopping List | ✅ Actif |
| `RECIPE_PAGES.md` | Recipe Discovery, Recipe Detail | ✅ Actif |
| `COMMUNITY_PAGES.md` | Community, Chat, Group, User Profile, Dashboard/Recap | ✅ Actif |
| `AUTH_PAGES.md` | Authentication, Inscription (Onboarding), Patient Intake, CGU | ✅ Actif |
| `SETTINGS_PAGES.md` | Profile Settings, Edit Info, Payment, Notifications, Support, Referral | ✅ Actif |

### 3d. Système de Recommandation — Vectorisation & Intelligence

| Document | Description | Statut |
|----------|-------------|--------|
| `PYTHON_RECOMMENDATION_ENGINE.md` | Python Service (Railway) — construction des vecteurs user et recipe uniquement. ⚠️ Les sections cosine similarity et runtime feed/meal_plan sont **obsolètes** — voir `V1_ARCHITECTURE_DECISIONS.md` ADR-001 | ✅ Actif — ⚠️ Lire avec ADR-001 |
| `FEED_GENERATION.md` | Algorithme feed scrollable — 70% personnalisé / 20% exploration / 10% fresh, anti-winner-takes-all | ✅ Actif |
| `OUTCOME_BASED_METRICS.md` | Métriques outcome — recipe performance, user behavior patterns, weekly momentum, impact vectorisation | ✅ Actif |
| `RECIPE_ADJUSTMENT_ENGINE.md` | Ajustement macros recettes en temps réel — recettes paramétriques, logique mathématique, contraintes nutritionnelles | ✅ Actif |
| `V1_VECTORIZATION_MEAL_PLANNER.md` | Structure des 50 dimensions vectorielles (user + recipe) — référence pour la composition des vecteurs uniquement. ⚠️ Les timings (~50-100ms) sont obsolètes — pgvector HNSW = ~3ms. Voir ADR-001 | ✅ Actif — ⚠️ Structure uniquement |
| `User_Vectorization_and_EGR_Matrix.md` | Vision V2 — matrice EGR (Enjoyability, Goal, Retention), vectorisation 7 dimensions 1536D | 🗓️ V2 — Vision |

### 3e. Assistant IA In-App

| Document | Description | Statut |
|----------|-------------|--------|
| `V1_AI_ASSISTANT_SPECS.md` | Spécifications fonctionnelles de l'assistant — intentions, réponses, UX | ✅ Actif |
| `V1_AI_ASSISTANT_ARCHITECTURE.md` | Architecture technique — fast path / smart path, 9 modules de données, rate limiting | ✅ Actif |
| `V1_AI_ASSISTANT_ARCHITECTURE-1.md` | Doublon exact de `V1_AI_ASSISTANT_ARCHITECTURE.md` — fichiers identiques | 🗄️ Archivé — doublon |
| `V1_AI_ASSISTANT_IMPLEMENTATION.md` | Plan d'implémentation — phases, edge functions, tests | ✅ Actif |
| `Feature_Assistant_Akeli` | Roadmap modulaire features assistant — AI Memory, modules activables indépendamment | ✅ Actif |

---

## 4. V1 — Website Next.js

Réécriture propre en Next.js de la plateforme créateur.  
**Trois surfaces :** Publique (marketing) · Découverte (marketplace créateurs) · Espace Créateur (authentifié).  
**Domaine :** a-keli.com · **Stack :** Next.js 14 · TypeScript · Tailwind + shadcn/ui · Supabase · Vercel

### 4a. Vision & Scope (documents fondateurs)

| Document | Description | Statut |
|----------|-------------|--------|
| `V1_SCOPE_FINAL_VALIDE.md` | **Scope V1 validé** — features incluses/exclues, priorités, décisions critiques, budget API. Référence périmètre | ✅ Actif — **Lire en premier** |
| `V1_WEBSITE_VISION_PHILOSOPHIE.md` | Vision et philosophie du website — "Talent is everywhere", accessibilité universelle, ton | ✅ Actif |
| `V1_WEBSITE_PHILOSOPHIE_DETAILLEE.md` | Philosophie détaillée — ce que le website dit et ne dit pas, principes de communication | ✅ Actif |
| `V1_WEBSITE_TROIS_SURFACES.md` | Architecture des trois surfaces — Publique, Découverte, Espace Créateur | ✅ Actif |
| `V1_WEBSITE_ACCESSIBILITE_UNIVERSELLE.md` | Accessibilité — 3G, petits écrans, 8 langues, inclusion | ✅ Actif |
| `V1_VISION_INTELLIGENCE_COLLECTIVE.md` | Vision intelligence collective — chat créateurs, collecte passive V1, analyse V2 | ✅ Actif |
| `V1_PRINCIPE_VALIDATION_PUBLIQUE.md` | Principe validation publique — Akeli ne juge pas, le public valide par les données | ✅ Actif |
| `V1_WEBSITE_QUESTIONS_SUSPENS.md` | 8 questions critiques résolues — traductions, macros, onboarding, dashboard progressif, wizard | ✅ Actif — Décisions finales |

### 4b. Documentation Technique (prête pour Claude Code)

> Ordre de lecture recommandé pour Claude Code : Architecture → Database → Pages → Chat → IA → Deployment

| Document | Description | Statut |
|----------|-------------|--------|
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | **Architecture technique complète** — stack (Next.js 14, TypeScript, shadcn/ui, TanStack Query, Zustand, next-intl), structure projet, routing complet (22 pages), auth SSR, state management, design tokens, SEO, upload images, déploiement Vercel | ✅ Actif |
| `V1_WEBSITE_DATABASE_COMPLETE.md` | **Database complémentaire website** — 3 nouvelles tables (specialty, recipe_translation, ingredient_submission), modifications tables existantes (ingredient status, creator username/socials, recipe slug/draft_data, conversation type), vues, fonctions SQL, triggers, Storage policies. Ordre d'exécution inclus | ✅ Actif |
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | **Specs des 22 pages** — layout, composants, queries Supabase, schemas Zod, flows (wizard 6 steps, auth, chat, dashboard progressif, Mode Fan, profil, paramètres). Couvre les 3 surfaces | ✅ Actif |
| `V1_WEBSITE_CHAT_ARCHITECTURE.md` | **Architecture chat créateurs** — Supabase Realtime, hooks useConversation + useConversationList, 3 types de conversations (privé/groupe/support), optimistic updates, typing indicators, badge non-lus, pagination scroll infini, upload images chat, RLS | ✅ Actif |
| `V1_WEBSITE_IA_SPECIFICATIONS.md` | **Spécifications IA website** — Gemini (correction orthographe temps réel, traduction 8 langues async) + Claude Sonnet (dashboard expliqué, insight recette). Prompts complets, exemples réponses, rate limiting, gestion erreurs, estimation coûts | ✅ Actif |
| `V1_WEBSITE_DEPLOYMENT_GUIDE.md` | **Guide de déploiement** — 15 étapes ordonnées : Supabase setup (pgvector, auth, Storage, Edge Functions, cron jobs, Realtime), Stripe Connect, Vercel, DNS IONOS, seed data, checklist pré-lancement (25+ points), monitoring | ✅ Actif |

### 4c. Périmètre V1 Website — Rappel

**INCLUS V1 :**
- ✅ Surface Publique (landing page, about, légales)
- ✅ Surface Découverte (catalogue créateurs, profil public, catalogue recettes, détail recette teasing)
- ✅ Espace Créateur — Création recette (wizard 6 steps, IA Gemini, auto-save, traduction 8 langues)
- ✅ Espace Créateur — Chat complet (privé, groupes, support — Supabase Realtime)
- ✅ Espace Créateur — Gestion catalogue (liste, édition, stats)
- ✅ Espace Créateur — Dashboard revenus (progressif, Claude Sonnet insights)
- ✅ Espace Créateur — Mode Fan (stats, progression vers éligibilité)
- ✅ Espace Créateur — Profil public + Paramètres (Stripe Connect)
- ✅ Multilingue 8 langues (FR/EN natif V1, autres via Gemini)
- ✅ SEO créateurs (profil + recettes teasing indexés)

**EXCLU V1 (→ V2) :**
- ❌ Analytics avancés (démographie fans)
- ❌ SEO Tool / Niche Finder
- ❌ Chat analysis IA active
- ❌ Vente programmes nutritionnels
- ❌ Système parrainage

---

## 5. Business & Marché

Documents de référence stratégique. Consultés lors des décisions produit et expansion.

| Document | Description | Statut |
|----------|-------------|--------|
| `AKELI_PERSONAS_UTILISATEURS.md` | Personas détaillés — utilisateurs consommateurs et créateurs | ✅ Actif |
| `AKELI_MODELE_CREATEUR.md` | Modèle économique créateur — rémunération €1/90 consommations, Mode Fan, logique plateforme | ✅ Actif |
| `AKELI_MARCHES_EXPANSION.md` | Marchés cibles — Europe francophone, anglophone (Nigeria, UK, US, SA) | ✅ Actif |
| `AKELI_MODE_FAN.md` | Mode Fan — allocation directe 1€/mois à un créateur, règle 90/10, blocage technique, historique | ✅ Actif |
| `AKELI_NICHES.md` | Niches culinaires identifiées — segments et sous-marchés | ✅ Actif |
| `AKELI_REALITE_SOCIOLOGIQUE.md` | Réalité sociologique de la diaspora — pratiques alimentaires, contexte européen | ✅ Actif |
| `AKELI_PHILOSOPHIE_REALIGNMENT.md` | Philosophie du réalignement — adapter la cuisine au mode de vie, pas l'inverse | ✅ Actif |
| `AKELI_CUISINE_SYSTEME_VIVANT.md` | La cuisine comme système vivant — dynamique, adaptation, transmission | ✅ Actif |
| `AKELI_CUISINE_ADAPTATION.md` | Adaptation culinaire diaspora — compromis, hybridation, praticité | ✅ Actif |
| `AKELI_VISION_UNIVERSELLE.md` | Vision universelle Akeli — au-delà de la diaspora africaine | ✅ Actif |
| `AKELI_STRATEGIE_CREATEUR.md` | Stratégie créateur — recrutement, onboarding, fidélisation | ✅ Actif |
| `AKELI_STRATEGIE_COMMUNAUTE.md` | Stratégie communauté — groupes, engagement, intelligence collective | ✅ Actif |
| `AKELI_COMMUNICATION_CREATEUR.md` | Communication créateur — ton, messages, canaux | ✅ Actif |
| `AKELI_AXES_CONTENU.md` | Axes de contenu — thèmes éditoriaux, types de recettes | ✅ Actif |
| `Improving_the_Akeli_recipe_platform` | Réflexions sur l'amélioration de la plateforme créateur web | ✅ Actif (référence) |

---

## 6. V2 — En Préparation (Sept 2026)

Features avancées pour créateurs et intelligence B2B. Travail préparatoire en cours — aucun code, concepts et documentation uniquement.

> **Principe** : Chaque sujet V2 est traité dans une conversation séparée, documenté, puis indexé ici.

| Document | Description | Statut |
|----------|-------------|--------|
| `01-vision-architecture.md` | Vision plateforme Pro Tier créateur — Niche Finder, SEO Tool, Analytics avancés. **Périmètre V2 website uniquement** | 🗓️ V2 |
| `02-specifications-fonctionnelles.md` | Specs fonctionnelles Pro Tier — Vectorisation recherches, SEO Tool, Niche Finder. **Périmètre V2** | 🗓️ V2 |
| `03-database-schema.md` | Schéma base de données Pro Tier V2. **Remplacé par `V1_DATABASE_SCHEMA.md` pour la V1** | 🗓️ V2 |
| `04-roadmap-implementation.md` | Roadmap plateforme Pro Tier V2. **Remplacée par `V1_OBJECTIFS_IMPLEMENTATION.md` pour la V1** | 🗓️ V2 |
| `README.md` | Introduction aux docs 01-04 plateforme Pro Tier | 🗓️ V2 |
| `AI_AGENT_ARCHITECTURE.md` | Agent IA action-first — nutrition coach qui agit (meal plan, ajustements, substitutions, shopping list, analytics insights) | 🗓️ V2 |
| `User_Vectorization_and_EGR_Matrix.md` | Matrice EGR (Enjoyability, Goal, Retention), vectorisation 7 dimensions 1536D | 🗓️ V2 |

---

## 7. Archivé

Documents obsolètes conservés pour mémoire. Ne pas utiliser comme référence.

| Document | Raison | Statut |
|----------|--------|--------|
| `V1_AI_ASSISTANT_ARCHITECTURE-1.md` | Doublon exact de `V1_AI_ASSISTANT_ARCHITECTURE.md` (diff = 0) | 🗄️ Archivé — doublon |

---

## Conventions de Documentation

**Avant de créer un nouveau document :**
1. Identifier la section où il s'intègre (V1 App / V1 Website / Business / V2)
2. Créer le document avec un nom explicite en `SCREAMING_SNAKE_CASE.md`
3. L'ajouter immédiatement dans ce `MASTER_INDEX.md` avec son statut

**Statuts disponibles :**
- ✅ **Actif** — référence courante, utilisée pour le développement
- 🔲 **À documenter** — prévu, conversation future
- 🗓️ **V2 — En attente** — concept validé, implémentation sept 2026
- 🗄️ **Archivé** — obsolète, conservé pour mémoire

**Langues :**
- Documentation technique → Anglais
- Vision, business, réflexions → Français

**Ordre de lecture recommandé pour Claude Code — Website V1 :**
1. `V1_ARCHITECTURE_DECISIONS.md` — décisions qui font autorité
2. `V1_SCOPE_FINAL_VALIDE.md` — périmètre validé
3. `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` — stack et structure
4. `V1_WEBSITE_DATABASE_COMPLETE.md` — schéma database
5. `V1_DATABASE_SCHEMA.md` — schéma base V1 (45 tables)
6. `V1_WEBSITE_PAGES_SPECIFICATIONS.md` — specs pages
7. `V1_WEBSITE_CHAT_ARCHITECTURE.md` — chat Realtime
8. `V1_WEBSITE_IA_SPECIFICATIONS.md` — Gemini + Claude
9. `V1_WEBSITE_DEPLOYMENT_GUIDE.md` — déploiement

---

*Ce document est la source de vérité du projet Akeli pour le statut et l'organisation.*  
*En cas de contradiction entre deux documents sur une décision d'architecture, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.*  
*En cas de contradiction sur les specs, le document le plus récent (voir date en header) fait référence.*

*Dernière mise à jour : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*
