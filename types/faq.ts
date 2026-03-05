export type FAQAudience = "user" | "prospect_creator" | "creator";
export type FAQPlacement = "landing" | "creator_page" | "dashboard" | "help_center";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  audience: FAQAudience;
  placement: FAQPlacement;
  category: string;
  link?: string;
  linkLabel?: string;
}
