# Akeli Copywriting Foundation — Design Spec

**Date:** 2026-06-22
**Status:** Approved for implementation
**Author:** Curtis (founder) + Claude

---

## Overview

Akeli's live marketing copy predates the project's evolved philosophy and offer. The
*réalignement* concept, the *collective intelligence* belief, and the V1 product reality
(personalized plans, outcome-based algorithm, re-engineered light African recipes) were
developed **after** the existing copy was written. The copy now reads like a generic
cultural recipe-subscription app; it does not reflect what Akeli has become or who it sells to.

This project rebuilds the copywriting from its foundation. It is split into two phases:

- **Phase 1 (this spec):** write the two *source-of-truth* foundation docs — a Genesis &
  Persona doc and a Positioning & Messaging doc ("the copywriting bible"). Everything else
  derives from these.
- **Phase 2 (next cycle):** recraft all the actual copy, surface by surface, against the
  approved foundation.

The governing principle, set by the founder: **separate what *describes us* (brand narrative
— for creators, believers, investors) from what the user *needs to know for the buying act*
(pure user point of view).** These are two distinct layers with different audiences, content,
and tone.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Structure | Two-phase: foundation docs → then all copy | Copy must rest on an approved, written foundation |
| Two messaging layers | "Describe-us" vs. "Buying-act" | Founder's anchoring principle; different audiences |
| Launch buyer | Overweight African diaspora woman who wants to lose weight | Feels the most pain → converts first |
| Expansion buyers | Men, athletes, energy/variety seekers | Need education + product familiarity → post-launch |
| Audience scope | African diaspora only (beachhead) | Relevance + momentum; universality stays in vision layer |
| Conversion spine | A (outcome) + B (mechanism), behind an encouragement-led hero | Serves E→D; keeps originality; disarms diet-shame |
| Hero line | « Mangez comme vous êtes. » | The exact line that resonated with the core persona |
| Body-outcome language | Positive proxies only (*retrouvez votre corps/silhouette*) | Persona scans for trigger words; diet vocabulary re-traumatizes |
| Brand stance | Stands on its own — no competitor comparison | Most of the persona never used competitors long enough to compare |
| Collective intelligence framing | Positive belief: "talent is everywhere" | Hope/inclusion, not a takedown of experts |
| Offer (V1) | Single price, 2,99 €/month | Custom subscriptions arrive in V2 with user+creator feedback |
| Doc language | French (vision/business convention) | Copy is FR-first; EN/AR translated in Phase 2 |

---

## Scope

**In scope (Phase 1):**
- `AKELI_GENESE_PERSONA.md` → `akeli-nutrition-app/docs/01_vision_contexte/`
- `AKELI_POSITIONNEMENT_MESSAGING.md` → `akeli-nutrition-app/docs/05_business_marche/`
- Both registered in that repo's `MASTER_INDEX.md`

**Out of scope (Phase 1 — handled in Phase 2):**
- Rewriting `app/[locale]/page.tsx`, `become-creator`, About, FAQ copy
- `messages/*.json` edits, encoding-bug fixes, EN/AR translations
- App-store copy, ads, onboarding copy

**Non-goals:**
- Repositioning to non-diaspora audiences
- A premium/"transformation" pricing tier (V2)
- Surfacing réalignement or collective intelligence in conversion copy

---

## Deliverable 1 — `AKELI_GENESE_PERSONA.md`

Origin truth and the named persona every line of copy is written *to*.

**Outline:**
1. **L'origine** — Akeli started not from a market study but from one woman.
2. **La persona fondatrice** — the founder's sister (detailed below).
3. **Ce que le terrain a confirmé** — diaspora women observed in the health sector.
4. **L'insight fondateur** — the false choice; *le premier combat est dans l'assiette.*
5. **La réponse produit** — African food re-engineered light (volume eating, satiety, taste
   intact) + personalization.
6. **Du cas personnel au marché** — one woman → ~200M addressable diaspora; expansion personas
   (men, athletes, energy-seekers) come later.

**The core persona — "la fondatrice":**
- **Who:** Femme, 37, née en Afrique, diaspora. Yo-yo : perte puis reprise, encore et encore.
- **Pain (emotional):** Pense à son poids *chaque matin*. En prenant du poids, se sent *moins
  féminine, moins elle-même*. Sentiment de **n'avoir aucun contrôle sur son corps**.
- **Pain (functional):** Les régimes "sains" = un **traumatisme**. Refuse de retourner à la
  salade. Tout son plaisir alimentaire est africain — même ses cheat meals étaient africains.
- **The trap:** Deux pertes possibles — perdre le poids *ou* se perdre elle-même. Personne ne
  lui a proposé de garder les deux.
- **What she wants (buying act):** Retrouver son corps **en mangeant la cuisine qu'elle aime**
  (E), avec un accompagnement **fait pour elle** (D). En profondeur : reprendre le contrôle,
  se sentir à nouveau elle-même.
- **Coping to abandon:** "les hommes aiment les rondes" — une résignation, pas un choix.

**Market truth:** majorité en surpoids, majorité insatisfaites, ont **abandonné** faute de
solution adaptée; nuance physiologique réelle (aide-soignante vs. secrétaire ≈ 20 kg d'écart —
le travail physique change le besoin).

> Note: this doc is internal/strategic. It may name pain plainly (weight, diet trauma). The
> no-trigger-word rules govern **user-facing copy**, not this internal reference.

---

## Deliverable 2 — `AKELI_POSITIONNEMENT_MESSAGING.md`

The copywriting bible. Sections:

### 2.1 The two-layer architecture

| Layer | Audience | Content | Surfaces |
|---|---|---|---|
| **Buying-act** | The core persona | Outcome + false-choice + mechanism + emotional payoff | Landing, app store, ads, onboarding |
| **Describe-us** | Creators, believers, investors | Réalignement, intelligence collective, vision | About, become-creator, pitch |

### 2.2 Conversion message hierarchy (buying-act layer)

1. **Hook (A — encouragement + identity):** *« Mangez comme vous êtes. »* — permission first,
   disarms shame.
2. **Subhead (outcome via positive proxy):** the body result she wants, framed as gain — e.g.
   *« La cuisine que vous aimez, et un corps qui vous ressemble. »* /
   *« Retrouvez votre corps avec les plats de chez vous. »*
3. **Mechanism (B):** vos propres plats africains, repensés et **faits pour vous** ; mangez à
   votre faim, le goût reste. (Proof: fermented-cabbage fufu, light seasoned soups.)
4. **Validation (used sparingly):** *« Vous méritiez une méthode faite pour vous. »* —
   affirmative, forward-looking, ties to the mechanism. Never the lead; always within the
   no-trigger rules.
5. **Emotional payoff:** reprendre le contrôle de son corps ; se sentir à nouveau soi-même ;
   apaiser l'angoisse du matin ; sortir du yo-yo.
6. **Proof points:** recettes repensées · personnalisation (un plan à partir de *votre*
   cuisine) · ce qui marche pour des profils comme le vôtre · créateurs de votre culture ·
   **2,99 €/mois.**
7. **CTA:** commencer / télécharger.

**One-sentence promise (buying act):**
> « Retrouvez votre corps en mangeant la cuisine que vous aimez — la vôtre, et faite pour vous. »

**Hero line:** locked → *« Mangez comme vous êtes. »*
**Subhead:** finalize exact wording in Phase 2 from the positive-proxy directions above.

### 2.3 Brand pillars (describe-us layer)

1. **Le réalignement — la voie Akeli.** Akeli réadapte la cuisine africaine à la vie moderne
   avec les outils de la modernité. Ce n'est pas un régime, c'est une remise en phase entre une
   cuisine et un mode de vie. La transformation du corps est la **conséquence** de ce
   réalignement.
2. **L'intelligence collective — le talent est partout.** Conviction fondatrice : *le talent
   est partout, et la bonne solution peut venir de n'importe qui.* Akeli fait confiance au
   collectif et aux résultats réels : des **créateurs de tous milieux** créent des recettes à
   résultat réel ; les **retours et données des utilisateurs** révèlent ce qui fonctionne,
   profil par profil. Les nutritionnistes et diététiciens — africains notamment — y ont toute
   leur place : **une voix dans le collectif, parmi d'autres.**
3. **Combattre la modernité par la modernité — la vision.** Le modèle réalignement + créateurs
   rémunérés pour l'intelligence collective vaut pour **toute culture perdue dans la
   modernité**. La diaspora africaine (~200M, pleinement adressable) est la tête de pont — par
   pertinence et momentum, pas par limite.

**Creator value prop (become-creator), derived:**
> *Ce que vous savez cuisiner peut désormais vous nourrir en retour.* — rémunération au
> résultat réel ; une audience qui *mange* vos recettes, pas qui *regarde*.

### 2.4 Voice & tone rules

**Voice:** encouraging, accepting, warm (a friend who gets it) · affirmative and self-assured
(stands on its own) · proud and dignified · identity-first, outcome-second.

**Hard rules (non-negotiable):**
1. **Affirmative only** — no negation (*ne… pas, sans, jamais, plus de*).
2. **No diet/"healthy" vocabulary** — banned: *régime, maigrir, perdre/perte de poids,
   calories, allégé(e), light, sain, brûler.*
3. **Body outcome via positive proxy only** — *retrouvez votre corps / votre silhouette, votre
   énergie, vous-même, confiance.*
4. **Every word safe in isolation** — she scans and reacts before finishing the sentence.
5. **Stand on our own** — no competitor names, no comparison framing, ever.
6. **Encouragement before outcome** — permission/identity leads; body result follows.
7. **"Vous", consistent** — the register that landed with her.
8. **No shame, no pressure, no obligation** — banned: *il faut, vous devez,* duty-framed goals.

**Two-layer filter:** buying-act surfaces apply all hard rules strictly; describe-us surfaces
allow the mission register (réalignement, intelligence collective, vision) but stay positive,
dignified, and comparison-free.

**On/off-brand quick test:**
- ✅ affirmative · encouragement/identity-first · safe word-by-word · outcome via positive
  proxy · stands on its own.
- ❌ negation · diet/"healthy" word · competitor/comparison · shame/pressure/duty · any single
  trigger word in isolation.

**Lexicon:**
- **Use:** *mangez comme vous êtes · la cuisine que vous aimez · chez vous · retrouvez · votre
  corps · votre énergie · vous-même · plaisir · confiance · fait pour vous · ensemble.*
- **Avoid:** *régime · maigrir · perdre du poids · calories · allégé · light · sain · sans ·
  ne… pas · salade (comme punition) · il faut · [tout nom de concurrent].*

---

## Phase 2 preview (next cycle, not this spec)

Recraft, in order, against the approved foundation:
1. **User landing** (`app/[locale]/page.tsx`) — highest leverage.
2. **become-creator** (describe-us + creator value prop).
3. **About** (the three brand pillars).
4. **FAQ** + `messages/*.json` (incl. fixing existing encoding/mojibake bugs).
5. **EN / AR translations.**

---

## Success criteria

- A stranger reading the landing understands, in order: *you're accepted as you are* → *you can
  retrouver votre corps eating your own cuisine* → *it's made for you* → *2,99 €.*
- No user-facing line violates the hard rules.
- Creators/investors reading About understand réalignement + the talent-is-everywhere belief.
- Both foundation docs are indexed in `MASTER_INDEX.md` and usable as the single source of
  truth for all Phase 2 copy.
