# Akeli V1 — Guide pour Claude Code

## Contexte du projet

**Akeli** est une plateforme pour les créateurs culinaires de la diaspora africaine.
- L'**application mobile Flutter** (repo `recipe_addition`) permet aux utilisateurs de consommer les recettes.
- Ce **website Next.js** (`akeli_landing_page`, branche `Akeli-v1`) est la plateforme creator + surface marketing.

Le backend est **Supabase** (PostgreSQL + Auth + Storage + Realtime + Edge Functions), **partagé** entre le website et l'app mobile. Ne pas modifier le schéma sans une migration SQL planifiée.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js App Router (TypeScript strict) |
| UI | Tailwind CSS + shadcn/ui |
| i18n | next-intl (FR par défaut, EN) |
| State serveur | TanStack Query v5 |
| State client | Zustand |
| Auth | Supabase SSR (`@supabase/ssr`) |
| DB | Supabase PostgreSQL |
| Formulaires | React Hook Form + Zod |
| Upload | react-dropzone + browser-image-compression |
| Déploiement | Vercel — domaine a-keli.com |

---

## Structure du projet

```
app/
├── layout.tsx                    # Root layout (pas de html/body ici)
└── [locale]/                     # FR (défaut) ou EN
    ├── layout.tsx                # Layout avec NextIntlClientProvider + Providers
    ├── page.tsx                  # Landing page (/)
    ├── about/page.tsx
    ├── legal/{terms,privacy,mentions}/page.tsx
    ├── creators/page.tsx         # Catalogue créateurs (public)
    ├── creator/[username]/page.tsx # Profil public créateur
    ├── recipes/page.tsx          # Catalogue recettes (public, aperçu seulement)
    ├── recipe/[slug]/page.tsx    # Détail recette (teasing — PAS d'ingrédients complets)
    ├── auth/{login,signup,callback}/page.tsx
    └── (creator)/                # Route group — espace créateur (authentifié)
        ├── layout.tsx            # Layout avec sidebar
        ├── dashboard/page.tsx
        ├── recipes/page.tsx
        ├── recipes/new/page.tsx  # Wizard création recette (6 étapes)
        ├── recipes/[id]/edit/page.tsx
        ├── profile/page.tsx
        ├── chat/page.tsx
        ├── chat/[id]/page.tsx
        ├── fan-mode/page.tsx
        └── settings/page.tsx

components/
├── providers.tsx                 # QueryClientProvider + AuthProvider (Zustand)
├── ui/                           # shadcn/ui components
├── layout/                       # Navbar, Sidebar, Footer, LanguageSwitcher
├── public/                       # Composants surfaces publiques
│   └── landing/                  # HeroCreators, HowItWorks, RevenueCalc...
└── creator/                      # Composants espace créateur
    ├── dashboard/                # RevenueStats, RevenueCharts, TopRecipes, AIInsights
    ├── recipe-form/              # RecipeWizard, Step1Basic...Step6Tags
    ├── chat/                     # ConversationList, ChatWindow, MessageBubble
    └── shared/                   # ImageUpload, AICorrection

lib/
├── supabase/
│   ├── client.ts                 # createBrowserClient (use client)
│   ├── server.ts                 # createServerClient (async, cookies)
│   └── middleware.ts             # updateSession
├── i18n/
│   ├── request.ts                # getRequestConfig (next-intl server)
│   ├── routing.ts                # defineRouting (locales: fr, en)
│   └── navigation.ts             # createNavigation (Link, useRouter...)
├── stores/
│   ├── authStore.ts              # Zustand — user + creator profile
│   └── uiStore.ts                # Zustand — sidebarOpen
├── queries/                      # TanStack Query fetch functions
├── validations/                  # Zod schemas
└── utils/

messages/
├── fr.json                       # Traductions françaises
└── en.json                       # Traductions anglaises

middleware.ts                     # Auth guard + next-intl routing
```

---

## Règles importantes

### Supabase
- **Client browser** : `createClient()` depuis `@/lib/supabase/client` — uniquement dans les composants "use client"
- **Client serveur** : `createClient()` depuis `@/lib/supabase/server` — dans les Server Components et Server Actions
- La table `creator` se lookup par `auth_id = user.id` (UUID Supabase Auth)
- Les Edge Functions sont appelées via `supabase.functions.invoke('nom-fonction', { body: {...} })`

### Anomalies BDD à connaître (noms de colonnes exacts)
| Table | Colonne | Anomalie |
|---|---|---|
| `receipe` | `sans porc` | espace (pas d'underscore) |
| `receipe` | `Food Region` | majuscule + espace |
| `step` | `temprorary_receipe_id` | faute de frappe (double r) |
| (table) | `food region` | nom de table avec espace |

### i18n
- Les traductions sont dans `messages/fr.json` et `messages/en.json`
- **Serveur** : `const t = await getTranslations("namespace")`
- **Client** : `const t = useTranslations("namespace")`
- Ajouter chaque nouvelle clé dans les deux fichiers

### Sécurité
- Aucune clé secrète (Gemini, Claude, Stripe secret) n'est jamais côté client Next.js
- Ces clés vivent uniquement dans les variables d'environnement des Edge Functions Supabase
- Les routes creator (`/dashboard`, `/recipes`, etc.) sont protégées par le middleware

### Surface publique — recettes
- Le détail d'une recette (`/recipe/[slug]`) affiche uniquement un **teasing** : image, titre, macros, temps, difficulté, créateur
- **PAS d'ingrédients complets ni d'étapes** sur le web — uniquement dans l'app mobile

---

## Commandes utiles

```bash
npm run dev          # Démarrer le serveur de développement
npm run build        # Build de production
npm run lint         # Vérifier le code
```

---

## Documentation complète

La documentation détaillée du projet se trouve dans :
```
akeli-documention/00-INDEX/00-INDEX/00/00/00-index/00-Inedx/00-INDEX/
├── 01-V1-APP/           # Documentation de l'app mobile Flutter
├── 02-V1-WEBSITE/       # Documentation du website Next.js
│   ├── vision-scope/    # Scope validé, philosophie, vision
│   └── technical/       # Architecture, DB, pages specs, chat, IA
└── 03-BUSINESS/         # Modèle économique, personas, stratégie
```

Fichiers clés à lire pour continuer le développement :
- `02-V1-WEBSITE/vision-scope/V1_SCOPE_FINAL_VALIDE.md` — Scope complet validé
- `02-V1-WEBSITE/technical/V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` — Architecture Next.js
- `02-V1-WEBSITE/technical/V1_WEBSITE_PAGES_SPECIFICATIONS.md` — Specs des pages
- `02-V1-WEBSITE/technical/V1_WEBSITE_DATABASE_COMPLETE.md` — Schéma DB complet

---

## Priorités de développement (dans l'ordre)

1. **Création de recette** — Wizard 6 étapes (`/recipes/new`)
2. **Chat créateurs** — Supabase Realtime (`/chat`)
3. **Gestion catalogue** — Liste + édition recettes (`/recipes`)
4. **Profil public** — Édition profil (`/profile`)
5. **Dashboard revenus** — Stats + Claude Sonnet insights (`/dashboard`)
6. **Mode Fan** — Abonnements créateurs (`/fan-mode`)

Surface publique (parallèle) :
- Landing page (`/`)
- Catalogue créateurs (`/creators`)
- Profil public créateur (`/creator/[username]`)
- Catalogue recettes (`/recipes`)
- Détail recette teasing (`/recipe/[slug]`)

---

## Variables d'environnement requises

Créer `.env.local` à partir de `.env.local.example` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
