# Akeli V1 — Architecture Technique Website (Next.js)

> Document de référence pour l'implémentation Claude Code.
> Ce document couvre exclusivement le website Next.js (a-keli.com).
> L'architecture globale système est dans `V1_ARCHITECTURE_GLOBALE.md`.
> En cas de contradiction, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## Vue d'ensemble

Le website Akeli est une application Next.js 14 déployée sur Vercel.
Il partage le backend Supabase avec l'application mobile Flutter — même base de données, même authentification, même stockage.

```
┌─────────────────────────────────────────────────────────┐
│              WEBSITE AKELI (a-keli.com)                 │
│              Next.js 14 — App Router                    │
│              Déployé sur Vercel                         │
│                                                         │
│  Surface Publique   Surface Découverte   Espace Créateur│
│  /                  /creators            /dashboard     │
│  /about             /creator/[username]  /recipes       │
│  /legales           /recipes             /settings      │
│                     /recipe/[slug]       /profile       │
│                                          /chat          │
└──────────────────────────┬──────────────────────────────┘
                           │ Supabase Client (JS)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE                            │
│  Auth · PostgreSQL · Storage · Realtime · Edge Functions│
│         (Partagé avec l'application Flutter)            │
└─────────────────────────────────────────────────────────┘
```

---

## Stack Technique

| Couche | Technologie | Version | Usage |
|--------|-------------|---------|-------|
| Framework | Next.js | 14.x | App Router |
| Langage | TypeScript | strict | Tout le projet |
| UI | Tailwind CSS | 3.x | Styles |
| Composants | shadcn/ui | latest | UI components |
| State serveur | TanStack Query | v5 | Fetch, cache, mutations |
| State client | Zustand | v4 | Auth session, UI state |
| i18n | next-intl | v3 | Multilingue FR/EN |
| Backend | Supabase | v2 | Auth, DB, Storage, Realtime |
| Formulaires | React Hook Form | v7 | Formulaires |
| Validation | Zod | v3 | Schémas validation |
| Upload images | react-dropzone | latest | Drag & drop upload |
| Crop images | react-image-crop | latest | Crop avatar |
| Compression | browser-image-compression | latest | Resize avant upload |
| Déploiement | Vercel | — | Hosting, CI/CD |
| DNS | IONOS | — | a-keli.com |

### Services externes

| Service | Usage | Appelé depuis |
|---------|-------|---------------|
| Gemini API | Traductions recettes, correction orthographe | Edge Function Supabase |
| Claude Sonnet API | Analytics expliqués (dashboard) | Edge Function Supabase |
| Stripe Connect | Paiements créateurs | Edge Function Supabase + webhooks |

**Principe de sécurité :** Aucune clé API n'est exposée côté client Next.js.
Toutes les clés sensibles (Gemini, Claude, Stripe secret) vivent dans les variables d'environnement des Edge Functions Supabase.

---

## Structure du projet

```
akeli-website/
├── app/                          # App Router Next.js
│   ├── [locale]/                 # Racine i18n (fr | en)
│   │   ├── layout.tsx            # Layout global avec providers
│   │   ├── page.tsx              # Landing page (/)
│   │   ├── about/
│   │   │   └── page.tsx          # À propos
│   │   ├── legal/
│   │   │   ├── terms/page.tsx    # CGU
│   │   │   ├── privacy/page.tsx  # Politique de confidentialité
│   │   │   └── mentions/page.tsx # Mentions légales
│   │   ├── creators/
│   │   │   └── page.tsx          # Catalogue créateurs (publique)
│   │   ├── creator/
│   │   │   └── [username]/
│   │   │       └── page.tsx      # Profil public créateur (publique)
│   │   ├── recipes/
│   │   │   └── page.tsx          # Catalogue recettes (publique, optionnel V1)
│   │   ├── recipe/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Détail recette teasing (publique)
│   │   ├── auth/
│   │   │   ├── login/page.tsx    # Connexion créateur
│   │   │   ├── signup/page.tsx   # Inscription créateur
│   │   │   └── callback/page.tsx # OAuth callback Supabase
│   │   └── (creator)/            # Route group — espace créateur (authentifié)
│   │       ├── layout.tsx        # Layout avec sidebar créateur
│   │       ├── dashboard/
│   │       │   └── page.tsx      # Dashboard revenus
│   │       ├── recipes/
│   │       │   ├── page.tsx      # Liste recettes du créateur
│   │       │   ├── new/
│   │       │   │   └── page.tsx  # Créer une recette (wizard)
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx # Éditer une recette
│   │       ├── profile/
│   │       │   └── page.tsx      # Profil public + édition
│   │       ├── chat/
│   │       │   ├── page.tsx      # Liste conversations
│   │       │   └── [id]/
│   │       │       └── page.tsx  # Conversation individuelle
│   │       ├── fan-mode/
│   │       │   └── page.tsx      # Stats Mode Fan
│   │       └── settings/
│   │           └── page.tsx      # Paramètres compte
├── components/
│   ├── ui/                       # shadcn/ui components (auto-générés)
│   ├── layout/
│   │   ├── Navbar.tsx            # Navigation publique
│   │   ├── Sidebar.tsx           # Sidebar espace créateur
│   │   ├── Footer.tsx            # Pied de page
│   │   └── LanguageSwitcher.tsx  # Sélecteur FR/EN
│   ├── public/                   # Composants surfaces publique + découverte
│   │   ├── landing/
│   │   │   ├── HeroCreators.tsx  # Section créateurs landing
│   │   │   ├── HeroUsers.tsx     # Section utilisateurs landing
│   │   │   ├── HowItWorks.tsx    # Explication modèle
│   │   │   └── RevenueCalc.tsx   # Calculateur revenus transparence
│   │   ├── CreatorCard.tsx       # Card créateur (catalogue)
│   │   ├── RecipeCard.tsx        # Card recette (teasing)
│   │   └── AppDownloadCTA.tsx    # CTA téléchargement app
│   └── creator/                  # Composants espace créateur
│       ├── dashboard/
│       │   ├── RevenueStats.tsx  # Stats simples (< 10 recettes)
│       │   ├── RevenueCharts.tsx # Graphiques (≥ 10 recettes)
│       │   ├── TopRecipes.tsx    # Top recettes performance
│       │   └── AIInsights.tsx    # Insights Claude Sonnet
│       ├── recipe-form/
│       │   ├── RecipeWizard.tsx  # Container wizard 6 steps
│       │   ├── Step1Basic.tsx    # Infos de base
│       │   ├── Step2Ingredients.tsx # Ingrédients
│       │   ├── Step3Steps.tsx    # Étapes préparation
│       │   ├── Step4Nutrition.tsx # Nutrition
│       │   ├── Step5Images.tsx   # Images
│       │   └── Step6Tags.tsx     # Tags + publication
│       ├── chat/
│       │   ├── ConversationList.tsx
│       │   ├── ChatWindow.tsx
│       │   ├── MessageBubble.tsx
│       │   └── TypingIndicator.tsx
│       └── shared/
│           ├── ImageUpload.tsx   # Upload générique (cover, galerie, avatar)
│           └── AICorrection.tsx  # Widget correction orthographe Gemini
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client Supabase browser
│   │   ├── server.ts             # Client Supabase server (SSR)
│   │   └── middleware.ts         # Client Supabase middleware
│   ├── stores/
│   │   ├── authStore.ts          # Zustand — session créateur
│   │   └── uiStore.ts            # Zustand — état UI (sidebar, modales)
│   ├── queries/                  # TanStack Query — fonctions de fetch
│   │   ├── creators.ts
│   │   ├── recipes.ts
│   │   ├── dashboard.ts
│   │   └── chat.ts
│   ├── validations/              # Zod schemas
│   │   ├── recipe.schema.ts
│   │   ├── creator.schema.ts
│   │   └── auth.schema.ts
│   └── utils/
│       ├── format.ts             # Formatage nombres, dates, devises
│       ├── seo.ts                # Helpers metadata Next.js
│       └── image.ts              # Helpers upload / compression
├── messages/                     # Fichiers i18n next-intl
│   ├── fr.json
│   └── en.json
├── middleware.ts                 # Auth guard + i18n routing
├── next.config.ts
├── tailwind.config.ts
└── .env.local                    # Variables d'environnement (local)
```

---

## Routing et i18n

### Architecture i18n avec next-intl

Le website supporte FR et EN dès V1. Le routing utilise le segment `[locale]` en racine.

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localeDetection: true,        // Détection automatique navigateur
});

export default async function middleware(request: NextRequest) {
  // 1. i18n routing
  const intlResponse = intlMiddleware(request);

  // 2. Auth guard pour les routes créateur
  const isCreatorRoute = request.nextUrl.pathname.includes('/dashboard') ||
    request.nextUrl.pathname.includes('/recipes/new') ||
    request.nextUrl.pathname.includes('/chat') ||
    request.nextUrl.pathname.includes('/settings');

  if (isCreatorRoute) {
    const supabase = createServerClient(/* config */);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Table de routing complète

| URL | Page | Auth | Indexé SEO |
|-----|------|------|------------|
| `/` | Landing page | Non | ✅ Oui |
| `/about` | À propos | Non | ✅ Oui |
| `/legal/terms` | CGU | Non | ✅ Oui |
| `/legal/privacy` | Politique confidentialité | Non | ✅ Oui |
| `/legal/mentions` | Mentions légales | Non | ✅ Oui |
| `/creators` | Catalogue créateurs | Non | ✅ Oui |
| `/creator/[username]` | Profil public créateur | Non | ✅ Oui (critique SEO) |
| `/recipe/[slug]` | Détail recette (teasing) | Non | ✅ Oui |
| `/auth/login` | Connexion | Non | ❌ Non |
| `/auth/signup` | Inscription créateur | Non | ❌ Non |
| `/auth/callback` | OAuth callback | Non | ❌ Non |
| `/dashboard` | Dashboard revenus | ✅ Oui | ❌ Non |
| `/recipes` | Liste recettes créateur | ✅ Oui | ❌ Non |
| `/recipes/new` | Créer une recette | ✅ Oui | ❌ Non |
| `/recipes/[id]/edit` | Éditer une recette | ✅ Oui | ❌ Non |
| `/profile` | Profil + édition | ✅ Oui | ❌ Non |
| `/chat` | Liste conversations | ✅ Oui | ❌ Non |
| `/chat/[id]` | Conversation | ✅ Oui | ❌ Non |
| `/fan-mode` | Stats Mode Fan | ✅ Oui | ❌ Non |
| `/settings` | Paramètres compte | ✅ Oui | ❌ Non |

> **Note i18n** : Toutes ces URLs sont préfixées par `/[locale]` en interne (`/fr/dashboard`, `/en/dashboard`).
> La locale est invisible si c'est la locale par défaut (FR).

---

## Authentification

### Supabase Auth — Flux créateur

L'authentification est partagée avec l'app Flutter. Un créateur peut se connecter sur le website et l'app avec le même compte.

```
Signup créateur (website uniquement)
→ Supabase Auth crée auth.users
→ Trigger PostgreSQL crée user_profile (is_creator = false)
→ Edge Function create-creator-profile
   → Crée entrée creator + creator_balance
   → Met is_creator = true dans user_profile
→ Redirect vers /dashboard (page Bienvenue)

Login créateur
→ Email/password OU OAuth (Google)
→ Supabase Auth vérifie credentials
→ JWT généré → stocké dans cookie (SSR compatible)
→ Middleware vérifie JWT sur routes protégées
→ Redirect vers /dashboard
```

### Gestion de session SSR

Next.js 14 App Router requiert une gestion de session côté serveur pour éviter le flash non-authentifié.

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}
```

### Vérification is_creator

Toute route de l'espace créateur vérifie que l'utilisateur a bien `is_creator = true`.
Un utilisateur qui n'est pas créateur est redirigé vers la landing page.

```typescript
// Dans le layout (creator)/layout.tsx
const { data: profile } = await supabase
  .from('user_profile')
  .select('is_creator')
  .eq('id', session.user.id)
  .single();

if (!profile?.is_creator) {
  redirect('/');
}
```

---

## Supabase — Intégration Next.js

### Clients selon le contexte

| Contexte | Client | Usage |
|----------|--------|-------|
| Server Components | `createClient()` depuis `lib/supabase/server.ts` | Fetch SSR, auth |
| Client Components | `createBrowserClient()` depuis `lib/supabase/client.ts` | Mutations, Realtime |
| Middleware | `createServerClient()` depuis `lib/supabase/middleware.ts` | Auth guard |

### Politique d'accès données

Le website Next.js accède à Supabase via la clé `anon` + JWT utilisateur.
Les RLS policies filtrent automatiquement les données selon `auth.uid()`.
Aucune clé `service_role` n'est utilisée côté website — uniquement dans les Edge Functions.

---

## State Management

### Zustand — State client

```typescript
// lib/stores/authStore.ts
interface AuthStore {
  creator: CreatorProfile | null;
  isLoading: boolean;
  setCreator: (creator: CreatorProfile | null) => void;
}

// lib/stores/uiStore.ts
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeWizardStep: number;
  setWizardStep: (step: number) => void;
}
```

### TanStack Query — State serveur

TanStack Query gère le cache des données serveur, les mutations, et les invalidations.

```typescript
// lib/queries/recipes.ts — exemples de query keys
const recipeKeys = {
  all: ['recipes'] as const,
  byCreator: (creatorId: string) => ['recipes', 'creator', creatorId] as const,
  detail: (id: string) => ['recipes', id] as const,
};

// lib/queries/dashboard.ts
const dashboardKeys = {
  stats: (creatorId: string) => ['dashboard', 'stats', creatorId] as const,
  topRecipes: (creatorId: string) => ['dashboard', 'top-recipes', creatorId] as const,
};
```

---

## Multilingue — next-intl

### Configuration

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./i18n.ts');
export default withNextIntl({ /* next config */ });

// i18n.ts
import { getRequestConfig } from 'next-intl/server';
export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### Structure fichiers de traduction

```json
// messages/fr.json (extrait)
{
  "nav": {
    "dashboard": "Tableau de bord",
    "recipes": "Mes recettes",
    "chat": "Messages",
    "settings": "Paramètres"
  },
  "recipe_form": {
    "step1": "Informations de base",
    "step2": "Ingrédients",
    "step3": "Étapes",
    "step4": "Nutrition",
    "step5": "Photos",
    "step6": "Publication"
  },
  "dashboard": {
    "revenue_this_month": "Revenus ce mois",
    "total_consumptions": "Consommations totales",
    "top_recipes": "Meilleures recettes"
  }
}
```

**Règle :** Tout texte visible dans l'interface passe par next-intl. Aucun texte hardcodé.

---

## Variables d'environnement

### `.env.local` (développement)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/akeli/...
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=...

# Feature flags
NEXT_PUBLIC_ENABLE_RECIPES_CATALOG=false   # Catalogue /recipes optionnel V1
```

### Variables Vercel (production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App URLs
NEXT_PUBLIC_SITE_URL=https://a-keli.com
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/...
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/...
```

> **Rappel :** Les clés Gemini, Claude et Stripe ne sont JAMAIS dans les variables Next.js.
> Elles sont exclusivement dans les Edge Functions Supabase.

---

## Design System

### Tokens couleur

```typescript
// tailwind.config.ts
colors: {
  primary: '#9c88ff',     // Violet Akeli
  secondary: '#3bb78f',   // Vert
  accent: '#FF9F1C',      // Orange
  background: '#f1f4f8',  // Fond page
  card: '#ffffff',        // Fond cards
  text: {
    primary: '#1a1a2e',
    secondary: '#6b7280',
    muted: '#9ca3af',
  }
}
```

### Typography

```typescript
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'sans-serif'],  // Google Fonts
},
fontSize: {
  'heading-lg': ['36px', { fontWeight: '700' }],
  'heading-md': ['28px', { fontWeight: '700' }],
  'heading-sm': ['22px', { fontWeight: '600' }],
  'body': ['16px', { lineHeight: '1.6' }],
  'small': ['14px', { lineHeight: '1.5' }],
}
```

### Composants shadcn/ui utilisés

`Button`, `Card`, `Input`, `Textarea`, `Select`, `Dialog`, `Sheet`, `Tabs`,
`Badge`, `Avatar`, `Progress`, `Skeleton`, `Toast`, `Tooltip`,
`DropdownMenu`, `Separator`, `ScrollArea`

---

## SEO

### Pages critiques SEO

**Profil créateur** (`/creator/[username]`) — priorité maximale

```typescript
// app/[locale]/creator/[username]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const creator = await getCreatorByUsername(params.username);
  return {
    title: `${creator.display_name} — Créateur Akeli`,
    description: creator.bio ?? `Découvrez les recettes de ${creator.display_name} sur Akeli.`,
    openGraph: {
      images: [creator.avatar_url],
      type: 'profile',
    },
  };
}
```

**Recette** (`/recipe/[slug]`) — Schema.org partiel

```typescript
// Structured data Schema.org Recipe (teasing)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: recipe.title,
  description: recipe.description,
  image: recipe.cover_image_url,
  author: { '@type': 'Person', name: creator.display_name },
  cookTime: `PT${recipe.cook_time_min}M`,
  nutrition: {
    '@type': 'NutritionInformation',
    calories: `${recipe.macros.calories} cal`,
  },
};
```

### robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /recipes/new
Disallow: /recipes/*/edit
Disallow: /chat
Disallow: /settings
Disallow: /profile
Disallow: /fan-mode
Disallow: /auth

Sitemap: https://a-keli.com/sitemap.xml
```

### sitemap.xml (généré dynamiquement)

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const creators = await getAllPublicCreators();
  const recipes = await getAllPublishedRecipes();

  return [
    { url: 'https://a-keli.com', priority: 1.0 },
    { url: 'https://a-keli.com/creators', priority: 0.9 },
    ...creators.map(c => ({
      url: `https://a-keli.com/creator/${c.username}`,
      priority: 0.8,
    })),
    ...recipes.map(r => ({
      url: `https://a-keli.com/recipe/${r.slug}`,
      priority: 0.6,
    })),
  ];
}
```

---

## Upload Images

### Spécifications techniques

| Type | Formats | Taille max | Dimensions | Bucket Supabase |
|------|---------|------------|------------|-----------------|
| Cover recette | JPEG, PNG, WebP | 5 MB | 1200×800 (ratio 3:2) | `recipe-images` |
| Galerie recette | JPEG, PNG, WebP | 5 MB | Idem | `recipe-images` |
| Avatar créateur | JPEG, PNG | 2 MB | 400×400 (ratio 1:1, crop requis) | `avatars` |

### Chemins Storage

```
recipe-images/
  covers/{recipe_id}/{filename}
  gallery/{recipe_id}/{filename}

avatars/
  creators/{user_id}/{filename}
```

### Flux upload

```
1. Sélection fichier (react-dropzone)
2. Validation format + taille (client)
3. Compression / resize (browser-image-compression)
4. Crop si avatar (react-image-crop)
5. Upload vers Supabase Storage
6. Récupération URL publique
7. Stockage URL dans recipe.cover_image_url ou creator.avatar_url
```

---

## Realtime — Chat créateurs

Le chat utilise Supabase Realtime (websockets). Applicable uniquement dans l'espace créateur authentifié.

```typescript
// Subscription à une conversation
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_message',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Ajouter le message à la liste locale
    addMessage(payload.new as ChatMessage);
  })
  .subscribe();

// Cleanup
return () => { supabase.removeChannel(channel); };
```

**Tables concernées :** `conversation`, `conversation_participant`, `chat_message`
(Voir `V1_DATABASE_SCHEMA.md` section 11 — Communauté & Chat)

---

## Deployment — Vercel

### Configuration `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/creator/:username*",
      "headers": [
        { "key": "Cache-Control", "value": "public, s-maxage=3600, stale-while-revalidate=86400" }
      ]
    }
  ]
}
```

### Région Vercel

`cdg1` (Paris) — proximité avec la majorité des utilisateurs Europe francophone.

### Variables d'environnement Vercel

Configurées dans le dashboard Vercel → Settings → Environment Variables.
Trois environnements : Production, Preview, Development.

### DNS IONOS

```
Type    Nom     Valeur
A       @       76.76.21.21       (IP Vercel)
CNAME   www     cname.vercel-dns.com
```

---

## Décisions techniques website spécifiques

### Rendu — Server vs Client Components

| Type de page | Rendu | Raison |
|--------------|-------|--------|
| Landing page | Server Component (SSG) | SEO, performance |
| Profil public créateur | Server Component (ISR 1h) | SEO critique |
| Détail recette | Server Component (ISR 1h) | SEO |
| Catalogue créateurs | Server Component (SSR) | Filtres dynamiques |
| Dashboard | Client Component | Données temps réel, interactivité |
| Wizard recette | Client Component | Formulaire multi-step, auto-save |
| Chat | Client Component | Realtime websockets |

### Auto-save wizard recette

Le wizard sauvegarde automatiquement toutes les 30 secondes en base (statut `draft`).
Le créateur peut fermer et reprendre à tout moment.

```typescript
// Logique auto-save
useEffect(() => {
  const interval = setInterval(() => {
    if (isDirty) {
      saveDraft(formData);
    }
  }, 30000);
  return () => clearInterval(interval);
}, [formData, isDirty]);
```

### Deep link profil créateur depuis l'app Flutter

Le profil public créateur (`/creator/[username]`) est accessible via deep link depuis l'app Flutter en web view intégrée.

```dart
// Flutter — ouverture profil créateur
final url = 'https://a-keli.com/creator/${creator.username}';
await launchUrl(Uri.parse(url), mode: LaunchMode.inAppWebView);
```

---

## Principes directeurs

1. **Accessibilité universelle** — Fonctionne sur 3G, petits écrans, 8 langues (FR/EN V1, autres phases suivantes)
2. **Mobile-first** — Consultable sur mobile (dashboard, profil), créateur sur desktop
3. **Pas de jugement** — Aucun message condescendant, aucun filtrage éditorial
4. **Sécurité** — Clés API jamais exposées côté client, RLS sur toutes les tables
5. **SEO créateurs** — Le profil créateur est la page SEO la plus importante du site
6. **Simplicité langage** — Textes simples, sans jargon technique

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_ARCHITECTURE_GLOBALE.md` | Architecture système complète (Flutter + Next.js + Supabase) |
| `V1_ARCHITECTURE_DECISIONS.md` | Journal des décisions — fait autorité en cas de contradiction |
| `V1_DATABASE_SCHEMA.md` | Schéma complet 45 tables |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue Edge Functions Supabase |
| `V1_SCOPE_FINAL_VALIDE.md` | Scope V1 validé — référence périmètre |
| `V1_WEBSITE_TROIS_SURFACES.md` | Architecture trois surfaces (Public, Découverte, Créateur) |
| `V1_WEBSITE_QUESTIONS_SUSPENS.md` | Décisions tranchées — questions V1 résolues |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Architecture Technique Website V1*
