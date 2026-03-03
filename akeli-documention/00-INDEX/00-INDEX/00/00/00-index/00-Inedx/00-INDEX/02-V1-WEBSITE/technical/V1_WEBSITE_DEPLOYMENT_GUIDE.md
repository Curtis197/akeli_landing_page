# Akeli V1 — Guide de Déploiement Website

> Procédure complète pour déployer le website Akeli en production.
> Couvre : Supabase setup, Vercel deployment, DNS IONOS, variables d'environnement.
> À suivre dans l'ordre indiqué — les étapes ont des dépendances.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Domaine** : a-keli.com (géré chez IONOS)

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  IONOS (DNS)                                                │
│  a-keli.com → Vercel                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  VERCEL                                                     │
│  Next.js 14 — Production build                             │
│  Région : cdg1 (Paris)                                      │
│  Branch : main → auto-deploy                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (Pro tier)                                        │
│  PostgreSQL + Auth + Storage + Realtime + Edge Functions    │
│  Région : eu-west-1 (Frankfurt) ou eu-west-2 (London)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Gemini API    Claude API    Stripe Connect
         (corrections  (analytics)   (paiements
          traductions)               créateurs)
```

---

## Étape 1 — Supabase : Création du projet

### 1.1 Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New project
2. Paramètres :
   - **Name :** `akeli-v1`
   - **Database password :** Générer un mot de passe fort (sauvegarder dans un gestionnaire de mots de passe)
   - **Region :** `eu-west-2 (London)` ou `eu-west-1 (Frankfurt)` — proximité Europe francophone
   - **Plan :** Pro (requis pour pgvector + Realtime + Edge Functions)

3. Noter les informations du projet :
```
Project URL    : https://[project-ref].supabase.co
Anon Key       : eyJ...  (publique — utilisée côté Next.js)
Service Key    : eyJ...  (secrète — uniquement Edge Functions)
DB Password    : [mot de passe généré]
Project Ref    : [project-ref]
```

### 1.2 Activer pgvector

Dans le SQL Editor de Supabase :

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.3 Activer les extensions nécessaires

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";      -- Pour appels HTTP depuis triggers
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- Pour recherche insensible aux accents
```

---

## Étape 2 — Supabase : Appliquer le schéma database

Appliquer les fichiers SQL dans cet ordre via le SQL Editor :

```
1. V1_DATABASE_SCHEMA.md         → Schéma complet 45 tables
   (copier chaque bloc SQL dans le SQL Editor)

2. V1_WEBSITE_DATABASE_COMPLETE.md → Compléments website
   Suivre l'ordre indiqué dans la section 14 du document :
   a. ALTER TABLE ingredient (status)
   b. ALTER TABLE creator (username, socials)
   c. ALTER TABLE recipe (slug, draft_data)
   d. ALTER TABLE conversation (type)
   e. CREATE TABLE specialty
   f. CREATE TABLE recipe_translation
   g. CREATE TABLE ingredient_submission
   h. Triggers (slug, support conversation)
   i. Vues (creator_public_profile, creator_dashboard_stats)
   j. Fonctions SQL
   k. Storage buckets + policies
```

**Vérification après application :**
```sql
-- Vérifier le nombre de tables créées
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- Attendu : ~50 tables

-- Vérifier les extensions
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pg_net', 'uuid-ossp');
```

---

## Étape 3 — Supabase : Configurer l'authentification

### 3.1 Providers Auth

Dans Supabase Dashboard → Authentication → Providers :

**Email (activé par défaut) :**
- Enable email confirmations : **OUI** en production
- Secure email change : **OUI**

**Google OAuth :**
```
1. Google Cloud Console → Credentials → Create OAuth 2.0 Client
2. Authorized redirect URI : https://[project-ref].supabase.co/auth/v1/callback
3. Copier Client ID et Client Secret dans Supabase → Auth → Providers → Google
```

### 3.2 URL de redirection

Dans Supabase Dashboard → Authentication → URL Configuration :

```
Site URL           : https://a-keli.com
Redirect URLs      : https://a-keli.com/auth/callback
                     https://a-keli.com/en/auth/callback
                     http://localhost:3000/auth/callback     (développement)
                     http://localhost:3000/en/auth/callback  (développement)
```

### 3.3 Email templates (optionnel — personnaliser en production)

Dans Authentication → Email Templates :
- Confirmation : Personnaliser avec le branding Akeli
- Password reset : Personnaliser avec le branding Akeli

---

## Étape 4 — Supabase : Configurer Storage

Les buckets sont créés par le SQL de l'étape 2. Vérifier dans Dashboard → Storage :

```
✅ recipe-images   (public: true, 5MB max)
✅ avatars          (public: true, 2MB max)
✅ chat-images      (public: true, 5MB max)
```

**Si les buckets ne sont pas créés automatiquement** (le SQL Storage peut nécessiter les droits superuser), les créer manuellement dans le dashboard.

---

## Étape 5 — Supabase : Déployer les Edge Functions

Les Edge Functions sont déployées via Supabase CLI.

### 5.1 Installer Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref [project-ref]
```

### 5.2 Structure Edge Functions

```
supabase/functions/
├── complete-onboarding/index.ts
├── create-creator-profile/index.ts
├── gemini-correct-text/index.ts
├── translate-recipe/index.ts
├── explain-creator-stats/index.ts
├── explain-recipe-performance/index.ts
├── stripe-webhook/index.ts
├── create-checkout-session/index.ts
├── compute-monthly-revenue/index.ts
├── process-fan-mode-transitions/index.ts
├── activate-fan-mode/index.ts
├── cancel-fan-mode/index.ts
├── send-push-notification/index.ts
└── send-meal-reminders/index.ts
```

### 5.3 Configurer les secrets Edge Functions

```bash
# Clés API — JAMAIS dans le code source
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set CLAUDE_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set FCM_SERVER_KEY=...
supabase secrets set PYTHON_SERVICE_URL=https://akeli-engine.railway.app
supabase secrets set PYTHON_SERVICE_SECRET=...
```

### 5.4 Déployer les Edge Functions

```bash
# Déployer toutes les fonctions
supabase functions deploy

# Ou déployer une fonction spécifique
supabase functions deploy gemini-correct-text
supabase functions deploy translate-recipe
supabase functions deploy explain-creator-stats
supabase functions deploy explain-recipe-performance
supabase functions deploy create-creator-profile
```

### 5.5 Configurer les cron jobs

Dans Supabase Dashboard → Database → Extensions → pg_cron :

```sql
-- Vérifier que pg_cron est activé
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job : envoi rappels repas (toutes les heures)
SELECT cron.schedule(
  'send-meal-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-meal-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron job : transitions Mode Fan (1er du mois à 00:05 UTC)
SELECT cron.schedule(
  'process-fan-mode-transitions',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-fan-mode-transitions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron job : calcul revenus mensuels (1er du mois à 01:00 UTC)
SELECT cron.schedule(
  'compute-monthly-revenue',
  '0 1 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/compute-monthly-revenue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Étape 6 — Supabase : Configurer Realtime

Dans Supabase Dashboard → Database → Replication :

Activer Realtime sur les tables du chat :

```sql
-- Activer Realtime sur les tables nécessaires
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participant;
```

**Vérification :**
```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- Doit inclure chat_message, conversation, conversation_participant
```

---

## Étape 7 — Stripe Connect : Configuration

### 7.1 Créer le compte Stripe

1. [stripe.com](https://stripe.com) → Créer un compte business Akeli
2. Activer **Stripe Connect** (pour les paiements aux créateurs)
3. Choisir le modèle : **Express accounts** (créateurs ont accès limité au dashboard Stripe)

### 7.2 Créer le produit abonnement

Dans Stripe Dashboard → Products :
```
Nom          : Abonnement Akeli
Prix         : 4,50€/mois (premier mois) → puis 9€/mois
              Ou : 9€/mois directement selon le modèle final validé
Type         : Récurrent (monthly)
Devise       : EUR
```

Récupérer le `price_id` (format `price_xxx`) → nécessaire dans les Edge Functions.

### 7.3 Configurer le webhook Stripe

Dans Stripe Dashboard → Webhooks → Add endpoint :

```
URL           : https://[project-ref].supabase.co/functions/v1/stripe-webhook
Events        :
  customer.subscription.created
  customer.subscription.updated
  customer.subscription.deleted
  invoice.payment_failed
  account.updated              (pour Stripe Connect)
```

Copier le **Webhook Signing Secret** (`whsec_...`) → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Étape 8 — Vercel : Déploiement

### 8.1 Connecter le dépôt GitHub

1. [vercel.com](https://vercel.com) → New Project
2. Importer le dépôt GitHub `akeli-website`
3. Framework : Next.js (détecté automatiquement)
4. Root Directory : `/` (ou `website/` si monorepo)

### 8.2 Configurer les variables d'environnement Vercel

Dans Vercel Dashboard → Settings → Environment Variables :

```bash
# ── Supabase ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon key...

# ── URLs application ──────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://a-keli.com
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/akeli/id[app-id]
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.akeli.app

# ── Feature flags ─────────────────────────────────────
NEXT_PUBLIC_ENABLE_RECIPES_CATALOG=true
```

> **Rappel :** Les clés Gemini, Claude et Stripe ne sont PAS dans les variables Vercel.
> Elles vivent uniquement dans les secrets Supabase Edge Functions.

### 8.3 Configurer le projet Vercel

`vercel.json` à la racine du projet :

```json
{
  "framework": "nextjs",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/creator/:username*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/recipe/:slug*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

### 8.4 Déploiement initial

```bash
# Premier déploiement
git push origin main
# Vercel détecte le push et lance le build automatiquement

# Vérifier le build dans Vercel Dashboard → Deployments
# Build time attendu : 2-4 minutes
```

---

## Étape 9 — DNS IONOS : Pointer a-keli.com vers Vercel

### 9.1 Récupérer les valeurs DNS Vercel

Dans Vercel Dashboard → Domains → Add domain → `a-keli.com`
Vercel fournit les valeurs DNS à configurer.

### 9.2 Configurer IONOS

Dans le panel IONOS → Domaines → a-keli.com → DNS :

```
Type    Nom       Valeur                          TTL
─────────────────────────────────────────────────────
A       @         76.76.21.21                     3600
CNAME   www       cname.vercel-dns.com            3600
```

> L'IP `76.76.21.21` est l'IP Anycast de Vercel — stable, pas besoin de la mettre à jour.

### 9.3 Ajouter le domaine dans Vercel

Dans Vercel Dashboard → Project → Settings → Domains :

```
Ajouter : a-keli.com
Ajouter : www.a-keli.com  (redirect vers a-keli.com)
```

Vercel génère automatiquement un certificat SSL Let's Encrypt.

**Délai propagation DNS :** 15 minutes à 48 heures selon les registraires.

**Vérification :**
```bash
# Vérifier la propagation DNS
dig a-keli.com A
# Attendu : 76.76.21.21

# Vérifier le SSL
curl -I https://a-keli.com
# Attendu : HTTP/2 200
```

---

## Étape 10 — Seed Data initial

### 10.1 Insérer les données de référence

```sql
-- Régions culinaires (food_region)
INSERT INTO food_region (code, name_fr, name_en) VALUES
  ('west_africa', 'Afrique de l''Ouest', 'West Africa'),
  ('east_africa', 'Afrique de l''Est', 'East Africa'),
  ('central_africa', 'Afrique Centrale', 'Central Africa'),
  ('north_africa', 'Afrique du Nord', 'North Africa'),
  ('southern_africa', 'Afrique Australe', 'Southern Africa'),
  ('caribbean', 'Caraïbes', 'Caribbean'),
  ('indian_ocean', 'Océan Indien', 'Indian Ocean');

-- Unités de mesure (measurement_unit)
INSERT INTO measurement_unit (code, name_fr, name_en) VALUES
  ('g', 'gramme(s)', 'gram(s)'),
  ('kg', 'kilogramme(s)', 'kilogram(s)'),
  ('ml', 'millilitre(s)', 'milliliter(s)'),
  ('l', 'litre(s)', 'liter(s)'),
  ('tbsp', 'cuillère(s) à soupe', 'tablespoon(s)'),
  ('tsp', 'cuillère(s) à café', 'teaspoon(s)'),
  ('cup', 'tasse(s)', 'cup(s)'),
  ('unit', 'unité(s)', 'unit(s)'),
  ('pinch', 'pincée(s)', 'pinch(es)'),
  ('handful', 'poignée(s)', 'handful(s)');

-- Spécialités créateurs (specialty) — voir V1_WEBSITE_DATABASE_COMPLETE.md section 1
INSERT INTO specialty (code, name_fr, name_en) VALUES
  ('west_african', 'Afrique de l''Ouest', 'West African'),
  ('east_african', 'Afrique de l''Est', 'East African'),
  ('central_african', 'Afrique Centrale', 'Central African'),
  ('north_african', 'Afrique du Nord', 'North African'),
  ('southern_african', 'Afrique Australe', 'Southern African'),
  ('caribbean', 'Cuisine des Caraïbes', 'Caribbean'),
  ('creole', 'Cuisine Créole', 'Creole'),
  ('diasporic_fusion', 'Fusion Diaspora', 'Diasporic Fusion');
```

### 10.2 Importer les recettes initiales (CSV Curtis)

Les 200+ recettes initiales sont importées via un script Python ou directement via le SQL Editor :

```python
# import_recipes.py — à exécuter en local avec les credentials Supabase
import csv
from supabase import create_client

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

with open('recipes_initial.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Insert recipe
        recipe = supabase.table('recipe').insert({
            'title': row['title'],
            'description': row['description'],
            'region': row['region'],
            'difficulty': row['difficulty'],
            'prep_time_min': int(row['prep_time_min']),
            'cook_time_min': int(row['cook_time_min']),
            'servings': int(row['servings']),
            'is_published': True,
            'creator_id': AKELI_CREATOR_ID,
        }).execute()

        # Déclencher traduction async
        # supabase.functions.invoke('translate-recipe', {...})
```

---

## Étape 11 — Vérifications pré-lancement

### Checklist technique

```
AUTH
□ Signup email fonctionne (réception email confirmation)
□ Login email/password fonctionne
□ Login Google OAuth fonctionne
□ Redirect post-login vers /dashboard fonctionne
□ Auth guard : /dashboard redirige vers /auth/login si non connecté

DATABASE
□ RLS activées sur toutes les tables
□ Un créateur ne voit pas les données d'un autre créateur
□ Ingrédients validés visibles publiquement
□ Ingrédients pending visibles uniquement par leur créateur

WEBSITE SURFACES
□ Landing page affiche correctement
□ /creators liste les créateurs
□ /creator/[username] affiche le profil public
□ /recipe/[slug] affiche le teasing (sans ingrédients complets, sans étapes)
□ CTA téléchargement pointe vers les bons stores

WIZARD RECETTE
□ Step 1 à 6 fonctionnent
□ Auto-save 30s opérationnel
□ Upload image cover fonctionne
□ Publication déclenche traduction async

CHAT
□ Conversation privée créée et messages envoyés/reçus en temps réel
□ Groupe créé et messages envoyés/reçus en temps réel
□ Typing indicator affiché
□ Badge non-lus mis à jour

IA
□ Correction orthographe Gemini fonctionne dans le wizard
□ Traduction déclenchée à la publication (vérifier recipe_translation en DB)
□ Explication dashboard Claude Sonnet fonctionne

STRIPE
□ Webhook Stripe reçoit les événements (test mode)
□ Stripe Connect onboarding accessible depuis /settings
□ Abonnement 9€/mois créé correctement en base

SEO
□ /creator/[username] a les bonnes metadata (title, description, OG)
□ /recipe/[slug] a le Schema.org Recipe
□ sitemap.xml accessible sur a-keli.com/sitemap.xml
□ robots.txt accessible sur a-keli.com/robots.txt
□ Pages espace créateur non indexées (noindex)

PERFORMANCE
□ Lighthouse score landing page > 85
□ Profil créateur ISR fonctionne (cache 1h)
□ Recette ISR fonctionne (cache 1h)
```

---

## Environments

### Trois environments Vercel

| Environment | Branch | URL | Supabase |
|-------------|--------|-----|---------|
| Production | `main` | a-keli.com | Projet production |
| Preview | PR branches | [hash].vercel.app | Projet staging (optionnel) |
| Development | Local | localhost:3000 | Projet local ou staging |

### Variables par environment

```bash
# Production (Vercel → Settings → Environment Variables)
NEXT_PUBLIC_SITE_URL=https://a-keli.com

# Development (.env.local — ne pas committer)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Maintenance et monitoring

### Supabase Dashboard — à surveiller

```
Database → Table Editor       : Vérifier les données
Database → Logs               : Erreurs SQL et RLS
Edge Functions → Logs         : Erreurs Edge Functions
Auth → Users                  : Nouveaux créateurs inscrits
Storage → Usage               : Consommation stockage
```

### Vercel Dashboard — à surveiller

```
Deployments    : Statut des builds
Analytics      : Trafic, Web Vitals
Logs           : Erreurs runtime
Functions      : Invocations API routes
```

### Alertes à configurer

```
Supabase → Settings → Alerts :
  - Database CPU > 80%
  - Storage > 80% du quota
  - Edge Function errors > 10/minute

Vercel → Monitoring :
  - Error rate > 1%
  - Response time > 3s (p95)
```

---

## Commandes utiles

```bash
# Développement local
npm run dev

# Build de production (vérifier avant push)
npm run build

# Linter
npm run lint

# Supabase CLI — état du projet
supabase status

# Supabase CLI — logs Edge Functions
supabase functions logs gemini-correct-text --tail

# Supabase CLI — déployer une Edge Function
supabase functions deploy translate-recipe

# Vérifier les secrets Edge Functions
supabase secrets list

# Supabase CLI — reset base de données (ATTENTION — local uniquement)
supabase db reset
```

---

## Récapitulatif ordre d'exécution

```
1. Supabase : Créer projet Pro                         (~10 min)
2. Supabase : Activer extensions (pgvector, pg_net)    (~5 min)
3. Supabase : Appliquer schéma database                (~30 min)
4. Supabase : Configurer Auth (Google OAuth, URLs)     (~15 min)
5. Supabase : Vérifier Storage buckets                 (~5 min)
6. Supabase : Déployer Edge Functions + secrets        (~20 min)
7. Supabase : Configurer cron jobs                     (~10 min)
8. Supabase : Activer Realtime sur tables chat         (~5 min)
9. Stripe : Créer compte + produit + webhook           (~20 min)
10. Vercel : Connecter dépôt + variables d'env         (~10 min)
11. IONOS : Configurer DNS                              (~5 min + propagation)
12. Vercel : Ajouter domaine + SSL auto                (~10 min)
13. Seed data : Insérer données référence              (~15 min)
14. Seed data : Importer recettes initiales            (~30 min)
15. Checklist pré-lancement                            (~30 min)

Total estimé : ~3-4 heures (hors propagation DNS)
```

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Stack, variables d'environnement, structure projet |
| `V1_WEBSITE_DATABASE_COMPLETE.md` | Schéma database — ordres d'exécution SQL |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue Edge Functions |
| `V1_WEBSITE_IA_SPECIFICATIONS.md` | Configuration Gemini et Claude (secrets) |
| `V1_DATABASE_SCHEMA.md` | Schéma base V1 — 45 tables |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Guide Déploiement Website V1*
