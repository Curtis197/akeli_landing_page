// Whitelist of landing-page funnel events. `wizard_step` = step COMPLETED (user
// validated the step), not step viewed — keeps the funnel counts meaningful.
export const LANDING_EVENTS = [
  "cta_click",
  "wizard_step",
  "wizard_results",
  "lead_submitted",
] as const;

export type LandingEventName = (typeof LANDING_EVENTS)[number];

export function isLandingEvent(value: unknown): value is LandingEventName {
  return typeof value === "string" && (LANDING_EVENTS as readonly string[]).includes(value);
}
