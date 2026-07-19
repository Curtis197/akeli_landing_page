import type { FAQItem } from "@/types/faq";

export const faqData: FAQItem[] = [
  // ─── FAQ Utilisateur (landing) ────────────────────────────────────────────

  { id: "user-disponibilite", audience: "user", placement: "landing", category: "application" },
  { id: "user-prix", audience: "user", placement: "landing", category: "subscription" },
  { id: "user-cuisine", audience: "user", placement: "landing", category: "content" },
  { id: "user-ia", audience: "user", placement: "landing", category: "howItWorks" },
  { id: "user-donnees", audience: "user", placement: "landing", category: "privacy" },

  // ─── FAQ Prospect Créateur (/become-creator) ──────────────────────────────

  {
    id: "creator-revenus-calcul",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "revenue",
    link: "/help/remuneration",
  },
  {
    id: "creator-revenus-realiste",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "revenue",
    link: "/help/remuneration",
  },
  {
    id: "creator-revenus-delai",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "revenue",
  },
  {
    id: "creator-prerequis-abonnes",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "prerequisites",
  },
  {
    id: "creator-prerequis-technique",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "prerequisites",
  },
  {
    id: "creator-prerequis-cuisine",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "prerequisites",
  },
  {
    id: "creator-liberte-contenu",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "editorialFreedom",
  },
  {
    id: "creator-langues",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "languages",
  },
  {
    id: "creator-algorithme",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "businessModel",
  },
  {
    id: "creator-mode-fan-intro",
    audience: "prospect_creator",
    placement: "creator_page",
    category: "fanMode",
    link: "/help/mode-fan",
  },

  // ─── FAQ Créateur Connecté — Mode Fan ────────────────────────────────────

  { id: "fan-eligibilite", audience: "creator", placement: "dashboard", category: "fanMode" },
  {
    id: "fan-revenu-garanti",
    audience: "creator",
    placement: "dashboard",
    category: "fanMode",
    link: "/help/mode-fan",
  },
  {
    id: "fan-regles-utilisateur",
    audience: "creator",
    placement: "dashboard",
    category: "fanMode",
    link: "/help/mode-fan",
  },
  { id: "fan-changement-createur", audience: "creator", placement: "dashboard", category: "fanMode" },
  { id: "fan-statistiques", audience: "creator", placement: "dashboard", category: "fanMode" },

  // ─── FAQ Créateur Connecté — Traduction ──────────────────────────────────

  {
    id: "lang-fonctionnement",
    audience: "creator",
    placement: "dashboard",
    category: "translation",
    link: "/help/traduction",
  },
  { id: "lang-correction", audience: "creator", placement: "dashboard", category: "translation" },
  {
    id: "lang-langues-disponibles",
    audience: "creator",
    placement: "dashboard",
    category: "translation",
    link: "/help/traduction",
  },
  { id: "lang-langue-principale", audience: "creator", placement: "dashboard", category: "translation" },

  // ─── FAQ Créateur Connecté — Recettes ────────────────────────────────────

  { id: "recipe-temps", audience: "creator", placement: "dashboard", category: "recipes" },
  { id: "recipe-brouillon", audience: "creator", placement: "dashboard", category: "recipes" },
  { id: "recipe-suppression", audience: "creator", placement: "dashboard", category: "recipes" },
  { id: "recipe-edition-publiee", audience: "creator", placement: "dashboard", category: "recipes" },
  { id: "recipe-images", audience: "creator", placement: "dashboard", category: "recipes" },
  {
    id: "recipe-seuil-fan",
    audience: "creator",
    placement: "dashboard",
    category: "recipes",
    link: "/help/mode-fan",
  },

  // ─── FAQ Créateur Connecté — Revenus ─────────────────────────────────────

  {
    id: "revenue-calcul-detail",
    audience: "creator",
    placement: "dashboard",
    category: "revenue",
    link: "/help/remuneration",
  },
  {
    id: "revenue-consommation-definition",
    audience: "creator",
    placement: "dashboard",
    category: "revenue",
    link: "/help/remuneration",
  },
  { id: "revenue-paiement-date", audience: "creator", placement: "dashboard", category: "revenue" },
  {
    id: "revenue-paiement-minimum",
    audience: "creator",
    placement: "dashboard",
    category: "revenue",
    link: "/help/remuneration",
  },
  {
    id: "revenue-frais",
    audience: "creator",
    placement: "dashboard",
    category: "revenue",
    link: "/help/remuneration",
  },
  { id: "revenue-sources", audience: "creator", placement: "dashboard", category: "revenue" },

  // ─── FAQ Créateur Connecté — Stripe ──────────────────────────────────────

  {
    id: "stripe-pourquoi",
    audience: "creator",
    placement: "dashboard",
    category: "stripe",
    link: "/help/stripe-setup",
  },
  {
    id: "stripe-setup",
    audience: "creator",
    placement: "dashboard",
    category: "stripe",
    link: "/help/stripe-setup",
  },
  { id: "stripe-delai-validation", audience: "creator", placement: "dashboard", category: "stripe" },
  {
    id: "stripe-pays",
    audience: "creator",
    placement: "dashboard",
    category: "stripe",
    link: "/help/stripe-setup",
  },
  { id: "stripe-modification", audience: "creator", placement: "dashboard", category: "stripe" },

  // ─── FAQ Créateur Connecté — Support ─────────────────────────────────────

  { id: "support-contact", audience: "creator", placement: "dashboard", category: "support" },
  { id: "support-bug", audience: "creator", placement: "dashboard", category: "support" },
  { id: "support-compte-suspendu", audience: "creator", placement: "dashboard", category: "support" },
  {
    id: "support-suppression-compte",
    audience: "creator",
    placement: "dashboard",
    category: "support",
    link: "/help/suppression-compte",
  },
];
