import { describe, it, expect } from "vitest";
import { getRequestEligibility } from "./request-eligibility";

describe("getRequestEligibility", () => {
  it("is eligible with a verified identity and no open payout", () => {
    expect(getRequestEligibility({ identityStatus: "verified", hasOpenPayout: false })).toBe("eligible");
  });

  it("needs an identity first", () => {
    expect(getRequestEligibility({ identityStatus: null, hasOpenPayout: false })).toBe("no_identity");
  });

  it("waits for verification of a submitted identity", () => {
    expect(getRequestEligibility({ identityStatus: "submitted", hasOpenPayout: false })).toBe("pending_verification");
  });

  it("blocks a second request while one is open", () => {
    expect(getRequestEligibility({ identityStatus: "verified", hasOpenPayout: true })).toBe("open_request");
  });

  it("reports the open request even when the identity state is not verified", () => {
    expect(getRequestEligibility({ identityStatus: null, hasOpenPayout: true })).toBe("open_request");
    expect(getRequestEligibility({ identityStatus: "submitted", hasOpenPayout: true })).toBe("open_request");
  });
});
