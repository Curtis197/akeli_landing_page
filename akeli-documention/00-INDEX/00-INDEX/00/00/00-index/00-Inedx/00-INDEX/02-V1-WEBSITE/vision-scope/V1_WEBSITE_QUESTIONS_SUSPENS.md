# V1 Website — Questions en Suspens & Travail Préparatoire

> **Document de travail provisoire**  
> Contient les questions ouvertes et les décisions préparatoires issues de la conversation.  
> À finaliser avant de créer la documentation technique complète.

**Date** : Mars 2026  
**Statut** : Work in Progress — Questions à valider

---

## 📋 Décisions Déjà Validées

### Stack Technique
- ✅ Next.js 14 **App Router** (pas Pages Router)
- ✅ TypeScript **strict**
- ✅ Tailwind CSS + shadcn/ui
- ✅ TanStack Query (React Query) pour server state
- ✅ Zustand pour client state
- ✅ Supabase Storage pour images
- ✅ Vercel pour déploiement
- ✅ Domain : **a-keli.com** (DNS déjà configuré sur IONOS)

### Base de Données
- ✅ Utiliser schéma **V1_DATABASE_SCHEMA.md** (nouveau schéma propre)
- ✅ Migration V0 → V1 déjà effectuée sur **base séparée**
- ✅ Website V1 Next.js + App V1 Flutter → **nouveau schéma V1 uniquement**
- ✅ Ancien schéma V0 abandonné (webapp FlutterFlow obsolète)

### Périmètre Fonctionnel V1
**DANS le scope :**
- ✅ Landing page publique
- ✅ Dashboard créateur (revenus, stats basiques)
- ✅ Création/édition recettes
- ✅ Liste recettes créateur
- ✅ Paramètres créateur
- ✅ **Profil public créateur** (nouveau)
- ✅ Pages légales (CGU, confidentialité, mentions légales)

**HORS scope V1 :**
- ❌ Page parrainage dédiée → **ANNULÉ**
- ❌ Système parrainage complet → **ANNULÉ**
- ❌ Analytics avancés → **V2**
- ❌ SEO Tool → **V2**
- ❌ Niche Finder → **V2**
- ❌ Notifications → **En attente**

### Compte Créateur
- ✅ Création compte **uniquement sur website** (pas depuis app mobile)
- ✅ **Auto-approved** (pas de validation manuelle)
- ✅ Flow : Signup → devient créateur immédiatement
- ✅ Username uniquement pour créateurs (users consommateurs n'en ont pas)

### Multilingue
- ✅ **FR + EN dès V1**
- ✅ Référentiels traduits en database (food_region, tag, specialty, measurement_unit)
- ✅ Contenu recettes traduit automatiquement (API Gemini)
- ✅ Détection langue auto + sélecteur manuel navbar

### Design
- ✅ Couleurs : Violet `#9c88ff`, Vert `#3bb78f`, Orange `#FF9F1C`
- ✅ Typography : Inter (Google Fonts)
- ✅ Cohérent avec design system app mobile

---

## ❓ Questions Ouvertes (À Valider Avant Documentation)

### **QUESTION 1 - Recettes Multilingues : Traduction Manuelle ou Auto ?**

**Options discutées :**

**Option A - Créateur traduit manuellement**
```
Formulaire avec onglets FR/EN
Créateur saisit tout en double
```
➕ Traduction de qualité  
➖ Formulaire 2× plus long, friction créateur

**Option B - Traduction automatique IA à la publication**
```
Créateur saisit en 1 langue
API Gemini traduit automatiquement
Créateur peut corriger après publication
```
➕ UX simple, pas de friction  
➖ Coût API, qualité variable

**Option C - Hybride (RECOMMANDÉ)**
```
Créateur saisit en 1 langue
Option : "Générer traduction auto" (cochée par défaut)
Override manuel possible après publication
```
➕ Flexibilité, traduction auto + contrôle manuel  
➖ Complexité implémentation

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B  
- [ ] Option C

---

### **QUESTION 2 - Base Ingrédients : Source de Données ?**

**Options discutées :**

**Option A - Base manuelle curated (~200-500 ingrédients)**
```
Équipe Akeli saisit manuellement
Focus cuisine africaine/diaspora
Valeurs nutritionnelles fiables
```
➕ Contrôle qualité, adapté cuisine africaine  
➖ Base limitée, travail manuel initial

**Option B - API externe (USDA, Open Food Facts)**
```
Appel API pour chaque ingrédient
Base massive, pas de saisie manuelle
```
➕ Base énorme, automatisé  
➖ Données généralistes, pas cuisine africaine, dépendance API

**Option C - Hybride (RECOMMANDÉ)**
```
Base curated manuelle (~200 ingrédients de base)
Autocomplete cherche dans base curated
Si pas trouvé → créateur saisit macros manuellement (optionnel)
```
➕ Meilleur des deux mondes  
➖ Nécessite création base initiale

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B
- [ ] Option C

**QUESTION LIÉE :** Qui crée la base ingrédients initiale ?
- [ ] Équipe Akeli manuellement
- [ ] Import CSV existant (si disponible)
- [ ] Crowdsourcing créateurs (ajoutent au fur et à mesure)

---

### **QUESTION 3 - Calcul Macros : Automatique ou Manuel ?**

**VALIDÉ :** Calcul automatique depuis base ingrédients

**Formule :**
```
macros_ingredient = (quantité / 100) × valeur_pour_100g
total_recette = sum(macros_ingredients)
macros_par_portion = total_recette / nombre_portions
```

**QUESTION RESTANTE :** Que faire si ingrédient pas dans base référence ?

**Option A - Blocage publication**
```
Créateur ne peut pas publier sans macros complètes
```
➕ Qualité garantie  
➖ Friction élevée, barrière d'entrée

**Option B - Saisie manuelle macros (optionnelle)**
```
Créateur peut saisir macros custom
OU laisser vide
Recette publiée quand même
```
➕ Flexibilité, pas de blocage  
➖ Recettes sans macros possibles

**Option C - Estimation approximative (RECOMMANDÉ)**
```
Système suggère valeur approximative
Créateur peut accepter ou corriger
Indication "valeurs approximatives" sur recette
```
➕ Toujours des macros, transparence sur approximation  
➖ Complexité calcul estimation

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B
- [ ] Option C

---

### **QUESTION 4 - Profil Public Créateur : Accessible Comment ?**

**URL :** `a-keli.com/creator/[username]` (VALIDÉ)

**QUESTION :** Accessible depuis l'app mobile comment ?

**Option A - Deep link → web view**
```
User dans app tape sur créateur
→ Ouvre web view du profil créateur (website)
```
➕ Implémentation simple  
➖ Expérience moins native

**Option B - Navigation native app**
```
Profil créateur refait en Flutter (natif app)
Website = version web séparée
```
➕ Expérience native  
➖ Double maintenance (web + mobile)

**Option C - Deep link → navigateur externe**
```
Ouvre navigateur système (Safari, Chrome)
User sort de l'app
```
➕ Implémentation très simple  
➖ Friction utilisateur

**DÉCISION À PRENDRE :**
- [ ] Option A (web view)
- [ ] Option B (navigation native)
- [ ] Option C (navigateur externe)

---

### **QUESTION 5 - Landing Page : À Qui Parle-t-elle ?**

**Option A - Parle AUX créateurs (recrutement)**
```
Landing page = pitch créateur
Objectif : signup créateur
Contenu : modèle économique, revenus, témoignages
```

**Option B - Parle DES créateurs (vitrine pour utilisateurs)**
```
Landing page = catalogue créateurs
Objectif : télécharger app
Contenu : découverte recettes, créateurs, Mode Fan
```

**Option C - Les deux (sections séparées)**
```
Section 1 : Pour créateurs (devenir créateur)
Section 2 : Pour utilisateurs (télécharger app)
```

**DÉCISION À PRENDRE :**
- [ ] Option A (créateurs uniquement)
- [ ] Option B (utilisateurs uniquement)
- [ ] Option C (les deux)

---

### **QUESTION 6 - Onboarding Créateur : Premier Écran Après Signup ?**

**Option A - Dashboard vue d'ensemble**
```
Affiche stats vides (0 recettes, 0€)
Navigation libre
```
➕ Pas de forcing  
➖ Peut être démotivant (tout à zéro)

**Option B - Wizard "Crée ta première recette" forcé**
```
Redirige directement vers formulaire création
Doit publier 1 recette avant d'accéder au reste
```
➕ Activation rapide garantie  
➖ Friction, pression

**Option C - Page "Bienvenue" avec choix (RECOMMANDÉ)**
```
Message bienvenue
CTA principal : "Créer ma première recette"
Actions secondaires : explorer dashboard, voir profil, etc.
```
➕ Guidage sans forcing  
➖ Nécessite design page dédiée

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B
- [ ] Option C

---

### **QUESTION 7 - Dashboard Revenus : Niveau de Détail V1 ?**

**Option A - Stats simples**
```
• Revenus du mois : X€
• Consommations totales : Y
• Top 3 recettes
```
➕ Simple, clair  
➖ Peu d'insights

**Option B - Graphiques avancés**
```
• Revenus mois + graphique évolution hebdo
• Breakdown revenus par recette
• Consommations par jour de la semaine
• Projections revenus
```
➕ Insights riches  
➖ Complexité dev, peut overwhelm

**Option C - Progressif (RECOMMANDÉ)**
```
Vue simple au début (< 10 recettes)
Vue avancée débloquée après 10 recettes publiées
```
➕ Adapté au niveau créateur  
➖ Logique conditionnelle

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B
- [ ] Option C

---

### **QUESTION 8 - Formulaire Création Recette : Structure ?**

**VALIDÉ :** Wizard 6 steps

**QUESTION :** Niveau de rigidité du wizard ?

**Option A - Wizard strict (linéaire)**
```
Step 1 → Step 2 → Step 3 → ... → Step 6
Impossible de sauter un step
Validation bloquante à chaque step
```
➕ Guidage fort, qualité garantie  
➖ Rigide, frustrant si créateur veut ajuster

**Option B - Navigation libre avec steps suggérés**
```
Tabs Step 1-6 cliquables librement
Validation à la publication finale
```
➕ Flexibilité  
➖ Moins de guidage, risque d'oublis

**Option C - Hybride (RECOMMANDÉ)**
```
Navigation step-by-step guidée
Mais boutons "Suivant" ET navigation tabs cliquable
Validation non-bloquante (warnings, pas errors)
```
➕ Guidage + flexibilité  
➖ UX plus complexe

**DÉCISION À PRENDRE :**
- [ ] Option A
- [ ] Option B
- [ ] Option C

---

## 🎨 Spécifications Préparatoires

### Upload Images - Specs Techniques (VALIDÉES)

**Image recette (cover) :**
```typescript
{
  formats: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 5 * 1024 * 1024,        // 5MB
  recommendedDimensions: {
    width: 1200,
    height: 800,
    ratio: '3:2'
  },
  resizeBeforeUpload: true,
  bucket: 'recipe-images',
  path: 'covers/{recipe_id}/{filename}'
}
```

**Galerie images recette :**
```typescript
{
  maxImages: 5,
  // Mêmes specs que cover
  bucket: 'recipe-images',
  path: 'gallery/{recipe_id}/{filename}'
}
```

**Avatar créateur :**
```typescript
{
  formats: ['image/jpeg', 'image/png'],
  maxSize: 2 * 1024 * 1024,        // 2MB
  dimensions: {
    width: 400,
    height: 400,
    ratio: '1:1'
  },
  cropRequired: true,
  bucket: 'avatars',
  path: 'creators/{user_id}/{filename}'
}
```

**Libraries suggérées :**
- `react-dropzone` : drag & drop
- `react-image-crop` : crop manuel
- `browser-image-compression` : resize avant upload

---

### Structure Database Supplémentaire

**Table `specialty` (À CRÉER) :**
```sql
CREATE TABLE specialty (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name_fr     text NOT NULL,
  name_en     text NOT NULL,
  region      text REFERENCES food_region(code),
  created_at  timestamptz DEFAULT now()
);
```

**Ajout colonnes `creator` (À VALIDER) :**
```sql
ALTER TABLE creator ADD COLUMN instagram_handle text;
ALTER TABLE creator ADD COLUMN tiktok_handle text;
ALTER TABLE creator ADD COLUMN specialties text[];  -- Array de codes
```

---

### Scripts SQL Seed Data (À CRÉER)

**Fichiers nécessaires :**

1. **`seed/01_food_regions.sql`**
   - ~15 régions culinaires (FR/EN)
   
2. **`seed/02_tags.sql`**
   - ~40-50 tags pertinents (FR/EN + couleur)
   
3. **`seed/03_specialties.sql`**
   - ~12-15 spécialités créateurs (FR/EN)
   
4. **`seed/04_measurement_units.sql`**
   - ~20 unités de mesure (FR/EN + abbréviations)
   
5. **`seed/05_ingredient_reference.sql`**
   - ~200-500 ingrédients de base (focus cuisine africaine)
   - Avec macros pour 100g

**QUESTION :** Est-ce que des listes existent déjà (CSV, Google Sheets) ?
- [ ] Oui, je peux les fournir
- [ ] Non, à créer from scratch
- [ ] Partiellement (préciser lesquelles)

---

## 📝 Notes de la Conversation

### Insights Clés

**Sur la philosophie du réalignment :**
- Ne jamais culpabiliser l'utilisateur
- Partir de ce qui existe (cuisine traditionnelle) pour l'adapter
- Pas de rupture culturelle imposée
- Synchronisation, pas transformation

**Sur le modèle créateur :**
- B2B2C : créateur d'abord, utilisateur ensuite
- Faible barrière d'entrée (2K abonnés suffisent)
- Haute barrière à la sortie (catalogue = actif)
- Transparence économique totale

**Sur les personas :**
- Fatoumata/Marianne 40-45 ans = test ultime
- Invisibles dans discours nutrition dominant
- Créateurs micro/mid-tier > mega-influenceurs

### Décisions Stratégiques Prises

1. **Pas de landing page parrainage** → Annulé
2. **Système parrainage complet** → Annulé
3. **Notifications V1** → En attente
4. **Analytics avancés** → V2
5. **Profil public créateur** → Validé V1
6. **Création compte créateur** → Website uniquement
7. **Validation créateur** → Auto-approved
8. **Username** → Créateurs uniquement

---

## 🎯 Prochaines Actions

**1. Valider les 8 questions ouvertes ci-dessus**

**2. Finaliser les spécifications**
- Seed data scripts SQL (référentiels)
- Structure exacte formulaire création recette
- Flow onboarding créateur détaillé

**3. Créer la documentation technique complète**
- `V1_WEBSITE_ARCHITECTURE.md`
- `V1_WEBSITE_PAGES_CREATOR.md`
- `V1_WEBSITE_PAGES_PUBLIC.md`

**4. Indexer dans MASTER_INDEX.md**

---

*Document créé : Mars 2026*  
*Statut : Questions en suspens — À valider avant dev*
