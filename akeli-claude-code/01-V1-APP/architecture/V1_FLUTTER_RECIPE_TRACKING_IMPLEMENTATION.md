# Akeli V1 — Flutter Recipe Tracking Implementation

> Document d'implémentation pour Claude Code.
> Couvre le tracking des impressions et sessions recette dans l'application Flutter V1.
> En cas de contradiction, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.

**Statut** : Référence V1 Flutter — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Tables concernées** : `recipe_impression`, `recipe_open`  
**Document associé** : `V1_RECIPE_SCHEMA_ADDITIONS.md`

---

## Vue d'ensemble

Deux événements sont trackés côté Flutter :

| Événement | Table | Déclencheur | Signal |
|-----------|-------|-------------|--------|
| Impression | `recipe_impression` | Carte recette rendue visible dans le feed/search/meal planner | Passif — reach |
| Open + Session | `recipe_open` | Utilisateur tape sur une recette + quitte la vue détail | Intentionnel — engagement |

**Principe général :**
- Tous les inserts se font **directement via le client Supabase Flutter** (pas d'Edge Function).
- La session (`closed_at`, `session_duration_seconds`) est calculée côté client et envoyée en une seule requête PATCH à la fermeture de la vue détail.
- Le tracking est **non-bloquant** — une erreur de tracking ne doit jamais bloquer l'expérience utilisateur.
- Les inserts se font en **fire-and-forget** : pas d'attente de confirmation UI.

---

## Architecture des fichiers

```
lib/
├── features/
│   └── recipe/
│       ├── data/
│       │   ├── repositories/
│       │   │   └── recipe_tracking_repository.dart   ← Couche data
│       │   └── datasources/
│       │       └── recipe_tracking_datasource.dart   ← Appels Supabase
│       ├── domain/
│       │   ├── entities/
│       │   │   └── recipe_tracking.dart              ← Entités
│       │   └── repositories/
│       │       └── i_recipe_tracking_repository.dart ← Interface
│       └── presentation/
│           ├── providers/
│           │   └── recipe_tracking_provider.dart     ← Riverpod providers
│           ├── widgets/
│           │   └── recipe_card.dart                  ← Impression tracking
│           └── pages/
│               └── recipe_detail_page.dart           ← Open + Session tracking
```

---

## 1. Entités

### `lib/features/recipe/domain/entities/recipe_tracking.dart`

```dart
enum TrackingSource {
  feed,
  search,
  mealPlanner;

  String get value {
    switch (this) {
      case TrackingSource.feed:         return 'feed';
      case TrackingSource.search:       return 'search';
      case TrackingSource.mealPlanner:  return 'meal_planner';
    }
  }
}

class RecipeImpression {
  final String recipeId;
  final String? userId;  // nullable — utilisateur non connecté possible
  final TrackingSource source;
  final DateTime seenAt;

  const RecipeImpression({
    required this.recipeId,
    this.userId,
    required this.source,
    required this.seenAt,
  });
}

class RecipeOpen {
  final String id;          // UUID retourné par Supabase après l'insert
  final String recipeId;
  final String? userId;
  final TrackingSource source;
  final DateTime openedAt;

  const RecipeOpen({
    required this.id,
    required this.recipeId,
    this.userId,
    required this.source,
    required this.openedAt,
  });
}
```

---

## 2. Interface Repository

### `lib/features/recipe/domain/repositories/i_recipe_tracking_repository.dart`

```dart
abstract class IRecipeTrackingRepository {
  /// Enregistre une impression (carte vue dans le feed/search/meal planner).
  /// Fire-and-forget — ne throw pas.
  Future<void> trackImpression({
    required String recipeId,
    required TrackingSource source,
  });

  /// Enregistre l'ouverture d'une recette.
  /// Retourne le RecipeOpen avec l'id Supabase (nécessaire pour le PATCH de fermeture).
  /// Retourne null en cas d'erreur (non-bloquant).
  Future<RecipeOpen?> trackOpen({
    required String recipeId,
    required TrackingSource source,
  });

  /// Met à jour la session à la fermeture de la vue détail.
  /// Fire-and-forget — ne throw pas.
  Future<void> trackClose({
    required String openId,
    required DateTime openedAt,
  });
}
```

---

## 3. Datasource

### `lib/features/recipe/data/datasources/recipe_tracking_datasource.dart`

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class RecipeTrackingDatasource {
  final SupabaseClient _client;

  RecipeTrackingDatasource(this._client);

  Future<void> insertImpression({
    required String recipeId,
    required String source,
    String? userId,
  }) async {
    await _client.from('recipe_impression').insert({
      'recipe_id': recipeId,
      'user_id': userId,
      'source': source,
      'seen_at': DateTime.now().toIso8601String(),
    });
  }

  /// Retourne l'id de la ligne insérée (nécessaire pour le PATCH de fermeture).
  Future<String?> insertOpen({
    required String recipeId,
    required String source,
    String? userId,
  }) async {
    final response = await _client
        .from('recipe_open')
        .insert({
          'recipe_id': recipeId,
          'user_id': userId,
          'source': source,
          'opened_at': DateTime.now().toIso8601String(),
        })
        .select('id')
        .single();

    return response['id'] as String?;
  }

  Future<void> updateClose({
    required String openId,
    required DateTime closedAt,
    required int sessionDurationSeconds,
  }) async {
    await _client.from('recipe_open').update({
      'closed_at': closedAt.toIso8601String(),
      'session_duration_seconds': sessionDurationSeconds,
    }).eq('id', openId);
  }
}
```

---

## 4. Repository Implementation

### `lib/features/recipe/data/repositories/recipe_tracking_repository.dart`

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class RecipeTrackingRepository implements IRecipeTrackingRepository {
  final RecipeTrackingDatasource _datasource;
  final SupabaseClient _client;

  RecipeTrackingRepository(this._datasource, this._client);

  String? get _currentUserId => _client.auth.currentUser?.id;

  @override
  Future<void> trackImpression({
    required String recipeId,
    required TrackingSource source,
  }) async {
    try {
      await _datasource.insertImpression(
        recipeId: recipeId,
        source: source.value,
        userId: _currentUserId,
      );
    } catch (e) {
      // Non-bloquant — on log silencieusement, on ne throw pas
      debugPrint('[RecipeTracking] impression error: $e');
    }
  }

  @override
  Future<RecipeOpen?> trackOpen({
    required String recipeId,
    required TrackingSource source,
  }) async {
    try {
      final openedAt = DateTime.now();
      final id = await _datasource.insertOpen(
        recipeId: recipeId,
        source: source.value,
        userId: _currentUserId,
      );
      if (id == null) return null;

      return RecipeOpen(
        id: id,
        recipeId: recipeId,
        userId: _currentUserId,
        source: source,
        openedAt: openedAt,
      );
    } catch (e) {
      debugPrint('[RecipeTracking] open error: $e');
      return null;
    }
  }

  @override
  Future<void> trackClose({
    required String openId,
    required DateTime openedAt,
  }) async {
    try {
      final closedAt = DateTime.now();
      final duration = closedAt.difference(openedAt).inSeconds;

      await _datasource.updateClose(
        openId: openId,
        closedAt: closedAt,
        sessionDurationSeconds: duration,
      );
    } catch (e) {
      debugPrint('[RecipeTracking] close error: $e');
    }
  }
}
```

---

## 5. Riverpod Providers

### `lib/features/recipe/presentation/providers/recipe_tracking_provider.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final recipeTrackingDatasourceProvider = Provider<RecipeTrackingDatasource>(
  (ref) => RecipeTrackingDatasource(Supabase.instance.client),
);

final recipeTrackingRepositoryProvider = Provider<IRecipeTrackingRepository>(
  (ref) => RecipeTrackingRepository(
    ref.watch(recipeTrackingDatasourceProvider),
    Supabase.instance.client,
  ),
);
```

---

## 6. Impression — RecipeCard Widget

L'impression est trackée via `VisibilityDetector` : la carte doit être visible **au moins 1 seconde** avant de logger l'impression, pour éviter les faux positifs lors du scroll rapide.

### `lib/features/recipe/presentation/widgets/recipe_card.dart`

```dart
import 'package:visibility_detector/visibility_detector.dart';

class RecipeCard extends ConsumerStatefulWidget {
  final Recipe recipe;
  final TrackingSource source;

  const RecipeCard({
    super.key,
    required this.recipe,
    required this.source,
  });

  @override
  ConsumerState<RecipeCard> createState() => _RecipeCardState();
}

class _RecipeCardState extends ConsumerState<RecipeCard> {
  bool _impressionLogged = false;
  Timer? _visibilityTimer;

  @override
  void dispose() {
    _visibilityTimer?.cancel();
    super.dispose();
  }

  void _onVisibilityChanged(VisibilityInfo info) {
    // Seuil : 50% de la carte visible
    if (info.visibleFraction >= 0.5 && !_impressionLogged) {
      _visibilityTimer ??= Timer(const Duration(seconds: 1), () {
        if (!_impressionLogged && mounted) {
          _impressionLogged = true;
          ref.read(recipeTrackingRepositoryProvider).trackImpression(
            recipeId: widget.recipe.id,
            source: widget.source,
          );
        }
      });
    } else if (info.visibleFraction < 0.5) {
      _visibilityTimer?.cancel();
      _visibilityTimer = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return VisibilityDetector(
      key: Key('recipe-card-${widget.recipe.id}'),
      onVisibilityChanged: _onVisibilityChanged,
      child: GestureDetector(
        onTap: () => context.push(
          '/recipe/${widget.recipe.id}',
          extra: widget.source, // passé à RecipeDetailPage
        ),
        child: _RecipeCardContent(recipe: widget.recipe),
      ),
    );
  }
}
```

**Dépendance à ajouter dans `pubspec.yaml` :**
```yaml
dependencies:
  visibility_detector: ^0.4.0
```

---

## 7. Open + Session — RecipeDetailPage

L'open est inséré dans `initState`. La session est fermée dans `dispose`.

### `lib/features/recipe/presentation/pages/recipe_detail_page.dart`

```dart
class RecipeDetailPage extends ConsumerStatefulWidget {
  final String recipeId;
  final TrackingSource source;

  const RecipeDetailPage({
    super.key,
    required this.recipeId,
    required this.source,
  });

  @override
  ConsumerState<RecipeDetailPage> createState() => _RecipeDetailPageState();
}

class _RecipeDetailPageState extends ConsumerState<RecipeDetailPage> {
  RecipeOpen? _currentOpen;

  @override
  void initState() {
    super.initState();
    _trackOpen();
  }

  Future<void> _trackOpen() async {
    _currentOpen = await ref
        .read(recipeTrackingRepositoryProvider)
        .trackOpen(
          recipeId: widget.recipeId,
          source: widget.source,
        );
  }

  @override
  void dispose() {
    _trackClose();
    super.dispose();
  }

  void _trackClose() {
    final open = _currentOpen;
    if (open == null) return;

    // Fire-and-forget depuis dispose (pas d'async/await dans dispose)
    ref.read(recipeTrackingRepositoryProvider).trackClose(
      openId: open.id,
      openedAt: open.openedAt,
    );
  }

  @override
  Widget build(BuildContext context) {
    // ... UI RecipeDetail
  }
}
```

---

## 8. GoRouter — Passage de la source

Le `source` (TrackingSource) doit être passé à `RecipeDetailPage` via GoRouter `extra`.

### Exemple de route dans `router.dart`

```dart
GoRoute(
  path: '/recipe/:id',
  builder: (context, state) {
    final recipeId = state.pathParameters['id']!;
    final source = state.extra as TrackingSource? ?? TrackingSource.feed;
    return RecipeDetailPage(
      recipeId: recipeId,
      source: source,
    );
  },
),
```

### Navigation depuis RecipeCard

```dart
context.push('/recipe/${recipe.id}', extra: widget.source);
```

---

## 9. Checklist de vérification

### Impression
- [ ] `VisibilityDetector` wrapping chaque `RecipeCard`
- [ ] Seuil 50% visibilité + timer 1 seconde avant insert
- [ ] `_impressionLogged` évite les doublons par carte
- [ ] Timer annulé dans `dispose`
- [ ] Source correctement passée depuis `FeedPage`, `SearchPage`, `MealPlannerPage`
- [ ] Erreur silencieuse — pas de crash si insert échoue

### Open + Session
- [ ] Insert dans `initState` (non-bloquant)
- [ ] `_currentOpen` stocke l'id retourné par Supabase
- [ ] `dispose` appelle `trackClose` en fire-and-forget
- [ ] `session_duration_seconds` calculé côté client
- [ ] GoRouter passe bien le `source` en `extra`
- [ ] Si `trackOpen` retourne null (erreur), `trackClose` ne plante pas (guard `if open == null`)

---

## 10. Notes importantes

**Pourquoi `dispose` et pas `WillPopScope` ?**  
`dispose` couvre tous les cas de fermeture : bouton retour, navigation GoRouter, suppression du widget. `WillPopScope` ne couvre que le bouton retour physique Android.

**Pourquoi fire-and-forget pour `trackClose` dans `dispose` ?**  
`dispose` est synchrone — on ne peut pas `await` dedans. Le repository absorbe l'erreur. Si l'app crash avant la fermeture, la ligne `recipe_open` restera sans `closed_at` — c'est acceptable, on filtre les sessions sans `closed_at` dans les analytics.

**Volume d'impressions :**  
Sur un feed actif, une impression peut être insérée plusieurs fois si l'utilisateur scroll et revient sur la même carte. `_impressionLogged` par instance de widget résout le problème dans une même session de scroll. Les doublons multi-sessions sont normaux et attendus dans les analytics (même logique que les vues YouTube).

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_RECIPE_SCHEMA_ADDITIONS.md` | Schéma des tables `recipe_impression` et `recipe_open` |
| `V1_ARCHITECTURE_GLOBALE.md` | Architecture Flutter — principes généraux |
| `V1_ARCHITECTURE_DECISIONS.md` | Fait autorité en cas de contradiction |
| `CREATOR_ANALYTICS_DASHBOARD.md` | Utilisation des données de tracking dans le dashboard |

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Flutter V1 Recipe Tracking*
