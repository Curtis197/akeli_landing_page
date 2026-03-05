# Akeli V1 — Journal des Décisions d'Architecture

> Ce document log les décisions d'architecture prises en cours de documentation.
> Il sert de référence pour Claude Code et pour toute future révision des docs sources.
> Les docs sources (`PYTHON_RECOMMENDATION_ENGINE.md`, `SYSTEM_OVERVIEW_V1.md`) étant en lecture seule,
> ce document fait autorité en cas de contradiction avec leur contenu.

**Statut** : Référence V1 — supersède les docs sources sur les points listés
**Date de création** : Mars 2026
**Auteur** : Curtis — Fondateur Akeli

---

## ADR-001 — pgvector remplace Python au runtime pour la cosine similarity

**Date** : Mars 2026
**Statut** : ✅ Validé

### Contexte
Le document `PYTHON_RECOMMENDATION_ENGINE.md` décrit un Python Service (Railway) qui gère la cosine similarity au runtime via NumPy — appelé par des Edge Functions à chaque ouverture du feed et génération de meal plan.

### Décision
**pgvector avec index HNSW** gère la cosine similarity directement dans PostgreSQL. Python ne tourne qu'en batch nightly pour construire et stocker les vecteurs.

### Justification
- pgvector et NumPy sont comparables en vitesse de calcul pur
- L'avantage décisif de pgvector : **0 transfert réseau** — les vecteurs sont déjà en base, pas besoin de les charger vers Railway
- Latence NumPy/Railway : ~50ms réseau incompressible + ~2ms calcul
- Latence pgvector HNSW : ~3ms total, 0 réseau, pour 2500+ recettes
- Supabase Pro tier inclut pgvector sans surcoût
- Coût Railway réduit (service actif uniquement la nuit)
- Architecture plus simple — moins d'Edge Functions, moins de points de défaillance

### Impact sur les autres documents
- `PYTHON_RECOMMENDATION_ENGINE.md` : les endpoints `/user_feed`, `/recommended_recipes`, `/meal_plan` ne sont plus appelés au runtime
- `SYSTEM_OVERVIEW_V1.md` : le Python Service n'est plus un composant runtime critique
- `V1_BACKEND_EDGE_FUNCTIONS.md` : `trigger-user-vector-update` et `trigger-recipe-vector-update` supprimés — 27 → 14 Edge Functions
- `V1_ARCHITECTURE_GLOBALE.md` : flux 2, 3 et 7 mis à jour

### Architecture résultante

```
Runtime (chaque ouverture du feed)
Flutter → .rpc('recommend_recipes') → pgvector HNSW → ~3ms → résultats

Batch nightly (3h)
Python Service → compute_user_vector()   → upsert user_vector
Python Service → compute_recipe_vector() → upsert recipe_vector

Exception onboarding (une seule fois par utilisateur)
complete-onboarding Edge Function → Python Service → premier user_vector
```

---

## ADR-002 — Suppression des Edge Functions de query pure

**Date** : Mars 2026
**Statut** : ✅ Validé

### Contexte
Le MVP FlutterFlow utilisait des Edge Functions pour toutes les queries à cause des limitations du no-code. En Flutter natif, le client Supabase peut requêter directement la base.

### Décision
Les Edge Functions ne servent que la logique backend (services externes, cron, logique métier critique). Les queries sont gérées directement par Flutter ou via des fonctions SQL PostgreSQL appelées par `.rpc()`.

### Règle
| Type | Solution |
|---|---|
| Query simple | Client Supabase Flutter |
| Query complexe (joins, agrégations, transactions) | Fonction SQL PostgreSQL via `.rpc()` |
| Logique backend | Edge Function |
| Construction vecteurs | Python batch nightly |

### Fonctions supprimées
`get-recipe-feed`, `get-recipe-detail`, `scale-recipe`, `get-creator-dashboard`, `toggle-shopping-item`, `find-or-create-conversation`, `send-conversation-request`, `respond-conversation-request`, `create-group`, `join-group`, `generate-shopping-list` (→ fonction SQL)

### Fonctions SQL PostgreSQL créées en remplacement
| Fonction SQL | Domaine |
|---|---|
| `recommend_recipes(user_id, limit, filters)` | Feed vectorisé + HNSW |
| `search_recipes(query, filters, order_by, limit, offset)` | Recherche recettes |
| `search_creators(query, limit, offset)` | Recherche créateurs |
| `get_creator_public_profile(creator_id)` | Profil public créateur |
| `generate_meal_plan(user_id, days, meals_per_day, start_date)` | Meal planning pgvector |
| `generate_shopping_list(meal_plan_id)` | Liste de courses agrégée |
| `find_or_create_conversation(user_a_id, user_b_id)` | Communauté |
| `respond_conversation_request(request_id, action)` | Communauté |
| `join_group(group_id, user_id)` | Communauté |

---

## ADR-003 — Flux 2 (feed) : option hybride vecteur frais/rapide

**Date** : Mars 2026
**Statut** : ✅ Validé

### Contexte
Deux approches pour la fraîcheur du feed :
- **Option A** : vecteur pré-calculé → feed en ~3ms mais vecteur potentiellement vieux
- **Option B** : Python au chargement → vecteur frais mais +400-500ms de latence
- **Option C** : hybride → feed instantané depuis vecteur stocké, Python recalcule en background

### Décision
**Option C avec batch nightly** (variante simplifiée) — le vecteur est recalculé chaque nuit par Python. Le feed est toujours calculé à l'instant depuis le vecteur stocké. Maximum 24h de décalage.

### Justification
Le `user_vector` représente 4 semaines de comportement alimentaire. Un delta de 24h est imperceptible en termes de qualité de recommandation. En revanche, 400-500ms de latence au chargement nuit à l'expérience mobile.

### Comportement résultant
- Feed affiché en ~3ms à chaque ouverture
- `user_vector` recalculé chaque nuit (batch Python 3h)
- Seul cas où Python est appelé au runtime : onboarding (premier vecteur, bloquant)

---

## ADR-004 — Onglets Recettes / Créateurs sur la page Discovery

**Date** : Mars 2026
**Statut** : ✅ Validé

### Décision
La page Recipe Discovery (tab 3) intègre deux onglets :
- **Recettes** — comportement existant (recherche, filtres, tags)
- **Créateurs** — recherche de créateurs par nom, liste de cards créateurs

### Comportement onglet Créateurs
- Barre de recherche commune (placeholder change selon onglet actif)
- Filtres et tag chips masqués en mode Créateurs
- Cards créateurs : avatar, nom, nombre de recettes, badge Mode Fan disponible
- Tap → profil public du créateur (nouvelle page)

### Profil public créateur
Nouvelle page à créer : avatar, nom, bio, stats, recettes, bouton "Activer le Mode Fan" si `is_fan_eligible = true`.

### Lien Mode Fan
"Créateur favori" = Mode Fan (1€/mois, créateur unique). Pas de système de favoris multiples distinct en V1.

### Fonctions SQL ajoutées
- `search_creators(query, limit, offset)` — recherche par nom
- `get_creator_public_profile(creator_id)` — profil complet + stats

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0*
