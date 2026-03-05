# ðŸ§¬ Vectorisation Utilisateur & Matrice E-G-R - AKELI

**Version** : 1.0  
**Date** : FÃ©vrier 2026  
**Statut** : Documentation Conceptuelle - ImplÃ©mentation prÃ©vue Septembre 2026

---

## ðŸ“‹ Table des MatiÃ¨res

1. [Vision Globale](#vision-globale)
2. [Architecture Vectorisation](#architecture-vectorisation)
3. [Dimensions Utilisateur](#dimensions-utilisateur)
4. [Matrice E-G-R](#matrice-e-g-r)
5. [PondÃ©ration Dynamique](#pondÃ©ration-dynamique)
6. [Applications](#applications)
7. [ConsidÃ©rations Ã‰thiques](#considÃ©rations-Ã©thiques)

---

## ðŸŽ¯ Vision Globale

### Transformation StratÃ©gique

AKELI Ã©volue d'une **application nutrition simple** vers une **plateforme d'intelligence nutritionnelle algorithmique** en trois niveaux :

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  B2C (Utilisateurs)                                  â”‚
â”‚  â†’ SystÃ¨me de recommandation personnalisÃ©           â”‚
â”‚  â†’ Intelligence nutrition AI (tier premium)          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  B2B (Professionnels)                                â”‚
â”‚  â†’ Plateforme data intelligence nutrition            â”‚
â”‚  â†’ Analytics clients & patterns populationnels       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  CrÃ©ateurs                                           â”‚
â”‚  â†’ SystÃ¨me recommandation crÃ©ation                   â”‚
â”‚  â†’ Matching audience-contenu optimal                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### DiffÃ©renciateur ClÃ© : TikTok de la Nutrition

**Principe** : Algorithme puissant qui propose **les bonnes recettes aux bonnes personnes pour les meilleurs rÃ©sultats**, sans nÃ©cessiter d'explications complexes. Si Ã§a marche, les gens font confiance.

**Inspiration TikTok appliquÃ©e Ã  la nutrition** :
- Convergence rapide entre intention utilisateur et contenu pertinent
- Ã‰limination rapide des options dÃ©courageantes
- Renforcement constant de "Ã§a marche pour toi"
- Matching crÃ©ateur-audience optimal

---

## ðŸ—ï¸ Architecture Vectorisation

### Principe Structurel

Chaque utilisateur est reprÃ©sentÃ© par **un vecteur global unifiÃ©** composÃ© de **7 dimensions sÃ©parÃ©es**, chacune stockÃ©e dans sa propre table avec son vecteur partiel.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          user_vector_global (Table MaÃ®tre)          â”‚
â”‚                                                      â”‚
â”‚  â€¢ user_id                                          â”‚
â”‚  â€¢ global_embedding (vector 1536D)                  â”‚
â”‚  â€¢ dimension_magnitudes (JSON weights)              â”‚
â”‚  â€¢ data_completeness_score                          â”‚
â”‚  â€¢ confidence_score                                 â”‚
â”‚  â€¢ timestamps                                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
                   â”‚ AgrÃ¨ge depuis â†“
                   â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚                                              â”‚
    â–¼                          â–¼                   â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Dimension 1 â”‚    â”‚ Dimension 2 â”‚ ...â”‚ Dimension 7 â”‚
â”‚ (256D)      â”‚    â”‚ (256D)      â”‚    â”‚ (256D)      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Table MaÃ®tre : `user_vector_global`

**Contenu** :
- **global_embedding** : Vecteur unifiÃ© 1536 dimensions (agrÃ©gation pondÃ©rÃ©e de toutes dimensions)
- **dimension_magnitudes** : Poids de chaque dimension (JSON)
  ```json
  {
    "physiological": 0.85,
    "behavioral": 0.92,
    "contextual": 0.67,
    "outcomes": 0.78,
    "genetic_metabolic": 0.34,
    "social_engagement": 0.88,
    "geographic_cultural": 0.91
  }
  ```
- **data_completeness_score** : % de dimensions renseignÃ©es [0-1]
- **confidence_score** : FiabilitÃ© des donnÃ©es sources [0-1]
- **MÃ©tadonnÃ©es** : version, mÃ©thode calcul, timestamps

**RÃ´le** :
- Point d'entrÃ©e unique pour recommandations
- Stockage poids dynamiques pour scoring E-G-R
- Clustering utilisateurs global

---

## ðŸ“Š Dimensions Utilisateur

### 1. Dimension Physiologique (`user_dimension_physiological`)

**Vecteur** : 256D  
**Objectif** : CaractÃ©ristiques corporelles stables ou lentement changeantes

#### Contenu NormalisÃ© [0-1]

**AnthropomÃ©trie** :
- `age_normalized` = Ã¢ge / 100
- `bmi_normalized` = (BMI - 15) / (40 - 15)
- `sex_encoding` = one-hot [male, female, other]
- `height_normalized` = (height - 140) / (220 - 140)
- `weight_current_normalized` = weight / 200
- `weight_initial_normalized`
- `waist_normalized` = (waist - 50) / (150 - 50)

**SantÃ© & Contraintes** (boolÃ©ens) :
- `has_allergies`
- `has_intolerances`
- `has_medical_conditions`
- `is_pregnant`
- `is_breastfeeding`

**Magnitude initiale** : 0.85 (donnÃ©es gÃ©nÃ©ralement complÃ¨tes)

---

### 2. Dimension Comportementale (`user_dimension_behavioral`)

**Vecteur** : 256D  
**Objectif** : PrÃ©fÃ©rences alimentaires, objectifs fitness, habitudes culinaires

#### Contenu

**Objectifs Fitness** (one-hot) :
- `goal_weight_loss`, `goal_muscle_gain`, `goal_maintenance`, `goal_health`
- `goal_intensity` [0-1] : modÃ©rÃ© â†’ agressif
- `goal_horizon` : court terme vs long terme

**PrÃ©fÃ©rences Alimentaires** :
- Score affinitÃ© par type de cuisine (vecteur sparse)
- FrÃ©quence acceptation ingrÃ©dients top 50
- Score ingrÃ©dients dÃ©testÃ©s (vecteur nÃ©gatif)
- `repetition_tolerance` [0-1]
- PrÃ©fÃ©rence textures (croquant, crÃ©meux, Ã©picÃ©...)

**Habitudes Culinaires** :
- `cooking_time_normalized` = preferred_time / 120
- `skill_level` [0-1] : dÃ©butant â†’ expert
- `budget_normalized` : low=0.33, medium=0.66, high=1
- `shopping_frequency` : quotidien=1, hebdo=0.5, mensuel=0.25

**Patterns Temporels** :
- Jours prÃ©fÃ©rÃ©s (encoding cyclique sin/cos)
- Types repas prÃ©fÃ©rÃ©s (weights breakfast/lunch/dinner)
- `regularity_score` = inverse(variance_comportementale)

**Magnitude initiale** : 0.92 (forte importance prÃ©fÃ©rences)

---

### 3. Dimension Contextuelle (`user_dimension_contextual`)

**Vecteur** : 256D  
**Objectif** : Variables dynamiques liÃ©es Ã  l'environnement de vie actuel

#### Contenu

**ActivitÃ© Physique** :
- `activity_level` : sedentary=0.2, very_active=1
- `sport_type` (encoding catÃ©goriel)
- `training_frequency` = sessions/semaine / 7
- `intensity_avg` = RPE / 10
- `session_duration` = minutes / 180
- `weekly_volume` = heures / 20

**Contexte Professionnel** :
- `job_type` : sedentary_desk, mixed, physical (encodÃ©)
- `stress_level` [0-1]
- `work_hours_normalized` : standard=0.5, long=0.8, irregular=0.3
- `mental_load` [0-1]

**Sommeil & RÃ©cupÃ©ration** :
- `sleep_duration` = heures / 12
- `sleep_quality` : poor=0.33, average=0.66, good=1
- `sleep_regularity` = inverse(variance)

**Environnement Social** :
- `household_size` / 8
- `cooking_responsibility` (boolÃ©en)
- `family_situation` (encodÃ©)

**Magnitude initiale** : 0.67 (partiellement renseignÃ© au dÃ©but)

---

### 4. Dimension Outcomes (`user_dimension_outcomes`)

**Vecteur** : 256D  
**Objectif** : RÃ©sultats observÃ©s, progression, engagement rÃ©el

#### Contenu

**Tracking Nutritionnel** :
- `calories_avg` / 4000
- `protein_avg` / 300
- `carbs_avg` / 500
- `fat_avg` / 150
- `fiber_avg` / 60
- `nutritional_variance` (stabilitÃ© inverse)

**Progression Corporelle** :
- `weight_trend_weekly` : Â±2kg/semaine â†’ Â±1
- `change_velocity` (absolue, normalisÃ©e)
- `plateau_detected` (boolÃ©en ou durÃ©e)
- `fluctuation_variance`

**AdhÃ©rence & Engagement** :
- `logging_rate` = % jours trackÃ©s
- `meal_completion_rate` = consumed / planned
- `plan_abandon_rate` (inverse)
- `app_frequency` = jours actifs / 7
- `avg_session_duration` = minutes / 30

**Satisfaction Subjective** :
- `energy_level_avg` [1-5 normalisÃ©]
- `satiety_avg` [1-5]
- `digestive_comfort` [1-5]
- `mood_clarity` [1-5]
- `performance_perceived` : amÃ©lioration=1, stagnation=0.5, baisse=0

**Magnitude initiale** : 0.78 (Ã©volue avec donnÃ©es)

---

### 5. Dimension GÃ©nÃ©tique/MÃ©tabolique (`user_dimension_genetic_metabolic`)

**Vecteur** : 128D (plus petit, sparse)  
**Objectif** : Proxies mÃ©taboliques infÃ©rÃ©s ou dÃ©clarÃ©s - **ActivÃ©s contextuellement**

#### Contenu

**Proxies MÃ©taboliques InfÃ©rÃ©s** :
- `carb_tolerance` (observÃ©e via perte poids + ratio carbs)
- `insulin_sensitivity` (proxy via rÃ©ponse glucidique)
- `protein_efficiency` (satiÃ©tÃ© + performance)
- `fat_metabolism_efficiency`

**Marqueurs Fonctionnels DÃ©clarÃ©s** :
- `lactose_tolerance` (boolÃ©en ou infÃ©rÃ©)
- `caffeine_sensitivity`
- `iron_metabolism_risk` (menstruation + endurance)

**Note Critique** : Poids **faible par dÃ©faut** (0.15-0.34), augmentÃ© seulement si contexte l'active.

**Exemple activation** :
- Forte consommation laitiÃ¨re â†’ tolÃ©rance lactose devient pertinente â†’ magnitude â†‘

**Magnitude initiale** : 0.34 (faible, contextuel)

---

### 6. Dimension Sociale/Plateforme (`user_dimension_social_engagement`)

**Vecteur** : 128D  
**Objectif** : Comportement plateforme, interactions, dÃ©couverte

#### Contenu

**Engagement Plateforme** :
- `recipes_liked` / 100
- `recipes_saved` / 50
- `creators_followed` / 20
- `comments_interactions` / 50
- `shares` / 20

**Patterns DÃ©couverte** :
- Mots-clÃ©s recherche (vecteur TF-IDF top 100 termes)
- Cuisines explorÃ©es (diversitÃ© Shannon entropy)
- `exploration_exploitation_ratio` (nouveautÃ© vs familiaritÃ©)

**Magnitude initiale** : 0.88 (important pour engagement)

---

### 7. Dimension GÃ©ographique/Culturelle (`user_dimension_geographic_cultural`)

**Vecteur** : 256D  
**Objectif** : Origine gÃ©ographique, affinitÃ© culturelle, patterns diasporiques

#### Contenu

**Origine GÃ©ographique** :
- **Pays rÃ©sidence** : encodage GPS (lat, lon normalisÃ©es) + continent + sous-rÃ©gion
- **Pays origine** (si diffÃ©rent) : idem encodage
- **Pattern diaspora** : native, 1Ã¨re gÃ©nÃ©ration, 2Ã¨me gÃ©nÃ©ration, retour

**AffinitÃ©s Ethniques/Culturelles** (optionnel, self-declared) :
- Groupes ethniques (encoding sparse) : Akan, Bambara, Peul, Yoruba, Igbo, Wolof, Kongo, Zulu, Somali, Amhara, BerbÃ¨re, Arabe maghrÃ©bin, CrÃ©ole, etc.
- **Note** : PAS pour dÃ©terminisme racial, mais pour **affinitÃ©s culinaires culturelles**
- Langues parlÃ©es (proxy culturel multi-label)

**Patterns Culinaires Culturels ObservÃ©s** :
- FrÃ©quence consommation par rÃ©gion :
  - Ouest-Africain (thiÃ©boudienne, mafÃ©, alloco)
  - Central-Africain (pondu, saka-saka, moambe)
  - Est-Africain (injera, ugali, sambusas)
  - Nord-Africain (couscous, tajine, harira)
  - Diaspora fusion
- IngrÃ©dients culturellement spÃ©cifiques : manioc, igname, plantain, gombo, fonio, teff, mil, Ã©pices traditionnelles

**Migration & Diaspora** :
- `migration_pattern` : native, 1st_gen, 2nd_gen, return
- `years_since_migration` / 50
- `cultural_connection` : forte=1, modÃ©rÃ©e=0.66, faible=0.33

**Magnitude initiale** : 0.91 (trÃ¨s pertinent pour AKELI)

---

### Justification Scientifique Dimension GÃ©o-Culturelle

#### Pourquoi l'AffinitÃ© Ethnique/GÃ©ographique est Pertinente

**Principe** : **Adaptation mÃ©tabolique populationnelle**

DiffÃ©rentes populations ont dÃ©veloppÃ© diffÃ©rentes adaptations mÃ©taboliques liÃ©es Ã  :
1. Environnement alimentaire historique
2. GÃ©ographie (cÃ´tier vs intÃ©rieur, tropical vs tempÃ©rÃ©)
3. Pratiques culinaires ancestrales

**Ce n'est PAS** : DÃ©terminisme gÃ©nÃ©tique racialisant  
**C'est** : Ã‰pidÃ©miologie nutritionnelle basÃ©e sur l'observation

#### Exemples Concrets d'Adaptations

**1. Populations CÃ´tiÃ¨res Ouest-Africaines & ProtÃ©ines Poisson**

**Observation** :
- Consommation historique quotidienne poisson frais/fumÃ©
- ThiÃ©boudienne, kedjenou poisson, soupe poisson
- Faible consommation viande rouge

**HypothÃ¨se mÃ©tabolique** :
- Meilleure biodisponibilitÃ© acides aminÃ©s via poisson
- TolÃ©rance digestive supÃ©rieure poisson vs viande rouge
- Ratio Omega-3/Omega-6 optimisÃ©
- Enzymes digestives adaptÃ©es (transmission microbiome)

**Application AKELI** :
```
Utilisateur : SÃ©nÃ©galais, objectif muscle gain, cÃ´te
â†’ Dimension geo_cultural dÃ©tecte : population cÃ´tiÃ¨re Ouest-Africaine
â†’ SystÃ¨me privilÃ©gie recettes POISSON pour protÃ©ines
â†’ PondÃ¨re par goÃ»t utilisateur
â†’ RÃ©sultat : ThiÃ©boudienne high-protein, Yassa poisson, Caldou
```

**2. Populations SahÃ©liennes & TolÃ©rance Glucides Complexes**

**Observation** :
- Consommation mil, sorgho, fonio (cÃ©rÃ©ales anciennes)
- TÃ´, couscous mil, bouillie
- Faible consommation blÃ© moderne

**HypothÃ¨se** :
- Meilleure tolÃ©rance amidons rÃ©sistants
- Microbiome adaptÃ© fermentation cÃ©rÃ©ales ancestrales
- SensibilitÃ© moindre gluten
- Pic insulinique rÃ©duit avec cÃ©rÃ©ales complÃ¨tes

**3. Populations ForestiÃ¨res Afrique Centrale & Lipides VÃ©gÃ©taux**

**Observation** :
- Huile palme rouge ancestrale (non raffinÃ©e)
- Saka-saka, pondu, ndolÃ©
- Noix palme, graines courge, sÃ©same

**HypothÃ¨se** :
- TolÃ©rance lipides saturÃ©s vÃ©gÃ©taux supÃ©rieure
- MÃ©tabolisme efficace carotÃ©noÃ¯des
- Microbiome fibrolytique adaptÃ© feuilles vertes

#### MÃ©thode AKELI : Observation â†’ CorrÃ©lation â†’ Validation

**Ã‰tape 1 : Collecte**
- Utilisateur renseigne origine (optionnel)
- SystÃ¨me observe consommation + rÃ©sultats

**Ã‰tape 2 : Stratification**
- Groupe utilisateurs par `geo_cultural_vector`
- Compare rÃ©ponses nutritionnelles entre groupes

**Ã‰tape 3 : DÃ©tection Patterns**
```
Analyse :
  Population cÃ´tiÃ¨re Ouest-Africaine (n=234)
  Recettes poisson vs viande rouge
  Outcome : perte poids

RÃ©sultat observÃ© :
  Poisson : -0.8 kg/semaine moyenne
  Viande rouge : -0.5 kg/semaine moyenne
  
ProbabilitÃ© : 72% que poisson soit meilleur pour cette population
```

**Ã‰tape 4 : Application PersonnalisÃ©e**
```
Nouvel utilisateur : SÃ©nÃ©galais, objectif perte poids
â†’ Boost recettes poisson : +0.15 (pattern populationnel)
â†’ Observation rÃ©sultats personnels
â†’ Ajustement si nÃ©cessaire
```

#### DiffÃ©rence Cruciale : Probabiliste â‰  DÃ©terministe

**âœ… Ce que fait AKELI (CORRECT)** :
- "Utilisateurs population cÃ´tiÃ¨re ont **72% probabilitÃ©** de mieux rÃ©pondre au poisson"
- "Nous **privilÃ©gions lÃ©gÃ¨rement** recettes poisson et **observons ta rÃ©ponse**"
- "Si tu rÃ©ponds bien â†’ on continue. Sinon â†’ on adapte"

**âŒ Ce qu'AKELI ne fait PAS** :
- "Tu es SÃ©nÃ©galais donc tu **dois** manger du poisson"
- "Les SÃ©nÃ©galais **ne peuvent pas** digÃ©rer viande rouge"
- "Ton origine **dÃ©termine** ton mÃ©tabolisme"

---

## ðŸŽ² PondÃ©ration Dynamique des Dimensions

### Principe

Dans `user_vector_global.dimension_magnitudes`, chaque dimension a un poids initial qui **Ã©volue selon les donnÃ©es** :

**Exemple utilisateur type** :
```json
{
  "physiological": 0.85,      // DonnÃ©es complÃ¨tes
  "behavioral": 0.92,         // TrÃ¨s renseignÃ©
  "contextual": 0.67,         // Partiellement renseignÃ©
  "outcomes": 0.78,           // 3 mois de donnÃ©es
  "genetic_metabolic": 0.15,  // TrÃ¨s faible (non activÃ©)
  "social_engagement": 0.88,  // Utilisateur actif
  "geographic_cultural": 0.95 // TrÃ¨s pertinent (diaspora)
}
```

### RÃ¨gles d'Ajustement

- **ComplÃ©tude** : Plus de champs renseignÃ©s â†’ magnitude â†‘
- **RÃ©cence** : DonnÃ©es rÃ©centes â†’ magnitude â†‘
- **Pertinence contextuelle** : Dimension activÃ©e par comportement â†’ magnitude â†‘
- **Impact observÃ©** : Dimension qui prÃ©dit bien outcomes â†’ magnitude â†‘

### Pipeline de Calcul

**Ã‰tape 1 : Collecte & Normalisation**
- Chaque dimension collecte donnÃ©es brutes â†’ normalise [0-1]

**Ã‰tape 2 : Vectorisation Partielle**
- Chaque dimension gÃ©nÃ¨re son vecteur partiel (256D ou 128D)

**Ã‰tape 3 : AgrÃ©gation Globale**
```
global_vector = [
  physio_vector * magnitude_physio,
  behavioral_vector * magnitude_behavioral,
  contextual_vector * magnitude_contextual,
  outcomes_vector * magnitude_outcomes,
  genetic_vector * magnitude_genetic,
  social_vector * magnitude_social,
  geo_cultural_vector * magnitude_geo
]
```

Ou via somme pondÃ©rÃ©e :
```
global_vector = 
  Î±_physio * physio_vector +
  Î±_behavioral * behavioral_vector +
  ...
```

---

## ðŸ“ Matrice E-G-R v1.0

### Principe Fondamental

Pour chaque **utilisateur `u`** et **option `o`** (recette, repas, plan), calcul d'un **triplet** :

```
M(u, o) = (E, G, R)

E = Enjoyability     [0-1]  // Va-t-il aimer ?
G = Goal Reachability [0-1]  // Aide Ã  atteindre objectif ?
R = Retention        [0-1]  // Le garde engagÃ© ?
```

**Score final** :
```
S(u, o) = Î±_u Â· E + Î²_u Â· G + Î³_u Â· R

avec Î±_u + Î²_u + Î³_u = 1
```

Les poids **Î±, Î², Î³** sont **personnalisÃ©s par utilisateur** et **Ã©voluent**.

---

### 1. ENJOYABILITY (E) - "Va-t-il aimer ?"

#### DÃ©composition

```
E = wâ‚Â·E_taste + wâ‚‚Â·E_cultural + wâ‚ƒÂ·E_novelty + wâ‚„Â·E_convenience

wâ‚ + wâ‚‚ + wâ‚ƒ + wâ‚„ = 1
```

#### 1.1 E_taste - AffinitÃ© Gustative

**Calcul** :
```
E_taste = cosine_similarity(taste_vector_user, taste_vector_recipe)
```

**Sources donnÃ©es** :
- Historique consommations (weight +1.0)
- Likes (weight +0.8)
- Saves (weight +0.6)
- Rejets/skips (weight -1.0)

**Poids** : `wâ‚ = 0.40` (le plus important)

---

#### 1.2 E_cultural - FamiliaritÃ© Culturelle

**Calcul** :
```
E_cultural = cosine_similarity(
  user.geo_cultural_vector, 
  recipe.cultural_vector
)
```

**Boosters** :
- Diaspora rÃ©cente â†’ +0.15 cuisine traditionnelle
- 2Ã¨me gÃ©nÃ©ration â†’ +0.10 fusion
- Explorateur â†’ boost rÃ©duit

**Poids** : `wâ‚‚ = 0.30`

---

#### 1.3 E_novelty - Ã‰quilibre NouveautÃ©/FamiliaritÃ©

**Calcul** :
```
E_novelty = optimal_curve(days_since_last_consumption)

optimal_curve(x) = {
  0.3  si x < 3 jours   // Trop rÃ©cent
  1.0  si x âˆˆ [7, 21]   // Sweet spot
  0.6  si x > 60 jours  // Trop ancien
}
```

**Poids** : `wâ‚ƒ = 0.15`

---

#### 1.4 E_convenience - FacilitÃ© Pratique

**Calcul** :
```
E_convenience = 
  0.4 Â· cooking_time_score +
  0.3 Â· skill_match_score +
  0.2 Â· equipment_availability +
  0.1 Â· ingredient_accessibility
```

**Poids** : `wâ‚„ = 0.15`

---

#### Score Final E

```
E_final = sigmoid(
  0.40 Â· E_taste +
  0.30 Â· E_cultural +
  0.15 Â· E_novelty +
  0.15 Â· E_convenience
)
```

---

### 2. GOAL REACHABILITY (G) - "Aide Ã  progresser ?"

#### Formule GÃ©nÃ©rale

```
G = match_nutrients(recipe, user.goal) Â· population_boost
```

---

#### 2.1 Objectif : Weight Loss

```
G_weight_loss = 
  0.35 Â· protein_score +
  0.25 Â· calorie_deficit_score +
  0.20 Â· fiber_score +
  0.15 Â· satiety_index +
  0.05 Â· glycemic_load_score

protein_score = normalize(recipe.protein / recipe.calories, target=0.25)
calorie_deficit = 1.0 si < budget, 0.5 si proche, 0.2 si dÃ©passÃ©
fiber_score = normalize(fiber, min=5g, max=15g)
satiety_index = weighted(protein_density, fiber_density, volume_ratio)
glycemic_load = 1 - normalize(GL, min=0, max=20)
```

---

#### 2.2 Objectif : Muscle Gain

```
G_muscle_gain = 
  0.45 Â· protein_absolute_score +
  0.25 Â· calorie_surplus_score +
  0.15 Â· leucine_score +
  0.10 Â· carb_timing_score +
  0.05 Â· micronutrient_score

protein_absolute = normalize(protein, min=25g, max=50g)
leucine = normalize(leucine_content, min=2g, max=4g)
carb_timing = contextualized(post_workout vs repos)
```

---

#### 2.3 Objectif : Health/Maintenance

```
G_health = 
  0.30 Â· micronutrient_density +
  0.25 Â· omega3_ratio +
  0.20 Â· anti_inflammatory_index +
  0.15 Â· fiber_score +
  0.10 Â· calorie_balance

micronutrient_density = weighted_sum(iron, Mg, Zn, vitA, vitC, Ca) / calories
omega3_ratio = omega3 / (omega3 + omega6)
anti_inflammatory = score(+1: poisson, lÃ©gumes, Ã©pices; -1: sucres, trans)
```

---

#### 2.4 Population Boost

**IntÃ©gration pattern populationnel** :

```
population_boost = 
  P(success | recipe_type, geo_cultural_cluster) - 
  P(success | recipe_type, global)

clipped Ã  [-0.15, +0.15]
```

**Application** :
```
G_final = G_base Â· (1 + population_boost Â· magnitude_geo_cultural)
```

**Exemple** :
- Recette poisson, utilisateur SÃ©nÃ©galais
- P(success | poisson, SÃ©nÃ©gal) = 0.78
- P(success | poisson, global) = 0.65
- Boost = +0.13 â†’ **+13% sur G**

---

### 3. RETENTION (R) - "Le garde engagÃ© ?"

#### DÃ©composition

```
R = 
  0.30 Â· friction_score +
  0.25 Â· habit_alignment +
  0.20 Â· social_validation +
  0.15 Â· variety_balance +
  0.10 Â· success_momentum
```

---

#### 3.1 Friction Score

```
friction = 
  cooking_time_penalty +
  ingredient_sourcing_difficulty +
  cleanup_effort +
  cognitive_load

friction_score = 1 - normalize(friction, min=0, max=10)
```

---

#### 3.2 Habit Alignment

```
habit_alignment = cosine_similarity(
  recipe.temporal_pattern,
  user.meal_patterns
)
```

Patterns : jour semaine, moment repas, contexte (solo/famille)

---

#### 3.3 Social Validation

```
social_validation = 
  0.4 Â· creator_trust_score +
  0.3 Â· peer_success_rate +
  0.2 Â· consumption_velocity +
  0.1 Â· visual_appeal

creator_trust = normalize(consumptions + ratingÂ·100 + followersÂ·2)
peer_success = % users_similaires ayant atteint goal
consumption_velocity = trending_score_7_days
```

---

#### 3.4 Variety Balance

```
variety_balance = optimal_diversity(
  user.last_7_days_cuisine_diversity
)

optimal = Shannon_entropy âˆˆ [1.5, 2.5]

trop_bas â†’ boost recettes diffÃ©rentes
optimal â†’ neutre
trop_haut â†’ boost recettes familiÃ¨res
```

---

#### 3.5 Success Momentum

```
success_momentum = 
  recent_goal_progress Â· streak_bonus Â· confidence_boost

recent_progress = (current_week - baseline) / target_delta
streak_bonus = min(consecutive_days_logging / 7, 1.5)
confidence_boost = user.data_completeness Â· 0.3
```

---

#### Score Final R

```
R_final = sigmoid(
  0.30 Â· (1 - friction) +
  0.25 Â· habit_alignment +
  0.20 Â· social_validation +
  0.15 Â· variety_balance +
  0.10 Â· success_momentum
)
```

---

## ðŸŽ›ï¸ PondÃ©ration Dynamique (Î±, Î², Î³)

### Poids Initiaux (Cold Start)

```
Î±_init = 0.40  // Enjoyability
Î²_init = 0.40  // Goal
Î³_init = 0.20  // Retention
```

**Justification** : Nouvel utilisateur â†’ prioritÃ© plaisir + rÃ©sultat, retention secondaire.

---

### Ajustement par Phase Utilisateur

#### Phase 1 : DÃ©couverte (Semaines 1-2)

```
Î± = 0.50  // PrioritÃ© plaisir (Ã©viter churn)
Î² = 0.35  // Objectif modÃ©rÃ©
Î³ = 0.15  // Retention faible (pas assez data)
```

**Objectif** : Ne pas perdre l'utilisateur.

---

#### Phase 2 : Engagement (Semaines 3-8)

```
Î± = 0.35  // Plaisir rÃ©duit
Î² = 0.45  // Objectif augmente
Î³ = 0.20  // Retention monte
```

**Objectif** : Optimiser progression sans sacrifier adhÃ©rence.

---

#### Phase 3 : Optimisation (Mois 3+)

```
Î± = 0.30  // Plaisir baseline
Î² = 0.40  // Objectif prioritaire
Î³ = 0.30  // Retention crucial
```

**Objectif** : EfficacitÃ© + prÃ©vention plateau/churn.

---

### Ajustement Contextuel Dynamique

#### Signaux Churn Imminent

```
si days_since_last_log > 3 ET completion_rate < 0.5
alors :
  Î± = 0.55  // Boost massif plaisir
  Î² = 0.20  // Relax objectif
  Î³ = 0.25  // Focus retention
```

**Objectif** : Sauver l'utilisateur (recettes faciles, familiÃ¨res, rapides).

---

#### Plateau DÃ©tectÃ©

```
si weight_change_4weeks < 0.2kg ET goal = weight_loss
alors :
  Î± = 0.25  // RÃ©duire confort
  Î² = 0.55  // Boost agressif objectif
  Î³ = 0.20  // Tester nouvelles approches
```

**Objectif** : Relancer progression via variation.

---

#### Utilisateur Performant

```
si goal_progress > 1.2Â·target ET adherence > 0.85
alors :
  Î± = 0.40  // Maintenir plaisir
  Î² = 0.30  // Relax (dÃ©jÃ  en avance)
  Î³ = 0.30  // Stabiliser habitudes
```

**Objectif** : Consolidation + Ã©viter burnout.

---

### Ajustement par Contexte Temporel

#### Mode "Tonight" (Ce Soir)

```
Î± = 0.25
Î² = 0.20
Î³ = 0.55  // RETENTION MASSIVE
```

**PrioritÃ©s** :
- Friction minimale (temps court, facile)
- IngrÃ©dients en stock
- FamiliaritÃ© Ã©levÃ©e
- DÃ©cision rapide sans regret

---

#### Mode Famille (Multi-User)

```
Î±_famille = min(Î±_membres) Â· 0.8
  // Enjoyability = minimum viable

Î²_famille = weighted_avg(Î²_membres)
  // Goal = moyenne pondÃ©rÃ©e

Î³_famille = max(Î³_membres) Â· 1.2
  // Retention = maximum (Ã©viter conflits)
```

---

#### Weekend / Meal Prep

```
Î± = 0.35
Î² = 0.50  // Objectif fort (temps disponible)
Î³ = 0.15  // Friction acceptable
```

---

## ðŸ§® Calcul Final & Exemple Concret

### Pipeline Complet

```python
def calculate_recommendation_score(user, recipe):
    # 1. Calculer vecteurs utilisateur
    user_vector = get_or_compute_user_global_vector(user)
    
    # 2. Calculer E-G-R
    E = calculate_enjoyability(user, recipe)
    G = calculate_goal_reachability(user, recipe)
    R = calculate_retention(user, recipe)
    
    # 3. DÃ©terminer poids adaptatifs
    alpha, beta, gamma = determine_weights(user)
    
    # 4. Score final
    score = alpha * E + beta * G + gamma * R
    
    # 5. Boosters
    score *= novelty_decay_factor(user, recipe)
    score *= creator_quality_multiplier(recipe.creator)
    
    return {
        'score': score,
        'E': E,
        'G': G,
        'R': R,
        'weights': (alpha, beta, gamma)
    }
```

---

### Exemple Calcul : AttiÃ©kÃ© Poisson GrillÃ©

**Utilisateur** :
- Femme, 28 ans, Paris, origine CÃ´te d'Ivoire
- Objectif : Weight loss
- Phase : Engagement (semaine 5)
- Magnitude geo_cultural : 0.92

**Recette** : AttiÃ©kÃ© Poisson GrillÃ© (Light Version)

---

**Calcul E** :
```
E_taste = 0.85  (aimÃ© recettes similaires)
E_cultural = 0.95  (recette traditionnelle ivoirienne)
E_novelty = 0.90  (12 jours depuis derniÃ¨re consommation)
E_convenience = 0.75  (25min, skill medium)

E_final = 0.40Â·0.85 + 0.30Â·0.95 + 0.15Â·0.90 + 0.15Â·0.75
        = 0.8725
```

---

**Calcul G** :
```
G_base = 0.8975  (30g protein, 350 kcal, 8g fiber, bon satiety)

population_boost = 0.78 - 0.65 = +0.13
G_final = 0.8975 Â· (1 + 0.13 Â· 0.92)
        = 1.0048 â†’ clipped Ã  1.0
```

---

**Calcul R** :
```
friction = 0.80
habit_alignment = 0.70
social_validation = 0.85
variety_balance = 0.75
success_momentum = 0.80

R_final = 0.30Â·0.80 + 0.25Â·0.70 + 0.20Â·0.85 + 0.15Â·0.75 + 0.10Â·0.80
        = 0.7775
```

---

**PondÃ©ration Phase Engagement** :
```
Î± = 0.35
Î² = 0.45
Î³ = 0.20
```

---

**Score Final** :
```
Score = 0.35Â·0.8725 + 0.45Â·1.0 + 0.20Â·0.7775
      = 0.9109
```

**â†’ Score : 91.09% - RECOMMANDATION TRÃˆS FORTE**

---

## ðŸ“ˆ Ranking & SÃ©lection

### Top-K Recommandations

**Processus** :

1. **Calculer scores** pour pool recettes (500 actives)
2. **Filtrer impossibles** :
   - Allergies utilisateur
   - IngrÃ©dients inaccessibles
   - Temps > disponible Ã— 2
3. **Trier** par score dÃ©croissant
4. **Diversifier** top 20 :
   - Max 3 recettes mÃªme crÃ©ateur
   - Max 2 recettes mÃªme cuisine consÃ©cutives
   - Injecter 1-2 recettes exploratoires (score 0.60-0.75)
5. **Retourner** top 10 final

---

### Exploration vs Exploitation

**RÃ¨gle 80/20** :
- **80%** : scores > 0.75 (exploitation - rÃ©sultats connus)
- **20%** : scores 0.60-0.75 (exploration - dÃ©couverte)

**Objectifs exploration** :
- DÃ©couvrir prÃ©fÃ©rences inconnues
- Tester patterns populationnels
- Ã‰viter bulle de filtre
- Collecter donnÃ©es nouvelles dimensions

---

## ðŸ”„ Feedback Loop & Learning

### Signaux ObservÃ©s

**Positifs** :
- Recette consommÃ©e (completed) â†’ +1.0
- LikÃ©e â†’ +0.8
- SauvÃ©e â†’ +0.6
- Re-consommÃ©e < 30j â†’ +1.2

**NÃ©gatifs** :
- Skipped â†’ -0.5
- CommencÃ©e non terminÃ©e â†’ -0.8
- Unliked â†’ -1.0

---

### Mise Ã  Jour ParamÃ¨tres

**FrÃ©quence** :
- **Temps rÃ©el** : Enjoyability (taste, cultural)
- **Quotidien** : Retention (habits, friction)
- **Hebdomadaire** : Goal (nutrition patterns)
- **Mensuel** : Vecteurs globaux, magnitudes dimensions

**MÃ©thode** :
```
Bayesian Update :
  prior = score actuel
  likelihood = rÃ©sultat observÃ©
  posterior = weighted_average(prior, likelihood, learning_rate)
```

---

## ðŸŽ¯ Applications Multi-Niveaux

### 1. B2C : Recommandations PersonnalisÃ©es

**Cas d'usage** :
- Feed personnalisÃ© recettes
- Suggestions repas quotidiens
- Plans hebdomadaires adaptatifs
- Mode "Tonight" pour dÃ©cision rapide

**Valeur** :
- Moins de dÃ©cisions (fatigue cognitive rÃ©duite)
- Plus de rÃ©sultats (objectifs atteints)
- Plus de plaisir (cuisine culturellement alignÃ©e)
- Meilleure adhÃ©rence (friction minimisÃ©e)

---

### 2. B2B (Pros) : Intelligence Nutrition

**Cas d'usage** :
- Analytics clients (progress, adherence, patterns)
- Insights populationnels (stratification dÃ©mographique)
- PrÃ©diction adhÃ©rence et outcomes
- Dashboards dÃ©cision-support

**Valeur** :
- Gain temps (moins d'ajustements manuels)
- Meilleurs rÃ©sultats clients (recommandations data-driven)
- ScalabilitÃ© (gÃ©rer plus de clients)
- Evidence-based practice

---

### 3. CrÃ©ateurs : Matching Audience

**Cas d'usage** :
- PrÃ©diction utilisateurs aimant leurs crÃ©ations
- Optimisation exposition audiences pertinentes
- Tracking engagement/efficacitÃ© contenu
- Suggestions modifications pour adoption

**Valeur** :
- Assurance contenu trouve bonne audience
- Maximisation engagement
- MonÃ©tisation optimisÃ©e (â‚¬1/30 consumptions)
- FidÃ©lisation audience

---

### 4. Mode Famille : Multi-User

**ProblÃ¨me** : Trouver repas consensuels foyer multi-gÃ©nÃ©rationnel/multi-culturel

**Solution** :
```
Foyer : Couple mixte (Cameroun + France), 2 enfants

Parent 1 : geo_cultural fort Cameroun (ndolÃ©, eru)
Parent 2 : geo_cultural faible (cuisine franÃ§aise)
Enfants : behavioral faible nouveautÃ© (familier)

Recommandation : Plats fusion ou adaptÃ©s
  - Poulet DG version simplifiÃ©e (moins pimentÃ©)
  - NdolÃ© avec option pÃ¢tes enfants
  - Recettes "afro-fusion" consensus Ã©levÃ©
```

**Calcul** :
```
E_famille = min(E_membres)  // Personne ne dÃ©teste
G_famille = weighted_avg(G_membres)
R_famille = max(R_membres) Â· 1.2  // Ã‰viter conflits
```

---

## ðŸ” ConsidÃ©rations Ã‰thiques

### 1. DonnÃ©es Origine/Ethnie

**Objectif** : **AffinitÃ©s culinaires culturelles**, PAS classification raciale

**Principes** :
- âœ… Self-declared (utilisateur choisit)
- âœ… Optionnel (aucune obligation)
- âœ… AnonymisÃ© en agrÃ©gation
- âœ… Usage limitÃ© (recommandations culinaires uniquement)
- âœ… Transparence (utilisateur sait pourquoi)

**Framing app** :
> "Pour vous proposer des recettes qui vous rappellent la maison, dites-nous d'oÃ¹ vous venez (optionnel)"

---

### 2. Privacy & AgrÃ©gation

**Ce que voient les crÃ©ateurs** :
- âœ… DonnÃ©es agrÃ©gÃ©es (Ã¢ge moyen, % genres)
- âœ… Patterns populationnels ("65% audience Afrique Ouest")
- âœ… Success rates (% atteignant goals)

**Ce qu'ils ne voient PAS** :
- âŒ Noms utilisateurs individuels (sauf "qui a cliquÃ©")
- âŒ Poids spÃ©cifiques
- âŒ DonnÃ©es santÃ© identifiables

---

### 3. InfÃ©rence Probabiliste â‰  DÃ©terminisme

**Garde-fous** :

**âœ… Communication correcte** :
- "Utilisateurs profil similaire ont 72% probabilitÃ© de succÃ¨s"
- "Nous testons et observons votre rÃ©ponse personnelle"
- "RÃ©sultats individuels > patterns groupe"

**âŒ Communication interdite** :
- "Tu es X donc tu dois Y"
- "Les X ne peuvent pas Z"
- "Ton origine dÃ©termine ton mÃ©tabolisme"

---

### 4. Transparence (optionnelle)

Si utilisateur demande pourquoi une recette :
```
Recette recommandÃ©e : Caldou

Pourquoi :
âœ“ Objectif perte poids (protÃ©ines, low-cal)
âœ“ Temps court (compatible emploi du temps)
âœ“ Utilisateurs profil similaire ont rapportÃ© bons rÃ©sultats
```

Mais **pas d'explication par dÃ©faut** (comme TikTok).

---

### 5. Adaptation Individuelle Prime

**Ordre prioritÃ©** :
1. **RÃ©sultats personnels observÃ©s** (le plus fort)
2. **PrÃ©fÃ©rences dÃ©clarÃ©es**
3. **Patterns populationnels** (aide initiale)

**Exemple** :
```
Utilisateur sÃ©nÃ©galais MAIS dÃ©teste poisson
â†’ Patterns population ignorÃ©s
â†’ PrÃ©fÃ©rence personnelle prioritaire
â†’ Recommandations : poulet yassa, mafÃ© bÅ“uf
```

---

### 6. FalsifiabilitÃ© Scientifique

Si pattern populationnel **ne se confirme pas** :
```
HypothÃ¨se : Population X rÃ©pond mieux Ã  aliment Y

AprÃ¨s 6 mois :
  P(success | Y, X) = 0.52
  P(success | Y, global) = 0.50
  
DiffÃ©rence : 2% (non significatif)
â†’ Pattern rejetÃ©
â†’ Boost annulÃ©
```

**C'est de la science, pas du dogme.**

---

## ðŸŽ“ RÃ©fÃ©rences Conceptuelles

### Champs Scientifiques

1. **Nutrigenomics** : Interaction gÃ¨nes â†” nutrition
2. **Ã‰pidÃ©miologie nutritionnelle** : Patterns maladie/santÃ© par population
3. **Anthropologie alimentaire** : Ã‰volution pratiques culinaires
4. **Microbiome populationnel** : DiffÃ©rences bactÃ©ries intestinales
5. **MÃ©decine Ã©volutionnaire** : Adaptations mÃ©taboliques ancestrales
6. **Systems biology** : ModÃ©lisation interactions complexes
7. **Precision nutrition** : Individualisation approches nutritionnelles

### Exemples Ã‰tudes RÃ©elles

- Persistance lactase (populations pastorales vs agricoles)
- Copies gÃ¨ne amylase (populations riches amidons vs protÃ©ines)
- MÃ©tabolisme alcool (populations Asie de l'Est)
- SensibilitÃ© sel (populations africaines vs europÃ©ennes)

---

## ðŸ“Š MÃ©triques de SuccÃ¨s

### Validation SystÃ¨me E-G-R

**MÃ©triques utilisateur** :
- Taux complÃ©tion repas (target > 85%)
- Vitesse atteinte objectif (vs baseline)
- Taux retention 30/60/90 jours
- NPS (Net Promoter Score)

**MÃ©triques recommandations** :
- PrÃ©cision top-10 (% recettes consommÃ©es)
- DiversitÃ© vs satisfaction (balance)
- Convergence temps (jours pour stabiliser prÃ©fÃ©rences)

**MÃ©triques business** :
- Taux conversion gratuit â†’ payant
- LTV (Lifetime Value)
- Churn rate
- Engagement crÃ©ateurs

---

## ðŸš€ Feuille de Route

### Phase 1 : Foundation (Sept-Nov 2026)

- [ ] SchÃ©ma base donnÃ©es 7 tables dimensions + 1 globale
- [ ] Pipeline collecte donnÃ©es existantes
- [ ] Normalisation variables [0-1]
- [ ] Calcul vecteurs partiels (v1 simple)

### Phase 2 : E-G-R Core (DÃ©c 2026-FÃ©v 2027)

- [ ] ImplÃ©mentation calcul E-G-R
- [ ] SystÃ¨me pondÃ©ration dynamique Î±-Î²-Î³
- [ ] Pipeline recommandations
- [ ] A/B testing poids initiaux

### Phase 3 : Learning (Mars-Mai 2027)

- [ ] Feedback loop implÃ©mentation
- [ ] DÃ©tection patterns populationnels
- [ ] Ajustement magnitudes dimensions
- [ ] Validation statistique patterns

### Phase 4 : Scale (Juin 2027+)

- [ ] Optimisation performance (cache, indexing)
- [ ] Mode famille multi-user
- [ ] B2B dashboards pros
- [ ] Creator matching avancÃ©

---

## ðŸŽ¯ RÃ©sumÃ© ExÃ©cutif

### Vision

AKELI devient une **plateforme d'intelligence nutritionnelle algorithmique** qui :
- Recommande les bonnes recettes aux bonnes personnes
- S'adapte continuellement aux rÃ©sultats observÃ©s
- Respecte les affinitÃ©s culturelles et mÃ©taboliques
- Optimise plaisir, rÃ©sultats et engagement simultanÃ©ment

### DiffÃ©renciateurs

1. **Vectorisation utilisateur 7D** : Physiologique, Comportementale, Contextuelle, Outcomes, GÃ©nÃ©tique/MÃ©tabolique, Sociale, GÃ©o-Culturelle
2. **Matrice E-G-R dynamique** : Enjoyability, Goal, Retention avec poids adaptatifs
3. **Patterns populationnels** : Apprentissage adaptations mÃ©taboliques culturelles
4. **Approche probabiliste** : Tendances observÃ©es, pas dÃ©terminisme
5. **Multi-stakeholder** : B2C, B2B, CrÃ©ateurs tous bÃ©nÃ©ficient

### Positionnement Unique

**"Le TikTok de la nutrition"** : Algorithme puissant qui propose exactement ce qui marche pour vous, sans avoir besoin d'explications. Les rÃ©sultats parlent.

---

**Document vivant** : Cette documentation Ã©voluera avec l'implÃ©mentation et les apprentissages terrain.

**Prochaine mise Ã  jour prÃ©vue** : Septembre 2026 (post-implÃ©mentation v1)

---

*Fin du document - Version 1.0*
