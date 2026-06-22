# Akeli Copywriting Foundation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the two source-of-truth foundation docs (Genesis & Persona, Positioning & Messaging) that all future Akeli copy derives from, and index them.

**Architecture:** Two French Markdown documents in the `akeli-nutrition-app` strategy repo, plus index entries. The Genesis doc captures origin truth and the named persona; the Positioning doc is the copywriting bible (two-layer architecture, conversion spine, brand pillars, voice rules). No code — pure documentation. Verification is a read-through against the spec's section list and the on/off-brand filter.

**Tech Stack:** Markdown. Git (two repos). No build, no tests framework.

**Source spec:** `akeli_landing_page/docs/superpowers/specs/2026-06-22-akeli-copywriting-foundation-design.md` — read it before starting.

## Global Constraints

- **Doc language:** French (vision/business convention).
- **Repo for both docs:** `C:/Users/DELL LATITUDE 7480/akeli-nutrition-app` (git repo, default branch `main`). Create a working branch `docs/copywriting-foundation` there before committing.
- **The 8 hard voice rules** govern every **user-facing example line** inside the Positioning doc (the lines in « … » in the conversion sections). They do NOT restrict internal/strategic prose (the Genesis doc may name *poids, régime, surpoids, traumatisme* plainly; the Positioning doc's rules/lexicon sections necessarily *list* banned words).
  1. Affirmative only — no negation (*ne… pas, sans, jamais, plus de*).
  2. No diet/"healthy" vocabulary — *régime, maigrir, perdre/perte de poids, calories, allégé(e), light, sain, brûler.*
  3. Body outcome via positive proxy only — *retrouvez votre corps / votre silhouette, votre énergie, vous-même, confiance.*
  4. Every word safe in isolation.
  5. Stand on our own — no competitor names, no comparison.
  6. Encouragement before outcome.
  7. "Vous", consistent.
  8. No shame, no pressure, no obligation (*il faut, vous devez,* duty-framed goals).
- **Hero line is locked:** *« Mangez comme vous êtes. »*
- **Offer:** 2,99 €/mois (single price, V1).
- **Audience:** African diaspora beachhead; launch buyer = overweight African diaspora woman who wants to retrouver son corps.

---

### Task 1: Genesis & Persona doc

**Files:**
- Create: `C:/Users/DELL LATITUDE 7480/akeli-nutrition-app/docs/01_vision_contexte/AKELI_GENESE_PERSONA.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the named persona "la fondatrice" and the founding insight, referenced by Task 2 and all Phase 2 copy.

- [ ] **Step 1: Create the file with the full structure and content**

Write the document in French with these six sections (expand each into 1–3 short paragraphs; the bullets below are the must-include facts, not the final prose):

```markdown
# Akeli — Genèse & Persona Fondatrice

> Document fondateur. Vérité d'origine et persona de référence à qui s'adresse
> chaque ligne de copy. Usage interne/stratégique — il peut nommer le poids et
> le vécu des régimes sans détour. Les règles de langage « sans déclencheur »
> s'appliquent à la copy destinée à l'utilisateur, pas à ce document.

## 1. L'origine
Akeli ne naît pas d'une étude de marché mais d'une femme : la sœur du fondateur.

## 2. La persona fondatrice — « la fondatrice »
- Femme, 37 ans, née en Afrique, diaspora. Yo-yo : perte puis reprise, encore et encore.
- Pense à son poids chaque matin. En prenant du poids, se sent moins féminine, moins
  elle-même. Sentiment de n'avoir aucun contrôle sur son corps.
- Les régimes « sains » ont été un traumatisme. Refuse de retourner à la salade.
- Tout son plaisir alimentaire est africain — même ses cheat meals étaient africains.
- Le piège : deux pertes possibles — perdre le poids OU se perdre elle-même.
  Personne ne lui a proposé de garder les deux.
- Ce qu'elle veut (acte d'achat) : retrouver son corps en mangeant la cuisine qu'elle
  aime (E), avec un accompagnement fait pour elle (D). En profondeur : reprendre le
  contrôle, se sentir à nouveau elle-même.
- Récit de résignation à abandonner : « les hommes aiment les rondes ».

## 3. Ce que le terrain a confirmé
- Femmes de la diaspora observées dans le secteur de la santé : majorité en surpoids,
  majorité insatisfaites, ayant abandonné faute de solution adaptée.
- Nuance physiologique réelle : aide-soignante vs. secrétaire ≈ 20 kg d'écart à âge égal —
  le travail physique change le besoin.
- Athlètes africains sans notion de diète de performance, encore moins d'une diète
  africaine de performance.

## 4. L'insight fondateur
- Le faux choix : maigrir ou rester soi-même. Akeli refuse ce choix.
- « Le premier combat est dans l'assiette. »
- La culture diététique dominante est un import fade et punitif.

## 5. La réponse produit
- Cuisine africaine repensée à faible densité calorique : fufu à base de chou fermenté,
  soupes africaines légèrement assaisonnées.
- Manger à sa faim, le goût reste, satiété réelle.
- Personnalisation : un plan construit à partir de la cuisine de l'utilisatrice.

## 6. Du cas personnel au marché
- Une femme représente ~200M de diasporiens africains — marché pleinement adressable.
- Personas d'expansion (après lancement, car nécessitent éducation/familiarité) :
  hommes, athlètes, recherche d'énergie/variété.

---
*Document créé : Juin 2026 — Auteur : Curtis (fondateur)*
```

- [ ] **Step 2: Verify against the spec**

Read `2026-06-22-akeli-copywriting-foundation-design.md` → "Deliverable 1". Confirm all six sections exist and every persona bullet (age, daily weight anxiety, diet trauma, African pleasure, the trap, what she wants, the coping narrative) is present. Confirm the 20 kg health-sector nuance and the ~200M market line are included.
Expected: every item maps to a paragraph.

- [ ] **Step 3: Create the branch and commit**

```bash
cd "C:/Users/DELL LATITUDE 7480/akeli-nutrition-app"
git checkout -b docs/copywriting-foundation
git add docs/01_vision_contexte/AKELI_GENESE_PERSONA.md
git commit -m "docs(vision): genesis & core persona — la fondatrice

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 1 file changed, new file created on branch `docs/copywriting-foundation`.

---

### Task 2: Positioning & Messaging doc (the copywriting bible)

**Files:**
- Create: `C:/Users/DELL LATITUDE 7480/akeli-nutrition-app/docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md`

**Interfaces:**
- Consumes: the persona "la fondatrice" from Task 1 (reference it by name).
- Produces: the two-layer model, conversion hierarchy, hero/subhead, brand pillars, voice rules, lexicon — consumed by all Phase 2 copy tasks.

- [ ] **Step 1: Create the file with the full content**

Write in French. Include every block below verbatim in substance (the « … » example lines are exact):

```markdown
# Akeli — Positionnement & Messaging (Bible Copywriting)

> Document opérationnel. Source de vérité de toute la copy Akeli.
> Principe fondateur : séparer ce qui NOUS DÉCRIT (récit de marque — créateurs,
> convaincus, investisseurs) de ce que l'utilisatrice doit savoir POUR ACHETER
> (point de vue utilisateur). Deux couches distinctes.

## 1. Architecture à deux couches
| Couche | Audience | Contenu | Surfaces |
|---|---|---|---|
| Acte d'achat | La fondatrice (persona) | Résultat + faux choix + mécanisme + paie émotionnelle | Landing, store, ads, onboarding |
| Nous décrire | Créateurs, convaincus, investisseurs | Réalignement, intelligence collective, vision | About, become-creator, pitch |

## 2. Hiérarchie du message — couche acte d'achat
1. Accroche (encouragement + identité) : « Mangez comme vous êtes. »
2. Sous-titre (résultat via proxy positif) :
   « La cuisine que vous aimez, et un corps qui vous ressemble. »
   ou « Retrouvez votre corps avec les plats de chez vous. »
3. Mécanisme : vos propres plats africains, repensés et faits pour vous ;
   mangez à votre faim, le goût reste.
4. Validation (avec parcimonie) : « Vous n'étiez pas le problème. »
5. Paie émotionnelle : reprendre le contrôle de son corps ; se sentir à nouveau
   soi-même ; apaiser l'angoisse du matin ; sortir du yo-yo.
6. Preuves : recettes repensées · personnalisation · ce qui marche pour des profils
   comme le vôtre · créateurs de votre culture · 2,99 €/mois.
7. CTA : commencer / télécharger.

Promesse en une phrase :
« Retrouvez votre corps en mangeant la cuisine que vous aimez — la vôtre, et faite pour vous. »
Accroche verrouillée : « Mangez comme vous êtes. »

## 3. Piliers de marque — couche nous décrire
1. Le réalignement — la voie Akeli. Akeli réadapte la cuisine africaine à la vie
   moderne avec les outils de la modernité. Ce n'est pas un régime : une remise en
   phase entre une cuisine et un mode de vie. La transformation du corps en est la
   conséquence.
2. L'intelligence collective — le talent est partout. Conviction : le talent est
   partout, et la bonne solution peut venir de n'importe qui. Des créateurs de tous
   milieux créent des recettes à résultat réel ; les retours et données des
   utilisateurs révèlent ce qui fonctionne, profil par profil. Les nutritionnistes
   et diététiciens — africains notamment — y ont toute leur place : une voix dans le
   collectif, parmi d'autres.
3. Combattre la modernité par la modernité — la vision. Le modèle vaut pour toute
   culture perdue dans la modernité. La diaspora africaine (~200M, pleinement
   adressable) est la tête de pont — par pertinence et momentum, pas par limite.

Proposition créateur (become-creator) :
« Ce que vous savez cuisiner peut désormais vous nourrir en retour. » — rémunération
au résultat réel ; une audience qui mange vos recettes, pas qui regarde.

## 4. Voix & ton
Voix : encourageante, accueillante, chaleureuse · affirmée (existe par elle-même) ·
fière et digne · identité d'abord, résultat ensuite.

Règles dures (non négociables) :
1. Affirmatif uniquement — aucune négation (ne… pas, sans, jamais, plus de).
2. Aucun vocabulaire diète/« santé » — régime, maigrir, perdre/perte de poids,
   calories, allégé(e), light, sain, brûler.
3. Résultat corporel par proxy positif uniquement — retrouvez votre corps / votre
   silhouette, votre énergie, vous-même, confiance.
4. Chaque mot sûr isolément (elle scanne et réagit avant de finir la phrase).
5. Exister par soi-même — aucun nom de concurrent, aucune comparaison.
6. Encouragement avant résultat.
7. « Vous », constant.
8. Ni honte, ni pression, ni obligation (il faut, vous devez).

Filtre par couche : surfaces acte d'achat = toutes les règles dures strictement ;
surfaces nous décrire = registre mission autorisé, mais positif, digne, sans comparaison.

Test on/off-brand :
- ✅ affirmatif · encouragement/identité d'abord · sûr mot à mot · résultat via proxy
  positif · existe par soi-même.
- ❌ négation · mot diète/« santé » · concurrent/comparaison · honte/pression/devoir ·
  un seul mot déclencheur isolé.

## 5. Lexique
À utiliser : mangez comme vous êtes · la cuisine que vous aimez · chez vous ·
retrouvez · votre corps · votre énergie · vous-même · plaisir · confiance ·
fait pour vous · ensemble.
À éviter : régime · maigrir · perdre du poids · calories · allégé · light · sain ·
sans · ne… pas · salade (comme punition) · il faut · [tout nom de concurrent].

---
*Document créé : Juin 2026 — Auteur : Curtis (fondateur)*
```

- [ ] **Step 2: Verify every user-facing example line passes the on/off-brand filter**

Read each line inside « … » in sections 2 and 3. For each, confirm: no negation; no banned diet word; body outcome only via positive proxy; no competitor; no shame/duty word.
Run this targeted check (lists « … » example lines that contain a hard-banned token — should return **nothing**, ignoring the rules/lexicon sections 4–5 which legitimately list banned words):

```bash
cd "C:/Users/DELL LATITUDE 7480/akeli-nutrition-app"
grep -nE "«[^»]*(maigrir|régime|perdre|perte de poids|calories|allégé|light| sain|sans | ne |jamais| il faut )[^»]*»" docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md || echo "PASS: no banned token inside example lines"
```
Expected: `PASS: no banned token inside example lines`. If any line is listed, rewrite it affirmatively before committing.

- [ ] **Step 3: Verify against the spec**

Read `2026-06-22-...-design.md` → "Deliverable 2". Confirm sections 2.1–2.4 are all represented: two-layer table, conversion hierarchy (7 steps), one-sentence promise, locked hero, three brand pillars, creator value prop, the 8 hard rules, the two-layer filter, the on/off test, the lexicon.
Expected: every spec sub-item maps to a heading.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/DELL LATITUDE 7480/akeli-nutrition-app"
git add docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md
git commit -m "docs(business): positioning & messaging bible — two-layer model, A+B spine, voice rules

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 1 file changed, new file on branch `docs/copywriting-foundation`.

---

### Task 3: Index both docs in MASTER_INDEX

**Files:**
- Modify: `C:/Users/DELL LATITUDE 7480/akeli-nutrition-app/docs/MASTER_INDEX.md`

**Interfaces:**
- Consumes: the two files from Tasks 1–2.
- Produces: discoverable index entries (no downstream consumer).

- [ ] **Step 1: Add the Genesis doc to section "1. Vision & Contexte"**

Open `MASTER_INDEX.md`. Inside the table under "## 1. Vision & Contexte", add this row immediately after the `AKELI_CONCEPT_INDEX.md` row:

```markdown
| [`AKELI_GENESE_PERSONA.md`](01_vision_contexte\AKELI_GENESE_PERSONA.md) | Genèse du projet et persona fondatrice (« la fondatrice ») — vérité d'origine et de référence pour toute la copy | ✅ Actif — **Fondateur** |
```

- [ ] **Step 2: Add the Positioning doc to section "5. Business & Marché"**

Inside the table under "## 5. Business & Marché", add this row immediately after the `AKELI_MODELE_CREATEUR.md` row:

```markdown
| [`AKELI_POSITIONNEMENT_MESSAGING.md`](05_business_marche\AKELI_POSITIONNEMENT_MESSAGING.md) | Bible copywriting — architecture à deux couches (nous décrire / acte d'achat), accroche « Mangez comme vous êtes », piliers de marque, règles de voix | ✅ Actif |
```

- [ ] **Step 3: Update the header "Dernière mise à jour" line**

Replace the existing `**Dernière mise à jour** : …` line with:

```markdown
**Dernière mise à jour** : Juin 2026 — ajout fondation copywriting (AKELI_GENESE_PERSONA, AKELI_POSITIONNEMENT_MESSAGING)
```

- [ ] **Step 4: Verify the links resolve**

```bash
cd "C:/Users/DELL LATITUDE 7480/akeli-nutrition-app"
ls docs/01_vision_contexte/AKELI_GENESE_PERSONA.md docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md
grep -c "AKELI_GENESE_PERSONA\|AKELI_POSITIONNEMENT_MESSAGING" docs/MASTER_INDEX.md
```
Expected: both files listed; grep count ≥ 2.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/DELL LATITUDE 7480/akeli-nutrition-app"
git add docs/MASTER_INDEX.md
git commit -m "docs(index): register copywriting foundation docs in MASTER_INDEX

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 1 file changed.

---

## Self-Review

**Spec coverage:**
- Deliverable 1 (Genesis & Persona) → Task 1 ✅
- Deliverable 2 (Positioning & Messaging, sections 2.1–2.4) → Task 2 ✅
- "Both registered in MASTER_INDEX" → Task 3 ✅
- Phase 2 work → intentionally out of scope (separate cycle).

**Placeholder scan:** No TBD/TODO; all doc content is supplied verbatim in the steps.

**Consistency:** Hero line « Mangez comme vous êtes » identical in spec, Task 2 step 1, and Task 3 index entry. Persona named "la fondatrice" in Tasks 1, 2, 3. File paths identical across creation, verification, and index rows.

---

## Notes for the implementer

- These docs are **prose, not code** — "verify" steps are read-throughs against the spec and the on/off-brand filter, plus the one targeted grep in Task 2.
- The grep in Task 2 is a safety net, not a substitute for reading each example line.
- All commits happen in the **`akeli-nutrition-app`** repo on branch `docs/copywriting-foundation`. The plan/spec stay in `akeli_landing_page`.
