# Akeli — Principe de Validation par le Public

> **Document fondateur — Principe de gouvernance produit.**  
> Akeli ne valide pas les features. Le public valide. Akeli met en avant ce que le public a validé.

**Statut** : Document fondateur  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli

---

## 🎯 Le Principe Fondamental

### Ce Qu'Akeli NE Fait PAS

❌ **Akeli ne décide pas ce qui est "bon" ou "mauvais"**
- Pas de validation éditoriale
- Pas de curation subjective
- Pas de jury qui juge la qualité d'une recette

❌ **Akeli ne filtre pas le contenu créateur**
- Pas de "recette approuvée par Akeli"
- Pas de "badge qualité Akeli"
- Pas de sélection manuelle "top recettes"

❌ **Akeli n'impose pas de vision unique de la nutrition**
- Pas de "cette recette est saine" vs "cette recette ne l'est pas"
- Pas de "bon équilibre nutritionnel" défini par Akeli
- Pas de normalisation du contenu

### Ce Qu'Akeli FAIT

✅ **Le public décide ce qui a de la valeur**
- Les **consommations réelles** = validation
- Les **répétitions** = validation forte
- Les **ajouts favoris** = validation
- Les **abandons** = feedback négatif

✅ **Akeli met en avant ce que le public a validé**
- Algorithme de recommandation basé sur **comportement réel**
- "Top recettes" = **les plus consommées**, pas les plus jolies
- "Créateurs populaires" = **ceux dont les recettes sont répétées**, pas ceux avec plus de followers

✅ **Akeli garantit la qualité technique, pas éditoriale**
- **IA correction** : orthographe, grammaire, cohérence
- **IA validation** : macros réalistes, temps préparation cohérent
- **Pas de jugement** sur le contenu lui-même

---

## 🤖 Le Rôle de l'IA — Qualité Technique, Pas Éditoriale

### IA Comme Correcteur Technique

**Ce que l'IA corrige :**

**1. Orthographe et Grammaire**
```
Créateur écrit : "mètre le ri dans léo bouillant"
IA détecte et suggère : "Mettre le riz dans l'eau bouillante"
Créateur valide ou ignore
```

**2. Cohérence des Quantités**
```
Recette dit : "500ml de riz"
IA détecte : "Probablement 500g de riz (ml = liquide)"
IA suggère : "Tu voulais dire 500g ?"
Créateur décide
```

**3. Macros Réalistes**
```
Recette déclare : "100 kcal pour thiéboudienne (4 portions)"
IA calcule depuis ingrédients : "~520 kcal/portion attendu"
IA alerte : "Les macros semblent incorrectes. Vérifier ?"
Créateur corrige ou confirme
```

**4. Temps Préparation Cohérent**
```
Recette : "Temps préparation : 5 minutes"
Étapes : 10 étapes complexes
IA suggère : "5 minutes semble court pour 10 étapes. Vérifier ?"
```

**5. Complétude**
```
Recette manque image cover
IA alerte : "Image recommandée pour meilleure visibilité"
Créateur décide d'ajouter ou publier quand même
```

### IA NE Juge PAS le Contenu

**Ce que l'IA ne fait PAS :**

❌ **Pas de jugement nutritionnel**
```
MAUVAIS (Akeli ne fait pas ça) :
"Cette recette contient trop de glucides. Recommandé de réduire."

BON (Akeli fait ça) :
"Macros calculées : 520 kcal, 60g glucides, 25g protéines."
```

❌ **Pas de jugement culturel**
```
MAUVAIS :
"Cette recette n'est pas traditionnelle. Modifier les ingrédients."

BON :
Aucun jugement. Le créateur connaît sa culture mieux qu'une IA.
```

❌ **Pas de jugement esthétique**
```
MAUVAIS :
"Cette photo n'est pas professionnelle. Améliorer la présentation."

BON :
Aucun jugement. Le public décidera si la recette est attractive.
```

---

## 📊 Validation par les Données — Le Public Décide

### Comment le Public Valide

**Métriques de validation :**

**1. Consommations**
```
Recette A : 500 consommations
Recette B : 50 consommations

→ Recette A est plus validée par le public
→ Akeli met Recette A plus en avant (recommandations)
```

**2. Taux de Répétition**
```
Recette A : 70% users la répètent (2× ou +)
Recette B : 20% users la répètent

→ Recette A crée plus de valeur réelle
→ Akeli recommande Recette A en priorité
```

**3. Taux de Complétion**
```
Recette A : 85% users terminent la préparation
Recette B : 40% users abandonnent

→ Recette A est plus facile/claire/réaliste
→ Akeli détecte et favorise Recette A
```

**4. Ajout Favoris**
```
Recette A : 60% users ajoutent en favoris
Recette B : 10% users ajoutent en favoris

→ Recette A a plus de valeur perçue
→ Signal fort pour algorithme recommandation
```

**5. Temps de Préparation Réel vs Déclaré**
```
Recette déclare : "30 minutes"
Users mettent en moyenne : 28 minutes

→ Recette fiable, créateur honnête
→ Boost confiance et recommandation
```

### Ce Qu'Akeli Fait avec Ces Données

**Algorithme de Mise en Avant :**

```
Score Recette = 
  (Consommations × 1.0) +
  (Taux Répétition × 2.0) +         ← Poids fort
  (Taux Complétion × 1.5) +
  (Ajout Favoris × 1.0) +
  (Précision Temps × 0.5)

Recettes classées par Score (descendant)
→ Top recettes = plus validées par public
```

**Résultat :**
- Une recette "moche" mais délicieuse et fiable → Score élevé
- Une recette "belle" mais compliquée et abandonnée → Score faible

**Le public décide. Toujours.**

---

## 🚫 Ce Qu'Akeli Ne Valide Jamais

### 1. Goût

**Akeli ne dit jamais :**
- "Cette recette est délicieuse"
- "Ce plat est meilleur que cet autre"

**Akeli dit :**
- "Cette recette a été répétée 500× ce mois"
- "85% des utilisateurs qui l'ont essayée l'ont refaite"

**Le public valide le goût. Pas Akeli.**

---

### 2. Authenticité Culturelle

**Akeli ne dit jamais :**
- "Cette thiéboudienne n'est pas authentique"
- "Ce mafé est mal préparé"

**Akeli dit :**
- "Créée par @aminacuisine (Dakar)"
- "Région : Sénégal"
- "500 utilisateurs l'ont consommée"

**Le créateur est l'autorité culturelle. Pas Akeli.**

---

### 3. Équilibre Nutritionnel "Idéal"

**Akeli ne dit jamais :**
- "Cette recette est trop riche en glucides"
- "Pas assez de protéines"

**Akeli dit :**
- "Macros : 520 kcal, 60g glucides, 25g protéines"
- "Utilisateurs objectif perte poids consomment cette recette 200×/mois"

**Chaque utilisateur a des besoins différents. Le public vote avec ses consommations.**

---

### 4. Innovation vs Tradition

**Akeli ne dit jamais :**
- "Cette version fusion n'est pas correcte"
- "Rester fidèle à la recette originale"

**Akeli montre :**
- Recette traditionnelle par @grandmere (1000 consommations)
- Recette fusion moderne par @chef (800 consommations)

**Les deux existent. Le public choisit ce qu'il consomme.**

---

## ✅ Ce Qu'Akeli Valide — Qualité Technique Uniquement

### Checklist Validation Technique (IA)

**Avant publication, IA vérifie :**

```
✅ Orthographe correcte (ou suggestions données)
✅ Grammaire cohérente
✅ Ingrédients ont quantités réalistes
✅ Étapes sont compréhensibles
✅ Macros cohérentes avec ingrédients (si calculables)
✅ Temps préparation non aberrant (pas 5min pour 10 étapes)
✅ Image cover présente (recommandation, pas obligation)
✅ Minimum 3 ingrédients
✅ Minimum 3 étapes
```

**Si problème détecté :**
```
IA alerte créateur avec suggestion
Créateur peut :
  - Corriger
  - Ignorer et publier quand même
  
Akeli ne bloque jamais la publication.
```

**Exemple :**
```
┌─────────────────────────────────────────┐
│  ⚠️ Vérifications avant publication     │
├─────────────────────────────────────────┤
│  ✅ Orthographe : OK                    │
│  ⚠️  Quantités : "500ml riz" → 500g ?   │
│  ✅ Étapes : claires                    │
│  ⚠️  Temps : 5min semble court          │
│  ✅ Image : présente                    │
├─────────────────────────────────────────┤
│  [Corriger] [Publier quand même]       │
└─────────────────────────────────────────┘
```

**Créateur garde le contrôle final.**

---

## 🌍 Implications Philosophiques

### Pourquoi Ce Principe Est Fondamental

**1. Respect de la Diversité**

Si Akeli validait le contenu, Akeli imposerait **une vision unique** de la nutrition.

Or :
- Une grand-mère sénégalaise sait mieux qu'Akeli ce qui est "bon"
- Un athlète nigérian sait mieux ce qui fonctionne pour lui
- Une mère diaspora connaît mieux les contraintes de sa vie

**Le public est l'expert collectif.**

---

**2. Émergence Organique de la Qualité**

Les meilleures recettes **émergent naturellement** :
- Créateurs innovent
- Public teste
- Ce qui fonctionne se répand
- Ce qui ne fonctionne pas disparaît

**Pas besoin de jury. La consommation est le vote.**

---

**3. Intelligence Collective Vraie**

Si Akeli filtrait, Akeli **imposerait** ses biais.

En laissant le public valider, Akeli **apprend** :
- Quels types de recettes performent pour quels profils
- Quelles innovations marchent
- Quels créateurs créent de la valeur réelle

**L'intelligence vient du collectif, pas d'Akeli.**

---

**4. Responsabilité Créateur**

Le créateur sait que **le public jugera** :
- Pas Akeli
- Pas un algorithme opaque
- Les utilisateurs réels, avec leurs consommations

**Cela crée une accountability directe et honnête.**

---

## 📋 Implications Pratiques Website V1

### Dashboard Créateur

**Affichage stats transparent :**

```
┌─────────────────────────────────────────┐
│  Ta Recette "Thiéboudienne"             │
├─────────────────────────────────────────┤
│  500 consommations                      │
│  70% taux répétition                    │
│  85% taux complétion                    │
│  300 ajouts favoris                     │
├─────────────────────────────────────────┤
│  ℹ️  Cette recette performe dans le     │
│     top 10% de toutes les recettes.     │
│                                         │
│  Le public a validé cette recette.      │
└─────────────────────────────────────────┘
```

**Pas de :**
- "Recette approuvée par Akeli ✓"
- "Qualité vérifiée"
- "Note : 5/5 étoiles"

**Juste :**
- Données brutes
- Comparaison relative (top 10%)
- **Le public a validé**

---

### Profil Public Créateur

**Badge :**
```
❌ PAS ça :
"Créateur certifié Akeli ✓"

✅ ÇA :
"@aminacuisine
 42 recettes | 5,000 consommations
 Top créateur (public)"
```

**Le badge vient des données publiques, pas d'une validation Akeli.**

---

### Catalogue Recettes

**Tri par défaut :**
```
"Recettes les plus consommées" (pas "recommandées par Akeli")
"Créateurs populaires" (pas "sélection Akeli")
```

**Filtres :**
```
✅ Par région, type repas, temps, calories, tags
❌ "Approuvé par nutritionniste"
❌ "Recette premium"
```

---

### IA Explication (Dashboard)

**Ce que l'IA dit :**
```
✅ "Ta recette performe bien car :
    - Temps préparation court (30min)
    - Taux répétition élevé (70%)
    - Le public l'aime"

❌ "Ta recette est excellente nutritionnellement"
❌ "Cette recette mérite 5 étoiles"
```

**L'IA explique les données. Elle ne juge pas.**

---

## 🎯 Principes Directeurs — Validation Publique

### Pour Toute Décision Produit

**Se demander :**

1. **Suis-je en train de juger le contenu ?**
   - Si oui → retirer le jugement, montrer les données

2. **Suis-je en train d'imposer une vision ?**
   - Si oui → laisser le public décider

3. **Est-ce que je filtre basé sur ma perception de qualité ?**
   - Si oui → filtrer uniquement sur données comportement public

4. **Est-ce que je laisse le créateur garder le contrôle ?**
   - Si non → redonner contrôle au créateur

5. **Est-ce que les données publiques sont transparentes ?**
   - Si non → rendre visible

---

## 💡 Exemples Concrets

### Exemple 1 — Recette "Controverse"

**Scénario :**
Un créateur publie "Thiéboudienne Vegan" (controversé pour puristes).

**Ce qu'Akeli NE fait PAS :**
- ❌ Bloquer la publication ("pas authentique")
- ❌ Mettre un warning ("recette non traditionnelle")
- ❌ Cacher de la recherche

**Ce qu'Akeli FAIT :**
- ✅ IA vérifie qualité technique (orthographe, cohérence)
- ✅ Publie normalement
- ✅ Tag "Vegan" visible
- ✅ **Le public décide** : consomme ou pas

**Résultat possible :**
- 500 users vegans consomment → recette validée pour ce segment
- 10 users traditionnalistes consomment → recette pas validée pour eux
- **Les deux vérités coexistent**

---

### Exemple 2 — Créateur Débutant vs Expert

**Scénario :**
Débutant publie recette simple, photos amateur.
Expert publie recette complexe, photos pro.

**Ce qu'Akeli NE fait PAS :**
- ❌ Mettre en avant l'expert par défaut
- ❌ Cacher le débutant
- ❌ "Recette amateur" vs "Recette pro"

**Ce qu'Akeli FAIT :**
- ✅ Les deux publiées équitablement
- ✅ Algorithme recommande basé sur **consommations**
- ✅ Si recette débutant répétée 1000× → top recette
- ✅ Si recette expert abandonnée → score faible

**Le public décide qui crée de la valeur.**

---

### Exemple 3 — Macros "Incorrectes"

**Scénario :**
Créateur déclare macros manuellement, elles semblent fausses.

**Ce qu'Akeli NE fait PAS :**
- ❌ Bloquer publication
- ❌ Forcer correction
- ❌ Marquer "macros non vérifiées"

**Ce qu'Akeli FAIT :**
- ✅ IA alerte : "Macros semblent différentes du calculé (520 kcal vs 350 déclaré). Vérifier ?"
- ✅ Créateur décide : corriger ou garder
- ✅ Recette publiée
- ✅ **Le public décide** : si macros fausses, users l'abandonneront

**La vérité émerge des données comportementales.**

---

## 🔄 Boucle de Feedback — Auto-Régulation

### Le Système S'Auto-Régule

```
Créateur publie recette de mauvaise qualité
    ↓
Users testent
    ↓
Taux complétion faible (abandonné)
Taux répétition faible (pas refait)
    ↓
Score recette faible
    ↓
Algorithme recommande moins
    ↓
Moins de consommations
    ↓
Créateur voit stats faibles
    ↓
IA explique : "Taux complétion 40% (moyenne 75%). 
              Les users abandonnent. Simplifier ?"
    ↓
Créateur améliore (ou pas)
    ↓
Cycle continue
```

**Pas besoin de modération manuelle. Le système s'équilibre.**

---

## 🎯 Récapitulatif Final

**Akeli = Plateforme, pas Juge**

- ✅ Akeli fournit infrastructure
- ✅ Akeli garantit qualité technique (IA)
- ✅ Akeli analyse données comportement
- ✅ Akeli met en avant ce que le **public** a validé
- ❌ Akeli ne juge jamais le contenu

**Le Public = Autorité Finale**

- ✅ Public décide ce qui a de la valeur (consommations)
- ✅ Public valide la qualité (répétitions, complétions)
- ✅ Public fait émerger les meilleurs créateurs (comportement)
- ✅ Public crée l'intelligence collective (données)

**Créateur = Souverain sur son Contenu**

- ✅ Créateur publie ce qu'il veut (dans limites légales/éthiques)
- ✅ Créateur garde contrôle éditorial total
- ✅ Créateur voit feedback transparent (stats)
- ✅ Créateur s'améliore basé sur données réelles

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Principe Validation par le Public*
