# AKELI — Quiz "Et toi, tu manges comme tu vis ?"
## Spécification complète — Culinary Realignment Score

**Statut :** Validé  
**Cible V1 :** Landing page (section dédiée, scroll naturel)  
**Langue de lancement :** FR (EN à suivre)

---

## 1. Objectif du quiz

Révéler à l'utilisateur l'état de son alignement entre ce qu'il mange, comment il vit, et qui il est — sans jugement, sans prescription. Le résultat nomme quelque chose que l'utilisateur ressentait confusément.

**Ce que le quiz fait :**
- Mesure l'alignement actuel (pas un écart à combler, pas un objectif imposé)
- Produit un score en % — neutre, descriptif
- Débouche sur un résultat personnalisé + aperçu de recettes + CTA app

**Ce que le quiz ne fait pas :**
- Ne dit pas à l'utilisateur ce qu'il doit faire
- Ne prescrit pas un régime ou un mode alimentaire
- Ne juge pas les choix culturels ou nutritionnels

---

## 2. Position dans la landing page

Section dédiée dans le flux de scroll naturel de la landing page.

```
[Hero]
[Proposition de valeur]
[Section Quiz — "Et toi, tu manges comme tu vis ?"]
[Profils créateurs / recettes]
[CTA download]
[Footer]
```

La section quiz est précédée d'une accroche courte qui introduit le concept de réalignement sans l'expliquer théoriquement.

**Accroche proposée :**
> *"Tu vis à Lyon. Tu travailles 9h par jour. Tu manges comme ta mère t'a appris.  
> Est-ce que les deux se parlent encore ?"*

---

## 3. Structure du quiz — 8 questions

### Dimension A — Rythme de vie (Q1, Q2)
*Mesure l'intensité et la régularité du mode de vie actuel*

**Q1 : Ta semaine type, c'est quoi ?**
- A — Bureau + transports + peu de mouvement physique *(score A : 2)*
- B — Activité physique régulière (sport, marche, etc.) *(score A : 4)*
- C — Très variable selon les jours *(score A : 2)*
- D — Travail physique ou debout toute la journée *(score A : 3)*

**Q2 : Tu cuisines combien de fois par semaine ?**
- A — Rarement, j'ai peu de temps *(score A : 1)*
- B — 2-3 fois, quand je peux *(score A : 2)*
- C — Presque tous les jours *(score A : 3)*
- D — Chaque jour, c'est important pour moi *(score A : 4)*

---

### Dimension B — Corps (Q3, Q4, Q5)
*Mesure la cohérence entre ce que le corps reçoit et ce qu'il dépense*

**Q3 : Après un repas traditionnel de chez toi, tu te sens comment ?**
- A — Lourd, j'ai du mal à reprendre mon rythme *(score B : 1)*
- B — Bien, satisfait *(score B : 3)*
- C — Énergique *(score B : 4)*
- D — Ça dépend du plat *(score B : 2)*

**Q4 : Tu manges à quelle heure en général ?**
- A — Irrégulier, selon mon emploi du temps *(score B : 1)*
- B — Deux grands repas par jour *(score B : 2)*
- C — Trois repas fixes *(score B : 4)*
- D — Je grignote plutôt *(score B : 2)*

**Q5 : Ton objectif avec la nourriture en ce moment ?**
- A — Manger mieux sans perdre mes goûts *(score B : 3)*
- B — Gérer mon poids *(score B : 2)*
- C — Avoir plus d'énergie *(score B : 3)*
- D — Maintenir ce que j'ai déjà *(score B : 4)*

---

### Dimension C — Pratique culinaire (Q6, Q7)
*Mesure la continuité et l'adaptation de la cuisine d'origine*

**Q6 : Ta cuisine d'origine, tu la cuisines comment aujourd'hui ?**
- A — Comme j'ai appris, sans modifier *(score C : 2)*
- B — J'adapte les quantités et les graisses *(score C : 4)*
- C — Je cherche comment l'adapter mais je ne sais pas par où commencer *(score C : 2)*
- D — Je ne la cuisine presque plus *(score C : 1)*

**Q7 : Quand tu penses à manger "bien", c'est quoi pour toi ?**
- A — Des plats de ma culture préparés correctement *(score C : 4)*
- B — Un équilibre entre cuisine traditionnelle et cuisine locale *(score C : 4)*
- C — Ce que les nutritionnistes recommandent *(score C : 2)*
- D — Je ne sais pas trop *(score C : 1)*

---

### Question optionnelle — Origine culturelle (Q8)
*Facultatif — sert uniquement à personnaliser les recettes suggérées en résultat*

**Q8 : Ta cuisine d'origine, c'est laquelle ?** *(tu peux passer cette question)*
- Afrique de l'Ouest
- Afrique Centrale
- Afrique de l'Est
- Maghreb
- Caraïbes
- Autre / Je préfère ne pas préciser

> Note UX : Question clairement marquée "facultatif". Bouton "Passer" visible. Aucune réponse par défaut sélectionnée.

---

## 4. Calcul du score

### Formule

```
Score A (Rythme) = somme des points Q1 + Q2 / max(8) × 100
Score B (Corps)  = somme des points Q3 + Q4 + Q5 / max(12) × 100
Score C (Pratique) = somme des points Q6 + Q7 / max(8) × 100

Score global = moyenne pondérée (A × 0.30 + B × 0.40 + C × 0.30)
```

> Pondération : le corps (dimension B) est légèrement dominant car c'est le signal le plus concret et le plus universel.

### Plages de résultat

| Score | Label interne | Message affiché |
|-------|--------------|-----------------|
| 75–100% | Aligné | "Tu manges déjà bien en phase avec toi. Akeli t'aide à rester là." |
| 50–74% | En transition | "Tu es en transition. Tu sens l'écart mais tu cherches comment le combler." |
| 25–49% | En décalage | "Tu vis une vraie désynchronisation. Tu n'es pas seul — c'est la réalité de beaucoup." |
| 0–24% | Très désynchronisé | "L'écart entre ta vie et ce que tu manges est réel. C'est un point de départ, pas un jugement." |

---

## 5. Affichage du résultat

Le résultat s'affiche dans la même section, en remplacement du quiz (pas de redirection).

### Structure de la page résultat

```
[Score en grand — ex: 63%]
[Jauge visuelle circulaire ou linéaire]
[Label — ex: "En transition"]
[Message personnalisé — 2-3 lignes]

[Aperçu recettes — 2 à 3 cards]
(filtrées par cuisine d'origine si Q8 renseignée,
sinon sélection générale mise en avant)

[CTA principal]
"Découvre les recettes qui correspondent à ta vie"
→ Lien App Store / Google Play

[CTA secondaire]
"Voir toutes les recettes" → Marketplace website
```

### Logique des recettes suggérées

- Si Q8 renseignée → recettes filtrées par région d'origine
- Si Q8 non renseignée → recettes "top consommées" de la marketplace
- Les recettes affichées sont des **teasers** (comme sur la marketplace) — pas d'accès complet sans l'app
- Format card : photo + nom + créateur + macros visibles

---

## 6. UX & comportement

### Progression
- Une question à la fois (pas tout visible d'un coup)
- Barre de progression visible (ex: "3 / 8")
- Retour en arrière possible à tout moment
- Pas d'obligation de répondre à Q8

### Ton des questions
- Langue simple, directe, sans intellectualisation
- Tutoiement
- Aucun terme nutritionnel technique
- Aucune question qui juge implicitement (ex: "Tu fais du sport ?" → formulation neutre)

### États
- Question active : réponse mise en évidence au clic
- Question répondue : possibilité de modifier avant validation
- Résultat : affiché après la dernière réponse, sans chargement artificiel (calcul instantané côté client)

---

## 7. Intégration technique (à implémenter en V1)

### Stack
- Intégré dans la landing page Next.js
- Logique de score : calcul 100% côté client (JavaScript)
- Aucune donnée envoyée à la base de données (pas de compte requis)
- Les réponses ne sont pas stockées

### Composant
- Composant React isolé `<RealignmentQuiz />`
- Props : `recipes` (tableau de recettes à afficher en résultat, fetchées statiquement ou via API publique)
- État géré localement (useState)
- Aucune dépendance externe requise pour la logique du score

### Recettes en résultat
- Fetchées depuis l'API publique Akeli (même endpoint que la marketplace)
- Filtrées si `q8Answer` est renseigné
- Fallback : top 3 recettes par `total_consumptions`

---

## 8. Évolutions futures (hors scope V1)

- **V2 :** Possibilité de sauvegarder son score en créant un compte
- **V2 :** Score recalculé après X semaines d'utilisation → "Ton alignement a progressé de 12%"
- **V2 :** Quiz intégré dans l'onboarding app mobile
- **Analytics :** Tracker les réponses agrégées (anonymisées) pour comprendre les profils de la base utilisateur

---

## 9. Ce que ce quiz démontre pour Akeli

Le quiz est un argument de vente silencieux. Il ne dit pas "Akeli est la solution". Il fait vivre à l'utilisateur le problème qu'Akeli résout. La conversion naît de la reconnaissance, pas du discours.

*"Mangez comme vous êtes" — le quiz montre ce que ça veut dire avant que l'app l'explique.*
