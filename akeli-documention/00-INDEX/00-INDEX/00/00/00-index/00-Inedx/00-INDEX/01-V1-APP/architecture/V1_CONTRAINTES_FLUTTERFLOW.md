# V1 - Contraintes et Limitations FlutterFlow

## 📋 Contexte

L'application Akeli V0 a été développée avec **FlutterFlow** (no-code) et fonctionne correctement - elle a été approuvée par Apple et Google et a passé avec succès la phase de tests. Cependant, plusieurs **limitations techniques** du no-code ont été identifiées et nécessitent une migration vers **Flutter natif** pour la V1.

---

## 🔴 Contraintes Critiques

### 1. **Queries Supabase Limitées**

#### Problème
FlutterFlow impose des restrictions sur les queries Supabase :
- Pas de queries complexes avec joins multiples
- Logique conditionnelle limitée
- Impossibilité d'utiliser certaines fonctions PostgreSQL avancées

#### Impact
Force l'utilisation d'**Edge Functions** pour des opérations qui devraient être de simples queries SQL, ajoutant de la complexité et de la latence inutiles.

#### Exemple concret
Pour récupérer des recettes avec leurs créateurs, ingrédients et stats de consommation, impossible de faire un query avec les joins nécessaires → création d'une Edge Function dédiée.

---

### 2. **Impossibilité d'utiliser RPC (Remote Procedure Calls)**

#### Problème
FlutterFlow ne permet pas d'appeler directement les **fonctions PostgreSQL** (RPC) depuis l'app.

#### Impact
- Logique métier simple doit être déportée côté serveur (Edge Functions)
- Impossible d'utiliser les stored procedures Supabase
- Duplication de code entre client et serveur

#### Exemple concret
Une fonction PostgreSQL pour calculer les macros d'un repas ne peut pas être appelée directement → Edge Function wrapper nécessaire.

---

### 3. **Architecture Auth Incohérente**

#### Problème
FlutterFlow gère mal l'**authentification Supabase** :
- Difficile d'accéder directement à `auth.uid`
- Force parfois à fetcher des **rows utilisateur** complets au lieu d'utiliser l'ID auth
- Queries inefficaces avec joins inutiles sur la table `users`

#### Impact
- Queries plus lentes (fetch de données inutiles)
- Architecture auth messy
- Sécurité potentiellement compromise (RLS basée sur rows au lieu de auth.uid)

#### Exemple concret
Au lieu de filtrer directement avec `WHERE user_id = auth.uid()`, on doit :
1. Fetcher le user complet depuis la table `users`
2. Extraire le `user_id`
3. Utiliser cet ID dans les queries suivantes

---

### 4. **Liste Recettes : Cache et Pagination Non Scalables**

#### Problème
Le système de **cache** et **pagination** FlutterFlow est rigide :
- Cache global non configurable
- Pagination limitée (fonctionne pour ~20 recettes)
- **Casse complètement** avec une base de 2000+ recettes
- Pas de pagination infinie (infinite scroll)
- Pas de contrôle sur le refresh

#### Impact
- Performance dégradée sur grande volumétrie
- Expérience utilisateur frustrante (lenteur, scroll saccadé)
- Impossible de scaler l'app

#### Exemple concret
La page "Découvrir" avec toutes les recettes :
- V0 : Charge 20 recettes max, pagination cassée ensuite
- V1 nécessaire : Pagination infinie, cache intelligent par catégorie

---

### 5. **Performance Dégradée (Edge Functions)**

#### Problème
L'utilisation excessive d'**Edge Functions** pour pallier les limitations FlutterFlow ajoute de la **latence** :
- Appel HTTP → Edge Function → Query Supabase → Réponse
- Au lieu de : Query Supabase directe

#### Impact
- Temps de chargement augmenté (200-500ms supplémentaires par query)
- Coûts Supabase plus élevés (invocations Edge Functions)
- Complexité accrue (debugging plus difficile)

#### Exemple concret
Récupérer la liste des recettes favorites :
- V0 : App → Edge Function `get-favorites` → Supabase → retour
- V1 : App → Supabase direct avec query RPC

---

### 6. **Debugging Impossible**

#### Problème
FlutterFlow offre **zéro outils de debugging** efficaces :
- Pas de breakpoints
- Logs limités et non structurés
- Impossible de tracer les erreurs précisément
- Stack traces cryptiques ou inexistantes

#### Impact
- Temps de développement allongé (debugging à l'aveugle)
- Bugs difficiles à reproduire
- Frustration développeur maximale

#### Exemple concret
Un crash sur la page profil :
- V0 : Message d'erreur générique "Rendering error", aucune info sur la source
- V1 : Stack trace précise, logs structurés, debugger VSCode

---

## 🟡 Limitations Secondaires

### 7. **State Management Rigide**

#### Problème
FlutterFlow impose son propre système de state management :
- Difficile de partager l'état entre écrans
- Pas de contrôle fin sur le lifecycle
- Impossible d'utiliser Provider, Riverpod, Bloc proprement

#### Impact
- Code non maintenable à long terme
- Duplication de logique
- Bugs de synchronisation d'état

---

### 8. **Customisation Limitée**

#### Problème
Pour sortir des patterns FlutterFlow, il faut du **custom code** :
- Widgets personnalisés complexes
- Animations avancées
- Intégrations tierces

#### Impact
- Design "amateur" malgré une vision claire
- Impossible d'atteindre le niveau de polish professionnel souhaité

---

## ✅ Ce Qui Fonctionne (À Conserver)

### Backend Supabase
- ✅ **Edge Functions métier complexes** (AI meal planning, notifications, cron jobs) → **À garder**
- ✅ **Database schema** bien architecturé
- ✅ **RLS policies** correctes
- ✅ **Triggers et fonctions PostgreSQL** performants

### Architecture Générale
- ✅ Séparation mobile app / creator platform
- ✅ Modèle de données cohérent
- ✅ Flow utilisateur validé

---

## 🎯 Solution V1 : Migration Flutter Natif

### Bénéfices Attendus

#### 1. **Connexion Supabase Directe**
```dart
// V0 FlutterFlow : Impossible
// V1 Flutter natif : Simple query directe
final recipes = await supabase
  .from('receipe')
  .select('*, creator:profiles(*), ingredients:recipe_ingredient(*)')
  .eq('user_id', supabase.auth.currentUser!.id)
  .order('created_at', ascending: false);
```

#### 2. **RPC Direct**
```dart
// V1 : Appeler fonction PostgreSQL directement
final macros = await supabase
  .rpc('calculate_meal_macros', params: {'meal_id': mealId});
```

#### 3. **Auth Standardisée**
```dart
// V1 : Auth UID partout
final userId = supabase.auth.currentUser!.id;
// Toutes les queries utilisent directement userId
```

#### 4. **Pagination Scalable**
```dart
// V1 : Infinite scroll avec cache intelligent
final recipes = await supabase
  .from('receipe')
  .select()
  .range(offset, offset + 20)
  .order('created_at', ascending: false);
```

#### 5. **Debugging Professionnel**
- Breakpoints VSCode
- Logs structurés (logger package)
- Error tracking (Sentry)
- Performance monitoring (Firebase Performance)

---

## 📊 Comparaison Performance V0 vs V1

| Opération | V0 FlutterFlow | V1 Flutter Natif | Gain |
|-----------|----------------|------------------|------|
| Liste recettes (20) | 800ms | 200ms | **75%** |
| Profil utilisateur | 600ms | 150ms | **75%** |
| Recherche recettes | 1200ms | 300ms | **75%** |
| Meal planning | 2000ms | 500ms | **75%** |

*Estimations basées sur l'élimination des Edge Functions inutiles*

---

## 🚀 Prochaines Étapes

1. ✅ **Document créé** : Contraintes identifiées
2. ⏭️ **À créer** : V1_OBJECTIFS_IMPLEMENTATION.md
3. ⏭️ **Planning** : Architecture Flutter V1
4. ⏭️ **Migration** : Backend d'abord, puis frontend progressivement

---

**Date de création** : 21 février 2025  
**Auteur** : Curtis (Fondateur Akeli)  
**Status** : Documentation de référence pour migration V1
