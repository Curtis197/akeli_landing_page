# become-creator + About Recraft — Design Spec

**Date:** 2026-06-22
**Status:** Approved for implementation
**Phase:** 2 · Increment 2 of the copywriting recraft

---

## Overview

Recraft the **describe-us layer** surfaces — `become-creator` (conversion) and `About` (brand
story) — against the approved messaging bible, move all copy into `messages` (`becomeCreator.*`,
`about.*`), provide **FR + EN** in the same pass, and use **"vous"** throughout (About currently
uses "tu").

**Source of truth:** `akeli-nutrition-app/docs/05_business_marche/AKELI_POSITIONNEMENT_MESSAGING.md`
(brand pillars + creator value prop) and `AKELI_GENESE_PERSONA.md` (genesis nod).

**Division (approved):** become-creator = polish-for-conversion (value prop + a light
*talent-est-partout* belief + the honest practical model); About = full rewrite to the three
brand pillars + a one-line genesis nod.

**Layer note:** these are *describe-us* surfaces (audience: creators, believers). The buying-act
hard rules relax to "mission register" here — positive, dignified, no comparison, no competitor.
Selling phrases like *« Sans commission »* and the brand framing *« Pas un régime »* are allowed
(the bible itself frames réalignement as "ce n'est pas un régime").

---

## Scope

**In scope:** rewrite `app/[locale]/become-creator/page.tsx` and `app/[locale]/about/page.tsx`
to read from `messages`; add `becomeCreator.*` and `about.*` namespaces to `fr.json` and
`en.json`; switch About to "vous"; keep the prospect_creator FAQ (`data/faq.ts`) as-is.

**Out of scope:** `ar.json` (locale disabled); FAQ content rewrite; the landing (done); Stripe/
payments copy in the dashboard.

---

## i18n keys

```
becomeCreator.hero.{title,subtitle,ctaJoin,ctaFaq}
becomeCreator.stats[] (4 × {value,label})
becomeCreator.steps.{eyebrow,title,step1..step4.{title,description}}
becomeCreator.belief.{eyebrow,headline,body}
becomeCreator.model.{eyebrow,title,body,badge,standard.{label,value,desc},fan.{label,badge,value,desc}}
becomeCreator.faqTitle
becomeCreator.finalCta.{eyebrow,title,body,cta}
becomeCreator.footer.{backHome,terms,privacy,contact}
becomeCreator.meta.{title,description}

about.intro.{title,lead,genesis}
about.pillar1.{title,body}
about.pillar2.{title,body}
about.pillar3.{title,body}
about.cta.{title,ctaCreator,ctaUser}
about.contact
about.footer.{terms,privacy,legal}
about.meta.{title,description}
```

---

## become-creator — copy

### FR
- **hero.title:** « Votre cuisine vaut plus qu'un like. »
- **hero.subtitle:** « Ce que vous savez cuisiner peut vous nourrir en retour. Touchez une audience qui mange vos recettes, et gagnez au résultat réel. »
- **hero.ctaJoin:** « Rejoindre gratuitement » · **hero.ctaFaq:** « Questions fréquentes »
- **stats:** [ {30 min, pour publier une recette}, {8, langues automatiques}, {1€, pour 90 consommations}, {0%, de commission Akeli} ]
- **steps.eyebrow:** « Simple & guidé » · **steps.title:** « Démarrer en 4 étapes »
  - step1 « Créez votre compte » / « Inscription gratuite en 2 minutes. Aucune carte bancaire requise. »
  - step2 « Publiez vos premières recettes » / « Un wizard guidé en 6 étapes. L'IA traduit automatiquement dans 8 langues. »
  - step3 « Partagez avec votre audience » / « Votre profil public et vos recettes sont accessibles depuis l'app mobile. »
  - step4 « Percevez vos revenus » / « 1€ par tranche de 90 consommations. Paiement le 5 de chaque mois via Stripe. »
- **belief.eyebrow:** « Le talent est partout »
  **belief.headline:** « Vos recettes comptent par leurs résultats, pas par votre nombre d'abonnés. »
  **belief.body:** « Sur Akeli, ce qui compte, c'est ce que vos recettes apportent vraiment aux gens. Le talent vient de partout — et il se mesure aux résultats réels. »
- **model.eyebrow:** « Deux sources de revenus » · **model.title:** « Sans commission. Sans algorithme. »
  **model.body:** « Akeli ne prend aucune commission sur vos revenus. Vous gagnez sur chaque consommation et sur chaque fan fidèle. »
  **model.badge:** « 1€/fan garanti chaque mois »
  **model.standard:** label « Mode standard » · value « 1€ » · desc « par tranche de 90 consommations — elles s'accumulent d'un mois à l'autre. »
  **model.fan:** label « Mode Fan » · badge « dès 30 recettes » · value « 1€/fan/mois » · desc « 100 fans = 100€/mois garantis, indépendamment des consommations. »
- **faqTitle:** « Questions fréquentes »
- **finalCta.eyebrow:** « Prêt à commencer ? » · **title:** « Partagez votre cuisine avec le monde. »
  **body:** « Inscription gratuite. Aucun engagement. Vos premières recettes en ligne en moins d'une heure. » · **cta:** « Créer mon compte créateur »
- **footer:** backHome « ← Retour à l'accueil » · terms « CGU » · privacy « Confidentialité » · contact « Contact créateurs »
- **meta.title:** « Devenir créateur Akeli — Votre cuisine vaut plus qu'un like »
  **meta.description:** « Publiez vos recettes de la diaspora africaine, touchez une audience qui les cuisine, et gagnez au résultat réel — sans commission, sans algorithme. »

### EN
- **hero.title:** "Your cooking is worth more than a like."
- **hero.subtitle:** "What you know how to cook can feed you back. Reach an audience that eats your recipes, and earn on real results."
- **ctaJoin:** "Join for free" · **ctaFaq:** "FAQ"
- **stats:** [ {30 min, to publish a recipe}, {8, automatic languages}, {€1, per 90 servings}, {0%, Akeli commission} ]
- **steps.eyebrow:** "Simple & guided" · **steps.title:** "Start in 4 steps"
  - "Create your account" / "Free sign-up in 2 minutes. No credit card required."
  - "Publish your first recipes" / "A guided 6-step wizard. AI translates automatically into 8 languages."
  - "Share with your audience" / "Your public profile and recipes are available in the mobile app."
  - "Get paid" / "€1 per 90 servings. Paid on the 5th of each month via Stripe."
- **belief.eyebrow:** "Talent is everywhere"
  **headline:** "Your recipes count for their results, not your follower count."
  **body:** "On Akeli, what matters is what your recipes truly bring people. Talent comes from everywhere — and it's measured by real results."
- **model.eyebrow:** "Two income streams" · **title:** "No commission. No algorithm."
  **body:** "Akeli takes no commission on your earnings. You earn on every serving and every loyal fan."
  **badge:** "€1/fan guaranteed every month"
  **standard:** "Standard mode" · "€1" · "per 90 servings — they carry over month to month."
  **fan:** "Fan Mode" · "from 30 recipes" · "€1/fan/month" · "100 fans = €100/month guaranteed, regardless of servings."
- **faqTitle:** "Frequently asked questions"
- **finalCta:** "Ready to start?" · "Share your cooking with the world." · "Free sign-up. No commitment. Your first recipes online in under an hour." · "Create my creator account"
- **footer:** "← Back home" · "Terms" · "Privacy" · "Creator contact"
- **meta.title:** "Become an Akeli creator — Your cooking is worth more than a like"
  **meta.description:** "Publish your African-diaspora recipes, reach an audience that cooks them, and earn on real results — no commission, no algorithm."

---

## About — copy

### FR
- **intro.title:** « À propos d'Akeli »
- **intro.lead:** « Akeli réadapte la cuisine africaine à la vie moderne, avec les outils de la modernité. Pas un régime — une remise en phase entre une cuisine et un mode de vie. »
- **intro.genesis:** « Akeli a commencé avec une femme, pas avec une étude de marché. Une femme qui voulait retrouver son corps en continuant à manger la cuisine qu'elle aime. C'est d'elle que tout est parti. »
- **pillar1.title:** « Le réalignement »
  **pillar1.body:** « Nos vies ont changé ; notre cuisine, elle, mérite de rester la nôtre. Akeli réadapte les plats de chez vous à votre quotidien — vos habitudes, votre énergie, votre profil. La transformation du corps en est la conséquence naturelle, jamais une punition. »
- **pillar2.title:** « Le talent est partout »
  **pillar2.body:** « La bonne solution peut venir de n'importe qui. Akeli fait confiance au collectif et aux résultats réels : des créateurs de tous milieux créent des recettes qui marchent vraiment, et les retours des utilisateurs révèlent ce qui fonctionne, profil par profil. Les nutritionnistes et diététiciens y ont toute leur place — une voix dans le collectif, parmi d'autres. »
- **pillar3.title:** « Combattre la modernité par la modernité »
  **pillar3.body:** « La désynchronisation entre nos cuisines et nos modes de vie touche toutes les cultures. Akeli commence avec la diaspora africaine — là où la pertinence est la plus forte — et porte une logique universelle : redonner à chaque culture une cuisine en phase avec sa vie d'aujourd'hui. »
- **cta.title:** « Rejoignez le mouvement » · **cta.ctaCreator:** « Devenir créateur » · **cta.ctaUser:** « Découvrir l'app »
- **contact:** « Une question, une idée, un partenariat ? hello@akeli.app »
- **footer:** terms « CGU » · privacy « Confidentialité » · legal « Mentions légales »
- **meta.title:** « À propos — Akeli »
  **meta.description:** « La voie Akeli : réadapter la cuisine africaine à la vie moderne. Le réalignement, le talent partout, et une vision universelle. »

### EN
- **intro.title:** "About Akeli"
- **intro.lead:** "Akeli realigns African cuisine with modern life, using the tools of modernity. Not a diet — a way to bring a cuisine and a lifestyle back in sync."
- **intro.genesis:** "Akeli began with a woman, not a market study. A woman who wanted to get her body back while still eating the food she loves. Everything started with her."
- **pillar1.title:** "Realignment"
  **body:** "Our lives have changed; our cuisine deserves to stay ours. Akeli adapts the dishes from home to your everyday — your habits, your energy, your profile. The change in your body follows naturally, never as a punishment."
- **pillar2.title:** "Talent is everywhere"
  **body:** "The right solution can come from anyone. Akeli trusts the collective and real results: creators of every background create recipes that genuinely work, and user feedback reveals what works, profile by profile. Nutritionists and dietitians have their place here too — one voice in the collective, among others."
- **pillar3.title:** "Fighting modernity with modernity"
  **body:** "The gap between our cuisines and our lifestyles touches every culture. Akeli starts with the African diaspora — where it matters most — and carries a universal idea: give every culture a cuisine in sync with life today."
- **cta.title:** "Join the movement" · **ctaCreator:** "Become a creator" · **ctaUser:** "Discover the app"
- **contact:** "A question, an idea, a partnership? hello@akeli.app"
- **footer:** "Terms" · "Privacy" · "Legal notice"
- **meta.title:** "About — Akeli"
  **meta.description:** "The Akeli way: realigning African cuisine with modern life. Realignment, talent everywhere, and a universal vision."

---

## Component changes

- **`become-creator/page.tsx`:** convert `STEPS`/`STATS` consts to read from `t.raw(...)`; bind
  all hero/steps/model/finalCta/footer strings to `becomeCreator.*`; insert a new **belief band**
  section between the steps and the économique section; move `metadata` to `becomeCreator.meta`
  via `getTranslations`. Keep the existing layout/images and the `prospectFAQ` accordion.
- **`about/page.tsx`:** full copy rewrite to three pillar sections + intro (lead + genesis) +
  CTA; bind to `about.*`; switch "tu" → "vous"; keep contact + legal footer; move `metadata` to
  `about.meta`. Add `Navbar` already present.
- Both pages: add `useTranslations`/`getTranslations` as the landing does.

---

## Success criteria

- `/fr/become-creator`, `/en/become-creator`, `/fr/about`, `/en/about` all render their locale's
  copy with no hardcoded marketing strings and no missing-key errors.
- About reads "vous" throughout; the three pillars are present and match the bible.
- become-creator leads with the value prop + the *talent-est-partout* belief band, keeps the
  honest model.
- `npm run build` succeeds.
