# Akeli V1 — Spécifications Pages Website

> Specs détaillées de chaque page du website.
> Couvre les trois surfaces : Publique, Découverte, Espace Créateur.
> À lire avec `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` et `V1_WEBSITE_DATABASE_COMPLETE.md`.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## Index des pages

### Surface Publique
1. [Landing Page (`/`)](#1-landing-page-)
2. [À Propos (`/about`)](#2-à-propos-about)
3. [CGU (`/legal/terms`)](#3-cgu-legalterms)
4. [Politique de confidentialité (`/legal/privacy`)](#4-politique-de-confidentialité-legalprivacy)
5. [Mentions légales (`/legal/mentions`)](#5-mentions-légales-legalmentions)

### Surface Découverte
6. [Catalogue Créateurs (`/creators`)](#6-catalogue-créateurs-creators)
7. [Profil Public Créateur (`/creator/[username]`)](#7-profil-public-créateur-creatorusername)
8. [Catalogue Recettes (`/recipes`)](#8-catalogue-recettes-recipes)
9. [Détail Recette (`/recipe/[slug]`)](#9-détail-recette-recipeslug)

### Auth
10. [Login (`/auth/login`)](#10-login-authlogin)
11. [Signup (`/auth/signup`)](#11-signup-authsignup)
12. [Callback OAuth (`/auth/callback`)](#12-callback-oauth-authcallback)

### Espace Créateur
13. [Page Bienvenue (onboarding)](#13-page-bienvenue-onboarding)
14. [Dashboard (`/dashboard`)](#14-dashboard-dashboard)
15. [Liste Recettes (`/recipes`)](#15-liste-recettes-creator-recipes)
16. [Créer Recette — Wizard (`/recipes/new`)](#16-créer-recette--wizard-recipesnew)
17. [Éditer Recette (`/recipes/[id]/edit`)](#17-éditer-recette-recipesidedit)
18. [Chat — Liste Conversations (`/chat`)](#18-chat--liste-conversations-chat)
19. [Chat — Conversation (`/chat/[id]`)](#19-chat--conversation-chatid)
20. [Mode Fan (`/fan-mode`)](#20-mode-fan-fan-mode)
21. [Profil & Édition (`/profile`)](#21-profil--édition-profile)
22. [Paramètres (`/settings`)](#22-paramètres-settings)

---

## Conventions de lecture

**Rendu :** SSG = Static Site Generation, ISR = Incremental Static Regeneration, SSR = Server Side Rendering, CSR = Client Side Rendering

**API calls :** notation Supabase directe ou `.rpc()` pour fonctions SQL

**Zod schema :** validation formulaire côté client

---

## SURFACE PUBLIQUE

---

### 1. Landing Page (`/`)

**Rendu :** SSG (revalidation quotidienne)  
**Auth :** Non requise  
**SEO :** Priorité maximale — title "Akeli — Mangez comme vous êtes"

#### Sections

**Section 1 — Hero Utilisateurs**
```
Headline :  "Mangez comme vous êtes."
Sous-titre : "Un plan alimentaire qui respecte votre cuisine, pas l'inverse."
CTA primaire : [Télécharger l'app] → App Store / Play Store
CTA secondaire : [Voir comment ça marche ↓]
Visuel : Photo lifestyle diaspora (cuisine traditionnelle moderne)
```

**Section 2 — Pour qui ?**
```
3 profils visuels avec icône + titre court :
• "Tu veux manger équilibré sans renoncer à ta cuisine"
• "Tu suis un objectif fitness mais ta cuisine te manque"
• "Tu veux planifier tes repas sans perdre tes habitudes"
Pas de texte long — visuels + 1 phrase chacun
```

**Section 3 — Comment ça marche**
```
3 étapes numérotées :
1. Tu définis ton profil (objectifs, préférences)
2. Akeli construit ton plan alimentaire avec TES recettes
3. Tu manges. Tu suis. Tu progresses.
```

**Section 4 — Prix**
```
Transparent et simple :
"3€/mois. Annulable à tout moment."
[Télécharger l'app gratuitement]
Note : "Premier mois offert" si applicable
```

**Section 5 — Section Créateurs (pitch court)**
```
Titre : "Tu cuisines ? Partage et gagne."
2-3 phrases sur le modèle créateur
Chiffre clé : "€1 pour 90 consommations. Sans seuil minimum."
CTA : [Devenir créateur →] → /auth/signup
```

**Section 6 — Footer**
```
Logo Akeli
Liens : À propos · CGU · Confidentialité · Mentions légales
Liens app : App Store · Google Play
Copyright
```

#### Composants
- `HeroUsers` — hero principal
- `HowItWorks` — 3 étapes
- `PricingSimple` — prix
- `HeroCreators` — pitch créateurs court
- `AppDownloadCTA` — boutons téléchargement
- `Footer`

#### Supabase queries
Aucune — page statique.

---

### 2. À Propos (`/about`)

**Rendu :** SSG  
**Auth :** Non requise  
**SEO :** title "À propos — Akeli"

#### Contenu
```
Titre : "Nos modes de vie ont changé. Akeli aide ta cuisine à s'adapter."

Paragraphe 1 — Le constat
Les pratiques alimentaires de la diaspora africaine en Europe
ont évolué avec les rythmes de vie modernes.
Akeli part de ce constat sans jugement.

Paragraphe 2 — L'approche
Pas de régime. Pas de rupture culturelle.
Un outil qui prend ta cuisine telle qu'elle est
et l'adapte à tes objectifs du moment.

Paragraphe 3 — Le modèle créateur
Ceux qui détiennent le savoir culinaire sont partout.
Akeli les connecte à ceux qui en ont besoin.

CTA → Télécharger l'app
```

**Ton :** Calme, factuel, sans prosélytisme, sans négation des pratiques existantes.

#### Composants
- `PageHeader` — titre + sous-titre
- `TextSection` — paragraphes
- `AppDownloadCTA`

---

### 3. CGU (`/legal/terms`)

**Rendu :** SSG  
**Auth :** Non requise

Contenu légal statique. Fichier Markdown ou composant JSX statique.
Sections standards : objet, accès, compte, utilisation, propriété intellectuelle, résiliation, loi applicable.

---

### 4. Politique de confidentialité (`/legal/privacy`)

**Rendu :** SSG  
**Auth :** Non requise

Conforme RGPD. Sections : données collectées, finalités, durée conservation, droits utilisateurs (accès, rectification, suppression), contact DPO.

---

### 5. Mentions légales (`/legal/mentions`)

**Rendu :** SSG  
**Auth :** Non requise

Éditeur, hébergeur (Vercel), directeur de publication.

---

## SURFACE DÉCOUVERTE

---

### 6. Catalogue Créateurs (`/creators`)

**Rendu :** SSR (filtres dynamiques)  
**Auth :** Non requise  
**SEO :** title "Créateurs Akeli — Découvrez nos cuisiniers"

#### Layout
```
Navbar (publique)
├── Header : "Découvrez nos créateurs"
├── Barre filtres :
│   ├── Recherche (nom créateur)
│   ├── Filtre région culinaire (dropdown)
│   └── Filtre spécialité (dropdown)
├── Grid créateurs (3 colonnes desktop, 2 tablette, 1 mobile)
│   └── CreatorCard × N
├── Pagination (20 par page)
└── Footer
```

#### `CreatorCard` — contenu
```
Avatar (60px)
Nom affiché
Badge "Mode Fan disponible" (si is_fan_eligible = true)
Bio courte (80 chars max, tronquée)
Région culinaire
Stat : X recettes
→ Link vers /creator/[username]
```

#### Supabase query
```typescript
const { data: creators } = await supabase
  .from('creator')
  .select(`
    id, username, display_name, bio, avatar_url,
    recipe_count, is_fan_eligible, specialty_codes,
    food_region:region(name_fr, name_en)
  `)
  .eq('username', 'not.is.null')   // Uniquement créateurs avec username
  .gte('recipe_count', 1)          // Au moins 1 recette publiée
  .order('recipe_count', { ascending: false })
  .range(offset, offset + 19);

// Avec filtres optionnels :
// .ilike('display_name', `%${search}%`)
// .contains('specialty_codes', [specialty])
```

#### State (Zustand / local)
```typescript
interface CreatorsPageState {
  search: string;
  regionFilter: string | null;
  specialtyFilter: string | null;
  page: number;
}
```

---

### 7. Profil Public Créateur (`/creator/[username]`)

**Rendu :** ISR (revalidation 1 heure)  
**Auth :** Non requise  
**SEO :** Critique — profil créateur complet indexé

#### Metadata dynamique
```typescript
export async function generateMetadata({ params }) {
  const creator = await getCreatorByUsername(params.username);
  return {
    title: `${creator.display_name} — Créateur Akeli`,
    description: creator.bio ?? `Recettes de ${creator.display_name} sur Akeli.`,
    openGraph: {
      title: `${creator.display_name} sur Akeli`,
      images: [creator.avatar_url],
      type: 'profile',
    },
  };
}
```

#### Layout
```
Navbar (publique)
├── HEADER CRÉATEUR
│   ├── Avatar (120px) + Nom + Badge vérifié (si is_verified)
│   ├── Bio (250 chars)
│   ├── Spécialités (badges)
│   ├── Badge "Mode Fan disponible" (si is_fan_eligible)
│   ├── Stats : X recettes · Y consommations
│   └── Réseaux sociaux (icônes → liens externes)
│
├── CTA STICKY (desktop: sidebar droite / mobile: bas de page)
│   "Accède à toutes les recettes de [Nom]"
│   [📱 Télécharger l'app Akeli]
│
├── GRID RECETTES (aperçu uniquement)
│   └── RecipePreviewCard × N (max 12)
│       ├── Image cover
│       ├── Titre
│       ├── Temps total + Calories
│       └── Difficulté
│   → Link vers /recipe/[slug]
│
└── Footer
```

#### `RecipePreviewCard` — contenu affiché
```
✅ Image cover (aspect ratio 3:2)
✅ Titre
✅ Temps (prep + cuisson)
✅ Calories (si macros disponibles)
✅ Difficulté (badge easy/medium/hard)
❌ PAS d'ingrédients
❌ PAS d'étapes
```

#### Supabase query
```typescript
// Via fonction SQL (voir V1_WEBSITE_DATABASE_COMPLETE.md)
const { data: creator } = await supabase
  .rpc('get_creator_by_username', { p_username: username });

// Retourne : creator + recipes_preview (12 recettes aperçu)
```

#### generateStaticParams (ISR)
```typescript
export async function generateStaticParams() {
  const { data: creators } = await supabase
    .from('creator')
    .select('username')
    .not('username', 'is', null);
  return creators.map(c => ({ username: c.username }));
}
```

---

### 8. Catalogue Recettes (`/recipes`)

**Rendu :** SSR  
**Auth :** Non requise  
**SEO :** title "Recettes Akeli — Découvrez la cuisine de la diaspora"

#### Layout
```
Navbar (publique)
├── Header : "Recettes"
├── Barre filtres :
│   ├── Recherche (titre recette)
│   ├── Région culinaire
│   ├── Temps (< 30min / 30-60min / > 60min)
│   └── Tags (multi-select)
├── Grid recettes (aperçu) — 3 col desktop
│   └── RecipePreviewCard × N
├── Pagination (24 par page)
└── CTA téléchargement (sticky bas mobile)
```

#### Supabase query
```typescript
const { data: recipes } = await supabase
  .from('recipe')
  .select(`
    id, slug, title, cover_image_url,
    prep_time_min, cook_time_min, difficulty,
    creator:creator_id(display_name, username, avatar_url),
    macros:recipe_macro(calories)
  `)
  .eq('is_published', true)
  .order('created_at', { ascending: false })
  .range(offset, offset + 23);
```

---

### 9. Détail Recette (`/recipe/[slug]`)

**Rendu :** ISR (revalidation 1 heure)  
**Auth :** Non requise  
**SEO :** Schema.org Recipe partiel

#### Layout
```
Navbar (publique)
├── IMAGE COVER (pleine largeur, aspect 16:9)
│
├── HEADER RECETTE
│   ├── Titre (H1)
│   ├── Description (150 chars max)
│   ├── Par : [Avatar] @username → /creator/[username]
│   ├── Tags (badges)
│   └── Stats : Temps · Difficulté · Portions
│
├── MACROS (si disponibles)
│   ├── Calories · Protéines · Glucides · Lipides
│   └── Note : "Par portion"
│
├── TEASING INGRÉDIENTS
│   "Ingrédients principaux :"
│   • Ingrédient 1
│   • Ingrédient 2
│   • Ingrédient 3
│   "... et X autres ingrédients"
│   [Voir la recette complète →]
│
├── CTA MASSIF (card mis en avant)
│   "Cette recette est disponible uniquement dans l'app Akeli"
│   [📱 Télécharger sur l'App Store]
│   [▶ Télécharger sur Google Play]
│   ──────────────────────────────
│   "Découvre aussi les autres recettes de @[username]"
│   [→ Voir son profil]
│
└── Footer
```

#### Structured data Schema.org
```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: recipe.title,
  description: recipe.description,
  image: recipe.cover_image_url,
  author: {
    '@type': 'Person',
    name: creator.display_name,
    url: `https://a-keli.com/creator/${creator.username}`,
  },
  prepTime: `PT${recipe.prep_time_min}M`,
  cookTime: `PT${recipe.cook_time_min}M`,
  recipeYield: `${recipe.servings} portion(s)`,
  nutrition: recipe.macros ? {
    '@type': 'NutritionInformation',
    calories: `${recipe.macros.calories} cal`,
    proteinContent: `${recipe.macros.protein_g}g`,
    carbohydrateContent: `${recipe.macros.carbs_g}g`,
    fatContent: `${recipe.macros.fat_g}g`,
  } : undefined,
};
```

#### Supabase query
```typescript
const { data: recipe } = await supabase
  .from('recipe')
  .select(`
    id, slug, title, description, cover_image_url,
    prep_time_min, cook_time_min, servings, difficulty,
    creator:creator_id(display_name, username, avatar_url),
    macros:recipe_macro(calories, protein_g, carbs_g, fat_g),
    tags:recipe_tag(tag:tag_id(name_fr, name_en)),
    ingredients:recipe_ingredient(
      ingredient:ingredient_id(name_fr, name_en),
      sort_order
    )
  `)
  .eq('slug', slug)
  .eq('is_published', true)
  .single();

// Note : on charge les ingrédients pour afficher les 3 premiers uniquement
// Les étapes ne sont PAS chargées (hors scope teasing)
```

---

## AUTH

---

### 10. Login (`/auth/login`)

**Rendu :** CSR  
**Auth :** Redirige vers /dashboard si déjà connecté

#### Layout
```
Logo Akeli centré
Titre : "Connexion créateur"
──────────────────────
Input : Email
Input : Mot de passe
[Se connecter]
──────────────────────
[Continuer avec Google]
──────────────────────
Lien : "Pas encore créateur ? Créer un compte"
Lien : "Mot de passe oublié ?"
```

#### Zod schema
```typescript
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});
```

#### Auth flow
```typescript
// Email / password
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) showError(error.message);
else router.push('/dashboard');

// Google OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` },
});
```

---

### 11. Signup (`/auth/signup`)

**Rendu :** CSR  
**Auth :** Redirige vers /dashboard si déjà connecté

#### Layout
```
Logo Akeli centré
Titre : "Devenir créateur Akeli"
Sous-titre : "Gratuit · Immédiat · Aucune validation manuelle"
──────────────────────
Input : Prénom
Input : Nom
Input : Email
Input : Mot de passe (min 8 chars)
Input : Confirmer mot de passe
Input : Username (unique, format: a-z0-9_-)
  → Vérification disponibilité en temps réel
──────────────────────
Checkbox : "J'accepte les CGU et la politique de confidentialité"
[Créer mon compte créateur]
──────────────────────
[Continuer avec Google]
──────────────────────
Lien : "Déjà créateur ? Se connecter"
```

#### Zod schema
```typescript
const signupSchema = z.object({
  first_name: z.string().min(2, 'Prénom requis'),
  last_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string(),
  username: z.string()
    .min(3, 'Minimum 3 caractères')
    .max(30, 'Maximum 30 caractères')
    .regex(/^[a-z0-9_-]+$/, 'Lettres minuscules, chiffres, _ et - uniquement'),
  terms_accepted: z.boolean().refine(v => v === true, 'Vous devez accepter les CGU'),
}).refine(d => d.password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
});
```

#### Signup flow
```typescript
// 1. Créer le compte Supabase Auth
const { data, error } = await supabase.auth.signUp({ email, password });
if (error) { showError(error.message); return; }

// 2. Edge Function : create-creator-profile
// (crée creator + creator_balance + conversation support + is_creator = true)
const { error: profileError } = await supabase.functions.invoke('create-creator-profile', {
  body: { first_name, last_name, username, display_name: `${first_name} ${last_name}` }
});

// 3. Redirect vers /dashboard (page Bienvenue si premier login)
router.push('/dashboard');
```

#### Vérification username disponibilité (debounce 500ms)
```typescript
const checkUsername = async (username: string) => {
  const { data } = await supabase
    .from('creator')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  return data === null; // true = disponible
};
```

---

### 12. Callback OAuth (`/auth/callback`)

**Rendu :** SSR  
Échange le code OAuth contre une session Supabase.

```typescript
// app/[locale]/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

---

## ESPACE CRÉATEUR (Authentifié)

Layout commun : Sidebar fixe (280px) + zone contenu principale.

#### Sidebar — navigation
```
[Logo Akeli]
──────────────────
[📊 Dashboard]        → /dashboard
[📝 Mes recettes]     → /recipes
[💬 Messages]         → /chat  (badge nb non-lus)
[⭐ Mode Fan]         → /fan-mode
[👤 Mon profil]       → /profile
[⚙️ Paramètres]      → /settings
──────────────────
[Déconnexion]
──────────────────
Avatar + Nom créateur
```

---

### 13. Page Bienvenue (Onboarding)

**Affiché :** Uniquement au premier login (`onboarding_done = false` dans `user_profile`)  
**Rendu :** CSR

#### Layout
```
Logo Akeli (centré)
──────────────────────────────────────
"Bienvenue, [Prénom] ! 🎉"
"Ton compte créateur est prêt."
──────────────────────────────────────
CTA PRINCIPAL (card violet)
  "Crée ta première recette"
  "Commence à partager ton savoir culinaire"
  [→ Créer une recette]

ACTIONS SECONDAIRES (cards petites)
  [📊 Voir mon dashboard]
  [👤 Compléter mon profil]
  [💬 Rejoindre la communauté]
──────────────────────────────────────
"Tu peux commencer dans n'importe quel ordre."
```

#### Logique
```typescript
// Après clic sur n'importe quelle action :
await supabase
  .from('user_profile')
  .update({ onboarding_done: true })
  .eq('id', userId);
// Cette page ne s'affichera plus
```

---

### 14. Dashboard (`/dashboard`)

**Rendu :** CSR (données temps réel)  
**Auth :** Requise + is_creator = true

#### Logique progressive (décision Q7)
```
recipe_count < 10  → Vue Simple
recipe_count ≥ 10  → Vue Avancée (graphiques débloqués)
```

#### Layout — Vue Simple (< 10 recettes)
```
Header : "Bonjour, [Prénom]"
──────────────────────────────────────
CARDS STATS (3 colonnes)
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Revenus mois │ │ Consomma-    │ │ Mes recettes │
  │    X€        │ │ tions : Y    │ │    Z publiées│
  └──────────────┘ └──────────────┘ └──────────────┘

TOP 3 RECETTES (liste simple)
  1. [Cover] Titre recette — X consommations — Y€
  2. ...
  3. ...

PROGRESSION VERS MODE FAN (si < 30 recettes)
  "Il te manque X recettes pour activer le Mode Fan"
  Progress bar : Z/30
  [→ Créer une recette]

BOUTON IA
  [💬 Explique-moi mes stats]  → ouvre panel Claude Sonnet
```

#### Layout — Vue Avancée (≥ 10 recettes)
```
Header : "Bonjour, [Prénom]"
──────────────────────────────────────
CARDS STATS (4 colonnes)
  Revenus mois · Revenus mois précédent · Consommations · Fans

GRAPHIQUE ÉVOLUTION REVENUS (6 derniers mois)
  Barres mensuelles — fan_revenue vs consumption_revenue

TOP 5 RECETTES (tableau)
  Titre · Consommations · Revenus générés · Taux favoris

PANEL MODE FAN (si is_fan_eligible)
  Nb fans actifs · Revenus fans ce mois · Graphique évolution

BOUTON IA
  [💬 Explique-moi mes stats]  → ouvre panel Claude Sonnet
```

#### Panel IA — Claude Sonnet
```
Drawer latéral (desktop) / Bottom sheet (mobile)
Titre : "Analyse de tes performances"
──────────────────────────────────────
[Loading state pendant appel API]

Réponse texte de Claude Sonnet :
  "Ce mois-ci, tes recettes ont été consommées 45 fois...
   Ta recette [Nom] performe particulièrement bien car..."

Suggestions actionnables :
  • "Publie une recette ce dimanche soir..."
  • "Tes recettes rapides (< 30min) sont..."

[🔄 Régénérer l'analyse]
[✕ Fermer]
```

#### Supabase queries
```typescript
// Stats dashboard via vue
const { data: stats } = await supabase
  .from('creator_dashboard_stats')
  .select('*')
  .eq('creator_id', creatorId)
  .single();

// Appel IA via Edge Function
const { data: insight } = await supabase.functions.invoke('explain-creator-stats', {
  body: { creator_id: creatorId }
});
```

---

### 15. Liste Recettes Créateur (`/recipes`)

**Rendu :** CSR  
**Auth :** Requise + is_creator = true

#### Layout
```
Header : "Mes recettes"
CTA : [+ Nouvelle recette]
──────────────────────────────────────
FILTRES (barre horizontale)
  Statut : Tous · Publiées · Brouillons
  Recherche : input texte
  Région : dropdown
  Tri : Plus récentes · Plus consommées

LISTE RECETTES (tableau ou cards)
  Pour chaque recette :
  ┌─────────────────────────────────────────────────────────┐
  │ [Cover 80px] Titre               Statut badge           │
  │              Région · Difficulté  Consommations : X     │
  │              Publiée le JJ/MM/AA  Revenus : Y€          │
  │              [Éditer] [Dupliquer] [Dépublier/Publier]   │
  └─────────────────────────────────────────────────────────┘

Si 0 recettes :
  Empty state avec CTA "Créer ta première recette"
```

#### Actions recette
- **Éditer** → `/recipes/[id]/edit`
- **Dupliquer** → crée un brouillon copie, redirect vers edit
- **Dépublier** → `is_published = false` (confirmation dialog)
- **Publier** → `is_published = true` (déclenche traduction Gemini)
- **Supprimer** → confirmation + DELETE (si 0 consommations uniquement)

#### Supabase query
```typescript
const { data: recipes } = await supabase
  .from('recipe')
  .select(`
    id, slug, title, cover_image_url, is_published,
    region, difficulty, created_at,
    macros:recipe_macro(calories)
  `)
  .eq('creator_id', creatorId)
  .order('created_at', { ascending: false });

// Stats consommations par recette
const { data: stats } = await supabase
  .from('meal_consumption')
  .select('recipe_id, count(*)')
  .eq('creator_id', creatorId)
  .group('recipe_id');
```

---

### 16. Créer Recette — Wizard (`/recipes/new`)

**Rendu :** CSR  
**Auth :** Requise + is_creator = true  
**Feature clé :** Auto-save 30s · IA correction · Navigation tabs + next/prev

#### Structure Wizard

```
PROGRESS BAR (6 steps)
○──●──○──○──○──○
1  2  3  4  5  6

TABS CLIQUABLES (desktop)
[1. Infos] [2. Ingrédients] [3. Étapes] [4. Nutrition] [5. Photos] [6. Publication]

CONTENU STEP (zone centrale)

NAVIGATION BAS DE PAGE
[← Précédent]   Auto-save indicator   [Suivant →]
                 "Sauvegardé il y a 23s"
```

#### Step 1 — Infos de base

```
Titre *
  Input texte (max 80 chars)
  IA correction : soulignement rouge si faute détectée
  Suggestion IA : tooltip avec correction proposée

Description
  Textarea (max 300 chars)
  Compteur chars restants

Région culinaire *
  Select → food_region table

Type de repas *
  Multi-select : Petit-déjeuner · Déjeuner · Dîner · Snack

Difficulté *
  Radio : Facile · Moyen · Difficile

Temps de préparation *
  Input numérique (minutes)

Temps de cuisson
  Input numérique (minutes, optionnel)

Nombre de portions *
  Input numérique (min 1)
```

**Zod schema Step 1 :**
```typescript
const step1Schema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(300).optional(),
  region: z.string().min(1, 'Région requise'),
  meal_types: z.array(z.string()).min(1, 'Au moins un type de repas'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prep_time_min: z.number().int().min(1).max(480),
  cook_time_min: z.number().int().min(0).max(480).optional(),
  servings: z.number().int().min(1).max(50),
});
```

---

#### Step 2 — Ingrédients

```
LISTE INGRÉDIENTS (dynamique)
  ┌────────────────────────────────────────────────────┐
  │ ☰  [Autocomplete ingrédient]  [Quantité] [Unité]  │
  │ ☰  ...                                             │
  │ ☰  ...                                             │
  └────────────────────────────────────────────────────┘

Desktop : ☰ = drag handle (drag & drop)
Mobile  : boutons ↑ ↓ au lieu du drag handle

[+ Ajouter un ingrédient]

Si ingrédient non trouvé dans autocomplete :
  "Ingrédient non trouvé ?"
  [Soumettre un nouvel ingrédient]
  → Modal : nom + catégorie hint + notes
  → Crée ingredient_submission + ingredient (status: pending)
  → L'ingrédient pending est utilisable immédiatement par CE créateur
```

**Autocomplete ingrédient :**
```typescript
// Cherche dans ingrédients validés + pending du créateur
const { data: ingredients } = await supabase
  .from('ingredient')
  .select('id, name_fr, name_en, category')
  .or(`status.eq.validated,and(status.eq.pending,id.in.(${creatorPendingIds}))`)
  .ilike('name_fr', `%${query}%`)
  .limit(10);
```

**Zod schema Step 2 :**
```typescript
const step2Schema = z.object({
  ingredients: z.array(z.object({
    ingredient_id: z.string().uuid(),
    quantity: z.number().positive(),
    unit: z.string(),
    is_optional: z.boolean().default(false),
    sort_order: z.number().int(),
  })).min(3, 'Minimum 3 ingrédients'),
});
```

---

#### Step 3 — Étapes de préparation

```
LISTE ÉTAPES (dynamique)
  ┌────────────────────────────────────────────────────┐
  │ ☰  Étape 1                                         │
  │    [Textarea — instruction]                        │
  │    IA : "Corriger" | "Ignorer"                     │
  ├────────────────────────────────────────────────────┤
  │ ☰  Étape 2                                         │
  │    [Textarea]                                      │
  └────────────────────────────────────────────────────┘

Desktop : drag & drop
Mobile  : boutons ↑ ↓

[+ Ajouter une étape]
```

**IA correction en temps réel (debounce 2s) :**
```typescript
// Appel Edge Function avec le texte de l'étape
const { data: correction } = await supabase.functions.invoke('gemini-correct-text', {
  body: { text: stepContent, language: creatorLocale }
});

// Si correction suggérée : affiche widget non-bloquant
// [Texte original] → [Suggestion IA]
// [Accepter] [Ignorer]
```

**Zod schema Step 3 :**
```typescript
const step3Schema = z.object({
  steps: z.array(z.object({
    content: z.string().min(10, 'Étape trop courte'),
    sort_order: z.number().int(),
  })).min(3, 'Minimum 3 étapes'),
});
```

---

#### Step 4 — Nutrition

```
CALCUL AUTO (si ingrédients validés)
  "Valeurs calculées automatiquement"
  Calories : X kcal / portion
  Protéines : X g
  Glucides : X g
  Lipides : X g
  Fibres : X g

  Si ingrédients pending :
  ⚠️ "X ingrédient(s) en attente de validation.
      Les macros seront affinées après validation par Akeli."

OVERRIDE MANUEL (toggle)
  "Saisir les valeurs manuellement"
  → Champs numériques modifiables
  → Override enregistré (is_auto = false dans recipe_macro)

OPTIONNEL : Ne pas renseigner les macros
  → Recette publiée sans macros (acceptable)
  → Warning non-bloquant : "Sans macros, ta recette sera moins bien recommandée"
```

**Appel fonction SQL :**
```typescript
const { data: macros } = await supabase
  .rpc('calculate_recipe_macros', { p_recipe_id: draftRecipeId });
// Retourne calories, protein_g, carbs_g, fat_g + macros_complete flag
```

---

#### Step 5 — Images

```
IMAGE COVER (obligatoire)
  Zone drag & drop (react-dropzone)
  "Glisse ton image ici ou clique pour choisir"
  Formats : JPEG, PNG, WebP · Max 5MB · Ratio recommandé 3:2
  Preview avec crop si ratio incorrect
  [Changer l'image]

GALERIE (optionnel, max 5 images)
  Grid de zones d'upload
  Réorganisation par drag & drop
  [+ Ajouter une photo]
```

**Upload flow :**
```typescript
// 1. Compress image
const compressed = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
});

// 2. Upload vers Supabase Storage
const filename = `${Date.now()}-${file.name}`;
const { data } = await supabase.storage
  .from('recipe-images')
  .upload(`covers/${recipeId}/${filename}`, compressed);

// 3. Récupérer URL publique
const { data: { publicUrl } } = supabase.storage
  .from('recipe-images')
  .getPublicUrl(`covers/${recipeId}/${filename}`);

// 4. Sauvegarder URL dans draft
updateDraftField('cover_image_url', publicUrl);
```

---

#### Step 6 — Tags & Publication

```
TAGS
  Multi-select (chips) depuis table tag
  Max 8 tags
  Recherche dans les tags

OPTIONS
  ☐ Sans porc (filtre dietary restriction)

PREVIEW
  Card aperçu de la recette (comme apparaîtra publiquement)
  Toggle : "Vue publique" / "Vue créateur"

ACTIONS
  [Sauvegarder en brouillon]   → is_published = false
  [Publier la recette]          → is_published = true
                                → Déclenche traduction Gemini (Edge Function)
                                → Déclenche calcul recipe_vector (marque pending)
```

**Publication flow :**
```typescript
// 1. Sauvegarder tous les steps en base
await saveRecipeComplete(recipeData);

// 2. Publier
await supabase.from('recipe').update({ is_published: true }).eq('id', recipeId);

// 3. Déclencher traduction asynchrone (non-bloquant)
supabase.functions.invoke('translate-recipe', { body: { recipe_id: recipeId } });

// 4. Redirect vers liste recettes avec toast succès
router.push('/recipes');
toast.success('Recette publiée ! Traduction en cours...');
```

#### Auto-save logic
```typescript
// Auto-save toutes les 30 secondes
// Sauvegarde dans recipe.draft_data (jsonb) + tables si recette déjà créée
useEffect(() => {
  const timer = setInterval(async () => {
    if (isDirty) {
      await saveDraft(formState);
      setLastSaved(new Date());
      setIsDirty(false);
    }
  }, 30000);
  return () => clearInterval(timer);
}, [formState, isDirty]);
```

---

### 17. Éditer Recette (`/recipes/[id]/edit`)

**Rendu :** CSR  
**Auth :** Requise + propriétaire de la recette

Identique au wizard création (Step 1 à 6), pré-rempli avec les données existantes.

```typescript
// Chargement initial
const { data: recipe } = await supabase
  .from('recipe')
  .select('*, recipe_ingredient(*), recipe_macro(*), recipe_image(*), recipe_tag(*)')
  .eq('id', recipeId)
  .eq('creator_id', creatorId) // Sécurité : vérifie propriétaire
  .single();
```

Différences vs création :
- Pas de page Bienvenue après sauvegarde
- Bouton "Voir la recette publique" si publiée
- Si modifications sur recette publiée → re-déclenche traduction Gemini

---

### 18. Chat — Liste Conversations (`/chat`)

**Rendu :** CSR (Realtime)  
**Auth :** Requise + is_creator = true

#### Layout
```
Header : "Messages"
CTA : [+ Nouveau message] · [+ Créer un groupe]
──────────────────────────────────────────────
BARRE RECHERCHE conversations

SECTIONS LISTE
  PRIVÉS
  ┌─────────────────────────────────────────────┐
  │ [Avatar] Nom Créateur      Hier 14:32        │
  │          Dernier message (80 chars)    [3]  │
  └─────────────────────────────────────────────┘

  GROUPES
  ┌─────────────────────────────────────────────┐
  │ [Icon] Nom Groupe          Aujourd'hui      │
  │        Dernier message                 [1]  │
  └─────────────────────────────────────────────┘

  SUPPORT AKELI
  ┌─────────────────────────────────────────────┐
  │ [Logo] Support Akeli                        │
  │        Bienvenue ! Comment puis-je...       │
  └─────────────────────────────────────────────┘
```

#### Supabase query
```typescript
const { data: conversations } = await supabase
  .from('conversation')
  .select(`
    id, type, name, updated_at,
    participants:conversation_participant(
      user_id,
      last_read_at,
      profile:user_id(display_name, avatar_url)
    ),
    last_message:chat_message(content, sent_at, sender_id)
  `)
  .in('id', userConversationIds)
  .order('updated_at', { ascending: false });
```

#### Realtime subscription (badge non-lus)
```typescript
supabase.channel('new-messages')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'chat_message',
  }, () => { refetchConversations(); })
  .subscribe();
```

---

### 19. Chat — Conversation (`/chat/[id]`)

**Rendu :** CSR (Realtime)  
**Auth :** Requise + participant de la conversation

#### Layout
```
HEADER
  [← Retour] Avatar + Nom/Titre groupe · [Info]

ZONE MESSAGES (scroll infini vers le haut)
  ┌─────────────────────────────────────────────┐
  │                        [Avatar] Nom          │
  │                        Bonjour !    14:30    │
  │                                              │
  │ [Avatar] Moi                                 │
  │ Salut, comment vas-tu ?          14:31       │
  │                                              │
  │         ··· [Nom] est en train d'écrire...  │
  └─────────────────────────────────────────────┘

BARRE SAISIE
  [📎 Image] [Input message...] [Envoyer]
```

#### Realtime messages
```typescript
// Subscription messages
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'chat_message',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    addMessage(payload.new as ChatMessage);
    markAsRead();
  })
  .subscribe();

// Typing indicator (broadcast — pas stocké en DB)
const typingChannel = supabase.channel(`typing:${conversationId}`);
typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
  setTypingUsers(payload.user_id);
}).subscribe();

// Envoi message
const sendMessage = async (content: string) => {
  // Optimistic update
  addMessageOptimistic({ content, sender_id: userId, sent_at: new Date() });

  await supabase.from('chat_message').insert({
    conversation_id: conversationId,
    sender_id: userId,
    content,
    message_type: 'text',
  });
};
```

#### Chargement messages paginé
```typescript
const { data: messages } = await supabase
  .from('chat_message')
  .select(`
    id, content, message_type, sent_at,
    sender:sender_id(display_name, avatar_url)
  `)
  .eq('conversation_id', conversationId)
  .order('sent_at', { ascending: false })
  .range(0, 49); // 50 messages par page, scroll infini
```

---

### 20. Mode Fan (`/fan-mode`)

**Rendu :** CSR  
**Auth :** Requise + is_creator = true

#### Layout — Créateur non éligible (< 30 recettes)
```
Header : "Mode Fan"
──────────────────────────────────────────────
CARD INCITATIF
  Icône ⭐
  "Le Mode Fan te permet de gagner 1€/mois par fan"

  PROGRESSION
  "Il te manque X recettes"
  Progress bar : Z / 30 recettes
  [→ Créer une recette]

  EXPLICATION
  "Avec 30 recettes publiées, tes fans peuvent
   t'allouer 1€/mois directement.
   C'est un revenu garanti, chaque mois."
```

#### Layout — Créateur éligible (≥ 30 recettes)
```
Header : "Mode Fan ⭐"
Badge : "Éligible"
──────────────────────────────────────────────
STATS MODE FAN
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Fans actifs  │ │ Revenus fans │ │ Revenus fans │
  │    X         │ │  ce mois  Y€ │ │  total   Z€  │
  └──────────────┘ └──────────────┘ └──────────────┘

GRAPHIQUE ÉVOLUTION FANS (6 mois)

LISTE FANS RÉCENTS
  (anonymisée — pas de données personnelles)
  "Fan depuis [mois/année]" × N

EXPLICATION MODÈLE
  "Chaque fan t'alloue 1€/mois.
   90% de leurs recettes viendront de ton catalogue.
   Revenu garanti, versé le 1er de chaque mois."
```

#### Supabase query
```typescript
const { data: fanStats } = await supabase
  .from('creator_dashboard_stats')
  .select('fan_count, monthly_history, recipe_count, is_fan_eligible')
  .eq('creator_id', creatorId)
  .single();

const { data: fans } = await supabase
  .from('fan_subscription')
  .select('effective_from, status')
  .eq('creator_id', creatorId)
  .eq('status', 'active')
  .order('effective_from', { ascending: false });
```

---

### 21. Profil & Édition (`/profile`)

**Rendu :** CSR  
**Auth :** Requise + is_creator = true

#### Layout
```
TABS
  [Mon profil public] [Éditer]

TAB — MON PROFIL PUBLIC
  Preview iframe ou composant React du profil public
  Lien : "Voir mon profil public →" (a-keli.com/creator/[username])
  [📋 Copier le lien]

TAB — ÉDITER
  AVATAR
    Image actuelle (120px rond)
    [Changer l'avatar] → Upload + crop 1:1

  INFORMATIONS
    Nom affiché * (max 50 chars)
    Username * (non modifiable après 30 jours — ou restriction stricte)
    Bio (max 250 chars, textarea)

  SPÉCIALITÉS (max 3)
    Multi-select depuis table specialty

  RÉSEAUX SOCIAUX
    Instagram : @handle
    TikTok : @handle
    YouTube : @handle
    Site web : URL

  LANGUE PRÉFÉRÉE
    Select : FR · EN · (autres V2)

  [Sauvegarder les modifications]
```

**Zod schema profil :**
```typescript
const profileSchema = z.object({
  display_name: z.string().min(2).max(50),
  bio: z.string().max(250).optional(),
  specialty_codes: z.array(z.string()).max(3),
  instagram_handle: z.string().max(30).optional(),
  tiktok_handle: z.string().max(30).optional(),
  youtube_handle: z.string().max(60).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
});
```

**Supabase mutation :**
```typescript
await supabase
  .from('creator')
  .update({ display_name, bio, specialty_codes, instagram_handle, tiktok_handle })
  .eq('user_id', userId);
```

---

### 22. Paramètres (`/settings`)

**Rendu :** CSR  
**Auth :** Requise + is_creator = true

#### Sections

**Compte**
```
Email (lecture seule)
[Changer mon mot de passe]
  → Ancien MDP · Nouveau MDP · Confirmer
Langue de l'interface : FR · EN
```

**Paiements (Stripe Connect)**
```
Statut compte Stripe :
  Non configuré → [Configurer mon compte de paiement]
                 → Redirect vers Stripe Connect onboarding
  Configuré    → [Gérer mon compte Stripe →]
                 IBAN / RIB configuré
                 Prochain versement : 1er [mois prochain]
```

**IA & Assistance**
```
Niveau d'assistance IA :
  ○ Maximale (corrections automatiques)
  ● Équilibrée (suggestions, créateur valide)
  ○ Minimale (sur demande uniquement)
```

**Danger Zone**
```
[Supprimer mon compte]
  → Confirmation avec saisie "SUPPRIMER"
  → Supprime creator + user_profile
  → Recettes anonymisées (creator_id = null)
```

---

## Composants partagés

### `AppDownloadCTA`
```
Boutons côte à côte :
[🍎 App Store]  [▶ Google Play]
Lien vers : NEXT_PUBLIC_APP_STORE_URL / PLAY_STORE_URL
```

### `LanguageSwitcher`
```
Dropdown ou toggle FR | EN dans la navbar
Utilise next-intl router pour changer la locale
```

### `AIInsights` (panel drawer)
```
Déclenché depuis le Dashboard
Appelle Edge Function explain-creator-stats
Affiche réponse Claude Sonnet en markdown simple
```

### `ImageUpload`
```
Props : type ('cover' | 'gallery' | 'avatar'), recipeId?, userId?
Gère : drag & drop, validation, compression, upload Supabase, retour URL
```

### `RecipeWizardProgress`
```
Barre de progression 6 steps
Tabs cliquables (navigation libre)
Indicateur auto-save : "Sauvegardé il y a Xs" / "Sauvegarde..."
```

---

## Récapitulatif pages

| # | Page | Surface | Rendu | Auth |
|---|------|---------|-------|------|
| 1 | Landing page | Publique | SSG | Non |
| 2 | À propos | Publique | SSG | Non |
| 3-5 | Légales | Publique | SSG | Non |
| 6 | Catalogue créateurs | Découverte | SSR | Non |
| 7 | Profil public créateur | Découverte | ISR 1h | Non |
| 8 | Catalogue recettes | Découverte | SSR | Non |
| 9 | Détail recette | Découverte | ISR 1h | Non |
| 10 | Login | Auth | CSR | Non |
| 11 | Signup | Auth | CSR | Non |
| 12 | Callback OAuth | Auth | SSR | Non |
| 13 | Page Bienvenue | Créateur | CSR | Oui |
| 14 | Dashboard | Créateur | CSR | Oui |
| 15 | Liste recettes | Créateur | CSR | Oui |
| 16 | Créer recette (wizard) | Créateur | CSR | Oui |
| 17 | Éditer recette | Créateur | CSR | Oui |
| 18 | Chat — liste | Créateur | CSR | Oui |
| 19 | Chat — conversation | Créateur | CSR | Oui |
| 20 | Mode Fan | Créateur | CSR | Oui |
| 21 | Profil édition | Créateur | CSR | Oui |
| 22 | Paramètres | Créateur | CSR | Oui |

**Total : 22 pages**

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Stack, routing, structure projet |
| `V1_WEBSITE_DATABASE_COMPLETE.md` | Tables, vues, fonctions SQL |
| `V1_WEBSITE_CHAT_ARCHITECTURE.md` | Chat Realtime — détail implementation |
| `V1_WEBSITE_IA_SPECIFICATIONS.md` | Prompts Gemini + Claude Sonnet |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue Edge Functions Supabase |

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Spécifications Pages Website V1*
