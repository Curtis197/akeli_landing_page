# Akeli V1 Website — Architecture Trois Surfaces

> **Document fondateur architecture website.**  
> Définit les trois surfaces distinctes du website Akeli V1 et leurs rôles.

**Statut** : Document fondateur V1 Website  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## 🌍 Principe Fondateur : "Talent is Everywhere"

> "Même une femme n'ayant pas eu accès à l'éducation en Afrique ou un agrégé de philosophie en Europe doivent recevoir le même message et être à égalité. Tous deux peuvent avoir un savoir précieux pour le collectif global."

---

## 📍 Le Website : Trois Surfaces Distinctes

```
┌───────────────────────────────────────────────────────────────────────┐
│                    WEBSITE AKELI (a-keli.com)                         │
├──────────────────────┬──────────────────────┬─────────────────────────┤
│  SURFACE PUBLIQUE    │  SURFACE DÉCOUVERTE  │  ESPACE CRÉATEUR        │
│  (Marketing)         │  (Marketplace)       │  (Authentifié)          │
├──────────────────────┼──────────────────────┼─────────────────────────┤
│ Audience :           │ Audience :           │ Audience :              │
│ • Utilisateurs       │ • Utilisateurs       │ • Créateurs actifs      │
│   potentiels         │   curieux            │ • Créateurs potentiels  │
│ • Découverte Akeli   │ • Découverte recettes│                         │
│                      │ • Découverte créateurs│                        │
│                      │                      │                         │
│ Objectif :           │ Objectif :           │ Objectif :              │
│ • Présenter Akeli    │ • Découvrir créateurs│ • Recruter créateurs    │
│ • Présenter app      │ • Découvrir recettes │ • CRUD recettes         │
│ • Donner confiance   │ • SEO / Acquisition  │ • Analytics revenus     │
│                      │ • Télécharger app    │ • Communication interne │
│                      │                      │ • IA assistant          │
│                      │                      │                         │
│ Contenu :            │ Contenu :            │ Contenu :               │
│ • Landing page       │ • Profils publics    │ • Dashboard             │
│ • À propos           │   créateurs          │ • Gestion catalogue     │
│ • Pages légales      │ • Catalogue recettes │ • Création/édition      │
│                      │ • Détail recettes    │ • Analytics détaillées  │
│                      │ • Recherche/filtres  │ • Chat créateurs        │
│                      │                      │ • Chat support Akeli    │
│                      │                      │ • IA correction/analyse │
│                      │                      │                         │
│ Ton :                │ Ton :                │ Ton :                   │
│ • Simple             │ • Inspirant          │ • Professionnel         │
│ • Factuel            │ • Descriptif         │ • Business concret      │
│ • Sans prosélytisme  │ • Accessible         │ • Respectueux           │
│                      │                      │ • Collaboratif          │
│                      │                      │                         │
│ Engagement :         │ Engagement :         │ Engagement :            │
│ • Faible (lecture)   │ • Moyen (exploration)│ • Élevé (création)      │
│ • 2-3 pages          │ • Navigation libre   │ • Plusieurs pages       │
└──────────────────────┴──────────────────────┴─────────────────────────┘
```

---

## 🌐 SURFACE 1 — PUBLIC

[Contenu identique au document précédent - Landing page, À propos, Légales]

---

## 🔍 SURFACE 2 — DÉCOUVERTE (Marketplace Créateurs)

### Objectif Principal

**Rendre créateurs découvrables** pour acquisition organique d'utilisateurs.

**Rôles stratégiques :**
- ✅ **SEO Créateurs** : Référencement profils créateurs
- ✅ **Acquisition organique** : Découverte via recherche créateurs
- ✅ **Vitrine créateur** : Montrer richesse du catalogue créateur
- ✅ **Incitation téléchargement** : Voir aperçu, télécharger app pour recettes complètes

**Principe clé :**
> Les **créateurs sont découvrables** sur le web.  
> Les **recettes complètes** sont accessibles **uniquement dans l'app Akeli**.

**Stratégie :**
- Focus découverte **CRÉATEURS** (pas recettes individuelles)
- Teasing recettes (aperçu) pour inciter téléchargement app
- CTA omniprésent : "Découvre toutes les recettes dans l'app"

### Pages Découverte

**1. Catalogue Créateurs** (`/creators`)

Liste tous les créateurs avec filtres (région, spécialité)

**2. Profil Public Créateur** (`/creator/[username]`)

- Avatar, bio, stats publiques
- Badge Mode Fan si éligible
- **Grid recettes du créateur (aperçu uniquement)**
  - Image cover
  - Titre
  - Temps + Calories
  - **Pas d'ingrédients, pas d'étapes**
- CTA : "Découvre toutes ses recettes dans l'app"

**3. Catalogue Recettes Global** (`/recipes`) — **OPTIONNEL V1**

Liste toutes les recettes en aperçu avec filtres
- **Question :** Cette page est-elle nécessaire V1 ou focus uniquement sur créateurs ?
- **Recommandation :** Skip V1, focus sur `/creators` et `/creator/[username]`

**4. Détail Recette** (`/recipe/[slug]`) — **PAS DE ROUTE ID**

**Contenu visible publiquement (TEASING) :**
- ✅ Image cover (grande)
- ✅ Titre, description (150 chars)
- ✅ Macros (calories, protéines, glucides, lipides)
- ✅ Temps préparation, difficulté, portions
- ✅ Par @créateur (lien vers profil créateur)
- ✅ Tags
- ❌ **PAS d'ingrédients complets**
- ❌ **PAS d'étapes de préparation**

**Teasing ingrédients (optionnel) :**
```
Ingrédients principaux :
• Riz
• Poisson
• Légumes
• ... et 5 autres ingrédients

[Voir la recette complète dans l'app →]
```

**CTA principal massif :**
```
┌─────────────────────────────────────────┐
│  Cette recette est disponible           │
│  uniquement dans l'app Akeli             │
│                                          │
│  [📱 Télécharger l'app]                 │
│                                          │
│  Découvre aussi les autres recettes de  │
│  @créateur_name                          │
│  [→ Voir son profil]                    │
└─────────────────────────────────────────┘
```

**SEO page recette :**
- Title : "[Titre recette] par [Créateur] | Akeli"
- Meta description : "[Description]. Découvre cette recette et [X] autres dans l'app Akeli."
- Schema.org Recipe markup (partiel - pour apparaître dans recherche Google)
- Open Graph image (cover)

**Stratégie :** La page recette sert de **landing page teasing** pour acquisition, pas de contenu complet.

---

### Principes Surface Découverte

**Focus CRÉATEURS, pas recettes individuelles**

**Hiérarchie information :**
```
1. Créateur (profil complet, bio, stats)
   ↓
2. Catalogue créateur (grid recettes aperçu)
   ↓
3. Recette individuelle (teasing uniquement)
   ↓
4. CTA téléchargement app
```

**CTA non agressifs mais omniprésents**
- ✅ Présent sur chaque page
- ✅ Sticky header badge
- ✅ CTA après chaque section
- ✅ CTA massif sur page recette (car frustration = motivation télécharger)
- ❌ Jamais de popup bloquante

**Navigation fluide créateur-centrée**
- Recherche créateurs (par nom, région, spécialité)
- Filtres créateurs
- Découverte "Créateurs similaires"
- Pas de recherche recettes globale (ou minimaliste)

---

## 🛠️ SURFACE 3 — ESPACE CRÉATEUR (Authentifié)

### Objectif Principal

**Équiper les créateurs avec les outils professionnels** pour :
1. Créer et gérer leur catalogue
2. Analyser leurs performances
3. Optimiser leur contenu
4. Communiquer avec la communauté
5. Bénéficier de l'IA comme égalisateur

### Le Rôle Central de l'IA : Le Grand Égalisateur

**Philosophie :**
> L'IA permet à tous les créateurs, quel que soit leur niveau d'éducation ou de maîtrise technique, d'accéder aux mêmes outils professionnels.

**L'IA comme assistant universel :**

**1. Correction et Amélioration de Recettes**
```
Créateur saisit une recette avec des erreurs ou imprécisions
↓
IA analyse :
  - Grammaire et orthographe
  - Cohérence des quantités
  - Macros calculées correctement ?
  - Instructions claires ?
↓
IA suggère corrections en language naturel :
  "Il semble que tu aies écrit '500ml de riz' — 
   tu voulais dire '500g' ?"
```

**2. Explication en Langage Naturel**
```
Créateur voit ses analytics mais ne comprend pas
↓
IA explique :
  "Ta recette 'Thiéboudienne' a été consommée 
   45 fois cette semaine (+20% vs semaine dernière).
   
   Cela signifie que 45 utilisateurs l'ont ajoutée 
   à leur plan alimentaire.
   
   À ce rythme, tu atteindras 1€ de revenus dans 15 jours."
```

**3. Traduction Universelle (Toutes Langues)**
```
Créateur écrit recette en Wolof
↓
IA traduit en :
  - Français
  - Anglais
  - Espagnol
  - Portugais
  - Arabe
  - ... (toutes langues supportées)
↓
Créateur peut corriger si besoin
```

**4. Analyse et Insights**
```
Créateur demande :
  "Pourquoi ma recette X performe mieux que Y ?"
↓
IA analyse :
  - Temps de préparation (X = 30min, Y = 60min)
  - Calories (X plus adapté aux objectifs users)
  - Tags (X a plus de tags recherchés)
  - Moment publication (X publiée dimanche soir)
↓
IA explique en français simple :
  "Ta recette X est plus rapide à préparer.
   Les utilisateurs Akeli cherchent souvent des 
   recettes < 45 minutes en semaine."
```

### Fonctionnalités Espace Créateur

**1. Dashboard** 

**Vue d'ensemble :**
- Revenus du mois (€)
- Consommations totales
- Top 5 recettes
- Progression vers objectifs (30 recettes Mode Fan)
- Graphiques évolution

**IA Assistant dans Dashboard :**
- Bouton "Explique-moi mes stats" 
- IA génère rapport en language naturel

---

**2. Gestion Catalogue (CRUD Recettes)**

**Mes Recettes :**
- Liste complète (publiées + brouillons)
- Filtres (type, région, statut)
- Édition rapide
- Duplication
- Dépublication temporaire

**Création/Édition Recette :**
- Wizard 6 steps
- Auto-save
- **IA Correction en temps réel** :
  - Orthographe/grammaire
  - Cohérence quantités
  - Suggestions amélioration
- Preview avant publication
- Traduction automatique (IA)

**IA pendant création :**
```
Créateur écrit étape : 
  "mètre le ri dans léo bouillant"

IA détecte erreurs, suggère :
  "Tu voulais dire : 
   'Mettre le riz dans l'eau bouillante' ?"
  
  [Accepter] [Ignorer] [Modifier]
```

---

**3. Analytics Détaillées**

**Par recette :**
- Consommations (graphique)
- Revenus générés
- Taux ajout favoris
- Démographie consommateurs (V2)

**IA Analyse :**
- "Explique-moi cette recette"
- "Pourquoi elle performe bien ?"
- "Comment l'améliorer ?"

---

**4. Communication Créateurs**

**Chat Privé Créateur ↔ Créateur**
- Messaging direct entre créateurs
- Partage d'expériences
- Entraide communauté

**Groupes Créateurs**
- Groupes thématiques (par région, par spécialité)
- Discussions collectives
- Annonces équipe Akeli

**Chat Support (Créateur ↔ Équipe Akeli)**
- Support direct
- Questions techniques
- Feedback plateforme

**IA dans Chat :**
- Traduction automatique messages (si langues différentes)
- Suggestions réponses (optionnel)

---

**5. Profil & Paramètres**

**Mon Profil Public :**
- Preview profil public
- Édition bio, spécialités, réseaux sociaux
- Upload avatar

**Paramètres :**
- Email, password
- Langue interface
- Notifications (V2)
- Préférences IA (niveau assistance)

---

### Principes UX Espace Créateur

**Accessible à tous niveaux d'éducation**

**Exemple concret :**

**Créateur sans éducation formelle :**
- Interface visuelle claire (icons + texte)
- IA explique chaque action en language simple
- Validation non-bloquante (warnings, pas erreurs)
- Aide contextuelle partout (? icon)

**Créateur éduqué :**
- Raccourcis clavier
- Édition avancée (markdown support ?)
- Analytics détaillées disponibles
- Peut désactiver assistance IA si souhaité

**Les deux ont accès aux mêmes outils**, juste avec niveaux d'assistance différents.

---

**Progressivité de l'interface**

**Niveau 1 - Créateur débutant (< 10 recettes) :**
- Dashboard simplifié
- Tutoriels intégrés
- IA très présente (suggestions, corrections)
- Gamification subtile (badges progression)

**Niveau 2 - Créateur intermédiaire (10-30 recettes) :**
- Analytics plus détaillées
- Outils batch (édition multiple)
- IA moins intrusive (activable au besoin)

**Niveau 3 - Créateur avancé (> 30 recettes, Mode Fan) :**
- Vue complète analytics
- Export données
- IA sur demande uniquement

**Transition automatique** basée sur nombre de recettes, **mais réversible** (créateur peut choisir son niveau d'assistance).

---

## 🤖 L'IA : Spécifications Détaillées

### Cas d'Usage IA par Feature

**1. Création Recette**

**Correction orthographe/grammaire** (temps réel)
- Détection erreurs
- Suggestions contextuelles
- Multi-langue (FR, EN, Wolof, etc.)

**Validation cohérence** (à la soumission)
- Quantités réalistes ? (500kg riz = erreur probable)
- Macros calculées cohérentes avec ingrédients ?
- Temps préparation réaliste ?

**Amélioration contenu** (optionnel)
- "Rendre titre plus engageant ?"
- "Description trop courte, ajouter contexte culturel ?"

---

**2. Traduction**

**Automatique à la publication :**
- Recette FR → EN (Gemini API)
- Détection langue source
- Traduction ingrédients (avec fallback base référence)
- Traduction instructions

**Correction post-traduction :**
- Créateur peut éditer traductions
- IA suggère si détecte incohérence

---

**3. Analytics Expliquées**

**Questions prédéfinies :**
- "Explique-moi mon dashboard"
- "Pourquoi cette recette performe bien ?"
- "Comment atteindre 1€ plus vite ?"

**IA génère réponse personnalisée :**
```
User demande : "Pourquoi ma recette Mafé performe bien ?"

IA analyse données :
  - 67 consommations ce mois
  - 85% taux ajout favoris
  - Temps préparation 35min (optimal)
  - Tags populaires (#Quick #Comfort #HighProtein)
  - Publié dimanche soir (moment optimal)

IA répond :
  "Ta recette Mafé a 3 atouts :
   
   1. Temps de préparation (35min) 
      → Les utilisateurs cherchent recettes < 45min
   
   2. Tes tags (#Quick #Comfort) 
      → Très recherchés en semaine
   
   3. Publié dimanche soir
      → Moment où users planifient leur semaine
   
   Continue sur cette lancée ! 🎯"
```

---

**4. Chat Support**

**IA première ligne (optionnel) :**
- Répond questions fréquentes
- "Comment publier recette ?"
- "Quand je reçois mes revenus ?"

**Escalade humain :**
- Si question complexe → transféré équipe Akeli
- Créateur peut demander "Parler à un humain"

---

### Paramètres IA (Personnalisation)

**Niveau assistance IA :**
```
[ ] Maximale (IA corrige/suggère automatiquement)
[x] Équilibrée (IA suggère, créateur valide)
[ ] Minimale (IA sur demande uniquement)
[ ] Désactivée (pas d'IA)
```

**Langue interface :**
- Français, Anglais, (Wolof V2 ?)

**Langue préférée réponses IA :**
- Peut être différente de langue interface
- Exemple : Interface EN, réponses IA FR

---

## 🎯 Récapitulatif — Les Trois Surfaces

| Critère | Surface Publique | Surface Découverte | Espace Créateur |
|---------|------------------|-------------------|-----------------|
| **URL** | `/` `/about` | `/creators` `/creator/[username]` | `/dashboard` `/create` |
| **Auth** | Non | Non | Oui |
| **Audience** | Utilisateurs potentiels | Utilisateurs curieux | Créateurs |
| **Objectif** | Présenter Akeli | Découvrir créateurs | Créer et gérer |
| **SEO** | Basique | **Critique (créateurs)** | Non indexé |
| **Contenu** | Marketing | Profils créateurs + aperçu recettes | CRUD + Analytics |
| **Recettes** | N/A | **Aperçu uniquement (teasing)** | Complètes (création) |
| **IA** | Non | Non | **Omniprésente** |
| **Ton** | Simple, factuel | Inspirant, incitatif | Professionnel, collaboratif |
| **CTA** | Télécharger app | **Télécharger app (massif)** | Créer recette |

---

## 💡 Principes Directeurs Finaux

### Pour Toute Décision

**Se demander :**

1. **Surface Publique :**
   - Est-ce simple et sans prosélytisme ?
   - Parle-t-on à tous sans exclusion ?

2. **Surface Découverte :**
   - Le contenu est-il entièrement accessible ?
   - Le SEO est-il optimisé ?
   - Les CTA sont-ils non-agressifs ?

3. **Espace Créateur :**
   - L'IA aide-t-elle vraiment tous les niveaux ?
   - Un créateur sans éducation formelle peut-il utiliser cet outil ?
   - Un créateur éduqué se sent-il respecté ?
   - Suit-on "Talent is everywhere" ?

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Architecture Trois Surfaces Website V1*
