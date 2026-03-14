# V1 Recipe Schema Additions

**Date :** Mars 2026  
**Auteur :** Curtis — Fondateur Akeli  
**Statut :** ✅ Validé — prêt à appliquer  
**Migration file :** `V1_RECIPE_SCHEMA_ADDITIONS.sql`  
**Prérequis :** `V1_MIGRATION_COMPLETE.sql` appliqué

---

## Contexte

Lors de l'audit du schéma V1 avant la migration Flutter, cinq lacunes ont été identifiées dans le système recette :

1. Les étapes de préparation étaient stockées comme un `text` brut (`recipe.instructions`) — héritage V0, incompatible avec l'affichage riche (timer, image par étape, titre).
2. Aucune table de sauvegarde (bookmarks) n'existait.
3. Aucun suivi des impressions (carte vue dans le feed) ni des ouvertures (recette tapée) n'était prévu.

Ces tables sont nécessaires pour : l'expérience Flutter V1, les analytics créateur, et le moteur de recommandation (signal passif utilisateur).

---

## Changements appliqués

### 1. DROP `recipe.instructions`

**Raison :** remplacé par `recipe_step` (structure riche).  
**Safe :** la table `recipe` contait 0 lignes au moment de la migration.

> **Note :** `recipe_translation.instructions` reste intact en V1. Il stocke les instructions traduites sous forme de bloc texte. La traduction étape par étape est prévue en **V2**.

---

### 2. `recipe_step` — Étapes structurées

Stocke les étapes de préparation d'une recette, une par ligne, ordonnées par `step_number`.

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | uuid | NO | PK |
| `recipe_id` | uuid | NO | FK → `recipe(id)` CASCADE |
| `step_number` | int | NO | Ordre de l'étape (1, 2, 3…) |
| `title` | text | YES | Titre optionnel de l'étape |
| `content` | text | NO | Texte de l'instruction |
| `image_url` | text | YES | Photo optionnelle de l'étape |
| `timer_seconds` | int | YES | Durée timer optionnelle (ex: 600 = 10 min) |
| `created_at` | timestamptz | YES | |

**Contrainte :** `UNIQUE (recipe_id, step_number)` — pas de doublon d'ordre par recette.

**Index :** `idx_recipe_step_recipe` sur `recipe_id`.

**RLS :**
- SELECT public → recettes publiées uniquement
- INSERT / UPDATE / DELETE → créateur de la recette uniquement

**Usage Flutter :** liste ordonnée affichée dans `RecipeDetailPage`. Step par step en mode cuisine.  
**Usage Website :** formulaire de création recette (wizard étapes).

---

### 3. `recipe_save` — Bookmarks

Table de jonction : un utilisateur sauvegarde une recette pour y revenir.

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `user_id` | uuid | NO | PK + FK → `user_profile(id)` CASCADE |
| `recipe_id` | uuid | NO | PK + FK → `recipe(id)` CASCADE |
| `saved_at` | timestamptz | YES | Date de sauvegarde |

**Contrainte :** PK composite `(user_id, recipe_id)` — une seule sauvegarde par recette par utilisateur.

**Index :** `idx_recipe_save_user` sur `user_id`.

**RLS :** owner only — un utilisateur ne voit et ne modifie que ses propres sauvegardes.

**V2 :** collections / dossiers de sauvegarde (catégorisation des bookmarks).

---

### 4. `recipe_impression` — Carte vue

Enregistre chaque fois qu'une carte recette est rendue visible à l'utilisateur (feed, search, meal planner). Signal **passif** — l'utilisateur n'a pas nécessairement agi.

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | uuid | NO | PK |
| `recipe_id` | uuid | NO | FK → `recipe(id)` CASCADE |
| `user_id` | uuid | YES | FK → `user_profile(id)` SET NULL — nullable (anonyme) |
| `source` | text | NO | `feed` / `search` / `meal_planner` |
| `seen_at` | timestamptz | YES | |

**Index :** `idx_recipe_impression_recipe`, `idx_recipe_impression_user`.

**RLS :**
- INSERT authentifié → direct depuis Flutter
- INSERT anonyme → via Next.js API route (service key) pour les visiteurs website
- SELECT → créateur lit les impressions de ses recettes uniquement

**`ON DELETE SET NULL` sur `user_id`** : si un utilisateur supprime son compte, les impressions restent pour préserver les analytics créateur.

**Valeur analytique :** taux de clic = `recipe_open / recipe_impression` par recette → indicateur de performance de la couverture et du titre.

---

### 5. `recipe_open` — Recette ouverte + session

Enregistre chaque ouverture de la vue détail. Signal **intentionnel**. La durée de session est calculée côté client et envoyée en une seule requête PATCH à la fermeture.

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | uuid | NO | PK |
| `recipe_id` | uuid | NO | FK → `recipe(id)` CASCADE |
| `user_id` | uuid | YES | FK → `user_profile(id)` SET NULL — nullable (anonyme) |
| `source` | text | NO | `feed` / `search` / `meal_planner` — provenance |
| `opened_at` | timestamptz | YES | Défini à l'insertion |
| `closed_at` | timestamptz | YES | Défini au PATCH de fermeture |
| `session_duration_seconds` | int | YES | Calculé côté client, envoyé au PATCH |

**Index :** `idx_recipe_open_recipe`, `idx_recipe_open_user`.

**RLS :**
- INSERT → authentifié direct (Flutter) ou anonyme via service key (Next.js)
- UPDATE → owner uniquement (pour envoyer `closed_at` + `session_duration_seconds`)
- SELECT → créateur lit les opens de ses recettes

**Implémentation client :**

```dart
// Flutter — à l'ouverture de RecipeDetailPage
final openId = await supabase.from('recipe_open').insert({
  'recipe_id': recipeId,
  'user_id': currentUserId,
  'source': source, // 'feed' | 'search' | 'meal_planner'
}).select('id').single();

// À la fermeture (dispose ou WillPopScope)
final duration = DateTime.now().difference(openedAt).inSeconds;
await supabase.from('recipe_open')
  .update({
    'closed_at': DateTime.now().toIso8601String(),
    'session_duration_seconds': duration,
  })
  .eq('id', openId['id']);
```

```typescript
// Next.js API route — pour inserts anonymes (website)
// Route : POST /api/track/impression
// Route : POST /api/track/open
// Utilise supabaseAdmin (service key) — jamais exposé côté client
```

---

## Tableau récapitulatif

| Table | Rôle | Signal |
|-------|------|--------|
| `recipe_step` | Structure les étapes de préparation | — |
| `recipe_save` | Bookmarks utilisateur | Intentionnel fort |
| `recipe_impression` | Carte recette affichée | Passif |
| `recipe_open` | Recette ouverte + durée session | Intentionnel |

---

## Impact sur d'autres documents

| Document | Impact |
|----------|--------|
| `V1_DATABASE_SCHEMA.md` | Ajouter les 4 nouvelles tables + noter le DROP de `recipe.instructions` |
| `V1_MIGRATION_COMPLETE.sql` | Ce fichier est le complément — ne pas modifier l'original |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Les routes Next.js de tracking anonymous sont à documenter lors de l'implémentation website |
| `CREATOR_ANALYTICS_DASHBOARD.md` | `recipe_impression` et `recipe_open` alimentent les métriques : taux de clic, durée moyenne de session, reach |
| `FEED_GENERATION.md` | `recipe_impression` et `recipe_open` sont des signaux d'entrainement pour le moteur de recommandation |

---

## Note V2

- `recipe_step_translation` : traduction des étapes par langue (actuellement `recipe_translation.instructions` = bloc texte brut)
- `recipe_save` collections : dossiers de sauvegarde catégorisés
- Sources supplémentaires pour `recipe_impression` / `recipe_open` : `profile`, `chat`, `external`

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0*
