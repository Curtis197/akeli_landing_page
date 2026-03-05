# Akeli V1 Website — SCOPE FINAL VALIDÉ

> **Document de référence définitif.**  
> Scope V1 complètement validé, prêt pour documentation technique.

**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Statut** : ✅ VALIDÉ - Prêt pour implémentation

---

## 📊 SCOPE V1 COMPLET

### **Timeline : 10-12 semaines**

Philosophie : Prendre le temps nécessaire pour des fondations solides.

---

## 🌐 SURFACE PUBLIQUE (Marketing)

### Pages

**1. Landing Page Utilisateurs** (`/`)
- Hero simple : **"Mangez comme vous êtes."**
- Pour qui ? (3 profils visuels)
- Comment ça marche ? (3 étapes)
- Prix (3€/mois)
- CTA téléchargement app

**2. Landing Page Créateurs** (`/creators/join` ou section)
- Pitch créateur (modèle économique transparent)
- Talent is everywhere
- Revenus : €1/90 consommations + Mode Fan
- CTA "Devenir créateur"

**3. À Propos** (`/about`)
- Vision simple : "Nos modes de vie ont changé. Akeli aide ta cuisine à s'adapter."
- Pas de prosélytisme
- Ton calme, factuel

**4. Pages Légales**
- CGU (`/legal/terms`)
- Politique de confidentialité (`/legal/privacy`)
- Mentions légales (`/legal/mentions`)

**Ton :** Simple, factuel, sans prosélytisme, sans négation

---

## 🔍 SURFACE DÉCOUVERTE (Marketplace Créateurs)

**Stratégie :** Focus CRÉATEURS, pas recettes complètes

### Pages

**1. Catalogue Créateurs** (`/creators`)
- Liste tous les créateurs
- Filtres : région culinaire, spécialités
- Grid créateurs (avatar, nom, stats, bio courte)
- SEO créateurs

**2. Profil Public Créateur** (`/creator/[username]`)
- Header : Avatar, bio, région, spécialités, réseaux sociaux
- Stats publiques : X recettes, Y consommations
- Badge Mode Fan (si ≥30 recettes)
- **Grid recettes créateur (APERÇU uniquement)**
  - Image cover
  - Titre
  - Temps + Calories
  - **Pas d'ingrédients, pas d'étapes**
- CTA : "Découvre toutes ses recettes dans l'app"
- SEO : Profil créateur complet indexé

**3. Catalogue Recettes** (`/recipes`) — **NÉCESSAIRE V1**
- Liste toutes les recettes (aperçu)
- Filtres : région, type repas, temps, calories, tags
- Grid recettes (aperçu)
- CTA téléchargement omniprésent

**4. Détail Recette** (`/recipe/[slug]`)
- **URL : Pas d'ID, juste slug** (ex: `/recipe/thieboudienne-facile`)
- **Contenu TEASING uniquement :**
  - ✅ Image cover
  - ✅ Titre, description (150 chars)
  - ✅ Macros (calories, protéines, glucides, lipides)
  - ✅ Temps, difficulté, portions
  - ✅ Par @créateur (lien profil)
  - ✅ Tags
  - ❌ **PAS ingrédients complets**
  - ❌ **PAS étapes préparation**
- **Teasing ingrédients (optionnel) :**
  ```
  Ingrédients principaux :
  • Riz, Poisson, Légumes
  ... et 5 autres ingrédients
  ```
- **CTA massif :**
  ```
  Cette recette est disponible uniquement dans l'app Akeli
  [Télécharger l'app]
  
  Découvre aussi les autres recettes de @créateur
  [Voir son profil]
  ```
- SEO : Recipe markup partiel (pour apparaître Google)

**Principe :** Recettes complètes **uniquement dans l'app**

---

## 🛠️ ESPACE CRÉATEUR (Authentifié)

### 1. Création Recette (Priorité 1)

**Wizard 6 steps :**

**Step 1 - Infos de base**
- Titre, description
- Région culinaire, type repas
- Difficulté, temps préparation/cuisson
- Nombre portions

**Step 2 - Ingrédients**
- Liste drag & drop (**desktop**)
- **Mobile : Boutons ↑ ↓** (réorganisation tactile)
- Par ingrédient : nom, quantité, unité
- Autocomplete ingredient_reference
- Minimum 3 ingrédients

**Step 3 - Étapes**
- Liste drag & drop (**desktop**)
- **Mobile : Boutons ↑ ↓** (réorganisation tactile)
- Par étape : texte instruction
- Minimum 3 étapes

**Step 4 - Nutrition**
- Calcul auto macros (si ingrédients dans référence)
- Sinon saisie manuelle (optionnel)
- Calories, protéines, glucides, lipides, fibres

**Step 5 - Images**
- Image cover (obligatoire)
- Galerie (max 5, optionnel)
- Upload : react-dropzone
- Storage : Supabase Storage

**Step 6 - Tags & Publication**
- Tags (multi-select)
- Sans porc (checkbox)
- Preview recette
- Actions : Sauvegarder brouillon | Publier

**Features :**
- Auto-save toutes les 30 secondes
- IA correction orthographe/grammaire (Gemini)
- IA traduction automatique (8 langues : FR, EN, ES, PT, WO, BM, LN, AR)
- Validation non-bloquante (warnings)

---

### 2. Chat Créateurs COMPLET (Priorité 2)

**Technologie :** Supabase Realtime (WebSockets)

**Features :**
- ✅ Chat privé 1-to-1 (créateur ↔ créateur)
- ✅ Groupes (créés par créateurs, pas pré-créés)
- ✅ Chat support (créateur ↔ équipe Akeli)
- ✅ Partage images/liens
- ✅ Notifications nouveaux messages
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Recherche conversations
- ❌ **Pas de traduction IA messages**

**Groupes :**
- Créateurs créent leurs propres groupes
- Auto-organisation par langue, région, niche
- Modération légère (IA spam/insultes)

**Intelligence Collective :**
- Messages stockés (collecte passive V1)
- Analysis IA activée V1.5/V2

---

### 3. Gestion Catalogue (Priorité 3)

**Features :**
- Liste recettes (publiées + brouillons)
- Filtres : type repas, région, statut, tags
- Recherche
- Actions : Éditer, Dupliquer, Dépublier
- Stats par recette : consommations, revenus

---

### 4. Profil Public (Priorité 4)

**Édition profil public :**
- Bio (250 chars)
- Région culinaire
- Spécialités (max 3)
- Réseaux sociaux (Instagram, TikTok)
- Avatar upload
- Preview profil public

---

### 5. Dashboard Revenus (Priorité 5)

**Stats :**
- Revenus ce mois (€)
- Consommations totales
- Top 5 recettes
- Graphique évolution
- **Stats Mode Fan** (si ≥30 recettes)

**IA Explication (Claude Sonnet) :**
- Bouton "Explique-moi mes stats"
- Rapport en langage naturel
- Insights actionnables
- Suggestions progression

---

### 6. Mode Fan (Priorité 6) — **V1 CONFIRMÉ**

**Fonctionnement :**
- User paie 1€/mois pour Mode Fan avec 1 créateur
- 90% recettes plan = ce créateur
- Créateur reçoit 1€/mois garanti par fan
- Éligibilité : ≥30 recettes publiées

**Dashboard créateur :**
- Badge Mode Fan (si éligible)
- Nombre de fans
- Revenus Mode Fan
- Graphique évolution fans
- Message incitatif si < 30 recettes

**Impact :** Revenus prévisibles, fidélisation users, motivation créateurs

---

## 🌍 MULTILINGUE

### Langues V1 : 8 langues

**Natives (traduction humaine) :**
- 🇫🇷 Français (FR)
- 🇬🇧 Anglais (EN)
- 🇪🇸 Espagnol (ES)
- 🇵🇹 Portugais (PT)

**Africaines (traduction IA Gemini) :**
- 🇸🇳 Wolof (WO)
- 🇲🇱 Bambara (BM)
- 🇨🇩 Lingala (LN)
- 🇸🇦 Arabe (AR)

### Traductions

**Interface (boutons, labels) :**
- Natives : JSON statiques (humain)
- Africaines : Gemini (non révisées V1)
- Badge : "Traduit par IA - Aidez-nous à améliorer"

**Contenu recettes :**
- Toutes langues : Gemini auto à la publication
- Correction manuelle possible créateur

**Chat :**
- ❌ **Pas de traduction IA**
- Créateurs communiquent langue commune
- Groupes auto-organisés par langue

---

## 🤖 IA APIs

### Gemini API (~$100-150/mois)

**Usages :**
- Traductions interface (langues africaines)
- Traductions recettes (8 langues)
- Corrections orthographe/grammaire temps réel
- Suggestions amélioration contenu

### Claude Sonnet API (~$50-80/mois)

**Usages :**
- Analytics expliqués (dashboard)
- Insights recettes (pourquoi performe)
- Suggestions progression créateur

**Budget total : ~$150-230/mois**

---

## 💳 PAIEMENTS CRÉATEURS

**Système :** Stripe Connect

**Paramètres :**
- Fréquence : **Mensuel** (1er de chaque mois)
- Seuil minimum : **AUCUN** (premier €1 payé)
- Délai : Mois M payé début mois M+1
- Régions : Afrique + Europe supportées

**Raison pas de seuil :**
- Motivation immédiate créateurs
- Preuve concrète revenus (même €1)
- Confiance dans le modèle

---

## 🗄️ BASE DE DONNÉES

**Utilise :** `V1_DATABASE_SCHEMA.md` (schéma propre)

**Ajouts nécessaires V1 :**

**Table Mode Fan :**
```sql
CREATE TABLE fan_subscription (
  id              uuid PRIMARY KEY,
  user_id         uuid REFERENCES user_profile(id),
  creator_id      uuid REFERENCES creator(id),
  status          text, -- 'active', 'cancelled'
  started_at      timestamptz,
  cancelled_at    timestamptz,
  UNIQUE(user_id, creator_id)
);
```

**Tables Chat :**
```sql
CREATE TABLE chat_conversation (
  id              uuid PRIMARY KEY,
  type            text, -- 'private', 'group', 'support'
  name            text, -- NULL pour private
  created_by      uuid REFERENCES creator(id),
  created_at      timestamptz
);

CREATE TABLE chat_participant (
  id              uuid PRIMARY KEY,
  conversation_id uuid REFERENCES chat_conversation(id),
  creator_id      uuid REFERENCES creator(id),
  joined_at       timestamptz,
  last_read_at    timestamptz,
  UNIQUE(conversation_id, creator_id)
);

CREATE TABLE chat_message (
  id              uuid PRIMARY KEY,
  conversation_id uuid REFERENCES chat_conversation(id),
  sender_id       uuid REFERENCES creator(id),
  content         text,
  image_url       text,
  created_at      timestamptz,
  edited_at       timestamptz
);
```

**Table Specialty :**
```sql
CREATE TABLE specialty (
  id          uuid PRIMARY KEY,
  code        text UNIQUE,
  name_fr     text,
  name_en     text,
  name_es     text,
  name_pt     text,
  name_wo     text,
  name_bm     text,
  name_ln     text,
  name_ar     text,
  created_at  timestamptz
);
```

---

## ❌ HORS SCOPE V1

**Confirmé V2 :**
- Vente programmes nutritionnels
- Analytics avancés (démographie fans)
- SEO Tool / Niche Finder
- Notifications push avancées
- Chat analysis IA active
- Système parrainage (annulé définitivement)

---

## 📋 CHECKLIST VALIDATION FINALE

### Documents Fondateurs ✅
- [x] V1_WEBSITE_VISION_PHILOSOPHIE.md
- [x] V1_WEBSITE_PHILOSOPHIE_DETAILLEE.md
- [x] V1_WEBSITE_TROIS_SURFACES.md
- [x] V1_WEBSITE_ACCESSIBILITE_UNIVERSELLE.md
- [x] V1_VISION_INTELLIGENCE_COLLECTIVE.md

### Décisions Critiques ✅
- [x] Priorités fonctionnelles : Création > Chat > Catalogue > Profil > Dashboard > Mode Fan
- [x] Chat créateurs complet V1 (10-12 semaines)
- [x] Pas de traduction IA chat
- [x] Pas de groupes pré-créés
- [x] Recettes web = teasing uniquement (focus créateurs)
- [x] Catalogue recettes nécessaire V1
- [x] Mode Fan activé V1
- [x] Paiements : mensuel, pas de seuil minimum
- [x] 8 langues (FR, EN, ES, PT, WO, BM, LN, AR)
- [x] Budget API ~$150-230/mois validé

### Stack Technique ✅
- [x] Next.js 14 App Router
- [x] TypeScript strict
- [x] Tailwind CSS + shadcn/ui
- [x] Supabase (Auth, DB, Realtime, Storage)
- [x] Gemini API (traductions, corrections)
- [x] Claude Sonnet API (analytics)
- [x] Stripe Connect (paiements)
- [x] Vercel deployment
- [x] Domain : a-keli.com

---

## 🚀 PROCHAINE ÉTAPE

**Création Documentation Technique Complète :**

1. **`V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md`**
   - Structure Next.js complète
   - Intégrations (Supabase, IA, Stripe)
   - i18n (next-intl)
   - File structure
   - Environment variables

2. **`V1_WEBSITE_DATABASE_COMPLETE.md`**
   - Schema chat complet
   - Schema Mode Fan
   - Ajustements schema existant
   - RLS policies
   - Triggers, functions

3. **`V1_WEBSITE_PAGES_SPECIFICATIONS.md`**
   - Specs exactes chaque page
   - Components
   - API calls
   - States

4. **`V1_WEBSITE_CHAT_ARCHITECTURE.md`**
   - Supabase Realtime implementation
   - Messages flow
   - Groupes management
   - Notifications

5. **`V1_WEBSITE_IA_SPECIFICATIONS.md`**
   - Prompts Gemini (traductions, corrections)
   - Prompts Claude (analytics)
   - Use cases complets
   - Error handling

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — SCOPE V1 FINAL VALIDÉ*
