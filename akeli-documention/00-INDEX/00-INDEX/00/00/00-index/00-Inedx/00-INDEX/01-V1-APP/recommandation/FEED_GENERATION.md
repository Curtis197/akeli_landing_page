# 📱 Feed Generation Algorithm - AKELI V1

**Version** : 1.0  
**Date** : Février 2026  
**Statut** : Documentation Technique - Implémentation V1 (Septembre 2025)

---

## 🎯 Vision Globale

### Principe Fondamental

**Le Feed AKELI n'est pas une liste chronologique - c'est un moteur de découverte intelligent qui équilibre personnalisation et serendipité.**

Inspiré de TikTok, mais pour la nutrition :
- **70% personnalisé** (cosine similarity)
- **20% exploration** (découverte)
- **10% fresh** (nouveautés créateurs)

### Différenciateur vs Apps Classiques

| Dimension | Apps Classiques | AKELI Feed |
|-----------|----------------|------------|
| **Ordre** | Chronologique ou alphabétique | Intelligence-driven |
| **Découverte** | Search only | Scroll infini personnalisé |
| **Adaptation** | Statique | Learns from every interaction |
| **Objectif** | Showcase all content equally | Maximize outcome probability |
| **Économie** | Views = success | Consumptions = success |

### Objectifs Stratégiques

```
┌────────────────────────────────────────────────┐
│  1. ENGAGEMENT                                 │
│     • Keep users scrolling                    │
│     • Découverte facile                       │
│     • Surprise & delight                      │
└────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────┐
│  2. CONVERSION                                 │
│     • Recipe saves → meal plan additions      │
│     • High acceptance rate (>60%)             │
│     • Low skip rate (<30%)                    │
└────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────┐
│  3. CREATOR SUCCESS                            │
│     • Quality > Virality                      │
│     • Fair distribution (anti-winner-takes-all)│
│     • New creators get chance                 │
└────────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────────┐
│  4. OUTCOME OPTIMIZATION                       │
│     • Surface recipes that WORK               │
│     • Filter out high drop-off                │
│     • Boost high adherence                    │
└────────────────────────────────────────────────┘
```

---

## 📋 Table des Matières

1. [Architecture Feed](#architecture-feed)
2. [Algorithm Core](#algorithm-core)
3. [Ranking Signals](#ranking-signals)
4. [Diversity Mechanisms](#diversity-mechanisms)
5. [Update Strategy](#update-strategy)
6. [Database Schema](#database-schema)
7. [Performance Optimization](#performance-optimization)

---

## 🏗️ Architecture Feed

### Types de Feeds

```
┌─────────────────────────────────────────────────┐
│  1. MAIN FEED (For You)                         │
│     • Personnalisé 70%                          │
│     • Exploration 20%                           │
│     • Fresh 10%                                 │
│     • Updated: Daily (3am batch)                │
│     • Size: 200 recettes                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  2. DISCOVERY FEED (Explore)                    │
│     • Trending recipes (momentum-based)         │
│     • New creators                              │
│     • Cross-cuisine discovery                   │
│     • Updated: Hourly                           │
│     • Size: 100 recettes                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  3. CREATOR FEED (Following)                    │
│     • Recipes from followed creators            │
│     • Chronological (newest first)              │
│     • Updated: Real-time                        │
│     • Size: Variable                            │
└─────────────────────────────────────────────────┘
```

**V1 Focus** : Main Feed (For You) - les autres feeds sont simples queries SQL.

---

### Flow Génération Main Feed

```
CRON Job (Daily 3am) OR On-Demand Request
    ↓
Python Service: generate_user_feed(user_id)
    ↓
┌─────────────────────────────────────────────────┐
│  Step 1: Load User Context                     │
│  ├─ get_or_compute_user_vector(user_id)        │
│  ├─ get_user_preferences(cuisine, constraints) │
│  ├─ get_recent_interactions(last 7 days)       │
│  └─ get_user_goal_profile()                    │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Generate Candidate Pool               │
│  ├─ Personalized (70%): cosine similarity      │
│  │   • Top 140 recipes by similarity score     │
│  │   • Filter: drop_off < 0.20                 │
│  │   • Diversity: max 3 per creator            │
│  │                                             │
│  ├─ Exploration (20%): random sampling         │
│  │   • 40 recipes from LOW similarity          │
│  │   • BUT high quality (adherence > 0.70)     │
│  │   • Different cuisines than usual           │
│  │                                             │
│  └─ Fresh (10%): new content                   │
│      • 20 recipes created in last 7 days       │
│      • From creators user doesn't follow yet   │
│      • Quality threshold (avoid spam)          │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Step 3: Ranking & Scoring                     │
│  ├─ Apply ranking signals (see below)          │
│  ├─ Penalize recently consumed recipes         │
│  ├─ Boost underexposed quality content         │
│  └─ Final sort by composite score              │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Step 4: Sequencing & Diversity                │
│  ├─ Interleave clusters (no repetition)        │
│  ├─ Vary difficulty (easy → hard → easy)       │
│  ├─ Alternate cuisines                         │
│  └─ Insert "palette cleansers" every 20        │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Step 5: Store Feed                            │
│  ├─ INSERT into user_feed table                │
│  ├─ Cache for 24h                              │
│  └─ Track impressions/interactions             │
└─────────────────────────────────────────────────┘
    ↓
App Loads Feed → Infinite Scroll
```

---

## ⚙️ Algorithm Core

### Master Function

```python
def generate_user_feed(
    user_id: str,
    size: int = 200
) -> list[dict]:
    """
    Génère le feed personnalisé "For You".
    
    70% personnalisé (similarity)
    20% exploration (low similarity but high quality)
    10% fresh (new content)
    
    Returns: list of recipe_ids avec metadata
    """
    
    # 1. LOAD USER CONTEXT
    user_vector = get_or_compute_user_vector(user_id)
    user_prefs = get_user_preferences(user_id)
    recent_consumed = get_recently_consumed_recipes(user_id, days=7)
    recent_skipped = get_recently_skipped_recipes(user_id, days=7)
    
    # 2. LOAD RECIPE POOL
    recipe_vectors, recipe_ids = load_recipe_vectors()
    
    # 3. PERSONALIZED SEGMENT (70%)
    personalized_size = int(size * 0.70)  # 140 recipes
    
    personalized = _generate_personalized_segment(
        user_vector=user_vector,
        recipe_vectors=recipe_vectors,
        recipe_ids=recipe_ids,
        size=personalized_size,
        exclude=recent_consumed + recent_skipped,
        filters={
            'safe_only': True,      # drop_off < 0.20
            'diversity': True,       # max 3 per creator
            'quality_min': 0.70      # adherence > 70%
        }
    )
    
    # 4. EXPLORATION SEGMENT (20%)
    exploration_size = int(size * 0.20)  # 40 recipes
    
    exploration = _generate_exploration_segment(
        user_vector=user_vector,
        recipe_vectors=recipe_vectors,
        recipe_ids=recipe_ids,
        size=exploration_size,
        exclude=recent_consumed + recent_skipped + [p['recipe_id'] for p in personalized],
        strategy='anti_similarity'  # Deliberately different
    )
    
    # 5. FRESH SEGMENT (10%)
    fresh_size = int(size * 0.10)  # 20 recipes
    
    fresh = _generate_fresh_segment(
        user_id=user_id,
        size=fresh_size,
        days_threshold=7,  # Created in last 7 days
        exclude=recent_consumed + recent_skipped + 
                [p['recipe_id'] for p in personalized] + 
                [e['recipe_id'] for e in exploration]
    )
    
    # 6. COMBINE & RANK
    combined = personalized + exploration + fresh
    
    # Apply final ranking
    ranked = _apply_ranking_signals(combined, user_id)
    
    # 7. SEQUENCE for optimal experience
    sequenced = _sequence_feed(ranked, user_prefs)
    
    return sequenced[:size]  # Ensure exact size


# === SEGMENT GENERATORS ===

def _generate_personalized_segment(
    user_vector: np.array,
    recipe_vectors: np.array,
    recipe_ids: list,
    size: int,
    exclude: list,
    filters: dict
) -> list[dict]:
    """
    Generate personalized segment via cosine similarity.
    """
    
    # Cosine similarity
    scores = cosine_similarity(user_vector, recipe_vectors)
    
    # Apply filters
    if filters.get('safe_only'):
        scores = filter_high_dropoff(scores, recipe_ids, threshold=0.20)
    
    if filters.get('quality_min'):
        scores = filter_low_quality(scores, recipe_ids, min_adherence=filters['quality_min'])
    
    # Exclude already seen
    for recipe_id in exclude:
        idx = recipe_ids.index(recipe_id) if recipe_id in recipe_ids else -1
        if idx >= 0:
            scores[idx] = 0.0
    
    # Diversity
    if filters.get('diversity'):
        scores = apply_creator_diversity(scores, recipe_ids, max_per_creator=3)
    
    # Top N
    top_indices = np.argsort(scores)[-size*2:][::-1]  # 2x buffer for diversity
    
    # Build result
    results = []
    creators_count = {}
    
    for idx in top_indices:
        if len(results) >= size:
            break
        
        recipe_id = recipe_ids[idx]
        creator_id = get_recipe_creator_id(recipe_id)
        
        # Enforce diversity
        if creators_count.get(creator_id, 0) >= 3:
            continue
        
        results.append({
            'recipe_id': recipe_id,
            'score': float(scores[idx]),
            'segment': 'personalized'
        })
        
        creators_count[creator_id] = creators_count.get(creator_id, 0) + 1
    
    return results


def _generate_exploration_segment(
    user_vector: np.array,
    recipe_vectors: np.array,
    recipe_ids: list,
    size: int,
    exclude: list,
    strategy: str = 'anti_similarity'
) -> list[dict]:
    """
    Generate exploration segment - deliberately different from user preferences.
    
    Strategy:
    - Find recipes with LOW similarity (0.2-0.4 range)
    - BUT high quality (adherence > 0.70)
    - Different cuisines than user's typical
    """
    
    # Cosine similarity
    scores = cosine_similarity(user_vector, recipe_vectors)
    
    # INVERT selection criteria
    exploration_scores = np.zeros_like(scores)
    
    for i, score in enumerate(scores):
        recipe_id = recipe_ids[i]
        
        # Skip excluded
        if recipe_id in exclude:
            continue
        
        # Target: similarity in 0.20-0.40 range (not too foreign, not too familiar)
        if 0.20 <= score <= 0.40:
            # Check quality
            adherence = get_recipe_adherence_rate(recipe_id)
            
            if adherence and adherence > 0.70:
                # Check cuisine diversity
                recipe_cuisine = get_recipe_cuisine(recipe_id)
                user_cuisines = get_user_typical_cuisines(user_vector)
                
                if recipe_cuisine not in user_cuisines:
                    # Good exploration candidate
                    exploration_scores[i] = adherence  # Rank by quality
    
    # Top N exploration
    top_indices = np.argsort(exploration_scores)[-size:][::-1]
    
    return [
        {
            'recipe_id': recipe_ids[idx],
            'score': float(exploration_scores[idx]),
            'segment': 'exploration'
        }
        for idx in top_indices
    ]


def _generate_fresh_segment(
    user_id: str,
    size: int,
    days_threshold: int,
    exclude: list
) -> list[dict]:
    """
    Generate fresh content segment - new recipes from last N days.
    """
    
    # Query new recipes
    fresh_recipes = db.query("""
        SELECT 
            r.recipe_id,
            r.created_at,
            c.creator_id,
            COALESCE(rpm.adherence_rate, 0.75) as quality_estimate
        FROM recipes r
        JOIN creators c ON c.creator_id = r.creator_id
        LEFT JOIN recipe_performance_metrics rpm 
            ON rpm.recipe_id = r.recipe_id
        WHERE r.created_at >= NOW() - INTERVAL ? DAY
        AND r.recipe_id NOT IN ?
        AND NOT EXISTS (
            -- User doesn't already follow this creator
            SELECT 1 FROM creator_follows cf
            WHERE cf.user_id = ? AND cf.creator_id = c.creator_id
        )
        ORDER BY r.created_at DESC
        LIMIT ?
    """, days_threshold, exclude, user_id, size * 2)
    
    # Filter quality
    results = []
    
    for recipe in fresh_recipes:
        if len(results) >= size:
            break
        
        # Quality threshold (be lenient for new content)
        if recipe.quality_estimate > 0.65:
            results.append({
                'recipe_id': recipe.recipe_id,
                'score': recipe.quality_estimate,
                'segment': 'fresh',
                'age_days': (datetime.now() - recipe.created_at).days
            })
    
    return results
```

---

## 📊 Ranking Signals

### Composite Score Calculation

```python
def _apply_ranking_signals(
    candidates: list[dict],
    user_id: str
) -> list[dict]:
    """
    Apply multi-signal ranking to feed candidates.
    
    Signals:
    1. Base similarity score (from segment generation)
    2. Quality signal (adherence, satisfaction)
    3. Velocity signal (trending up/down)
    4. Freshness signal (recency penalty)
    5. Creator signal (diversity, reliability)
    """
    
    for candidate in candidates:
        recipe_id = candidate['recipe_id']
        base_score = candidate['score']
        
        # === SIGNAL 1: BASE (already computed) ===
        signal_base = base_score
        
        # === SIGNAL 2: QUALITY ===
        metrics = get_recipe_performance_metrics(recipe_id)
        
        quality_score = (
            (metrics.adherence_rate or 0.75) * 0.40 +
            (metrics.satisfaction_score or 0.70) * 0.30 +
            (1.0 - (metrics.drop_off_rate or 0.10)) * 0.30
        )
        
        signal_quality = quality_score
        
        # === SIGNAL 3: VELOCITY (trending) ===
        consumptions_last_7d = get_recipe_consumptions(recipe_id, days=7)
        consumptions_prev_7d = get_recipe_consumptions(recipe_id, days=14, offset=7)
        
        if consumptions_prev_7d > 0:
            velocity = (consumptions_last_7d - consumptions_prev_7d) / consumptions_prev_7d
            signal_velocity = min(1.0, max(0.0, 0.5 + velocity))  # Normalize to [0, 1]
        else:
            signal_velocity = 0.5  # Neutral
        
        # === SIGNAL 4: FRESHNESS PENALTY ===
        # Penalize recipes user has seen recently in feed (but didn't interact)
        days_since_impression = get_days_since_last_feed_impression(user_id, recipe_id)
        
        if days_since_impression is None:
            signal_freshness = 1.0  # Never seen
        elif days_since_impression < 3:
            signal_freshness = 0.3  # Heavy penalty (seen recently)
        elif days_since_impression < 7:
            signal_freshness = 0.6  # Moderate penalty
        else:
            signal_freshness = 0.9  # Light penalty
        
        # === SIGNAL 5: CREATOR ===
        creator_id = get_recipe_creator_id(recipe_id)
        creator_stats = get_creator_stats(creator_id)
        
        signal_creator = (
            min(1.0, creator_stats.avg_recipe_performance / 0.80) * 0.60 +
            min(1.0, creator_stats.total_recipes / 20.0) * 0.20 +
            min(1.0, creator_stats.follower_count / 1000.0) * 0.20
        )
        
        # === COMPOSITE SCORE ===
        composite_score = (
            signal_base * 0.40 +
            signal_quality * 0.25 +
            signal_velocity * 0.15 +
            signal_freshness * 0.10 +
            signal_creator * 0.10
        )
        
        candidate['composite_score'] = composite_score
        candidate['signals'] = {
            'base': signal_base,
            'quality': signal_quality,
            'velocity': signal_velocity,
            'freshness': signal_freshness,
            'creator': signal_creator
        }
    
    # Sort by composite score
    candidates.sort(key=lambda x: x['composite_score'], reverse=True)
    
    return candidates
```

---

## 🎨 Diversity Mechanisms

### Sequencing for Optimal Experience

```python
def _sequence_feed(
    ranked: list[dict],
    user_prefs: dict
) -> list[dict]:
    """
    Re-sequence ranked feed for optimal scroll experience.
    
    Goals:
    1. Avoid creator repetition (max 1 per 10 recipes)
    2. Vary difficulty (easy → medium → hard → easy)
    3. Alternate cuisines
    4. Insert "palette cleansers" every 20 recipes
    """
    
    sequenced = []
    recent_creators = []  # Last 10 creators
    recent_cuisines = []  # Last 5 cuisines
    difficulty_pattern = ['easy', 'medium', 'hard']  # Cycle
    difficulty_index = 0
    
    available = ranked.copy()
    
    while len(sequenced) < len(ranked) and available:
        # Target difficulty for this position
        target_difficulty = difficulty_pattern[difficulty_index % len(difficulty_pattern)]
        
        # Find best candidate
        best_candidate = None
        best_score = -1
        
        for candidate in available:
            recipe_id = candidate['recipe_id']
            creator_id = get_recipe_creator_id(recipe_id)
            cuisine = get_recipe_cuisine(recipe_id)
            difficulty = get_recipe_difficulty(recipe_id)
            
            # Scoring criteria
            score = candidate['composite_score']
            
            # PENALTY: Recent creator
            if creator_id in recent_creators:
                score *= 0.3
            
            # PENALTY: Recent cuisine
            if cuisine in recent_cuisines:
                score *= 0.7
            
            # BONUS: Matches target difficulty
            if difficulty == target_difficulty:
                score *= 1.3
            
            # Track best
            if score > best_score:
                best_score = score
                best_candidate = candidate
        
        # Add best candidate
        if best_candidate:
            sequenced.append(best_candidate)
            available.remove(best_candidate)
            
            # Update tracking
            creator_id = get_recipe_creator_id(best_candidate['recipe_id'])
            cuisine = get_recipe_cuisine(best_candidate['recipe_id'])
            
            recent_creators.append(creator_id)
            if len(recent_creators) > 10:
                recent_creators.pop(0)
            
            recent_cuisines.append(cuisine)
            if len(recent_cuisines) > 5:
                recent_cuisines.pop(0)
            
            difficulty_index += 1
        
        # INSERT PALETTE CLEANSER every 20 recipes
        if len(sequenced) % 20 == 0 and len(sequenced) > 0:
            palette_cleanser = _find_palette_cleanser(
                available,
                recent_creators,
                recent_cuisines
            )
            if palette_cleanser:
                sequenced.append(palette_cleanser)
                available.remove(palette_cleanser)
    
    return sequenced


def _find_palette_cleanser(
    available: list[dict],
    recent_creators: list,
    recent_cuisines: list
) -> dict:
    """
    Find a "palette cleanser" - completely different recipe.
    
    Criteria:
    - Very easy difficulty (1-2)
    - Cuisine NOT in recent
    - Creator NOT in recent
    - High satisfaction (comfort food)
    """
    
    for candidate in available:
        recipe_id = candidate['recipe_id']
        creator_id = get_recipe_creator_id(recipe_id)
        cuisine = get_recipe_cuisine(recipe_id)
        difficulty = get_recipe_difficulty(recipe_id)
        satisfaction = get_recipe_satisfaction(recipe_id)
        
        if (difficulty <= 2 and
            cuisine not in recent_cuisines and
            creator_id not in recent_creators and
            satisfaction > 0.75):
            
            return candidate
    
    return None  # Fallback: no perfect match
```

---

## 🔄 Update Strategy

### Daily Batch Update (Preferred V1)

```python
# cron_jobs/daily_feed_update.py

def daily_feed_generation():
    """
    Exécuté chaque matin à 3h (après user vector update).
    
    Génère feeds pour tous les utilisateurs actifs (7 derniers jours).
    """
    
    print("[CRON] Starting daily feed generation")
    
    # Users actifs
    active_users = db.query("""
        SELECT DISTINCT user_id
        FROM meal_logs
        WHERE consumed_at > NOW() - INTERVAL '7 days'
    """)
    
    generated_count = 0
    
    for user_id in [u.user_id for u in active_users]:
        try:
            # Generate feed
            feed = generate_user_feed(user_id, size=200)
            
            # Delete old feed
            db.execute("""
                DELETE FROM user_feed
                WHERE user_id = ?
            """, user_id)
            
            # Store new feed
            for position, item in enumerate(feed):
                db.insert("""
                    INSERT INTO user_feed (
                        user_id,
                        recipe_id,
                        position,
                        segment,
                        composite_score,
                        generated_at
                    ) VALUES (?, ?, ?, ?, ?, NOW())
                """, 
                user_id,
                item['recipe_id'],
                position,
                item['segment'],
                item['composite_score'])
            
            generated_count += 1
            
        except Exception as e:
            print(f"[ERROR] Failed to generate feed for {user_id}: {e}")
    
    print(f"[CRON] Generated feeds for {generated_count} users")
```

---

### On-Demand Refresh (Optional)

```python
# Edge Function: refresh-feed

async def refresh_user_feed(user_id: str):
    """
    Permet au user de forcer refresh du feed.
    
    Limite: 1x par 6 heures (anti-abuse).
    """
    
    # Check last refresh
    last_refresh = db.query("""
        SELECT MAX(generated_at) as last_gen
        FROM user_feed
        WHERE user_id = ?
    """, user_id).last_gen
    
    if last_refresh:
        hours_since = (datetime.now() - last_refresh).total_seconds() / 3600
        
        if hours_since < 6:
            return {
                'error': 'Too soon to refresh',
                'retry_after_hours': 6 - hours_since
            }
    
    # Generate fresh feed
    feed = generate_user_feed(user_id, size=200)
    
    # Store (same as batch)
    # ... (same logic as above)
    
    return {'status': 'refreshed', 'size': len(feed)}
```

---

## 🗄️ Database Schema

### Table: user_feed

```sql
CREATE TABLE user_feed (
    feed_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User
    user_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Recipe
    recipe_id UUID NOT NULL REFERENCES recipes(recipe_id),
    
    -- Position dans feed
    position INT NOT NULL,  -- 0, 1, 2, ... (ordre scroll)
    
    -- Metadata génération
    segment VARCHAR(20) NOT NULL,  -- personalized, exploration, fresh
    composite_score FLOAT NOT NULL,
    signals JSONB,  -- {base, quality, velocity, freshness, creator}
    
    -- Tracking interactions
    impression_count INT DEFAULT 0,
    impression_first_at TIMESTAMP,
    impression_last_at TIMESTAMP,
    
    interaction_type VARCHAR(20),  -- view, save, skip, consume
    interaction_at TIMESTAMP,
    
    -- Timestamps
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    
    -- Constraints
    UNIQUE(user_id, recipe_id, generated_at),  -- No duplicates per generation
    
    -- Indexes
    INDEX idx_user_feed_user_position (user_id, position),
    INDEX idx_user_feed_expires (expires_at),
    INDEX idx_user_feed_segment (user_id, segment)
);

-- Auto-cleanup expired feeds
CREATE OR REPLACE FUNCTION cleanup_expired_feeds()
RETURNS void AS $$
BEGIN
    DELETE FROM user_feed
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup (daily)
SELECT cron.schedule(
    'cleanup-expired-feeds',
    '0 4 * * *',  -- 4am daily
    $$ SELECT cleanup_expired_feeds(); $$
);
```

---

### Table: feed_impressions (Analytics)

```sql
CREATE TABLE feed_impressions (
    impression_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    user_id UUID NOT NULL REFERENCES users(user_id),
    recipe_id UUID NOT NULL REFERENCES recipes(recipe_id),
    feed_item_id UUID REFERENCES user_feed(feed_item_id),
    
    -- Position & segment
    position INT NOT NULL,
    segment VARCHAR(20),
    
    -- Interaction
    action VARCHAR(20),  -- view, skip, save, consume
    dwell_time_seconds FLOAT,  -- Temps passé visible
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_impressions_user (user_id, created_at),
    INDEX idx_impressions_recipe (recipe_id, created_at),
    INDEX idx_impressions_action (action, created_at)
);
```

---

## ⚡ Performance Optimization

### Caching Strategy

```python
class FeedCache:
    """
    Multi-level caching pour feed.
    
    Level 1: In-memory (app-level) - 1h TTL
    Level 2: Database (user_feed table) - 24h TTL
    """
    
    def __init__(self):
        self.memory_cache = {}  # {user_id: {feed, timestamp}}
        self.ttl_hours = 1
    
    def get(self, user_id: str) -> list[dict]:
        """
        Get feed from cache (multi-level).
        """
        
        # Level 1: Memory
        if user_id in self.memory_cache:
            cached = self.memory_cache[user_id]
            age_hours = (datetime.now() - cached['timestamp']).total_seconds() / 3600
            
            if age_hours < self.ttl_hours:
                return cached['feed']
        
        # Level 2: Database
        db_feed = db.query("""
            SELECT 
                recipe_id,
                position,
                segment,
                composite_score,
                signals
            FROM user_feed
            WHERE user_id = ?
            AND expires_at > NOW()
            ORDER BY position ASC
        """, user_id)
        
        if db_feed:
            feed = [dict(row) for row in db_feed]
            
            # Cache in memory
            self.memory_cache[user_id] = {
                'feed': feed,
                'timestamp': datetime.now()
            }
            
            return feed
        
        # Cache MISS
        return None
    
    def set(self, user_id: str, feed: list[dict]):
        """
        Store feed in cache.
        """
        
        # Memory
        self.memory_cache[user_id] = {
            'feed': feed,
            'timestamp': datetime.now()
        }
        
        # Database (already stored by generation function)
```

---

### Pagination & Infinite Scroll

```dart
// Flutter implementation

class FeedController {
  List<Recipe> _loadedRecipes = [];
  int _currentPosition = 0;
  final int _batchSize = 20;  // Load 20 at a time
  
  Future<List<Recipe>> loadNextBatch() async {
    // Fetch from API (pulls from user_feed table)
    final response = await supabase
        .from('user_feed')
        .select('recipe_id, position')
        .eq('user_id', userId)
        .gte('position', _currentPosition)
        .lt('position', _currentPosition + _batchSize)
        .order('position', ascending: true);
    
    final recipeIds = response.map((r) => r['recipe_id']).toList();
    
    // Fetch recipe metadata
    final recipes = await fetchRecipesByIds(recipeIds);
    
    _loadedRecipes.addAll(recipes);
    _currentPosition += _batchSize;
    
    return recipes;
  }
  
  void trackImpression(String recipeId, int position) {
    // Log impression
    supabase.from('feed_impressions').insert({
      'user_id': userId,
      'recipe_id': recipeId,
      'position': position,
      'action': 'view',
      'created_at': DateTime.now().toIso8601String(),
    });
  }
}
```

---

## 📊 Analytics & Learning

### Feed Performance Metrics

```python
def analyze_feed_performance(user_id: str, days: int = 7):
    """
    Mesure efficacité du feed pour cet utilisateur.
    
    Métriques:
    - Acceptance rate (saves / impressions)
    - Skip rate
    - Consumption rate
    - Segment performance (personalized vs exploration vs fresh)
    """
    
    stats = db.query("""
        SELECT 
            segment,
            COUNT(*) as impressions,
            SUM(CASE WHEN action = 'save' THEN 1 ELSE 0 END) as saves,
            SUM(CASE WHEN action = 'skip' THEN 1 ELSE 0 END) as skips,
            SUM(CASE WHEN action = 'consume' THEN 1 ELSE 0 END) as consumptions,
            AVG(dwell_time_seconds) as avg_dwell_time
        FROM feed_impressions fi
        JOIN user_feed uf ON uf.feed_item_id = fi.feed_item_id
        WHERE fi.user_id = ?
        AND fi.created_at >= NOW() - INTERVAL ? DAY
        GROUP BY segment
    """, user_id, days)
    
    results = {}
    
    for row in stats:
        segment = row.segment
        
        acceptance_rate = row.saves / row.impressions if row.impressions > 0 else 0
        skip_rate = row.skips / row.impressions if row.impressions > 0 else 0
        consumption_rate = row.consumptions / row.impressions if row.impressions > 0 else 0
        
        results[segment] = {
            'impressions': row.impressions,
            'acceptance_rate': acceptance_rate,
            'skip_rate': skip_rate,
            'consumption_rate': consumption_rate,
            'avg_dwell_time': row.avg_dwell_time
        }
    
    return results
```

---

### Adaptive Segment Ratios

```python
def adjust_feed_ratios(user_id: str):
    """
    Adapte les ratios 70/20/10 selon performance utilisateur.
    
    Si exploration performe mieux → augmenter exploration %
    Si personalized performe mieux → augmenter personalized %
    """
    
    perf = analyze_feed_performance(user_id, days=14)
    
    # Default ratios
    ratios = {
        'personalized': 0.70,
        'exploration': 0.20,
        'fresh': 0.10
    }
    
    # Calculate effectiveness scores
    effectiveness = {}
    for segment, metrics in perf.items():
        # Composite effectiveness score
        score = (
            metrics['acceptance_rate'] * 0.40 +
            metrics['consumption_rate'] * 0.40 +
            (1.0 - metrics['skip_rate']) * 0.20
        )
        effectiveness[segment] = score
    
    # Adjust ratios (±10% max)
    if effectiveness.get('exploration', 0) > effectiveness.get('personalized', 0):
        # User likes exploration → increase it
        ratios['exploration'] = min(0.30, ratios['exploration'] + 0.10)
        ratios['personalized'] = max(0.60, ratios['personalized'] - 0.10)
    
    # Store user-specific ratios
    db.upsert("""
        INSERT INTO user_feed_preferences (user_id, segment_ratios)
        VALUES (?, ?)
        ON CONFLICT (user_id) DO UPDATE
        SET segment_ratios = EXCLUDED.segment_ratios
    """, user_id, ratios)
    
    return ratios
```

---

## ✅ Checklist Implémentation

### Core Algorithm
- [ ] generate_user_feed() function implémentée
- [ ] Segment generators (personalized, exploration, fresh)
- [ ] Ranking signals appliqués
- [ ] Sequencing & diversity logic testés

### Database
- [ ] user_feed table créée
- [ ] feed_impressions table créée
- [ ] Indexes optimisés
- [ ] Auto-cleanup scheduled

### Batch Jobs
- [ ] Daily feed generation (3am)
- [ ] Feed analytics aggregation
- [ ] Adaptive ratio adjustment

### App Integration
- [ ] Infinite scroll implémenté
- [ ] Impression tracking
- [ ] Interaction logging (view, save, skip)

### Analytics
- [ ] Feed performance metrics
- [ ] Segment effectiveness tracking
- [ ] A/B testing framework (ratios)

---

**FIN DU DOCUMENT**
