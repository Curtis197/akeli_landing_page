export type FAQAudience = "user" | "prospect_creator" | "creator";
export type FAQPlacement = "landing" | "creator_page" | "dashboard" | "help_center";
export type FAQCategory =
  | "application"
  | "subscription"
  | "content"
  | "howItWorks"
  | "privacy"
  | "revenue"
  | "prerequisites"
  | "editorialFreedom"
  | "languages"
  | "businessModel"
  | "fanMode"
  | "translation"
  | "recipes"
  | "stripe"
  | "support";

export interface FAQItem {
  id: string;
  audience: FAQAudience;
  placement: FAQPlacement;
  category: FAQCategory;
  link?: string;
}
