# V1 - Objectifs d'Implémentation

## 📋 Vue d'Ensemble

Ce document définit les **objectifs d'implémentation** pour Akeli V1, qui sera développée en **Flutter natif** (app mobile) et **Next.js** (website). La V1 corrige les limitations FlutterFlow, ajoute de nouvelles fonctionnalités essentielles, et améliore le design pour atteindre un niveau professionnel.

**Timeline** : Développement immédiat (avant V2 prévue pour septembre 2026)

---

## 🎯 Principes Directeurs V1

### 1. **Architecture Solide**
Poser des fondations techniques permettant de scaler jusqu'à la V2 et au-delà.

### 2. **Performance Optimale**
Éliminer toute latence inutile, viser des temps de chargement < 300ms.

### 3. **Developer Experience**
Code maintenable, debuggable, testable.

### 4. **User Experience Professionnelle**
Design cohérent, animations fluides, feedback immédiat.

---

## 🏗️ PARTIE A : Corrections Architecturales

### 1. Architecture Auth Standardisée

#### Objectif
Utiliser `auth.uid` **partout** de manière cohérente et sécurisée.

#### Implémentation Flutter

```dart
// lib/services/auth_service.dart

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  // Accès direct à l'utilisateur authentifié
  User? get currentUser => _supabase.auth.currentUser;
  String? get currentUserId => _supabase.auth.currentUser?.id;
  
  // Stream pour réagir aux changements d'auth
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
  
  // Méthodes auth
  Future<AuthResponse> signIn(String email, String password) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }
  
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
  
  Future<AuthResponse> signUp(String email, String password) async {
    return await _supabase.auth.signUp(
      email: email,
      password: password,
    );
  }
}
```

#### Utilisation dans les queries

```dart
// ✅ CORRECT : Utiliser auth.uid directement
final recipes = await supabase
  .from('receipe')
  .select()
  .eq('creator_id', supabase.auth.currentUser!.id);

// ❌ INCORRECT (V0) : Fetcher user puis extraire ID
final user = await supabase.from('users').select().eq('id', userId).single();
final recipes = await supabase.from('receipe').select().eq('creator_id', user['id']);
```

#### RLS Policies Supabase

```sql
-- Exemple : Politique RLS basée sur auth.uid
CREATE POLICY "Users can read their own consumed meals"
ON consumed_meal
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consumed meals"
ON consumed_meal
FOR INSERT
WITH CHECK (user_id = auth.uid());
```

---

### 2. Connexion Supabase Directe

#### Objectif
Éliminer les Edge Functions inutiles côté client, utiliser queries directes et RPC.

#### Configuration Supabase Client

```dart
// lib/core/supabase_config.dart

class SupabaseConfig {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authOptions: const AuthClientOptions(
        autoRefreshToken: true,
        persistSession: true,
      ),
    );
  }
}
```

#### Queries Optimisées avec Joins

```dart
// lib/services/recipe_service.dart

class RecipeService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  // Query complexe avec joins (impossible en FlutterFlow)
  Future<List<Recipe>> getRecipesWithDetails({
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _supabase
      .from('receipe')
      .select('''
        *,
        creator:profiles!creator_id(id, username, avatar_url),
        ingredients:recipe_ingredient(
          id,
          ingredient:ingredients(name, category),
          quantity,
          unit
        ),
        stats:recipe_stats(
          total_consumptions,
          avg_rating,
          total_saves
        )
      ''')
      .order('created_at', ascending: false)
      .range(offset, offset + limit - 1);
    
    return (response as List)
      .map((json) => Recipe.fromJson(json))
      .toList();
  }
}
```

#### RPC pour Logique Métier

```dart
// Appel RPC pour calculer macros (fonction PostgreSQL)
Future<MacroNutrients> calculateMealMacros(String mealId) async {
  final response = await _supabase.rpc('calculate_meal_macros', 
    params: {'meal_id': mealId}
  );
  
  return MacroNutrients.fromJson(response);
}
```

---

### 3. Liste Recettes Scalable

#### Objectif
Pagination infinie performante, cache intelligent, support de 2000+ recettes.

#### Pagination Infinie (Infinite Scroll)

```dart
// lib/screens/discover_screen.dart

class DiscoverScreen extends StatefulWidget {
  @override
  _DiscoverScreenState createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<Recipe> _recipes = [];
  int _offset = 0;
  bool _isLoading = false;
  bool _hasMore = true;
  
  @override
  void initState() {
    super.initState();
    _loadRecipes();
    _scrollController.addListener(_onScroll);
  }
  
  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }
  
  Future<void> _loadRecipes() async {
    setState(() => _isLoading = true);
    
    final recipes = await RecipeService().getRecipesWithDetails(
      limit: 20,
      offset: _offset,
    );
    
    setState(() {
      _recipes.addAll(recipes);
      _offset += recipes.length;
      _hasMore = recipes.length == 20;
      _isLoading = false;
    });
  }
  
  Future<void> _loadMore() async {
    if (!_isLoading && _hasMore) {
      await _loadRecipes();
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: _scrollController,
      itemCount: _recipes.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _recipes.length) {
          return Center(child: CircularProgressIndicator());
        }
        return RecipeCard(recipe: _recipes[index]);
      },
    );
  }
}
```

#### Cache Intelligent (Flutter Cache Manager)

```dart
// lib/services/cache_service.dart

import 'package:flutter_cache_manager/flutter_cache_manager.dart';

class RecipeCacheManager extends CacheManager {
  static const key = 'recipe_cache';
  
  static RecipeCacheManager? _instance;
  
  factory RecipeCacheManager() {
    _instance ??= RecipeCacheManager._();
    return _instance!;
  }
  
  RecipeCacheManager._() : super(
    Config(
      key,
      stalePeriod: const Duration(hours: 24), // Cache 24h
      maxNrOfCacheObjects: 200, // Max 200 recettes en cache
    ),
  );
}

// Utilisation
class RecipeService {
  final _cacheManager = RecipeCacheManager();
  
  Future<Recipe> getRecipe(String recipeId) async {
    final cacheKey = 'recipe_$recipeId';
    final cachedFile = await _cacheManager.getFileFromCache(cacheKey);
    
    if (cachedFile != null) {
      // Charger depuis cache
      final json = jsonDecode(await cachedFile.file.readAsString());
      return Recipe.fromJson(json);
    }
    
    // Charger depuis Supabase
    final recipe = await _supabase
      .from('receipe')
      .select()
      .eq('id', recipeId)
      .single();
    
    // Mettre en cache
    await _cacheManager.putFile(
      cacheKey,
      utf8.encode(jsonEncode(recipe)),
    );
    
    return Recipe.fromJson(recipe);
  }
}
```

---

### 4. State Management Propre

#### Objectif
Architecture scalable avec **Provider** (ou Riverpod selon préférence).

#### Configuration Provider

```dart
// lib/main.dart

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => RecipeProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => AnalyticsProvider()),
      ],
      child: AkeliApp(),
    ),
  );
}
```

#### Provider Exemple : RecipeProvider

```dart
// lib/providers/recipe_provider.dart

class RecipeProvider extends ChangeNotifier {
  final RecipeService _recipeService = RecipeService();
  
  List<Recipe> _recipes = [];
  bool _isLoading = false;
  String? _error;
  
  List<Recipe> get recipes => _recipes;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  Future<void> loadRecipes({int limit = 20, int offset = 0}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final recipes = await _recipeService.getRecipesWithDetails(
        limit: limit,
        offset: offset,
      );
      
      if (offset == 0) {
        _recipes = recipes;
      } else {
        _recipes.addAll(recipes);
      }
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> refreshRecipes() async {
    await loadRecipes(limit: 20, offset: 0);
  }
}
```

---

## ✨ PARTIE B : Nouvelles Fonctionnalités

### 1. Filtre Créateur

#### Objectif
Permettre de rechercher toutes les recettes d'un créateur spécifique.

#### UI : Chip Filter

```dart
// lib/widgets/creator_filter_chip.dart

class CreatorFilterChip extends StatelessWidget {
  final Creator? selectedCreator;
  final Function(Creator?) onCreatorSelected;
  
  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(selectedCreator?.username ?? 'Tous les créateurs'),
      selected: selectedCreator != null,
      onSelected: (selected) {
        if (selected) {
          _showCreatorPicker(context);
        } else {
          onCreatorSelected(null);
        }
      },
    );
  }
  
  void _showCreatorPicker(BuildContext context) async {
    final creator = await showModalBottomSheet<Creator>(
      context: context,
      builder: (context) => CreatorPickerSheet(),
    );
    
    if (creator != null) {
      onCreatorSelected(creator);
    }
  }
}
```

#### Query avec Filtre Créateur

```dart
// lib/services/recipe_service.dart

Future<List<Recipe>> searchRecipes({
  String? query,
  String? creatorId,
  int limit = 20,
  int offset = 0,
}) async {
  var queryBuilder = _supabase
    .from('receipe')
    .select('*, creator:profiles!creator_id(*)')
    .order('created_at', ascending: false)
    .range(offset, offset + limit - 1);
  
  if (query != null && query.isNotEmpty) {
    queryBuilder = queryBuilder.textSearch('name', query);
  }
  
  if (creatorId != null) {
    queryBuilder = queryBuilder.eq('creator_id', creatorId);
  }
  
  final response = await queryBuilder;
  return (response as List).map((json) => Recipe.fromJson(json)).toList();
}
```

---

### 2. Liste Créateurs Suivis (Profil Utilisateur)

#### Objectif
Afficher dans le profil utilisateur la liste des créateurs suivis avec statistiques.

#### Database Schema

```sql
-- Table pour les follows (si pas déjà existante)
CREATE TABLE IF NOT EXISTS creator_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  followed_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, creator_id)
);

CREATE INDEX idx_creator_follows_follower ON creator_follows(follower_id);
CREATE INDEX idx_creator_follows_creator ON creator_follows(creator_id);

-- RLS Policies
ALTER TABLE creator_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
ON creator_follows FOR SELECT
USING (follower_id = auth.uid());

CREATE POLICY "Users can follow creators"
ON creator_follows FOR INSERT
WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow creators"
ON creator_follows FOR DELETE
USING (follower_id = auth.uid());
```

#### Service Flutter

```dart
// lib/services/creator_service.dart

class CreatorService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  Future<List<Creator>> getFollowedCreators() async {
    final userId = _supabase.auth.currentUser!.id;
    
    final response = await _supabase
      .from('creator_follows')
      .select('''
        creator:profiles!creator_id(
          id,
          username,
          avatar_url,
          bio,
          recipe_count:receipe(count),
          total_consumptions
        )
      ''')
      .eq('follower_id', userId)
      .order('followed_at', ascending: false);
    
    return (response as List)
      .map((item) => Creator.fromJson(item['creator']))
      .toList();
  }
  
  Future<void> followCreator(String creatorId) async {
    final userId = _supabase.auth.currentUser!.id;
    
    await _supabase.from('creator_follows').insert({
      'follower_id': userId,
      'creator_id': creatorId,
    });
  }
  
  Future<void> unfollowCreator(String creatorId) async {
    final userId = _supabase.auth.currentUser!.id;
    
    await _supabase
      .from('creator_follows')
      .delete()
      .eq('follower_id', userId)
      .eq('creator_id', creatorId);
  }
}
```

#### UI : Section Profil

```dart
// lib/screens/profile_screen.dart

class ProfileScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ... Autres sections profil
            
            // Section Créateurs Suivis
            SectionHeader(title: 'Créateurs Suivis'),
            FutureBuilder<List<Creator>>(
              future: CreatorService().getFollowedCreators(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return CircularProgressIndicator();
                }
                
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return EmptyState(
                    message: 'Vous ne suivez aucun créateur',
                    action: TextButton(
                      onPressed: () => Navigator.pushNamed(context, '/discover'),
                      child: Text('Découvrir des créateurs'),
                    ),
                  );
                }
                
                return ListView.builder(
                  shrinkWrap: true,
                  physics: NeverScrollableScrollPhysics(),
                  itemCount: snapshot.data!.length,
                  itemBuilder: (context, index) {
                    final creator = snapshot.data![index];
                    return CreatorListTile(creator: creator);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### 3. Analytics Recettes

#### Objectif
Tracker les interactions utilisateur avec les recettes pour analyses futures (V2) :
- **Impression** : Recette vue (component initialisé)
- **Consultation** : Recette cliquée/ouverte
- **Recherche** : Enregistrement des queries de recherche

#### Database Schema

```sql
-- Table pour les impressions de recettes
CREATE TABLE recipe_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES receipe(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  screen text, -- 'discover', 'search', 'creator_profile', etc.
  position int, -- Position dans la liste (0-based)
  impressed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_recipe_impressions_recipe ON recipe_impressions(recipe_id);
CREATE INDEX idx_recipe_impressions_user ON recipe_impressions(user_id);
CREATE INDEX idx_recipe_impressions_date ON recipe_impressions(impressed_at DESC);

-- Table pour les consultations de recettes
CREATE TABLE recipe_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES receipe(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_screen text, -- Depuis quel écran l'utilisateur a cliqué
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX idx_recipe_clicks_recipe ON recipe_clicks(recipe_id);
CREATE INDEX idx_recipe_clicks_user ON recipe_clicks(user_id);
CREATE INDEX idx_recipe_clicks_date ON recipe_clicks(clicked_at DESC);

-- Table pour les recherches (déjà existante dans les audits, à adapter)
CREATE TABLE IF NOT EXISTS search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  query_embedding vector(1536), -- Pour V2 vectorization
  results_count int DEFAULT 0,
  clicked_recipe_id uuid REFERENCES receipe(id),
  searched_at timestamptz DEFAULT now()
);

CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_search_queries_date ON search_queries(searched_at DESC);
CREATE INDEX idx_search_queries_text ON search_queries(query_text);
```

#### Service Analytics Flutter

```dart
// lib/services/analytics_service.dart

class AnalyticsService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  // Track impression (recette vue)
  Future<void> trackRecipeImpression({
    required String recipeId,
    required String screen,
    required int position,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    
    await _supabase.from('recipe_impressions').insert({
      'recipe_id': recipeId,
      'user_id': userId,
      'screen': screen,
      'position': position,
    });
  }
  
  // Track clic (recette consultée)
  Future<void> trackRecipeClick({
    required String recipeId,
    required String sourceScreen,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    
    await _supabase.from('recipe_clicks').insert({
      'recipe_id': recipeId,
      'user_id': userId,
      'source_screen': sourceScreen,
    });
  }
  
  // Track recherche
  Future<void> trackSearch({
    required String queryText,
    required int resultsCount,
    String? clickedRecipeId,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    
    await _supabase.from('search_queries').insert({
      'user_id': userId,
      'query_text': queryText,
      'results_count': resultsCount,
      'clicked_recipe_id': clickedRecipeId,
    });
  }
}
```

#### Intégration UI : Tracking Automatique

```dart
// lib/widgets/recipe_card.dart

class RecipeCard extends StatefulWidget {
  final Recipe recipe;
  final String screen;
  final int position;
  
  @override
  _RecipeCardState createState() => _RecipeCardState();
}

class _RecipeCardState extends State<RecipeCard> {
  final AnalyticsService _analytics = AnalyticsService();
  bool _impressionTracked = false;
  
  @override
  void initState() {
    super.initState();
    _trackImpression();
  }
  
  void _trackImpression() async {
    if (!_impressionTracked) {
      await _analytics.trackRecipeImpression(
        recipeId: widget.recipe.id,
        screen: widget.screen,
        position: widget.position,
      );
      _impressionTracked = true;
    }
  }
  
  void _onTap() async {
    // Track clic
    await _analytics.trackRecipeClick(
      recipeId: widget.recipe.id,
      sourceScreen: widget.screen,
    );
    
    // Navigate
    Navigator.pushNamed(
      context,
      '/recipe-detail',
      arguments: widget.recipe,
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _onTap,
      child: Card(
        child: Column(
          children: [
            // Image, titre, etc.
          ],
        ),
      ),
    );
  }
}
```

#### Tracking Search

```dart
// lib/screens/search_screen.dart

class SearchScreen extends StatefulWidget {
  @override
  _SearchScreenState createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final AnalyticsService _analytics = AnalyticsService();
  List<Recipe> _results = [];
  
  void _onSearch() async {
    final query = _searchController.text;
    
    // Rechercher
    final results = await RecipeService().searchRecipes(query: query);
    
    // Track la recherche
    await _analytics.trackSearch(
      queryText: query,
      resultsCount: results.length,
    );
    
    setState(() {
      _results = results;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          TextField(
            controller: _searchController,
            onSubmitted: (_) => _onSearch(),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _results.length,
              itemBuilder: (context, index) {
                return RecipeCard(
                  recipe: _results[index],
                  screen: 'search',
                  position: index,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

---

### 4. Dashboard Professionnel Utilisateur

#### Objectif
Dashboard mobile clair et visuel affichant :
- Recettes consommées (aujourd'hui, semaine, mois)
- Macros (protéines, glucides, lipides)
- Calories (vs. objectif)
- Objectif actuel (perte de poids, prise de masse, etc.)
- Streak (jours consécutifs de tracking)

#### Database : Vue Agrégée

```sql
-- Vue pour stats utilisateur du jour
CREATE OR REPLACE VIEW user_daily_stats AS
SELECT 
  user_id,
  DATE(created_at) as date,
  COUNT(DISTINCT id) as meals_logged,
  SUM(calorie) as total_calories,
  SUM(protein) as total_protein,
  SUM(carbs) as total_carbs,
  SUM(fat) as total_fat
FROM consumed_meal
GROUP BY user_id, DATE(created_at);

-- Fonction pour calculer le streak
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id uuid)
RETURNS int AS $$
DECLARE
  current_streak int := 0;
  check_date date := CURRENT_DATE;
BEGIN
  -- Boucle pour compter les jours consécutifs
  LOOP
    IF EXISTS (
      SELECT 1 FROM consumed_meal 
      WHERE user_id = p_user_id 
      AND DATE(created_at) = check_date
    ) THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
```

#### Service Dashboard Flutter

```dart
// lib/services/dashboard_service.dart

class DashboardData {
  final int mealsToday;
  final double caloriesConsumed;
  final double caloriesTarget;
  final double proteinConsumed;
  final double proteinTarget;
  final double carbsConsumed;
  final double fatConsumed;
  final int streak;
  final String goalType; // 'weight_loss', 'muscle_gain', 'maintenance'
  
  DashboardData({
    required this.mealsToday,
    required this.caloriesConsumed,
    required this.caloriesTarget,
    required this.proteinConsumed,
    required this.proteinTarget,
    required this.carbsConsumed,
    required this.fatConsumed,
    required this.streak,
    required this.goalType,
  });
}

class DashboardService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  Future<DashboardData> getDashboardData() async {
    final userId = _supabase.auth.currentUser!.id;
    
    // Stats du jour
    final todayStats = await _supabase
      .from('user_daily_stats')
      .select()
      .eq('user_id', userId)
      .eq('date', DateTime.now().toIso8601String().split('T')[0])
      .maybeSingle();
    
    // Objectifs utilisateur
    final userProfile = await _supabase
      .from('profiles')
      .select('calorie_target, protein_target, goal_type')
      .eq('id', userId)
      .single();
    
    // Streak
    final streakResult = await _supabase
      .rpc('get_user_streak', params: {'p_user_id': userId});
    
    return DashboardData(
      mealsToday: todayStats?['meals_logged'] ?? 0,
      caloriesConsumed: (todayStats?['total_calories'] ?? 0).toDouble(),
      caloriesTarget: (userProfile['calorie_target'] ?? 2000).toDouble(),
      proteinConsumed: (todayStats?['total_protein'] ?? 0).toDouble(),
      proteinTarget: (userProfile['protein_target'] ?? 150).toDouble(),
      carbsConsumed: (todayStats?['total_carbs'] ?? 0).toDouble(),
      fatConsumed: (todayStats?['total_fat'] ?? 0).toDouble(),
      streak: streakResult as int,
      goalType: userProfile['goal_type'] ?? 'maintenance',
    );
  }
}
```

#### UI : Dashboard Screen

```dart
// lib/screens/dashboard_screen.dart

class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Tableau de bord')),
      body: FutureBuilder<DashboardData>(
        future: DashboardService().getDashboardData(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          }
          
          if (!snapshot.hasData) {
            return Center(child: Text('Erreur de chargement'));
          }
          
          final data = snapshot.data!;
          
          return SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Objectif actuel
                _GoalCard(goalType: data.goalType),
                
                SizedBox(height: 16),
                
                // Streak
                _StreakCard(streak: data.streak),
                
                SizedBox(height: 16),
                
                // Calories
                _CalorieProgressCard(
                  consumed: data.caloriesConsumed,
                  target: data.caloriesTarget,
                ),
                
                SizedBox(height: 16),
                
                // Macros
                _MacrosCard(
                  protein: data.proteinConsumed,
                  proteinTarget: data.proteinTarget,
                  carbs: data.carbsConsumed,
                  fat: data.fatConsumed,
                ),
                
                SizedBox(height: 16),
                
                // Repas d'aujourd'hui
                _MealsSummaryCard(mealsCount: data.mealsToday),
              ],
            ),
          );
        },
      ),
    );
  }
}

// Widgets individuels

class _CalorieProgressCard extends StatelessWidget {
  final double consumed;
  final double target;
  
  @override
  Widget build(BuildContext context) {
    final percentage = (consumed / target * 100).clamp(0, 100);
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Calories', style: Theme.of(context).textTheme.titleLarge),
            SizedBox(height: 12),
            
            LinearProgressIndicator(
              value: percentage / 100,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation(
                percentage <= 90 ? Colors.green : Colors.orange,
              ),
            ),
            
            SizedBox(height: 8),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${consumed.toInt()} / ${target.toInt()} kcal'),
                Text('${percentage.toInt()}%', 
                  style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MacrosCard extends StatelessWidget {
  final double protein;
  final double proteinTarget;
  final double carbs;
  final double fat;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Macronutriments', style: Theme.of(context).textTheme.titleLarge),
            SizedBox(height: 16),
            
            _MacroRow(
              label: 'Protéines',
              value: protein,
              target: proteinTarget,
              color: Colors.blue,
            ),
            
            SizedBox(height: 12),
            
            _MacroRow(
              label: 'Glucides',
              value: carbs,
              color: Colors.orange,
            ),
            
            SizedBox(height: 12),
            
            _MacroRow(
              label: 'Lipides',
              value: fat,
              color: Colors.purple,
            ),
          ],
        ),
      ),
    );
  }
}

class _MacroRow extends StatelessWidget {
  final String label;
  final double value;
  final double? target;
  final Color color;
  
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 24,
          color: color,
        ),
        SizedBox(width: 12),
        Expanded(
          child: Text(label),
        ),
        Text(
          target != null 
            ? '${value.toInt()}g / ${target!.toInt()}g'
            : '${value.toInt()}g',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

class _StreakCard extends StatelessWidget {
  final int streak;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.orange[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.local_fire_department, color: Colors.orange, size: 48),
            SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Série en cours', style: TextStyle(color: Colors.grey[700])),
                Text('$streak jours', 
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.orange,
                    fontWeight: FontWeight.bold,
                  )),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🎨 PARTIE C : Améliorations UX/Design

### 1. Design System Professionnel

#### Objectif
Élever le design de "amateur fonctionnel" à "professionnel cohérent".

#### Theme Configuration

```dart
// lib/core/theme.dart

class AkeliTheme {
  // Colors
  static const Color primaryGreen = Color(0xFF3BB78F);
  static const Color darkGreen = Color(0xFF2A8B6A);
  static const Color lightGreen = Color(0xFF6FD9B5);
  
  static const Color accentOrange = Color(0xFFFF8C42);
  static const Color accentYellow = Color(0xFFFFC857);
  
  static const Color textDark = Color(0xFF2C3E50);
  static const Color textLight = Color(0xFF7F8C8D);
  static const Color background = Color(0xFFF8F9FA);
  
  // Typography
  static const String fontFamily = 'Inter';
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryGreen,
      brightness: Brightness.light,
    ),
    fontFamily: fontFamily,
    
    textTheme: TextTheme(
      displayLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: textDark,
      ),
      displayMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: textDark,
      ),
      headlineLarge: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: textDark,
      ),
      headlineMedium: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: textDark,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        color: textDark,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        color: textLight,
      ),
    ),
    
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.white,
        padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
    ),
    
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      color: Colors.white,
      margin: EdgeInsets.symmetric(vertical: 8),
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: primaryGreen, width: 2),
      ),
    ),
  );
}
```

---

### 2. Animations Fluides

#### Page Transitions

```dart
// lib/core/page_transitions.dart

class SlideRightRoute extends PageRouteBuilder {
  final Widget page;
  
  SlideRightRoute({required this.page})
    : super(
        pageBuilder: (context, animation, secondaryAnimation) => page,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(1.0, 0.0);
          const end = Offset.zero;
          const curve = Curves.easeInOut;
          
          var tween = Tween(begin: begin, end: end).chain(
            CurveTween(curve: curve),
          );
          
          return SlideTransition(
            position: animation.drive(tween),
            child: child,
          );
        },
      );
}
```

#### Micro-interactions

```dart
// lib/widgets/animated_like_button.dart

class AnimatedLikeButton extends StatefulWidget {
  final bool isLiked;
  final VoidCallback onTap;
  
  @override
  _AnimatedLikeButtonState createState() => _AnimatedLikeButtonState();
}

class _AnimatedLikeButtonState extends State<AnimatedLikeButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(milliseconds: 200),
      vsync: this,
    );
    
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }
  
  void _onTap() {
    _controller.forward().then((_) => _controller.reverse());
    widget.onTap();
  }
  
  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: IconButton(
        icon: Icon(
          widget.isLiked ? Icons.favorite : Icons.favorite_border,
          color: widget.isLiked ? Colors.red : Colors.grey,
        ),
        onPressed: _onTap,
      ),
    );
  }
}
```

---

### 3. Feedback Utilisateur

#### Loading States

```dart
// lib/widgets/loading_states.dart

class ShimmerLoading extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Column(
        children: List.generate(5, (index) {
          return Padding(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: double.infinity,
                        height: 16,
                        color: Colors.white,
                      ),
                      SizedBox(height: 8),
                      Container(
                        width: 200,
                        height: 12,
                        color: Colors.white,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
```

#### Empty States

```dart
// lib/widgets/empty_state.dart

class EmptyState extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;
  final Widget? action;
  
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 80, color: Colors.grey[300]),
            SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              SizedBox(height: 24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
```

#### Toasts / Snackbars

```dart
// lib/utils/toast_helper.dart

class ToastHelper {
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
  
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.error, color: Colors.white),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
```

---

## 📊 Métriques de Succès V1

### Performance
- [ ] Temps chargement liste recettes : < 300ms (vs 800ms V0)
- [ ] Temps chargement profil : < 200ms (vs 600ms V0)
- [ ] FPS constant à 60 (animations fluides)

### Fonctionnalités
- [ ] Filtre créateur opérationnel
- [ ] Liste créateurs suivis dans profil
- [ ] Analytics tracking 100% des interactions
- [ ] Dashboard temps réel < 500ms

### Qualité Code
- [ ] 0 warnings Flutter Analyzer
- [ ] Test coverage > 70%
- [ ] Documentation inline complète
- [ ] CI/CD pipeline fonctionnel

### UX
- [ ] Design cohérent (0 incohérences visuelles)
- [ ] Animations fluides (60 FPS)
- [ ] Feedback immédiat (toasts, loading states)
- [ ] Accessibilité (semantic labels, contrast ratios)

---

## 🚀 Prochaines Étapes

1. ✅ **Documents créés** : Contraintes + Objectifs
2. ⏭️ **Architecture Flutter V1** : Structure projet, routing, state management
3. ⏭️ **Database Migration** : Ajout tables analytics, créateurs suivis
4. ⏭️ **Développement itératif** : Feature par feature
5. ⏭️ **Testing & QA** : Tests unitaires, intégration, UI
6. ⏭️ **Deployment** : App Store + Google Play

---

**Date de création** : 21 février 2025  
**Auteur** : Curtis (Fondateur Akeli)  
**Status** : Roadmap officielle V1  
**Timeline** : Développement immédiat (avant V2 sept 2026)
