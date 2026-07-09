import { describe, it, expect } from "vitest";
import { LANDING_EVENTS, isLandingEvent } from "@/lib/tracking/landing-events";

describe("landing event whitelist", () => {
  it("contains exactly the four funnel events", () => {
    expect([...LANDING_EVENTS].sort()).toEqual(
      ["cta_click", "lead_submitted", "wizard_results", "wizard_step"]
    );
  });

  it("accepts whitelisted event names", () => {
    expect(isLandingEvent("cta_click")).toBe(true);
    expect(isLandingEvent("wizard_step")).toBe(true);
    expect(isLandingEvent("wizard_results")).toBe(true);
    expect(isLandingEvent("lead_submitted")).toBe(true);
  });

  it("rejects unknown events and non-strings", () => {
    expect(isLandingEvent("drop table")).toBe(false);
    expect(isLandingEvent("")).toBe(false);
    expect(isLandingEvent(42)).toBe(false);
    expect(isLandingEvent(null)).toBe(false);
    expect(isLandingEvent(undefined)).toBe(false);
  });
});
