# 02 - SpÃ©cifications Fonctionnelles

---

## ðŸ“‹ Vue d'Ensemble Features Pro Tier

La V1 introduit **4 features majeures** pour crÃ©ateurs Pro :

1. **SystÃ¨me de Vectorisation** (infrastructure)
2. **In-App SEO Tool** (validation idÃ©es)
3. **Niche Finder** (dÃ©couverte opportunitÃ©s)
4. **Advanced Analytics** (comprÃ©hension audience)

---

## 1ï¸âƒ£ SystÃ¨me de Vectorisation

### Objectif

CrÃ©er des **reprÃ©sentations sÃ©mantiques** (embeddings) des utilisateurs et recherches pour permettre :
- Matching intelligent (recherches â†” recettes)
- Clustering automatique (dÃ©tection niches)
- Personalisation avancÃ©e (recommendations)

### 1.1 User Embeddings

#### DonnÃ©es Sources

Pour chaque utilisateur, agrÃ©ger :
- **Recettes consommÃ©es** : types cuisines, ingrÃ©dients rÃ©currents, temps cuisson prÃ©fÃ©rÃ©
- **Objectifs fitness** : perte poids, prise muscle, maintenance
- **Recherches effectuÃ©es** : intentions, frÃ©quence, thÃ¨mes
- **Engagement** : likes, saves, notes donnÃ©es
- **DÃ©mographie** : Ã¢ge, localisation (optionnel)

#### Processus Vectorisation

```
Cron Job Quotidien (2am) :

FOR EACH user actif (activitÃ© derniers 7 jours) :
  
  1. AgrÃ©ger comportement :
     - Recettes consommÃ©es 30 derniers jours
     - Recherches 30 derniers jours
     - Likes/saves donnÃ©s
     - Objectifs dÃ©clarÃ©s
  
  2. GÃ©nÃ©rer prompt descriptif :
     "Utilisateur femme 28 ans, objectif perte de poids.
      Consomme principalement cuisine ivoirienne rapide (<30min).
      IngrÃ©dients frÃ©quents : attiÃ©kÃ©, poulet, lÃ©gumes.
      Recherche souvent : recettes healthy, low-carb, meal prep.
      Likes recettes : simples, colorÃ©es, bien notÃ©es."
  
  3. Appeler OpenAI API :
     POST https://api.openai.com/v1/embeddings
     {
       "model": "text-embedding-3-small",
       "input": [prompt_descriptif]
     }
     â†’ Retourne vector[1536]
  
  4. Stocker :
     INSERT INTO user_embeddings (user_id, embedding, behavior_summary, updated_at)
     VALUES (...) 
     ON CONFLICT (user_id) DO UPDATE ...
```

#### Utilisation

**SimilaritÃ© Users** :
```sql
-- Trouver users similaires Ã  user X
SELECT u.id, u.name, 
       1 - (ue1.embedding <=> ue2.embedding) AS similarity
FROM user_embeddings ue1
JOIN user_embeddings ue2 ON ue2.user_id = $user_id
JOIN users u ON u.id = ue1.user_id
WHERE ue1.user_id != $user_id
ORDER BY ue1.embedding <=> ue2.embedding
LIMIT 10;
```

**Clustering DÃ©mographique** :
- K-means sur embeddings pour grouper users similaires
- UtilisÃ© par crÃ©ateurs pour voir "profils types" consommateurs

---

### 1.2 Search Embeddings

#### DonnÃ©es Sources

Ã€ chaque recherche user :
- **Texte requÃªte** : "attiÃ©kÃ© poisson rapide"
- **Contexte** : heure, jour semaine
- **User ID** : qui a cherchÃ© (pour historique)
- **RÃ©sultats** : combien recettes retournÃ©es
- **Clics** : quelle recette cliquÃ©e (si applicable)

#### Processus Vectorisation

```
Real-time Ã  chaque recherche :

1. User tape recherche dans mobile app
   
2. App appelle Edge Function "vectorize-search" :
   POST /functions/v1/vectorize-search
   {
     "query": "attiÃ©kÃ© poisson rapide",
     "user_id": "uuid-xxx",
     "context": { "hour": 18, "day": "sunday" }
   }

3. Function process :
   
   a) Vectoriser query :
      embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      })
   
   b) Chercher recettes similaires (cosine similarity) :
      SELECT r.id, r.name, 
             1 - (r.embedding <=> $query_embedding) AS similarity
      FROM receipe r
      WHERE 1 - (r.embedding <=> $query_embedding) > 0.7
      ORDER BY similarity DESC
      LIMIT 20
   
   c) Stocker recherche :
      INSERT INTO search_queries 
      (query_text, query_embedding, user_id, results_count, searched_at)
      VALUES (query, embedding, user_id, count_results, now())
      RETURNING id
   
   d) Retourner rÃ©sultats Ã  app

4. Si user clique recette :
   UPDATE search_queries 
   SET clicked_recipe_id = $recipe_id 
   WHERE id = $search_id
```

#### Utilisation

**Analyse Gaps** :
```sql
-- Recherches sans rÃ©sultats satisfaisants (opportunitÃ©s)
SELECT query_text, COUNT(*) as frequency
FROM search_queries
WHERE results_count < 3 
  AND searched_at > now() - interval '30 days'
GROUP BY query_text
HAVING COUNT(*) > 5
ORDER BY frequency DESC;
```

**Clustering Niches** :
- K-means sur search_embeddings
- Grouper recherches similaires sÃ©mantiquement
- Base du Niche Finder

---

## 2ï¸âƒ£ In-App SEO Tool

### Objectif

Permettre aux crÃ©ateurs de **valider le potentiel** d'une idÃ©e de recette AVANT de la crÃ©er.

### 2.1 User Flow

```
CrÃ©ateur sur Web Platform :

1. Navigue vers page "SEO Tool"

2. Entre INPUT (2 modes) :
   
   Mode A - Mot-clÃ© simple :
   [Entrez mot-clÃ©]  "attiÃ©kÃ© poisson"
   
   Mode B - IdÃ©e complÃ¨te :
   [DÃ©crivez votre recette]
   "AttiÃ©kÃ© au poisson braisÃ© avec sauce tomate Ã©picÃ©e,
    recette facile en 30 minutes, parfait pour dÃ®ner rapide"

3. Clique [Analyser Potentiel]

4. Loading (2-3 secondes)

5. Affichage RÃ©sultats :
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ ðŸ“Š INDICE POTENTIEL : 87/100 ðŸ”¥     â”‚
   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚ Volume Recherches    234/mois  â†—ï¸   â”‚
   â”‚ Recettes Existantes  3 recettes     â”‚
   â”‚ Ratio OpportunitÃ©    78:1 ðŸŽ¯        â”‚
   â”‚ Consommation Moy.    45/recette     â”‚
   â”‚ Note Moyenne         4.2â­          â”‚
   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚ [â–¼ Voir DÃ©tails Exhaustifs]         â”‚
   â”‚ [âœ¨ CrÃ©er Cette Recette]            â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

6. Si clique "Voir DÃ©tails" â†’ Section dÃ©ploie :
   - Graph tendances 6 mois
   - Distribution temporelle recherches
   - Profil dÃ©mographique chercheurs
   - Liste recettes concurrentes
   - Suggestions optimisation IA
```

---

### 2.2 Calcul Indice Potentiel

#### Formule Globale

```
INDICE_POTENTIEL (0-100) = 
  (DEMANDE Ã— 40%) +
  (OPPORTUNITÃ‰ Ã— 30%) +
  (ENGAGEMENT Ã— 20%) +
  (TENDANCE Ã— 10%)
```

#### Composantes DÃ©taillÃ©es

**A) DEMANDE (0-100)**

Mesure le volume de recherches relatif.

```
DEMANDE = (recherches_query_30j / max_recherches_plateforme_30j) Ã— 100

Exemple :
- Query "attiÃ©kÃ© poisson" : 234 recherches/mois
- Max plateforme : "poulet braisÃ©" : 1,200 recherches/mois
â†’ DEMANDE = (234 / 1200) Ã— 100 = 19.5

Normalisation :
- <10 recherches/mois : Score 0-10 (trÃ¨s faible)
- 10-50 : Score 10-30 (faible)
- 50-200 : Score 30-60 (moyen)
- 200-500 : Score 60-85 (Ã©levÃ©)
- >500 : Score 85-100 (trÃ¨s Ã©levÃ©)
```

**B) OPPORTUNITÃ‰ (0-100)**

Mesure la faiblesse de la concurrence.

```
OPPORTUNITÃ‰ = 100 - ((recettes_existantes / recherches_30j) Ã— 100)

Mais avec floor Ã  0 et ajustements :

SI recettes_existantes = 0 :
  â†’ Score 100 (gap total)

SI recettes_existantes < 5 ET recherches > 100 :
  â†’ Score 90-100 (excellente opportunitÃ©)

SI recettes_existantes > recherches :
  â†’ Score 0-20 (marchÃ© saturÃ©)

Exemple 1 :
- 234 recherches, 3 recettes
â†’ OPPORTUNITÃ‰ = 100 - ((3/234) Ã— 100) = 98.7 â†’ Score 99

Exemple 2 :
- 50 recherches, 25 recettes
â†’ OPPORTUNITÃ‰ = 100 - ((25/50) Ã— 100) = 50 â†’ Score 50

Exemple 3 :
- 100 recherches, 0 recette
â†’ OPPORTUNITÃ‰ = 100 (gap!)
```

**C) ENGAGEMENT (0-100)**

Mesure la performance des recettes existantes similaires.

```
ENGAGEMENT = 
  (consommation_score Ã— 40%) +
  (rating_score Ã— 40%) +
  (like_rate Ã— 20%)

OÃ¹ :

consommation_score = (conso_moyenne_recettes_similaires / max_conso_plateforme) Ã— 100

rating_score = (note_moyenne_recettes_similaires / 5) Ã— 100

like_rate = (likes / (consommations + vues)) Ã— 100

Exemple :
- Recettes similaires : avg 45 consommations (max plateforme = 200)
  â†’ conso_score = (45/200) Ã— 100 = 22.5
- Note moyenne : 4.2/5
  â†’ rating_score = (4.2/5) Ã— 100 = 84
- Like rate : 12%
  â†’ like_rate = 12

â†’ ENGAGEMENT = (22.5 Ã— 0.4) + (84 Ã— 0.4) + (12 Ã— 0.2)
             = 9 + 33.6 + 2.4
             = 45

InterprÃ©tation :
- <30 : Faible engagement (niche difficile ou qualitÃ© recettes faible)
- 30-60 : Engagement moyen (viable)
- 60-80 : Bon engagement
- >80 : Excellent engagement (recettes trÃ¨s populaires)
```

**D) TENDANCE (0-100)**

Mesure la croissance/dÃ©clin de la demande.

```
TENDANCE = Comparaison volume recherches actuel vs 30 jours prÃ©cÃ©dents

Croissance = ((recherches_30j - recherches_60-30j) / recherches_60-30j) Ã— 100

SI croissance > +20% :
  â†’ Score 100 (momentum fort)

SI croissance +10% Ã  +20% :
  â†’ Score 70

SI croissance -5% Ã  +10% :
  â†’ Score 50 (stable)

SI croissance -20% Ã  -5% :
  â†’ Score 30 (dÃ©clin lÃ©ger)

SI croissance < -20% :
  â†’ Score 0 (dÃ©clin fort, Ã©viter)

Exemple 1 :
- Recherches actuelles : 234/mois
- Recherches mois prÃ©cÃ©dent : 198/mois
â†’ Croissance = ((234-198)/198) Ã— 100 = +18%
â†’ Score 70

Exemple 2 :
- Recherches actuelles : 50/mois
- Recherches mois prÃ©cÃ©dent : 120/mois
â†’ Croissance = ((50-120)/120) Ã— 100 = -58%
â†’ Score 0 (abandon tendance)
```

---

#### Exemple Calcul Complet

**Query** : "AttiÃ©kÃ© poisson rapide"

**DonnÃ©es** :
- Recherches 30j : 234
- Recettes existantes : 3
- Consommation moyenne similaires : 45
- Note moyenne similaires : 4.2/5
- Like rate : 12%
- Croissance vs mois prÃ©cÃ©dent : +18%

**Calcul** :
```
DEMANDE = 60 (234 recherches = volume moyen-Ã©levÃ©)

OPPORTUNITÃ‰ = 99 (seulement 3 recettes pour 234 recherches)

ENGAGEMENT = 45 
  (conso moyenne, bonne note mais pas exceptionnelle)

TENDANCE = 70 (croissance +18%)

INDICE_POTENTIEL = (60Ã—0.4) + (99Ã—0.3) + (45Ã—0.2) + (70Ã—0.1)
                 = 24 + 29.7 + 9 + 7
                 = 69.7 â†’ Arrondi Ã  70/100
```

**InterprÃ©tation** : Score 70 = **Bonne opportunitÃ©**
- Demande solide et croissante
- TrÃ¨s faible concurrence (opportunitÃ© claire)
- Engagement modÃ©rÃ© (amÃ©lioration possible)
- **Recommandation** : CrÃ©er cette recette en se diffÃ©renciant sur rapiditÃ©/facilitÃ©

---

### 2.3 DÃ©tails Exhaustifs AffichÃ©s

Quand crÃ©ateur clique "Voir DÃ©tails", afficher :

#### A) Tendances Temporelles

**Graph Volume Recherches (6 derniers mois)** :
```
Recherches
    â†‘
250 |                               â—
    |                           â—
200 |                       â—
    |                   â—
150 |               â—
    |           â—
100 |       â—
    |___â—___|___|___|___|___|___â†’ Mois
     Oct  Nov  Dec  Jan  Fev  Mar
```

**Distribution Temporelle** :
- Top jours semaine : Dimanche (34%), Samedi (28%)
- Top heures : 18h-20h (41% recherches = dÃ®ner)
- Insight : "Peak recherche dimanche soir â†’ optimiser pour meal prep semaine"

---

#### B) Profil Chercheurs

**DÃ©mographie agrÃ©gÃ©e** (minimum 10 recherches pour anonymat) :
```
Genre :
  ðŸ‘© Femmes   67%
  ðŸ‘¨ Hommes   33%

Ã‚ge :
  18-24 ans   23%
  25-34 ans   45% â† dominant
  35-44 ans   22%
  45+ ans     10%

Localisation :
  ðŸ‡«ðŸ‡· France        45%
  ðŸ‡§ðŸ‡ª Belgique      23%
  ðŸ‡¬ðŸ‡§ UK            18%
  ðŸ‡©ðŸ‡ª Allemagne     14%

Objectifs Fitness :
  ðŸŽ¯ Perte de poids   56%
  ðŸ’ª Prise muscle     12%
  âš–ï¸  Maintenance      23%
  ðŸƒ Performance       9%
```

**Insight IA** :
"Vos chercheurs sont majoritairement des femmes jeunes (25-34) en perte de poids. Accent sur recettes lÃ©gÃ¨res, rapides, et visuellement attrayantes."

---

#### C) Recettes Concurrentes

**Liste recettes existantes similaires** :
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. "AttiÃ©kÃ© Simple"                              â”‚
â”‚    Par : Chef AÃ¯cha                              â”‚
â”‚    89 consommations | 4.5â­ | 67% completion     â”‚
â”‚    [Voir Recette]                                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 2. "AttiÃ©kÃ© Poulet"                              â”‚
â”‚    Par : Cuisine Ivoire                          â”‚
â”‚    67 consommations | 4.1â­ | 78% completion     â”‚
â”‚    [Voir Recette]                                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 3. "Garba Express"                               â”‚
â”‚    Par : Recettes Rapides                        â”‚
â”‚    45 consommations | 4.3â­ | 89% completion     â”‚
â”‚    [Voir Recette]                                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Analyse CompÃ©titive** :
- Aucune recette "attiÃ©kÃ© poisson" spÃ©cifique (gap!)
- Recettes existantes gÃ©nÃ©riques ou autre protÃ©ine
- Toutes bonnes notes â†’ niche validÃ©e, juste manque variÃ©tÃ©

---

#### D) Suggestions Optimisation IA

**GÃ©nÃ©rÃ©es par analyse patterns** :
```
ðŸ’¡ SUGGESTIONS POUR MAXIMISER SUCCÃˆS :

1. Accent sur "Rapide"
   â†’ 78% des chercheurs filtrent par temps <30min
   â†’ Mettre "15 minutes" dans titre

2. Visuels importants
   â†’ Recettes photos colorÃ©es ont +45% consommation
   â†’ PrÃ©voir photo attiÃ©kÃ© + poisson grillÃ© bien prÃ©sentÃ©

3. Variante VÃ©gÃ©tarienne
   â†’ 12% recherches mentionnent "sans viande"
   â†’ ConsidÃ©rer version tofu/lÃ©gumes en alternative

4. Timing publication
   â†’ Publier Samedi/Dimanche pour max visibilitÃ©
   â†’ Peak recherche = dimanche soir meal prep

5. Mots-clÃ©s optimisÃ©s
   â†’ Inclure : "healthy", "protÃ©inÃ©", "Ã©quilibrÃ©"
   â†’ Ã‰viter : "complexe", "long", "difficile"
```

---

### 2.4 Actions Post-Analyse

AprÃ¨s consultation SEO Tool, crÃ©ateur peut :

**1. CrÃ©er Recette Directement**
- Bouton "CrÃ©er Cette Recette"
- PrÃ©-remplissage : titre suggÃ©rÃ©, tags optimisÃ©s
- Redirect vers Recipe Creator avec context

**2. Sauvegarder IdÃ©e**
- Bouton "Sauvegarder OpportunitÃ©"
- Stocke dans liste "IdÃ©es Recettes" crÃ©ateur
- Notifs si tendance change (+20% volume = alerte)

**3. Comparer Autres IdÃ©es**
- Bouton "Tester Autre IdÃ©e"
- Historique recherches SEO (10 derniÃ¨res)
- Comparaison side-by-side scores

---

## 3ï¸âƒ£ Niche Finder

### Objectif

**DÃ©couvrir automatiquement** les clusters d'opportunitÃ©s business (niches) via analyse algorithmique des recherches.

### 3.1 Algorithme Clustering (Conceptuel)

```
Cron Job Hebdomadaire (Dimanche 3am) :

Ã‰TAPE 1 : COLLECTE DONNÃ‰ES
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Fetch toutes recherches uniques 90 derniers jours
WHERE search_count >= 5  (filter bruit)

RÃ©sultat : ~5,000-10,000 queries uniques


Ã‰TAPE 2 : VECTORISATION
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Pour chaque query pas encore vectorisÃ©e :
  - Appeler OpenAI embedding
  - Store query_embedding

RÃ©sultat : Chaque query a vector[1536]


Ã‰TAPE 3 : CLUSTERING MULTI-NIVEAUX
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Niveau 1 - LARGE (10-15 clusters)
  K-means avec K=12
  Exemples clusters :
    - "Cuisine Ivoirienne"
    - "Recettes Rapides"
    - "VÃ©gÃ©tarien Africain"
    - "Petit-dÃ©jeuner Traditionnel"
    ...

Niveau 2 - MOYEN (30-50 clusters)
  Pour chaque cluster Niveau 1 :
    Sub-clustering K-means K=4
  
  Exemples :
    "Cuisine Ivoirienne" â†’ sous-clusters :
      - "Petit-dÃ©jeuner Ivoirien"
      - "DÃ©jeuner Traditionnel Ivoirien"
      - "Snacks Ivoiriens"
      - "Desserts Ivoiriens"

Niveau 3 - PRÃ‰CIS (100-200 clusters)
  Pour chaque cluster Niveau 2 :
    Sub-clustering K-means K=3-5
  
  Exemples :
    "Petit-dÃ©jeuner Ivoirien" â†’ sous-clusters :
      - "AttiÃ©kÃ© Matin ProtÃ©inÃ©"
      - "Bouillie Traditionnelle"
      - "Aloco Breakfast"


Ã‰TAPE 4 : CALCUL MÃ‰TRIQUES PAR NICHE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Pour chaque cluster (tous niveaux) :

  a) Total recherches 30j :
     SUM(search_count) WHERE query IN cluster

  b) Recettes existantes :
     COUNT(recipes) WHERE recipe.embedding similaire Ã  cluster.centroid

  c) Consommation moyenne :
     AVG(consumptions) FROM recettes existantes

  d) Note moyenne :
     AVG(rating) FROM recettes existantes

  e) Croissance :
     Comparaison volume mois actuel vs prÃ©cÃ©dent


Ã‰TAPE 5 : SCORE POTENTIEL FINANCIER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

SCORE_FINANCIER = 
  (Volume_Recherches Ã— Taux_Conversion Ã— Prix_Par_Conso) 
  - PÃ©nalitÃ©_Saturation

DÃ©tail :

Volume_Recherches : total recherches/mois dans niche

Taux_Conversion : % recherches â†’ consommations
  - BasÃ© sur historique plateforme
  - Moyenne : 15%
  - Range : 5-30% selon qualitÃ© recettes

Prix_Par_Conso : Revenue crÃ©ateur par consommation
  - ModÃ¨le Akeli : â‚¬1 pour 30 consommations
  - Donc : â‚¬0.033/consommation

PÃ©nalitÃ©_Saturation :
  SI recettes_existantes / recherches > 0.5 :
    â†’ Niche saturÃ©e, score Ã— 0.5
  SI recettes_existantes / recherches > 1 :
    â†’ TrÃ¨s saturÃ©, score Ã— 0.2

Exemple Calcul :

Niche "Petit-dÃ©jeuner Ivoirien Rapide"
  - 890 recherches/mois
  - Taux conversion estimÃ© : 18% (bon engagement historique)
  - Consommations estimÃ©es : 890 Ã— 0.18 = 160/mois
  - Revenue : 160 Ã— â‚¬0.033 = â‚¬5.28/mois par recette
  - Recettes existantes : 2 (faible saturation)
  - PÃ©nalitÃ© : aucune
  â†’ SCORE : â‚¬5.28/mois/recette

Si crÃ©ateur publie 3 recettes dans cette niche :
  â†’ Potentiel : 3 Ã— â‚¬5.28 = â‚¬15.84/mois


Ã‰TAPE 6 : STOCKAGE & RANKING
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO niche_clusters (...) VALUES (...)

Rank par :
  1. Score financier (principal)
  2. Croissance tendance (tie-breaker)
  3. Niveau saturation (prÃ©fÃ©rer niches vides)

```

---

### 3.2 User Flow Niche Finder

```
CrÃ©ateur sur Web Platform :

1. Navigue vers page "Niche Finder"

2. Voit filtres en haut :
   [GranularitÃ©: â–¼ Toutes]  [RÃ©gion: â–¼ Toutes]  
   [Temps Cuisson: â–¼ Tous]  [DifficultÃ©: â–¼ Toutes]

3. Feed scroll infini, niches classÃ©es par potentiel financier :

   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ ðŸ”¥ #1 Petit-dÃ©jeuner Ivoirien Rapide        â”‚
   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚ Potentiel : â‚¬127/mois (pour 3-5 recettes)  â”‚
   â”‚ Recherches : 890/mois  â†—ï¸ +23%              â”‚
   â”‚ Recettes : 2 (trÃ¨s faible!)                â”‚
   â”‚ Saturation : ðŸŸ¢ Faible (22%)                â”‚
   â”‚                                             â”‚
   â”‚ Top recherches :                            â”‚
   â”‚ â€¢ attiÃ©kÃ© matin protÃ©inÃ© (456)              â”‚
   â”‚ â€¢ breakfast garba rapide (234)              â”‚
   â”‚ â€¢ bouillie healthy (200)                    â”‚
   â”‚                                             â”‚
   â”‚ [Explorer Niche] [CrÃ©er 1Ã¨re Recette]      â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ ðŸ”¥ #2 NdolÃ© Variations                      â”‚
   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚ Potentiel : â‚¬89/mois                        â”‚
   â”‚ ...                                         â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

   [Charger Plus...]

4. Si clique "Explorer Niche" â†’ Page DÃ©tail (voir section suivante)

5. Si clique "CrÃ©er 1Ã¨re Recette" â†’ Redirect Recipe Creator
   avec pre-fill : tags niche, suggestions SEO
```

---

### 3.3 Page DÃ©tail Niche

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ðŸŽ¯ Niche : Petit-dÃ©jeuner Ivoirien Rapide           â”‚
â”‚ Niveau : PrÃ©cis (Niveau 3)                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ“Š MÃ‰TRIQUES GLOBALES                               â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚ Total recherches     890/mois                       â”‚
â”‚ Recettes existantes  2                              â”‚
â”‚ Revenue estimÃ©       â‚¬127/mois (3-5 recettes)       â”‚
â”‚ Saturation           ðŸŸ¢ 22% (excellente opportunitÃ©)â”‚
â”‚ Tendance             â†—ï¸ +23% croissance 30j          â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ“ˆ TENDANCE 6 MOIS                                  â”‚
â”‚                                                     â”‚
â”‚ Recherches                                          â”‚
â”‚     â†‘                                               â”‚
â”‚ 900 |                                         â—     â”‚
â”‚ 800 |                                     â—         â”‚
â”‚ 700 |                                 â—             â”‚
â”‚ 600 |                             â—                 â”‚
â”‚ 500 |                         â—                     â”‚
â”‚ 400 |                     â—                         â”‚
â”‚ 300 |___â—___|___|___|___|___|___â†’ Mois              â”‚
â”‚      Sep  Oct  Nov  Dec  Jan  Fev                  â”‚
â”‚                                                     â”‚
â”‚ Analyse : Croissance linÃ©aire rÃ©guliÃ¨re.           â”‚
â”‚ Tendance durable, pas juste spike temporaire.      â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ” OPPORTUNITÃ‰S SPÃ‰CIFIQUES                         â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ 1. "AttiÃ©kÃ© protÃ©inÃ© petit-dÃ©jeuner"                â”‚
â”‚    456 recherches/mois | 0 recette â—               â”‚
â”‚    Potentiel : â‚¬203/mois                            â”‚
â”‚    DifficultÃ© : â­â­ Facile (gap Ã©vident)            â”‚
â”‚    [CrÃ©er Cette Recette]                            â”‚
â”‚                                                     â”‚
â”‚ 2. "Bouillie healthy matin"                         â”‚
â”‚    234 recherches/mois | 0 recette â—               â”‚
â”‚    Potentiel : â‚¬104/mois                            â”‚
â”‚    DifficultÃ© : â­â­â­ Moyen (recette traditionelle) â”‚
â”‚    [CrÃ©er Cette Recette]                            â”‚
â”‚                                                     â”‚
â”‚ 3. "Breakfast garba rapide"                         â”‚
â”‚    200 recherches/mois | 1 recette (note 3.2)      â”‚
â”‚    Potentiel : â‚¬89/mois                             â”‚
â”‚    DifficultÃ© : â­ TrÃ¨s facile (recette battable!)  â”‚
â”‚    Note : Recette existante mal notÃ©e, facile      â”‚
â”‚           de faire mieux avec bonne prÃ©sentation    â”‚
â”‚    [CrÃ©er Version AmÃ©liorÃ©e]                        â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ‘¥ PROFIL CONSOMMATEURS NICHE                       â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ DÃ©mographie :                                       â”‚
â”‚   72% Femmes | 28% Hommes                           â”‚
â”‚   Ã‚ge dominant : 25-34 ans (58%)                    â”‚
â”‚   Localisation : 67% France, 23% Belgique           â”‚
â”‚                                                     â”‚
â”‚ Objectifs :                                         â”‚
â”‚   65% Perte de poids                                â”‚
â”‚   23% Maintenance                                   â”‚
â”‚   12% Prise muscle                                  â”‚
â”‚                                                     â”‚
â”‚ Comportements :                                     â”‚
â”‚   Moment prÃ©fÃ©rÃ© : Matin (89% recherches 6h-10h)    â”‚
â”‚   Jours : Dimanche (34%), Lundi (28%)               â”‚
â”‚   CritÃ¨res : Rapide, protÃ©inÃ©, satiÃ©tÃ©              â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ’¡ INSIGHTS & RECOMMANDATIONS IA                    â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ âœ… POURQUOI CETTE NICHE EST EXCELLENTE :            â”‚
â”‚                                                     â”‚
â”‚ 1. Demande forte et croissante (+23%)              â”‚
â”‚    Les gens veulent petit-dÃ©jeuner ivoirien rapide â”‚
â”‚                                                     â”‚
â”‚ 2. Quasi absence de concurrence (2 recettes)       â”‚
â”‚    Vous serez parmi les premiers                   â”‚
â”‚                                                     â”‚
â”‚ 3. Audience bien dÃ©finie (femmes 25-34 perte poids)â”‚
â”‚    Facile de cibler et crÃ©er contenu adaptÃ©        â”‚
â”‚                                                     â”‚
â”‚ 4. Timing favorable (recherches peak dimanche)     â”‚
â”‚    Publier samedi/dimanche pour max impact         â”‚
â”‚                                                     â”‚
â”‚ âš ï¸  POINTS D'ATTENTION :                            â”‚
â”‚                                                     â”‚
â”‚ â€¢ Accent sur RAPIDE essentiel (<15min idÃ©al)       â”‚
â”‚ â€¢ ProtÃ©ines importantes (oeufs, poisson, tofu)     â”‚
â”‚ â€¢ Photos qualitÃ© critique (meal prep visual)       â”‚
â”‚ â€¢ Portions contrÃ´lÃ©es (objectif perte poids)       â”‚
â”‚                                                     â”‚
â”‚ ðŸŽ¯ STRATÃ‰GIE RECOMMANDÃ‰E :                          â”‚
â”‚                                                     â”‚
â”‚ CrÃ©er 3-5 recettes dans cette niche :              â”‚
â”‚                                                     â”‚
â”‚ 1. "AttiÃ©kÃ© ProtÃ©inÃ© Matin" (core, gap Ã©vident)    â”‚
â”‚ 2. "Bouillie Healthy Express" (traditionnel+moderneâ”‚
â”‚ 3. "Garba Complet 10min" (battre recette existante)â”‚
â”‚ 4. "Aloco Breakfast Bowl" (fusion, diffÃ©renciation)â”‚
â”‚ 5. "Smoothie Bowl Africain" (tendance healthy)     â”‚
â”‚                                                     â”‚
â”‚ Revenue estimÃ© si 5 recettes :                     â”‚
â”‚ â‚¬127/mois â†’ potentiel croissance â‚¬200+/mois        â”‚
â”‚ si niche devient dominante                          â”‚
â”‚                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

[â¬…ï¸ Retour Niches] [ðŸ“Š Comparer Autres Niches]
```

---

### 3.4 Filtres Niche Finder

Permettre crÃ©ateurs de filtrer/trier niches :

**GranularitÃ©** :
- Large (cuisines gÃ©nÃ©rales)
- Moyen (types repas, rÃ©gimes)
- PrÃ©cis (recettes spÃ©cifiques)

**RÃ©gion Cuisine** :
- Toutes
- Ivoirienne
- Camerounaise
- SÃ©nÃ©galaise
- Panafricaine
- Fusion

**Temps Cuisson** :
- Tous
- <15min (ultra-rapide)
- 15-30min (rapide)
- 30-60min (moyen)
- >60min (long)

**DifficultÃ©** :
- Toutes
- Facile (gap Ã©vident, 0 recettes)
- Moyen (1-5 recettes battables)
- Difficile (>5 recettes qualitÃ©)

**Tri** :
- Potentiel financier (dÃ©faut)
- Volume recherches
- Croissance tendance
- Niveau saturation

---

## 4ï¸âƒ£ Advanced Analytics CrÃ©ateur

### Objectif

Donner aux crÃ©ateurs une **comprÃ©hension profonde** de qui consomme leurs recettes pour optimiser leur offre.

### 4.1 Dashboard Analytics

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ðŸ‘¥ MES CONSOMMATEURS - Derniers 30 jours            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ“Š VUE D'ENSEMBLE                                   â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ Total unique          234 personnes                 â”‚
â”‚ Nouveaux              89 (38%)                      â”‚
â”‚ RÃ©currents            145 (62%)  âœ… Bon!            â”‚
â”‚ Taux rÃ©tention        67% â†—ï¸ +5% vs mois dernier    â”‚
â”‚                                                     â”‚
â”‚ Consommations totales 847 (+12%)                    â”‚
â”‚ Revenue               â‚¬28.23 (+â‚¬3.50)               â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ“Š DÃ‰MOGRAPHIE                                      â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ Genre :                                             â”‚
â”‚ â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 67% Femmes                     â”‚
â”‚ â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 33% Hommes                                â”‚
â”‚                                                     â”‚
â”‚ Ã‚ge :                                               â”‚
â”‚ 18-24 ans    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 23%                             â”‚
â”‚ 25-34 ans    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 45%  â† Dominant          â”‚
â”‚ 35-44 ans    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 22%                             â”‚
â”‚ 45+ ans      â–ˆâ–ˆâ–ˆ 10%                                â”‚
â”‚                                                     â”‚
â”‚ Localisation :                                      â”‚
â”‚ ðŸ‡«ðŸ‡· France        â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 45%                 â”‚
â”‚ ðŸ‡¬ðŸ‡§ UK            â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 23%                        â”‚
â”‚ ðŸ‡©ðŸ‡ª Allemagne     â–ˆâ–ˆâ–ˆâ–ˆ 12%                          â”‚
â”‚ ðŸ‡§ðŸ‡ª Belgique      â–ˆâ–ˆâ–ˆâ–ˆ 11%                          â”‚
â”‚ ðŸ‡¨ðŸ‡® CÃ´te Ivoire   â–ˆâ–ˆâ–ˆ 9%                            â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸŽ¯ OBJECTIFS FITNESS                                â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ Perte de poids   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 56%               â”‚
â”‚ Maintenance      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 23%                         â”‚
â”‚ Prise de muscle  â–ˆâ–ˆâ–ˆâ–ˆ 12%                           â”‚
â”‚ Performance      â–ˆâ–ˆâ–ˆ 9%                             â”‚
â”‚                                                     â”‚
â”‚ Insight : Vos recettes attirent surtout audience   â”‚
â”‚           "perte de poids" - optimiser calories     â”‚
â”‚           et macros pour ce public                  â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ½ï¸ COMPORTEMENTS CONSOMMATION                       â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ Recettes/semaine          4.2 moyenne               â”‚
â”‚                                                     â”‚
â”‚ Jours prÃ©fÃ©rÃ©s :                                    â”‚
â”‚ Dimanche  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 34%  â† Peak!                â”‚
â”‚ Samedi    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 28%                            â”‚
â”‚ Lundi     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 18%                                â”‚
â”‚ Autres    â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 20%                                â”‚
â”‚                                                     â”‚
â”‚ Moments :                                           â”‚
â”‚ DÃ®ner         â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 67%               â”‚
â”‚ DÃ©jeuner      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 23%                        â”‚
â”‚ Petit-dÃ©j     â–ˆâ–ˆâ–ˆ 10%                               â”‚
â”‚                                                     â”‚
â”‚ Taux completion recette   89%  âœ… Excellent!        â”‚
â”‚ Taux re-consommation      45%  (rÃ©-commandent)      â”‚
â”‚                                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                     â”‚
â”‚ ðŸ’¡ INSIGHTS ACTIONNABLES                            â”‚
â”‚ â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”  â”‚
â”‚                                                     â”‚
â”‚ âœ… CE QUI FONCTIONNE BIEN :                         â”‚
â”‚                                                     â”‚
â”‚ â€¢ Vos recettes "rapides" (<30min) performent       â”‚
â”‚   2x mieux auprÃ¨s femmes 25-34 ans                  â”‚
â”‚   â†’ CrÃ©er plus de recettes dans ce style           â”‚
â”‚                                                     â”‚
â”‚ â€¢ Dimanche soir = pic consommation                  â”‚
â”‚   â†’ Publier nouvelles recettes samedi/dimanche     â”‚
â”‚   â†’ Optimiser pour "meal prep semaine"             â”‚
â”‚                                                     â”‚
â”‚ â€¢ Taux completion 89% = excellent                   â”‚
â”‚   â†’ Vos instructions sont claires, continuer!      â”‚
â”‚                                                     â”‚
â”‚ âš ï¸  OPPORTUNITÃ‰S D'AMÃ‰LIORATION :                   â”‚
â”‚                                                     â”‚
â”‚ â€¢ Faible engagement hommes 35-44 ans (8% seulement) â”‚
â”‚   â†’ CrÃ©er recettes "prise muscle" pour cibler      â”‚
â”‚   â†’ Ex: Poulet grillÃ© protÃ©inÃ©, MafÃ© fitness        â”‚
â”‚                                                     â”‚
â”‚ â€¢ Petit-dÃ©jeuner sous-reprÃ©sentÃ© (10%)              â”‚
â”‚   â†’ Grosse opportunitÃ© dÃ©tectÃ©e (voir Niche Finder) â”‚
â”‚   â†’ "Breakfast Ivoirien Rapide" = niche #1          â”‚
â”‚                                                     â”‚
â”‚ â€¢ Localisation CÃ´te d'Ivoire faible (9%)            â”‚
â”‚   â†’ Votre contenu plaÃ®t diaspora, considÃ©rer       â”‚
â”‚     marketing local Afrique aussi                   â”‚
â”‚                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

[ðŸ“Š Exporter Rapport PDF] [ðŸ“§ Recevoir Hebdo Email]
```

---

### 4.2 DonnÃ©es CollectÃ©es

**Table `consumer_demographics`** :

Pour chaque user consommant recettes d'un crÃ©ateur, stocker :
- **DÃ©mographie** : genre, Ã¢ge, pays
- **Fitness** : objectif, niveau activitÃ©
- **Comportement** : total consommations, recettes prÃ©fÃ©rÃ©es, completion rate
- **Temporal** : jours prÃ©fÃ©rÃ©s, moments (breakfast/lunch/dinner)
- **Engagement** : likes, saves, re-consommations

**Mise Ã  jour** : Trigger automatique quand meal.consumed = true

**AgrÃ©gation** : Cron job quotidien recalcule stats par crÃ©ateur

---

### 4.3 Insights IA GÃ©nÃ©ratifs

**Optionnel** : Utiliser GPT pour gÃ©nÃ©rer insights textuels personnalisÃ©s

```
Prompt exemple :

"Analyse dÃ©mographique crÃ©ateur:
- 67% femmes 25-34 ans, objectif perte poids
- Peak consommation dimanche soir
- Recettes rapides surperforment
- Faible engagement hommes, petit-dÃ©jeuner

GÃ©nÃ¨re 3-5 suggestions actionnables pour crÃ©ateur
amÃ©liorer son offre et revenue."

â†’ GPT retourne insights personnalisÃ©s
```

**CoÃ»t** : ~$0.01 par gÃ©nÃ©ration insight â†’ Acceptable si 1x/semaine

---

**Prochaine section** : [03 - Architecture Base de DonnÃ©es](03-database-schema.md)
