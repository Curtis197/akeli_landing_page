# Akeli V1 Website — Accessibilité Universelle au Revenu

> **Document fondateur — Mission centrale du website.**  
> Le website est conçu pour que **n'importe qui avec une connexion internet puisse gagner de l'argent**.

**Statut** : Document fondateur V1 Website  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## 🌍 Mission Centrale

### Le But Ultime du Website

> **N'importe qui avec une connexion internet peut gagner de l'argent.**

**Ce que cela signifie concrètement :**

- ✅ Une femme au Sénégal avec un smartphone et 3G
- ✅ Un homme au Nigeria avec un cybercafé
- ✅ Une grand-mère en Côte d'Ivoire qui ne sait pas lire
- ✅ Un étudiant en France avec un ordinateur portable
- ✅ Une mère au foyer au Cameroun avec wifi partagé
- ✅ Un chef cuisinier au Brésil

**Tous peuvent :**
1. Créer un compte créateur
2. Publier leurs recettes
3. Générer un revenu
4. Suivre leurs gains
5. Communiquer avec la communauté

**Sans barrières de :**
- ❌ Langue (traduit dans leur langue)
- ❌ Éducation (IA assistant universel)
- ❌ Niveau technique (interface intuitive)
- ❌ Équipement (fonctionne sur petit écran)
- ❌ Connexion (optimisé pour 3G)

---

## 🌐 Système Multilingue Complet

### Langues Supportées V1

**Langues Natives (traduction humaine professionnelle) :**
```
🇫🇷 Français (FR)
🇪🇸 Espagnol (ES)
🇵🇹 Portugais (PT)
🇬🇧 Anglais (EN)
```

**Langues Africaines (traduction IA Gemini) :**
```
🇸🇳 Wolof (WO)
🇲🇱 Bambara (BM)
🇨🇩 Lingala (LN)
🇸🇦 Arabe (AR)
[+ autres langues africaines selon demande]
```

### Architecture Traduction

**Deux systèmes distincts :**

```
┌────────────────────────────────────────────────┐
│         TRADUCTION INTERFACE                   │
├────────────────────────────────────────────────┤
│  Boutons, labels, messages, navigation         │
│                                                │
│  Langues natives (FR, EN, ES, PT):             │
│  → Fichiers JSON statiques                     │
│  → Traduction humaine professionnelle          │
│                                                │
│  Langues africaines (WO, BM, LN, AR):          │
│  → Traduction IA (Gemini)                      │
│  → Cache en base de données                    │
│  → Mise à jour si strings changent             │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│         TRADUCTION CONTENU                     │
├────────────────────────────────────────────────┤
│  Recettes (titres, descriptions, instructions) │
│                                                │
│  Toutes langues:                               │
│  → Traduction IA (Gemini)                      │
│  → À la publication ou à la demande            │
│  → Stocké en base (colonnes multilingues)      │
│  → Correction manuelle possible créateur       │
└────────────────────────────────────────────────┘
```

---

## 🗣️ Traduction Interface — Implémentation

### Structure Next.js i18n

**Fichiers de traduction :**
```
messages/
├── fr.json          // Traduction humaine
├── en.json          // Traduction humaine
├── es.json          // Traduction humaine
├── pt.json          // Traduction humaine
├── wo.json          // Traduction IA Gemini (cachée)
├── bm.json          // Traduction IA Gemini (cachée)
├── ln.json          // Traduction IA Gemini (cachée)
└── ar.json          // Traduction IA Gemini (cachée)
```

**Exemple `fr.json` (référence) :**
```json
{
  "common": {
    "welcome": "Bienvenue",
    "login": "Se connecter",
    "signup": "S'inscrire",
    "logout": "Se déconnecter"
  },
  "creator": {
    "dashboard": {
      "title": "Tableau de bord",
      "revenue_this_month": "Revenus ce mois",
      "total_consumptions": "Consommations totales",
      "top_recipes": "Recettes les plus consommées"
    },
    "recipe": {
      "create_new": "Créer une recette",
      "title_label": "Titre de la recette",
      "description_label": "Description",
      "save_draft": "Sauvegarder brouillon",
      "publish": "Publier"
    }
  },
  "public": {
    "landing": {
      "hero_title": "Ton savoir culinaire mérite un revenu stable",
      "hero_subtitle": "Construis un revenu passif autour de tes recettes",
      "cta_become_creator": "Devenir créateur"
    }
  }
}
```

### Génération Traductions IA (Langues Africaines)

**Process :**

```
1. Développeur ajoute/modifie strings dans fr.json (langue source)

2. Script détecte nouveaux strings

3. Pour chaque langue africaine (wo, bm, ln, ar):
   
   a) Appelle API Gemini :
      Prompt: "Traduis ce texte du français vers le Wolof.
               Contexte: Interface application nutrition.
               Ton: Respectueux, simple, direct.
               
               Texte français: '[string]'
               
               Réponds uniquement avec la traduction."
   
   b) Gemini retourne traduction
   
   c) Script enregistre dans wo.json
   
   d) Cache en base de données :
      table: interface_translations
      colonnes: key, lang, value, updated_at

4. Révision humaine (optionnel) :
   - Native speaker peut corriger traductions IA
   - Corrections enregistrées en base
   - Marquées comme "human_reviewed: true"
```

**Exemple génération :**

```javascript
// scripts/generate-translations.js

const { Anthropic } = require('@anthropic-ai/sdk');

async function translateString(text, targetLang) {
  const langNames = {
    wo: 'Wolof',
    bm: 'Bambara',
    ln: 'Lingala',
    ar: 'Arabe'
  };
  
  const prompt = `Traduis ce texte du français vers le ${langNames[targetLang]}.
Contexte: Interface d'application de nutrition et recettes.
Ton: Respectueux, simple, direct, accessible.

Texte français: "${text}"

Réponds uniquement avec la traduction, sans explications.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return message.content[0].text.trim();
}
```

### Détection et Sélection Langue

**Détection automatique :**
```javascript
// middleware.ts (Next.js)

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

function getLocale(request) {
  // 1. Check cookie (persisté)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }
  
  // 2. Detect from Accept-Language header
  const headers = { 'accept-language': request.headers.get('accept-language') };
  const languages = new Negotiator({ headers }).languages();
  
  const locale = match(
    languages,
    supportedLocales,
    defaultLocale
  );
  
  return locale;
}
```

**Sélecteur manuel (navbar) :**
```tsx
// components/LanguageSelector.tsx

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  { code: 'bm', name: 'Bambara', flag: '🇲🇱' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

export function LanguageSelector() {
  const { locale, push, pathname } = useRouter();
  
  return (
    <select 
      value={locale}
      onChange={(e) => {
        // Persist preference
        document.cookie = `NEXT_LOCALE=${e.target.value}`;
        // Navigate to new locale
        push(pathname, pathname, { locale: e.target.value });
      }}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

---

## 📝 Traduction Contenu — Recettes

### Stockage Base de Données (Multilingue)

**Tables avec colonnes multilingues :**

```sql
CREATE TABLE recipe (
  id                uuid PRIMARY KEY,
  creator_id        uuid REFERENCES creator(id),
  
  -- Métadonnées (pas traduites)
  region            text,
  difficulty        text,
  prep_time_min     int,
  cook_time_min     int,
  servings          int,
  cover_image_url   text,
  
  -- Contenu traduisible (toutes langues)
  title_fr          text,
  title_en          text,
  title_es          text,
  title_pt          text,
  title_wo          text,
  title_bm          text,
  title_ln          text,
  title_ar          text,
  
  description_fr    text,
  description_en    text,
  description_es    text,
  description_pt    text,
  description_wo    text,
  description_bm    text,
  description_ln    text,
  description_ar    text,
  
  -- Langue source (définie par créateur)
  source_language   text DEFAULT 'fr',
  
  is_published      boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE recipe_ingredient (
  id                uuid PRIMARY KEY,
  recipe_id         uuid REFERENCES recipe(id),
  ingredient_ref_id uuid REFERENCES ingredient_reference(id),
  quantity          numeric(8,2),
  unit              text,
  
  -- Nom custom si pas dans référence (multilingue)
  custom_name_fr    text,
  custom_name_en    text,
  custom_name_es    text,
  custom_name_pt    text,
  custom_name_wo    text,
  custom_name_bm    text,
  custom_name_ln    text,
  custom_name_ar    text,
  
  sort_order        int
);

CREATE TABLE step (
  id                uuid PRIMARY KEY,
  recipe_id         uuid REFERENCES recipe(id),
  
  -- Instruction multilingue
  text_fr           text,
  text_en           text,
  text_es           text,
  text_pt           text,
  text_wo           text,
  text_bm           text,
  text_ln           text,
  text_ar           text,
  
  sort_order        int
);
```

### Process Traduction Contenu

**À la publication de recette :**

```
1. Créateur rédige recette en langue source (ex: Français)
   - title_fr: "Thiéboudienne Facile"
   - description_fr: "Plat national sénégalais..."
   - ingredients: custom_name_fr
   - steps: text_fr

2. Créateur clique "Publier"

3. Backend déclenche traductions automatiques :
   
   FOR EACH langue (en, es, pt, wo, bm, ln, ar):
     
     a) Traduit titre
        API Gemini: FR → EN, ES, PT, WO, BM, LN, AR
     
     b) Traduit description
        API Gemini: FR → [langue cible]
     
     c) Traduit ingrédients custom
        Pour chaque ingrédient sans référence
     
     d) Traduit étapes
        Pour chaque step
   
   e) Enregistre toutes traductions en base

4. Recette publiée et disponible en 8 langues
```

**Exemple appel Gemini pour recette :**

```javascript
async function translateRecipe(recipeId, sourceLang, targetLang) {
  const recipe = await getRecipe(recipeId);
  
  // Traduire titre
  const translatedTitle = await translateWithGemini(
    recipe[`title_${sourceLang}`],
    sourceLang,
    targetLang,
    'recipe_title'
  );
  
  // Traduire description
  const translatedDescription = await translateWithGemini(
    recipe[`description_${sourceLang}`],
    sourceLang,
    targetLang,
    'recipe_description'
  );
  
  // Traduire ingrédients
  const ingredients = await getRecipeIngredients(recipeId);
  for (const ingredient of ingredients) {
    if (ingredient[`custom_name_${sourceLang}`]) {
      ingredient[`custom_name_${targetLang}`] = await translateWithGemini(
        ingredient[`custom_name_${sourceLang}`],
        sourceLang,
        targetLang,
        'ingredient_name'
      );
    }
  }
  
  // Traduire étapes
  const steps = await getRecipeSteps(recipeId);
  for (const step of steps) {
    step[`text_${targetLang}`] = await translateWithGemini(
      step[`text_${sourceLang}`],
      sourceLang,
      targetLang,
      'recipe_instruction'
    );
  }
  
  // Sauvegarder toutes traductions
  await updateRecipeTranslations(recipeId, {
    title: translatedTitle,
    description: translatedDescription,
    ingredients,
    steps
  });
}

async function translateWithGemini(text, sourceLang, targetLang, context) {
  const langNames = {
    fr: 'français', en: 'anglais', es: 'espagnol', pt: 'portugais',
    wo: 'Wolof', bm: 'Bambara', ln: 'Lingala', ar: 'arabe'
  };
  
  const contextPrompts = {
    recipe_title: 'Titre de recette de cuisine',
    recipe_description: 'Description de recette',
    ingredient_name: 'Nom d\'ingrédient culinaire',
    recipe_instruction: 'Instruction de préparation de recette'
  };
  
  const prompt = `Traduis du ${langNames[sourceLang]} vers le ${langNames[targetLang]}.
Contexte: ${contextPrompts[context]}
Style: Naturel, simple, clair

Texte source: "${text}"

Réponds uniquement avec la traduction, sans explications.`;

  const response = await gemini.generateContent(prompt);
  return response.text().trim();
}
```

### Correction Manuelle Traductions

**Créateur peut corriger traductions IA :**

```tsx
// Page édition recette
<RecipeEditForm>
  <Tabs>
    <Tab label="🇫🇷 Français (source)">
      <Input value={title_fr} onChange={...} />
      <Textarea value={description_fr} onChange={...} />
    </Tab>
    
    <Tab label="🇬🇧 English">
      <Input 
        value={title_en} 
        onChange={...}
        placeholder="Auto-traduit par IA (modifiable)"
      />
      <Textarea value={description_en} onChange={...} />
      <Button variant="ghost" onClick={reTranslate}>
        🔄 Re-traduire avec IA
      </Button>
    </Tab>
    
    <Tab label="🇸🇳 Wolof">
      <Input value={title_wo} onChange={...} />
      <Textarea value={description_wo} onChange={...} />
      <Badge>Traduit par IA Gemini</Badge>
      <Button onClick={reTranslate}>🔄 Re-traduire</Button>
    </Tab>
    
    {/* ... autres langues */}
  </Tabs>
</RecipeEditForm>
```

---

## ♿ Accessibilité Technique — Connexion Internet Limitée

### Optimisation 3G/4G

**Principe :** Le website doit fonctionner sur connexion lente.

**Optimisations :**

**1. Images optimisées**
```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  }
};
```

**2. Lazy loading agressif**
```tsx
// Charger images uniquement quand visibles
<Image 
  src={recipe.cover_image_url}
  loading="lazy"
  placeholder="blur"
  blurDataURL={recipe.thumbnail_url} // tiny placeholder
/>
```

**3. Code splitting**
```tsx
// Charger composants lourds à la demande
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**4. Compression Brotli**
```javascript
// next.config.js
compress: true, // Gzip/Brotli auto
```

**5. Cache agressif**
```javascript
// Service Worker pour cache offline
// Cache API responses, images, fonts
```

**6. Metrics de performance**
```
Objectifs:
- First Contentful Paint: < 2s (3G)
- Time to Interactive: < 5s (3G)
- Largest Contentful Paint: < 3s (3G)
```

---

## 📱 Accessibilité Technique — Petits Écrans

### Mobile First Design

**Principe :** Concevoir d'abord pour mobile, améliorer pour desktop.

**Breakpoints Tailwind :**
```css
/* Mobile par défaut (< 640px) */
.container { width: 100%; padding: 16px; }

/* Tablet (≥ 640px) */
@media (min-width: 640px) {
  .container { max-width: 640px; }
}

/* Desktop (≥ 1024px) */
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}
```

**Navigation mobile-friendly :**
```tsx
// Navbar mobile avec drawer
<nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-auto">
  {/* Mobile: Bottom nav bar */}
  {/* Desktop: Top nav bar */}
</nav>
```

**Formulaires tactiles :**
```tsx
// Inputs larges pour doigts
<input className="min-h-[48px] text-16px" />

// Boutons larges
<button className="min-h-[48px] min-w-[120px]" />
```

---

## 💡 Scénarios d'Usage Réels

### Scénario 1 — Grand-mère au Sénégal (Wolof uniquement)

**Profil :**
- Ne sait pas lire le français
- Smartphone Android
- Connexion 3G partagée
- Cuisine traditionnelle sénégalaise depuis 40 ans

**Parcours :**

```
1. Arrive sur a-keli.com (détection auto → Wolof)
   Interface complète en Wolof (traduit par Gemini)

2. Clique "Liggéey ci Akeli" (Devenir créateur)
   Formulaire simple en Wolof

3. Crée compte avec aide de sa petite-fille
   Username: @yaaye_fatou

4. IA assistant en Wolof lui explique :
   "Bind nga am xaalis bu bari ci sa recepe yu jëkk"
   (Tu peux gagner de l'argent avec tes recettes)

5. Crée première recette ORALEMENT :
   Option: Enregistrement vocal (V2)
   OU sa petite-fille tape pendant qu'elle dicte
   
   Titre (Wolof): "Thiéboudieune bu neex"
   Description (Wolof): [elle explique en Wolof]
   
6. IA traduit automatiquement en FR, EN, ES, PT, etc.

7. Publie → Recette visible mondialement en 8 langues

8. Voit premiers revenus :
   Dashboard en Wolof
   "Sa xaalis ci weer wi: 2€"
   
9. IA explique en Wolof simple :
   "Ñu lekk sa thiéboudieune 18 yoon.
    Sa xaalis di yokk ci 72 yoon."
   (18 personnes ont consommé ta recette.
    Tu gagneras de l'argent dans 72 jours)
```

**Barrières levées :**
- ✅ Langue (Wolof natif)
- ✅ Alphabétisation (IA explique oralement possible V2)
- ✅ Technique (interface intuitive)
- ✅ Revenu (visible, compréhensible)

---

### Scénario 2 — Étudiant au Nigeria (Anglais)

**Profil :**
- 22 ans, Lagos
- Smartphone + WiFi campus
- Cuisine nigériane moderne (Jollof, Suya)
- TikTok 8K followers
- Cherche side income

**Parcours :**

```
1. Découvre Akeli via live TikTok Curtis

2. Va sur a-keli.com/en
   Landing en anglais
   Pitch: "Your recipes deserve steady income"

3. Signup en 2 minutes
   Username: @naija_chef

4. Crée 10 recettes en 1 semaine
   Langue source: Anglais
   IA traduit auto en FR, ES, PT, WO, etc.

5. Partage profil Akeli à ses followers TikTok
   "Check my recipes on Akeli: a-keli.com/creator/naija_chef"

6. 50 followers téléchargent app Akeli

7. Dashboard montre :
   "This month: 120 consumptions"
   "Revenue: 1.33€"
   "Progress to next euro: 67%"

8. IA analyse en anglais :
   "Your Jollof Rice recipe is performing well.
    Users love recipes under 30 minutes.
    Keep creating quick recipes!"

9. Atteint 30 recettes → Mode Fan éligible

10. 5 fans à 1€/mois = 5€ garantis + revenus passifs
```

**Barrières levées :**
- ✅ Langue (Anglais natif)
- ✅ Tech (à l'aise avec tools)
- ✅ Acquisition (TikTok → Akeli)
- ✅ Motivation (revenus rapides visibles)

---

## 🎯 Principes Directeurs — Accessibilité Universelle

### Checklist Avant Chaque Feature

**Se demander :**

**1. Langue**
- ✅ Disponible dans les 8 langues ?
- ✅ Traduction IA Gemini fonctionnelle ?
- ✅ Correction manuelle possible ?

**2. Éducation**
- ✅ Utilisable sans savoir lire couramment ?
- ✅ IA explique en language simple ?
- ✅ Icônes universelles présentes ?

**3. Connexion**
- ✅ Fonctionne sur 3G ?
- ✅ Images optimisées ?
- ✅ Temps chargement < 5s ?

**4. Équipement**
- ✅ Fonctionne sur petit écran ?
- ✅ Inputs tactiles larges ?
- ✅ Navigation mobile-first ?

**5. Revenu**
- ✅ Chemin vers revenu clair ?
- ✅ Dashboard revenus simple ?
- ✅ Progression visible ?

---

## 📊 Métriques de Succès — Accessibilité

**Objectifs V1 :**

**Diversité créateurs :**
- 30% créateurs langues africaines (WO, BM, LN)
- 40% créateurs sans éducation universitaire
- 50% créateurs femmes
- 20% créateurs > 45 ans

**Performance technique :**
- < 5s chargement page (3G)
- 100% pages accessibles mobile
- 100% contenu traduit 8 langues

**Revenu accessible :**
- Premier €1 gagné en moyenne < 60 jours
- 70% créateurs comprennent modèle revenus (mesure NPS)
- 0% créateurs bloqués par barrière linguistique

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Accessibilité Universelle au Revenu*
