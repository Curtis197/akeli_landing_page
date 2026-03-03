# 01 - Vision & Architecture Globale

---

## ðŸŽ¯ Vision Produit V1

### ProblÃ¨me Ã  RÃ©soudre

Les crÃ©ateurs de recettes de la diaspora africaine ont du mal Ã  :
- **Identifier les opportunitÃ©s** : Quelles recettes crÃ©er pour maximiser l'impact ?
- **Comprendre leur marchÃ©** : Qui consomme leurs recettes et pourquoi ?
- **Optimiser leur offre** : Comment se diffÃ©rencier et trouver leur niche ?
- **Professionnaliser leur approche** : Passer d'amateur passionnÃ© Ã  crÃ©ateur business-savvy

### Solution Akeli V1

**Une plateforme d'intelligence business** qui transforme les donnÃ©es de recherche et consommation en insights actionnables pour aider les crÃ©ateurs Ã  :

1. **DÃ©couvrir leur niche** via le Niche Finder algorithmique
2. **Valider leurs idÃ©es** via l'In-App SEO Tool
3. **Comprendre leur audience** via les Analytics CrÃ©ateur
4. **CroÃ®tre stratÃ©giquement** grÃ¢ce aux donnÃ©es, pas au hasard

---

## ðŸ’¡ Proposition de Valeur Pro Tier

### Pour le CrÃ©ateur

**"Devenez un crÃ©ateur data-driven, pas un crÃ©ateur qui devine"**

#### Free Tier
- CrÃ©ation recettes illimitÃ©e
- Analytics basiques
- 5 recherches SEO/mois
- Revenue tracking

#### Pro Tier (30â‚¬ EU / 12â‚¬ Afrique)
- âœ… **In-App SEO Tool illimitÃ©** : Testez autant d'idÃ©es que vous voulez
- âœ… **Niche Finder complet** : DÃ©couvrez toutes les opportunitÃ©s du marchÃ©
- âœ… **Analytics avancÃ©es** : DÃ©mographie dÃ©taillÃ©e de vos consommateurs
- âœ… **Insights IA** : Suggestions personnalisÃ©es pour amÃ©liorer vos recettes
- âœ… **Trends monitoring** : Alertes sur nouvelles opportunitÃ©s dans votre niche

### Pour Akeli (Business Model)

**Objectif Pro Tier** : Couvrir coÃ»ts opÃ©rationnels (compute + OpenAI), pas profit principal

**Revenue Principal** : Subscriptions utilisateurs finaux mobile app

**StratÃ©gie** :
- Pro Tier = outil de retention crÃ©ateurs
- CrÃ©ateurs heureux = plus de recettes = plus d'utilisateurs
- Cercle vertueux : meilleur contenu â†’ meilleure app â†’ plus de revenus

---

## ðŸ—ï¸ Architecture Technique

### Stack Technologique

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         USERS                               â”‚
â”‚                                                             â”‚
â”‚  ðŸ‘¤ CrÃ©ateurs (Web)          ðŸ‘¥ Consommateurs (Mobile)      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚                                â”‚
           â–¼                                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  NEXT.JS WEB APP     â”‚        â”‚  FLUTTER MOBILE APP  â”‚
â”‚  (Plateforme CrÃ©ateur)â”‚       â”‚  (Consommation)      â”‚
â”‚                      â”‚        â”‚                      â”‚
â”‚  - SEO Tool          â”‚        â”‚  - Recipe Discovery  â”‚
â”‚  - Niche Finder      â”‚        â”‚  - Meal Planning     â”‚
â”‚  - Analytics         â”‚        â”‚  - Search Tracking   â”‚
â”‚  - Recipe Creation   â”‚        â”‚  - Consumption       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚                               â”‚
           â”‚    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚    â”‚
           â–¼    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SUPABASE BACKEND                         â”‚
â”‚                                                             â”‚
â”‚  PostgreSQL Database                                        â”‚
â”‚  â”œâ”€ Recipes, Users, Meals                                   â”‚
â”‚  â”œâ”€ Search Queries (NEW)                                    â”‚
â”‚  â”œâ”€ User Embeddings (NEW)                                   â”‚
â”‚  â”œâ”€ Niche Clusters (NEW)                                    â”‚
â”‚  â””â”€ Creator Subscriptions (NEW)                             â”‚
â”‚                                                             â”‚
â”‚  Edge Functions                                             â”‚
â”‚  â”œâ”€ vectorize-search (NEW)                                  â”‚
â”‚  â”œâ”€ vectorize-user (NEW)                                    â”‚
â”‚  â”œâ”€ calculate-seo-score (NEW)                               â”‚
â”‚  â”œâ”€ cluster-niches (NEW)                                    â”‚
â”‚  â””â”€ check-feature-access (NEW)                              â”‚
â”‚                                                             â”‚
â”‚  Cron Jobs                                                  â”‚
â”‚  â”œâ”€ Daily: Vectorize active users                           â”‚
â”‚  â”œâ”€ Weekly: Recalculate niches                              â”‚
â”‚  â””â”€ Daily: Update demographics                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                      â”‚
                      â–¼
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚   EXTERNAL SERVICES    â”‚
         â”‚                        â”‚
         â”‚  - OpenAI API          â”‚
         â”‚    (Embeddings)        â”‚
         â”‚                        â”‚
         â”‚  - Stripe              â”‚
         â”‚    (Subscriptions)     â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Composants Principaux

#### 1. Next.js Web Platform
- **RÃ´le** : Interface crÃ©ateur desktop-first
- **ResponsabilitÃ©s** :
  - CrÃ©ation/Ã©dition recettes
  - Affichage SEO Tool
  - Affichage Niche Finder
  - Dashboard Analytics
  - Subscription management

#### 2. Flutter Mobile App
- **RÃ´le** : Interface consommateur
- **ResponsabilitÃ©s** :
  - Discovery recettes
  - Meal planning
  - **Tracking recherches** (nouveau V1)
  - Consommation recettes

#### 3. Supabase Backend
- **RÃ´le** : Data layer + compute
- **ResponsabilitÃ©s** :
  - Stockage donnÃ©es
  - Edge functions (business logic)
  - Real-time sync
  - Cron jobs
  - Authentication

#### 4. OpenAI API
- **RÃ´le** : Vectorisation sÃ©mantique
- **ModÃ¨le** : `text-embedding-3-small`
- **Usage** :
  - Vectoriser recherches users
  - Vectoriser profils users
  - Permettre similaritÃ© sÃ©mantique

#### 5. Stripe
- **RÃ´le** : Payment processing
- **ResponsabilitÃ©s** :
  - Subscription billing (Pro Tier)
  - Webhooks (status changes)
  - Customer portal

---

## ðŸ”„ Flux de DonnÃ©es Principaux

### Flux 1 : Recherche User â†’ Vectorisation â†’ Insights

```
1. User cherche "attiÃ©kÃ© rapide" dans mobile app
   â†“
2. App envoie Ã  Supabase : 
   POST /search_queries { query: "attiÃ©kÃ© rapide", user_id: "..." }
   â†“
3. Edge Function "vectorize-search" :
   - Appelle OpenAI embedding API
   - Store : { query_text, query_embedding, user_id, timestamp }
   â†“
4. Recherche retourne rÃ©sultats (recettes similaires)
   User clique sur recette X
   â†“
5. Update search_queries : clicked_recipe_id = X
   â†“
6. [Background] Cron job hebdomadaire :
   - Analyse toutes recherches
   - Clustering K-means sur embeddings
   - DÃ©tecte niches Ã©mergentes
   - Update niche_clusters table
   â†“
7. CrÃ©ateur consulte Niche Finder :
   - Voit niche "Petit-dÃ©jeuner Ivoirien Rapide"
   - 456 recherches/mois, 0 recette existante
   - Score opportunitÃ© : 95/100
```

### Flux 2 : CrÃ©ateur Teste IdÃ©e Recette

```
1. CrÃ©ateur (web platform) ouvre SEO Tool
   Entre : "NdolÃ© vÃ©gÃ©tarien express 15 minutes"
   â†“
2. Frontend appelle Edge Function "calculate-seo-score"
   Input : { query: "NdolÃ© vÃ©gÃ©tarien express 15 minutes" }
   â†“
3. Function process :
   a) Vectorise query
   b) Cherche recherches similaires (cosine similarity)
   c) Compte recettes existantes similaires
   d) Calcule metrics :
      - Volume recherches : 234/mois
      - Recettes concurrentes : 2
      - Consommation moyenne : 45/recette
      - Note moyenne : 4.1/5
      - Tendance : +18% croissance
   e) Calcule indice potentiel (formule pondÃ©rÃ©e)
   â†“
4. Function retourne JSON :
   {
     "potential_score": 87,
     "search_volume_30d": 234,
     "existing_recipes": 2,
     "avg_consumption": 45,
     "avg_rating": 4.1,
     "trend": "growing",
     "growth_rate": 18,
     "detailed_insights": { ... }
   }
   â†“
5. Frontend affiche rÃ©sultats visuellement
   CrÃ©ateur dÃ©cide : "Score 87/100, je crÃ©e cette recette !"
```

### Flux 3 : Analyse DÃ©mographique Consommateurs

```
1. User consomme recette crÃ©ateur X
   Mobile app : POST /meals { recipe_id, consumed: true }
   â†“
2. Trigger PostgreSQL :
   - Update recipe_performance_metrics
   - Insert/Update consumer_demographics
     (user_id, creator_id, demographics, behavior)
   â†“
3. [Background] Cron job quotidien :
   - AgrÃ¨ge donnÃ©es par crÃ©ateur
   - Calcule :
     * RÃ©partition genre, Ã¢ge, localisation
     * Objectifs fitness dominants
     * Comportements (jours prÃ©fÃ©rÃ©s, moments)
     * Taux retention, re-consommation
   - Generate AI insights (optional)
   â†“
4. CrÃ©ateur consulte Analytics dashboard
   Voit :
   - "67% de vos consommateurs sont des femmes 25-34 ans"
   - "Pic consommation : Dimanche soir (meal prep)"
   - "Objectif dominant : Perte de poids (56%)"
   - "Suggestion : Vos recettes 'rapides' surperforment"
```

### Flux 4 : Subscription Pro Tier

```
1. CrÃ©ateur clique "Upgrade to Pro"
   â†“
2. Frontend dÃ©tecte rÃ©gion (gÃ©olocalisation)
   Prix affichÃ© : 30â‚¬/mois (EU) ou 12â‚¬/mois (Afrique)
   â†“
3. Redirect to Stripe Checkout
   â†“
4. User paye
   â†“
5. Stripe webhook â†’ Supabase Edge Function
   â†“
6. Function updates :
   creator_subscriptions {
     creator_id: X,
     tier: 'pro',
     status: 'active',
     stripe_subscription_id: "sub_xxx"
   }
   â†“
7. User redirected to platform
   Feature gates now open (SEO Tool, Niche Finder, Analytics)
```

---

## ðŸ’° Business Model DÃ©taillÃ©

### Structure Revenue Akeli

```
TOTAL REVENUE AKELI
â”œâ”€ ðŸŽ¯ PRIMARY (80-90%)
â”‚  â””â”€ Mobile App Subscriptions (end users)
â”‚     - Free tier (ads ou limitations)
â”‚     - Premium tier (â‚¬X/mois)
â”‚
â””â”€ ðŸ”§ SECONDARY (10-20%)
   â””â”€ Creator Pro Tier
      - Europe : 30â‚¬/mois
      - Afrique : 12â‚¬/mois
      - Objectif : Break-even coÃ»ts
```

### Pricing StratÃ©gie Pro Tier

#### Pourquoi 30â‚¬ EU / 12â‚¬ Afrique ?

**CoÃ»ts Ã  couvrir par abonnement** :
- OpenAI embeddings : ~$2-3/crÃ©ateur/mois (vectorisations)
- Compute Supabase : ~$1/crÃ©ateur/mois (cron jobs, analytics)
- Stripe fees : ~â‚¬1/transaction
- **Total coÃ»t** : ~â‚¬5-6/crÃ©ateur/mois

**Marge** :
- EU : 30â‚¬ - 6â‚¬ = 24â‚¬ marge (contribue infrastructure globale)
- Afrique : 12â‚¬ - 6â‚¬ = 6â‚¬ marge (juste au-dessus break-even)

**Rationale** :
- Prix Afrique bas pour accessibilitÃ© marchÃ© local
- Prix EU standard pour marchÃ© diaspora (pouvoir d'achat)
- Subvention croisÃ©e acceptable car revenue principal = mobile app

### KPIs Business

#### MÃ©triques SuccÃ¨s Pro Tier
- **Taux conversion Free â†’ Pro** : Target 15-20%
- **Retention Pro Tier** : Target 85%+ aprÃ¨s 3 mois
- **Valeur vie client (LTV)** : Target 12+ mois abonnement
- **Payback pÃ©riode** : <3 mois

#### MÃ©triques QualitÃ© Plateforme
- **Recettes crÃ©Ã©es/crÃ©ateur Pro** : Target 3+/mois
- **Utilisation SEO Tool** : Target 10+ recherches/crÃ©ateur/mois
- **Niches explorÃ©es** : Target 5+ niches vues/crÃ©ateur/mois
- **Consommation recettes crÃ©Ã©es** : Target croissance 20%+ aprÃ¨s insights

---

## ðŸŽ¯ Objectifs V1

### Court Terme (3 mois post-launch)
- âœ… 50+ crÃ©ateurs Pro actifs
- âœ… 500+ recettes crÃ©Ã©es via insights SEO/Niche
- âœ… â‚¬1,500/mois revenue Pro Tier (50 crÃ©ateurs Ã— 30â‚¬ moyenne)
- âœ… Break-even coÃ»ts infrastructure Pro features

### Moyen Terme (6 mois post-launch)
- âœ… 200+ crÃ©ateurs Pro
- âœ… 80%+ satisfaction crÃ©ateurs (NPS >50)
- âœ… Identification 50+ niches opportunitÃ©s validÃ©es
- âœ… â‚¬6,000/mois revenue Pro Tier

### Long Terme (12 mois)
- âœ… 500+ crÃ©ateurs Pro
- âœ… Expansion gÃ©ographique (UK, Allemagne, US)
- âœ… API publique pour crÃ©ateurs (webhooks, exports)
- âœ… Marketplace programs (crÃ©ateurs vendent bundles recettes)

---

## ðŸ” Principes Architecture

### 1. Data-Driven par Design
- Toute action user trackÃ©e (avec consentement)
- Metrics agrÃ©gÃ©es en temps rÃ©el
- Insights gÃ©nÃ©rÃ©s automatiquement

### 2. ScalabilitÃ©
- Edge functions stateless (horizontal scaling)
- Database indexes optimisÃ©s (vector search)
- Caching stratÃ©gique (niches, analytics)

### 3. CoÃ»ts OptimisÃ©s
- Vectorisation batch (pas real-time users)
- Caching embeddings (avoid re-compute)
- Cron jobs off-peak hours (cheaper)

### 4. Privacy-First
- Anonymisation donnÃ©es analytics
- AgrÃ©gation minimum 10 users (Ã©viter identification)
- RGPD compliant (EU users)

### 5. Feature Gating Propre
- Backend enforcement (pas juste UI)
- Graceful degradation (free tier utile)
- Clear upgrade prompts (non-agressifs)

---

## ðŸš§ Risques & Mitigations

### Risque 1 : DonnÃ©es Insuffisantes au Launch
**ProblÃ¨me** : Pas assez de recherches historiques pour insights significatifs

**Mitigation** :
- Phase 0 : Commencer tracking AVANT launch Pro Tier (60+ jours)
- Seed data : Analyser keywords Google Trends cuisine africaine
- MVP Niche Finder : Niches prÃ©dÃ©finies manuellement initialement

### Risque 2 : CoÃ»ts OpenAI Explosent
**ProblÃ¨me** : Plus de crÃ©ateurs que prÃ©vu = coÃ»ts vectorisation Ã©levÃ©s

**Mitigation** :
- Caching agressif embeddings
- Throttling : limite vectorisations/crÃ©ateur/jour
- Fallback : dÃ©sactiver features IA temporairement si budget dÃ©passÃ©

### Risque 3 : Faible Adoption Pro Tier
**ProblÃ¨me** : CrÃ©ateurs ne voient pas valeur (taux conversion <5%)

**Mitigation** :
- Free trial 14 jours (sans carte)
- Previews SEO Tool en free tier (5 recherches/mois)
- Case studies : montrer revenus crÃ©ateurs ayant utilisÃ© insights
- Onboarding personnalisÃ© (email sequences, tutorials)

### Risque 4 : ComplexitÃ© Technique Clustering
**ProblÃ¨me** : Algorithme niches ne produit pas rÃ©sultats pertinents

**Mitigation** :
- V1 : Clustering simple (K-means conceptuel)
- Human-in-loop : Curtis valide niches avant affichage crÃ©ateurs
- ItÃ©ration : amÃ©liorer algo basÃ© sur feedback crÃ©ateurs
- Fallback : niches prÃ©dÃ©finies manuellement

---

## ðŸ“Š MÃ©triques de Monitoring

### Technique
- **Latency SEO Tool** : <2s (p95)
- **Cron job success rate** : >99%
- **Database query performance** : <100ms (p95)
- **OpenAI API success rate** : >99.5%

### Business
- **MRR Pro Tier** : Monthly Recurring Revenue
- **Churn rate Pro** : <10%/mois
- **CAC** : Customer Acquisition Cost (organic = â‚¬0 actuellement)
- **LTV/CAC ratio** : >3

### Produit
- **DAU crÃ©ateurs Pro** : Daily Active Users
- **Recettes crÃ©Ã©es post-insight** : Conversion insight â†’ action
- **Niches validÃ©es** : Combien opportunitÃ©s exploitÃ©es
- **NPS crÃ©ateurs** : Net Promoter Score

---

## ðŸ”„ Ã‰volutions Futures (Post-V1)

### V2 : Marketplace Programs
- CrÃ©ateurs vendent bundles recettes (ex: "30 jours Keto Africain")
- Akeli prend commission 20%
- Revenue additionnel crÃ©ateurs

### V3 : API Publique CrÃ©ateurs
- Webhooks notifs (nouvelle consommation, milestone)
- Exports donnÃ©es (CSV, JSON)
- IntÃ©grations tierces (Instagram, TikTok analytics)

### V4 : Expansion BeautÃ©/Wellness
- MÃªmes principes (SEO, niches, analytics)
- Nouveaux crÃ©ateurs (beauty routines africaines)
- Cross-pollination audiences

---

**Prochaine section** : [02 - SpÃ©cifications Fonctionnelles](02-specifications-fonctionnelles.md)
