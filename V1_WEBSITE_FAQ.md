# Akeli V1 — FAQ Website

> Document de référence pour Claude Code.
> Définit le contenu, la structure et le placement des FAQ pour les trois profils : utilisateur, prospect créateur, créateur connecté.
> À lire avec `V1_WEBSITE_PAGES_SPECIFICATIONS.md` et `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md`.

**Statut** : Référence V1 Website — Prêt pour Claude Code
**Date** : Mars 2026
**Auteur** : Curtis — Fondateur Akeli

---

## Structure du document

1. [FAQ Utilisateur](#1-faq-utilisateur) — Landing page `/`
2. [FAQ Prospect Créateur](#2-faq-prospect-créateur) — Page créateur publique `/become-creator`
3. [FAQ Créateur Connecté](#3-faq-créateur-connecté) — Dashboard `/dashboard`, pages `/help/...`
4. [Centre d'aide et ressources liées](#4-centre-daide-et-ressources-liées) — Architecture `/help`
5. [Implémentation technique](#5-implémentation-technique) — Composants, placement, rendu

---

## Conventions

Chaque entrée FAQ suit ce format :

```
id: identifiant unique kebab-case
question: La question telle qu'affichée à l'utilisateur
answer: Réponse courte, ton Akeli — direct, honnête, sans jargon
audience: user | prospect_creator | creator
placement: landing | creator_page | dashboard | help_center
category: regroupement thématique
link?: URL vers ressource complémentaire (optionnel)
```

**Ton des réponses :**
- Direct et honnête — pas de promesses exagérées
- Sans jargon technique
- Bref pour utilisateur/prospect, détaillé pour créateur connecté
- Jamais de culpabilisation, jamais de pression

---

## 1. FAQ Utilisateur

**Placement :** Section dédiée sur la landing page `/`
**Objectif :** Lever les derniers freins avant téléchargement
**Volume :** 5 questions — succinct

---

```
id: user-disponibilite
question: L'app est disponible sur iOS et Android ?
answer: Oui. Akeli est disponible sur l'App Store et Google Play. Le téléchargement est gratuit — l'abonnement Akeli Premium (3€/mois) se souscrit directement depuis l'app.
audience: user
placement: landing
category: Application
```

```
id: user-prix
question: Combien coûte Akeli ?
answer: Akeli Premium coûte 3€/mois. C'est sans engagement — vous pouvez annuler à tout moment depuis l'app en un clic.
audience: user
placement: landing
category: Abonnement
```

```
id: user-cuisine
question: Est-ce que mon pays ou ma région culinaire est représenté ?
answer: Akeli couvre la cuisine africaine et de la diaspora dans toute sa diversité — Afrique de l'Ouest, Afrique centrale, Maghreb, Caraïbes, et plus. Les recettes sont créées par des créateurs réels, issus de ces cultures.
audience: user
placement: landing
category: Contenu
```

```
id: user-ia
question: Comment l'app sait ce que je mange ?
answer: Lors de votre inscription, Akeli vous pose quelques questions sur vos habitudes alimentaires et vos objectifs. À partir de là, le système génère un plan de repas personnalisé, uniquement basé sur des recettes de votre cuisine — pas d'imposition d'une alimentation étrangère à vos habitudes.
audience: user
placement: landing
category: Fonctionnement
```

```
id: user-donnees
question: Mes données personnelles sont-elles sécurisées ?
answer: Oui. Toutes vos données sont chiffrées et hébergées en Europe (Paris). Akeli ne vend jamais vos informations. Vous pouvez demander la suppression de votre compte et de vos données à tout moment — conformément au RGPD.
audience: user
placement: landing
category: Confidentialité
```

---

## 2. FAQ Prospect Créateur

**Placement :** Section FAQ sur la page publique créateur `/become-creator`
**Objectif :** Convertir le visiteur en créateur inscrit — réponses honnêtes, sans fausse promesse
**Volume :** 10 questions

---

### Revenus & Modèle économique

```
id: creator-revenus-calcul
question: Comment sont calculés mes revenus ?
answer: Chaque mois, 1€ est distribué entre tous les créateurs actifs, au prorata des consommations. Concrètement : pour chaque tranche de 90 consommations de vos recettes atteinte dans le mois, vous recevez 1€. Ces consommations s'accumulent dans le temps — une consommation de janvier compte encore en février si la tranche n'est pas complète.
audience: prospect_creator
placement: creator_page
category: Revenus
link: /help/remuneration
```

```
id: creator-revenus-realiste
question: Combien puis-je gagner réalistement ?
answer: Cela dépend du nombre d'utilisateurs actifs qui consomment vos recettes. Un créateur avec 100 utilisateurs actifs réguliers peut espérer 50 à 100€/mois en mode standard. En Mode Fan (disponible dès 30 recettes publiées), chaque fan vous rapporte 1€/mois garanti — 100 fans = 100€/mois stables, indépendamment des consommations.
audience: prospect_creator
placement: creator_page
category: Revenus
link: /help/remuneration
```

```
id: creator-revenus-delai
question: Combien de temps avant mes premiers revenus ?
answer: Vos premiers revenus apparaissent dès qu'une tranche de 90 consommations est atteinte. Le délai dépend de votre audience et de votre activité de partage — il n'y a pas de minimum de recettes pour commencer à percevoir. Les paiements sont effectués le 5 de chaque mois pour les revenus du mois précédent.
audience: prospect_creator
placement: creator_page
category: Revenus
```

### Prérequis & Barrière d'entrée

```
id: creator-prerequis-abonnes
question: Dois-je avoir beaucoup d'abonnés pour rejoindre ?
answer: Non. Akeli n'impose pas de seuil d'abonnés. Un créateur avec 2 000 abonnés engagés peut générer plus de revenus qu'un compte à 100 000 abonnés peu actifs. Ce qui compte, c'est la relation que vous avez avec votre audience — pas votre taille.
audience: prospect_creator
placement: creator_page
category: Prérequis
```

```
id: creator-prerequis-technique
question: Dois-je avoir des compétences techniques ?
answer: Non. La création de recettes sur Akeli se fait via un formulaire guidé en 6 étapes. Une recette complète prend environ 30 minutes à publier. L'IA vous aide à corriger l'orthographe et à traduire automatiquement dans les langues disponibles.
audience: prospect_creator
placement: creator_page
category: Prérequis
```

```
id: creator-prerequis-cuisine
question: Dois-je être chef ou avoir une formation culinaire ?
answer: Pas du tout. Akeli valorise le savoir culinaire transmis de génération en génération — pas les diplômes. Si vous cuisinez des recettes de votre culture depuis des années, votre savoir a de la valeur sur Akeli.
audience: prospect_creator
placement: creator_page
category: Prérequis
```

### Liberté & Fonctionnement

```
id: creator-liberte-contenu
question: Akeli me dicte quelles recettes publier ?
answer: Non. Vous restez entièrement libre de votre catalogue. Akeli ne modifie pas vos recettes, ne vous impose pas de style alimentaire et ne favorise aucune cuisine par rapport à une autre. La seule condition est que vos recettes respectent les CGU (contenu approprié, informations exactes).
audience: prospect_creator
placement: creator_page
category: Liberté éditoriale
```

```
id: creator-langues
question: Puis-je publier dans plusieurs langues ?
answer: Oui. Vous rédigez vos recettes dans votre langue principale (français ou anglais en V1). Akeli traduit automatiquement votre contenu dans 8 langues via IA. Vous pouvez valider ou corriger chaque traduction avant publication.
audience: prospect_creator
placement: creator_page
category: Langues
```

```
id: creator-algorithme
question: Mes revenus dépendent-ils des algorithmes de réseaux sociaux ?
answer: Non. Vos revenus Akeli dépendent des consommations réelles de vos recettes, pas de la viralité de vos posts. Votre catalogue est un actif durable — une recette publiée il y a 6 mois peut toujours générer des revenus aujourd'hui.
audience: prospect_creator
placement: creator_page
category: Modèle
```

```
id: creator-mode-fan-intro
question: C'est quoi le Mode Fan ?
answer: Le Mode Fan permet à vos utilisateurs les plus fidèles de vous dédier leur abonnement complet. Chaque fan vous rapporte 1€/mois garanti, sans condition de consommation. Il est accessible dès que vous atteignez 30 recettes publiées.
audience: prospect_creator
placement: creator_page
category: Mode Fan
link: /help/mode-fan
```

---

## 3. FAQ Créateur Connecté

**Placement :** Dashboard `/dashboard` (aide contextuelle) + Centre d'aide `/help`
**Objectif :** Autonomiser le créateur, réduire les tickets support
**Volume :** Extensif — 6 catégories

---

### 3.1 Mode Fan

```
id: fan-eligibilite
question: Comment devenir éligible au Mode Fan ?
answer: Publiez 30 recettes dans votre catalogue. Une fois ce seuil atteint, votre profil est automatiquement marqué comme éligible et les utilisateurs peuvent vous choisir comme créateur Fan depuis l'app mobile.
audience: creator
placement: dashboard
category: Mode Fan
```

```
id: fan-revenu-garanti
question: Le revenu Fan est-il vraiment garanti chaque mois ?
answer: Oui. Chaque utilisateur actif en Mode Fan vous alloue 1€/mois, quel que soit le nombre de vos recettes qu'il a consommées. Tant qu'il est actif sur Akeli au cours du mois, son 1€ vous est acquis.
audience: creator
placement: dashboard
category: Mode Fan
link: /help/mode-fan
```

```
id: fan-regles-utilisateur
question: Quelles règles s'appliquent aux utilisateurs en Mode Fan ?
answer: Un utilisateur en Mode Fan s'engage à construire 90% de ses repas du mois à partir de votre catalogue. Les 10% restants sont libres. Ce ratio est contrôlé techniquement — l'app bloque automatiquement l'ajout de recettes externes au-delà de 9 recettes différentes d'autres créateurs par mois.
audience: creator
placement: dashboard
category: Mode Fan
link: /help/mode-fan
```

```
id: fan-changement-createur
question: Que se passe-t-il si un fan me quitte pour un autre créateur ?
answer: L'utilisateur peut changer de créateur Fan à tout moment, mais le changement est effectif au premier jour du mois suivant. Vous conservez son 1€ pour le mois en cours, même s'il a initié le changement en milieu de mois.
audience: creator
placement: dashboard
category: Mode Fan
```

```
id: fan-statistiques
question: Où voir le nombre de mes fans actifs ?
answer: Dans votre dashboard, la section "Mode Fan" affiche en temps réel le nombre d'abonnés Fan actifs et les revenus Fan du mois en cours. Cette donnée se distingue clairement des revenus à la consommation standard.
audience: creator
placement: dashboard
category: Mode Fan
```

---

### 3.2 Traduction & Langues

```
id: lang-fonctionnement
question: Comment fonctionne la traduction automatique de mes recettes ?
answer: Lorsque vous publiez une recette en français ou en anglais, Akeli la traduit automatiquement dans 8 langues via IA. Les traductions apparaissent sous votre langue originale dans le formulaire d'édition. Vous pouvez les valider ou les corriger avant que la recette soit visible par les utilisateurs dans ces langues.
audience: creator
placement: dashboard
category: Traduction
link: /help/traduction
```

```
id: lang-correction
question: Puis-je modifier une traduction générée par l'IA ?
answer: Oui. Depuis la page d'édition de chaque recette, vous avez accès à toutes les versions linguistiques — titre, description, ingrédients, étapes. Chaque champ est modifiable individuellement. Vos corrections sont enregistrées et ne seront pas écrasées par une nouvelle génération automatique.
audience: creator
placement: dashboard
category: Traduction
```

```
id: lang-langues-disponibles
question: Quelles langues sont disponibles en V1 ?
answer: Le français et l'anglais sont gérés nativement. Les 6 autres langues (arabe, wolof, swahili, portugais, espagnol, haoussa) sont générées automatiquement par IA. La qualité peut varier selon la langue — c'est pour ça que la correction manuelle est toujours possible.
audience: creator
placement: dashboard
category: Traduction
link: /help/traduction
```

```
id: lang-langue-principale
question: Dois-je rédiger en français ou en anglais ?
answer: Dans la langue que vous maîtrisez le mieux. Akeli traduit depuis votre langue source, qu'elle soit le français ou l'anglais. Écrire dans votre langue naturelle garantit des recettes de meilleure qualité.
audience: creator
placement: dashboard
category: Traduction
```

---

### 3.3 Recettes & Publication

```
id: recipe-temps
question: Combien de temps prend la création d'une recette ?
answer: En moyenne 20 à 30 minutes pour une recette complète via le wizard en 6 étapes. L'auto-save est actif en permanence — vous pouvez interrompre et reprendre à tout moment sans perdre votre travail.
audience: creator
placement: dashboard
category: Recettes
```

```
id: recipe-brouillon
question: Puis-je sauvegarder une recette en brouillon ?
answer: Oui. Chaque recette est sauvegardée automatiquement à chaque étape du wizard. Elle reste en statut "brouillon" jusqu'à ce que vous cliquiez sur "Publier". Les brouillons ne sont pas visibles par les utilisateurs.
audience: creator
placement: dashboard
category: Recettes
```

```
id: recipe-suppression
question: Que se passe-t-il si je supprime une recette ?
answer: La recette disparaît du catalogue et n'est plus accessible aux utilisateurs. Les consommations passées sont conservées et restent comptabilisées dans vos revenus — elles ne sont pas annulées. En revanche, aucune nouvelle consommation ne sera générée après suppression.
audience: creator
placement: dashboard
category: Recettes
```

```
id: recipe-edition-publiee
question: Puis-je modifier une recette déjà publiée ?
answer: Oui. Vous pouvez modifier titre, description, ingrédients, étapes et images à tout moment. La recette reste visible pendant l'édition. Les modifications sont effectives immédiatement après sauvegarde.
audience: creator
placement: dashboard
category: Recettes
```

```
id: recipe-images
question: Quels formats d'images sont acceptés pour les recettes ?
answer: JPG et PNG, jusqu'à 10 Mo par image. Akeli compresse automatiquement les images pour optimiser le chargement. Une image de couverture est obligatoire — les images de galerie sont optionnelles (4 maximum).
audience: creator
placement: dashboard
category: Recettes
```

```
id: recipe-seuil-fan
question: Combien de recettes dois-je publier pour être éligible au Mode Fan ?
answer: 30 recettes publiées. Ce seuil garantit que votre catalogue est suffisamment varié pour qu'un utilisateur construise 90% de ses repas du mois à partir de vos recettes sans répétition excessive.
audience: creator
placement: dashboard
category: Recettes
link: /help/mode-fan
```

---

### 3.4 Revenus & Paiements

```
id: revenue-calcul-detail
question: Comment est calculé exactement mon revenu mensuel ?
answer: Chaque mois, le système comptabilise les consommations de vos recettes sur les 30 derniers jours. Pour chaque tranche complète de 90 consommations, vous recevez 1€. Les consommations non-complètes s'accumulent et s'ajoutent au mois suivant — rien n'est perdu.
audience: creator
placement: dashboard
category: Revenus
link: /help/remuneration
```

```
id: revenue-consommation-definition
question: Qu'est-ce qu'une "consommation" exactement ?
answer: Une consommation est comptabilisée lorsqu'un utilisateur Akeli Premium intègre une de vos recettes dans son plan alimentaire mensuel et la marque comme consommée. Une même recette peut être consommée plusieurs fois par le même utilisateur dans le mois — chaque occurrence compte.
audience: creator
placement: dashboard
category: Revenus
link: /help/remuneration
```

```
id: revenue-paiement-date
question: Quand suis-je payé ?
answer: Les paiements sont effectués le 5 de chaque mois, pour les revenus du mois précédent. Si le 5 tombe un week-end ou jour férié, le paiement est effectué le premier jour ouvré suivant.
audience: creator
placement: dashboard
category: Revenus
```

```
id: revenue-paiement-minimum
question: Y a-t-il un minimum de revenus pour être payé ?
answer: Oui. Le seuil de paiement minimum est de 10€. Si vos revenus du mois sont inférieurs à 10€, ils sont reportés au mois suivant et cumulés jusqu'à atteindre ce seuil.
audience: creator
placement: dashboard
category: Revenus
link: /help/remuneration
```

```
id: revenue-frais
question: Akeli prend-il des frais sur mes revenus ?
answer: Non. Akeli ne prélève aucun frais sur les revenus à la consommation ni sur les revenus Mode Fan. Vous recevez l'intégralité du montant calculé. Votre banque peut appliquer des frais de virement entrant (généralement gratuit pour les virements SEPA en Europe).
audience: creator
placement: dashboard
category: Revenus
link: /help/remuneration
```

```
id: revenue-sources
question: Où voir le détail de mes sources de revenus ?
answer: Dans votre dashboard, la section "Revenus" distingue deux lignes : revenus à la consommation (mode standard) et revenus Fan (abonnés directs). Vous pouvez filtrer par mois et voir le détail par recette pour les revenus à la consommation.
audience: creator
placement: dashboard
category: Revenus
```

---

### 3.5 Stripe & Compte Bancaire

```
id: stripe-pourquoi
question: Pourquoi dois-je configurer un compte Stripe ?
answer: Stripe est le prestataire de paiement utilisé par Akeli pour verser vos revenus. C'est obligatoire pour recevoir des paiements. La configuration prend environ 5 minutes depuis vos paramètres de compte.
audience: creator
placement: dashboard
category: Stripe
link: /help/stripe-setup
```

```
id: stripe-setup
question: Comment configurer mon compte Stripe ?
answer: Depuis "Paramètres → Paiements", cliquez sur "Configurer mon compte de paiement". Vous serez redirigé vers Stripe pour compléter votre profil (identité, IBAN). Une fois validé par Stripe, votre compte est actif et vous recevrez vos paiements automatiquement.
audience: creator
placement: dashboard
category: Stripe
link: /help/stripe-setup
```

```
id: stripe-delai-validation
question: Combien de temps prend la validation Stripe ?
answer: En général, moins de 24 heures pour les vérifications d'identité standard. Stripe peut demander des documents supplémentaires dans certains cas — vous serez notifié par email directement par Stripe.
audience: creator
placement: dashboard
category: Stripe
```

```
id: stripe-pays
question: Depuis quels pays puis-je recevoir des paiements ?
answer: Stripe Connect est disponible dans la plupart des pays européens. Si votre pays n'est pas encore supporté, contactez le support créateurs — nous cherchons des solutions alternatives pour les marchés non couverts.
audience: creator
placement: dashboard
category: Stripe
link: /help/stripe-setup
```

```
id: stripe-modification
question: Puis-je changer mon IBAN ou mon compte bancaire ?
answer: Oui. Depuis "Paramètres → Paiements → Gérer mon compte Stripe", vous pouvez modifier vos informations bancaires à tout moment. Les modifications sont effectives dès le prochain cycle de paiement.
audience: creator
placement: dashboard
category: Stripe
```

---

### 3.6 Support & Contact

```
id: support-contact
question: Comment contacter l'équipe Akeli ?
answer: Depuis votre dashboard, cliquez sur "Support" dans le menu de navigation. Vous pouvez ouvrir une conversation directe avec l'équipe Akeli. Délai de réponse habituel : sous 48 heures ouvrées.
audience: creator
placement: dashboard
category: Support
```

```
id: support-bug
question: Comment signaler un bug ou un problème technique ?
answer: Via le chat support depuis votre dashboard ("Support → Nouveau message"). Décrivez le problème, la page concernée et les étapes pour le reproduire. Une capture d'écran accélère le diagnostic.
audience: creator
placement: dashboard
category: Support
```

```
id: support-compte-suspendu
question: Mon compte a été suspendu — que faire ?
answer: Contactez immédiatement le support via email à creators@akeli.app en indiquant votre nom d'utilisateur. Les suspensions sont toujours motivées par email — vérifiez vos spams si vous n'avez rien reçu.
audience: creator
placement: dashboard
category: Support
```

```
id: support-suppression-compte
question: Comment supprimer mon compte créateur ?
answer: Depuis "Paramètres → Danger Zone → Supprimer mon compte". Cette action est irréversible. Vos recettes seront anonymisées (non supprimées) pour préserver l'expérience des utilisateurs. Les revenus dus jusqu'à la date de suppression seront versés lors du prochain cycle de paiement.
audience: creator
placement: dashboard
category: Support
link: /help/suppression-compte
```

---

## 4. Centre d'aide et ressources liées

**Architecture `/help` — V1**

Le centre d'aide est une surface autonome du website, distincte de la plateforme créateur. Il est accessible depuis :
- Le dashboard créateur (lien "Aide" dans la navigation)
- Les liens `link:` dans les FAQ du dashboard
- Le footer du website

### Pages /help à créer en V1

| URL | Titre | Catégorie | Lié depuis |
|-----|-------|-----------|-----------|
| `/help` | Centre d'aide Akeli | Index | Dashboard, footer |
| `/help/remuneration` | Comment fonctionnent les revenus créateurs | Revenus | FAQ revenus, FAQ prospect |
| `/help/mode-fan` | Le Mode Fan — guide complet | Mode Fan | FAQ mode fan, FAQ prospect |
| `/help/traduction` | Traduction automatique des recettes | Langues | FAQ traduction |
| `/help/stripe-setup` | Configurer votre compte Stripe | Paiements | FAQ Stripe |
| `/help/suppression-compte` | Supprimer votre compte créateur | Compte | FAQ support |

### Ebooks existants — à intégrer comme ressources téléchargeables

| Fichier | Titre affiché | Accessible depuis |
|---------|---------------|-------------------|
| `Guide_de_Rémunération_Créateurs.html` | Guide complet de rémunération créateurs | `/help/remuneration`, Dashboard revenus |
| `ebook-createur-akeli-a4.html` | Guide créateur Akeli — Démarrer et progresser | `/help`, Page bienvenue onboarding |
| `ebook-micro-influenceur-akeli-mobile.html` | Akeli pour micro-influenceurs | `/become-creator`, `/help` |

**Format d'intégration :**
Chaque ebook est accessible en téléchargement PDF ou consultation en ligne depuis la page `/help` correspondante. Un CTA "Télécharger le guide" est présent en bas des pages `/help/remuneration` et `/help/mode-fan`.

### Articles de blog — V2 uniquement

Les articles de blog (SEO, contenu éditorial) sont hors scope V1. Les liens `blog:` dans les FAQ sont en placeholder et seront activés en V2.

---

## 5. Implémentation technique

### Composant FAQ — Accordéon

Les FAQ sont rendues via un composant `FAQAccordion` commun aux trois surfaces.

```typescript
// types/faq.ts

export type FAQAudience = 'user' | 'prospect_creator' | 'creator';
export type FAQPlacement = 'landing' | 'creator_page' | 'dashboard' | 'help_center';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  audience: FAQAudience;
  placement: FAQPlacement;
  category: string;
  link?: string;          // URL interne /help/...
  linkLabel?: string;     // Texte du lien (ex: "En savoir plus")
}
```

```typescript
// components/ui/FAQAccordion.tsx

interface FAQAccordionProps {
  items: FAQItem[];
  showCategories?: boolean;   // true sur dashboard, false sur landing
  expandFirst?: boolean;      // true sur landing page
}
```

### Données FAQ — Source unique

Toutes les FAQ sont définies dans un fichier de données centralisé :

```
/data/faq.ts    // Source unique, exportée et filtrée par audience/placement
```

Chaque surface importe et filtre :

```typescript
// Landing page — utilisateurs uniquement
const userFAQ = faqData.filter(q => q.placement === 'landing');

// Page créateur publique
const creatorProspectFAQ = faqData.filter(q => q.placement === 'creator_page');

// Dashboard créateur connecté
const dashboardFAQ = faqData.filter(q => q.placement === 'dashboard');
```

### Placement par page

| Page | Section FAQ | Composant | Rendu |
|------|-------------|-----------|-------|
| `/` (landing) | Section "Questions fréquentes" avant footer | `FAQAccordion` | SSG |
| `/become-creator` | Section FAQ milieu de page | `FAQAccordion` | SSG |
| `/dashboard` | Panneau latéral "Aide" (drawer) | `FAQAccordion` avec catégories | CSR |
| `/help` | Page index aide | Liste par catégorie | SSG |
| `/help/[slug]` | Page détaillée | Contenu + FAQ contextuelle | SSG |

### SEO — Schema FAQ (landing et page créateur)

Les FAQ des surfaces publiques (landing, `/become-creator`) implémentent le schema `FAQPage` de Schema.org pour l'indexation Google.

```typescript
// Généré automatiquement depuis les données faqData
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": userFAQ.map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }))
};
```

---

## Récapitulatif des volumes

| Section | Audience | Questions | Placement |
|---------|----------|-----------|-----------|
| FAQ Utilisateur | user | 5 | Landing page |
| FAQ Prospect Créateur | prospect_creator | 10 | Page `/become-creator` |
| FAQ Mode Fan | creator | 5 | Dashboard + `/help/mode-fan` |
| FAQ Traduction & Langues | creator | 4 | Dashboard + `/help/traduction` |
| FAQ Recettes & Publication | creator | 6 | Dashboard |
| FAQ Revenus & Paiements | creator | 6 | Dashboard + `/help/remuneration` |
| FAQ Stripe & Compte bancaire | creator | 5 | Dashboard + `/help/stripe-setup` |
| FAQ Support & Contact | creator | 4 | Dashboard |
| **Total** | | **45** | |

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Specs pages landing, `/become-creator`, dashboard |
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Stack, routing, structure projet |
| `AKELI_MODE_FAN.md` | Fonctionnement complet Mode Fan |
| `AKELI_MODELE_CREATEUR.md` | Modèle économique créateur |
| `Guide_de_Rémunération_Créateurs.html` | Ebook rémunération (ressource téléchargeable) |
| `ebook-createur-akeli-a4.html` | Ebook démarrer sur Akeli |
| `ebook-micro-influenceur-akeli-mobile.html` | Ebook micro-influenceurs |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — FAQ Website V1*
