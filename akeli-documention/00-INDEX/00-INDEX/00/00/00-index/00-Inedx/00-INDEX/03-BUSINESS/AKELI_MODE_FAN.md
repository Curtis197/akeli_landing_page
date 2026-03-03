# Akeli — Mode Fan

> Document stratégique et fonctionnel. Référence pour les décisions produit, l'architecture de recommandation, et la communication créateurs.

---

## Philosophie

Le mode standard d'Akeli rémunère les créateurs à la consommation — 1€ est distribué entre tous les créateurs dont les recettes ont été consommées, au prorata des 90 consommations atteintes. Ce modèle est juste mais imprévisible pour le créateur, et dilué pour l'utilisateur qui n'a pas de relation privilégiée avec un créateur particulier.

Le Mode Fan répond à une réalité différente : certains utilisateurs ont un créateur de confiance dont ils suivent l'univers culinaire. Ils ne veulent pas explorer — ils veulent approfondir. Pour eux, le Mode Fan transforme l'abonnement Akeli en soutien direct et exclusif à ce créateur.

Pour le créateur, c'est un revenu prévisible et garanti, indépendant du volume de consommation mensuel. Pour l'utilisateur, c'est une relation culinaire structurée avec un guide de confiance.

---

## Fonctionnement pour l'utilisateur

### Activation
L'utilisateur choisit de passer en Mode Fan en sélectionnant un créateur éligible. L'activation est immédiate — son 1€ mensuel sera alloué à ce créateur dès la prochaine échéance de facturation.

### Règle des 90/10
En Mode Fan, l'utilisateur s'engage à construire son alimentation principalement autour du catalogue de son créateur Fan :
- **90% de ses repas du mois** doivent être issus des recettes de ce créateur
- **10% libres** pour explorer d'autres créateurs et recettes

Le calcul est mensuel — il porte sur le nombre total de repas consommés dans le mois.

Cette règle est appliquée par un **blocage technique** : l'utilisateur ne peut pas ajouter plus de **9 recettes différentes** issues d'autres créateurs dans son plan alimentaire du mois. Au-delà de cette limite, le système bloque l'ajout de nouvelles recettes externes. Ce n'est pas un avertissement — c'est une contrainte système non contournable.

Le meal planner Akeli priorise automatiquement les recettes du créateur Fan dans ses recommandations pour faciliter naturellement le respect de cette règle.

### Changement de créateur Fan
Un utilisateur peut changer de créateur Fan à tout moment, mais le changement est effectif au **premier jour du mois suivant**. Le créateur Fan actuel conserve son 1€ jusqu'à la fin du mois en cours.

Chaque changement est enregistré dans l'historique de l'utilisateur. Cet historique est utilisé pour la personnalisation future et les analytics créateurs en V2.

### Désactivation du Mode Fan
L'utilisateur peut quitter le Mode Fan et revenir au mode standard à tout moment. La désactivation est également effective au premier jour du mois suivant.

---

## Fonctionnement pour le créateur

### Éligibilité
Un créateur doit disposer d'un **minimum de 30 recettes** dans son catalogue pour être éligible au Mode Fan. Ce seuil garantit que l'utilisateur peut construire une alimentation variée et équilibrée à 90% autour de ce créateur sans répétition excessive.

### Revenu Mode Fan
Chaque utilisateur en Mode Fan lui alloue **1€/mois de manière garantie**, indépendamment du nombre de consommations réelles effectuées dans le mois. C'est un revenu passif stable et prévisible.

Comparaison avec le mode standard :

| Mode | Condition | Revenu créateur |
|------|-----------|----------------|
| Standard | 90 consommations atteintes | 1€ |
| Fan | Utilisateur actif en mode Fan | 1€ garanti |

En mode Fan, le créateur n'a pas besoin d'atteindre un seuil de consommation. Son revenu est acquis dès que l'utilisateur est actif sur le mois.

### Visibilité du revenu Fan
Le tableau de bord créateur distingue clairement les deux sources de revenus :
- Revenus à la consommation (mode standard)
- Revenus Fan (abonnés directs)

Le nombre d'abonnés Fan actifs est visible en temps réel. C'est le KPI principal de fidélité créateur.

---

## Flux économique — Modèle à 3€

```
Abonnement utilisateur : 3€/mois
│
├── 0,5€ — Infrastructure et IA (Supabase, OpenAI, compute)
├── 0,5€ — Plateforme Akeli
└── 1€ — Créateur(s)
      │
      ├── Mode Standard
      │   └── Distribué entre créateurs selon consommations
      │       (1€ versé quand 90 consommations atteintes)
      │
      └── Mode Fan
          └── Alloué entièrement au créateur Fan choisi
              (1€ garanti, sans condition de consommation)
```

---

## Impact sur le système de recommandation

Le Mode Fan a une influence directe sur le meal planner et le système de recommandation.

### Priorisation des recettes
Lorsqu'un utilisateur est en Mode Fan, le meal planner doit :
- Prioriser les recettes du créateur Fan dans toutes les suggestions
- S'assurer que le ratio 90/10 est respecté sur le plan alimentaire généré
- Proposer les recettes d'autres créateurs uniquement dans les slots "exploration" (10%)

### Contrainte technique V1
Le système de vectorisation du meal planner (cosine similarity) doit intégrer un filtre de source pour les utilisateurs en Mode Fan — les recettes du créateur Fan reçoivent un boost de score dans le calcul de recommandation.

Le système doit également tracker en temps réel le compteur de recettes externes consommées dans le mois (0 à 9) et bloquer l'ajout de toute nouvelle recette externe dès que la limite de 9 est atteinte. Ce compteur se réinitialise au premier jour de chaque mois.

---

## Règles de transition et historique

### Transitions enregistrées
Chaque changement de statut Mode Fan est enregistré :
- Date d'activation
- Créateur Fan choisi
- Date de changement (si applicable)
- Nouveau créateur Fan
- Date de désactivation (si applicable)

Cet historique sert deux objectifs :
1. **Audit et facturation** — garantir que chaque créateur reçoit le bon montant au bon moment
2. **Intelligence V2** — comprendre les patterns de fidélité et de changement d'audience

### Règle de facturation
Le créateur Fan perçoit son 1€ pour tout mois calendaire où l'utilisateur était actif en Mode Fan, même si le changement ou la désactivation est intervenu en cours de mois. Le mois entamé est dû.

---

## Évolution du Mode Fan

| Version | Fonctionnalité |
|---------|---------------|
| V1 | Mode Fan — allocation directe 1€, règle 90/10, historique changements |
| V2 | Intelligence fans — analytics audience par créateur Fan, démographie, comportements |
| V2 | Vente de programmes nutritionnels à prix libres |

---

## Positionnement marché

Le Mode Fan est le mécanisme qui distingue Akeli de toute app nutrition existante. Ce n'est pas un modèle publicitaire, pas un modèle à la vue — c'est un modèle de **fidélité nutritionnelle rémunérée**.

Un créateur avec 100 abonnés Fan actifs perçoit **100€/mois garantis**, sans dépendre d'algorithmes, sans besoin de publier de nouveau contenu. C'est un actif stable et prévisible, construit sur la confiance réelle de son audience.

---

*Document créé : Février 2026*
*Auteur : Curtis — Fondateur Akeli*
*À mettre à jour à chaque évolution du modèle économique créateur*
