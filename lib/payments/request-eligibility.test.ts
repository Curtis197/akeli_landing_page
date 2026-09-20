import { describe, it, expect } from "vitest";
import { getRequestEligibility } from "./request-eligibility";

const ready = { identityStatus: "verified" as const, hasOpenPayout: false, availableBalance: 50 };

describe("getRequestEligibility", () => {
  it("is eligible with a verified identity, no open payout and a positive balance", () => {
    expect(getRequestEligibility(ready)).toBe("eligible");
  });

  it("needs an identity first", () => {
    expect(getRequestEligibility({ ...ready, identityStatus: null })).toBe("no_identity");
  });

  it("waits for verification of a submitted identity", () => {
    expect(getRequestEligibility({ ...ready, identityStatus: "submitted" })).toBe("pending_verification");
  });

  it("blocks a second request while one is open", () => {
    expect(getRequestEligibility({ ...ready, hasOpenPayout: true })).toBe("open_request");
  });

  it("reports the open request even when the identity state is not verified", () => {
    expect(getRequestEligibility({ ...ready, identityStatus: null, hasOpenPayout: true })).toBe("open_request");
    expect(getRequestEligibility({ ...ready, identityStatus: "submitted", hasOpenPayout: true })).toBe("open_request");
  });

  it("has nothing to request without an available balance", () => {
    expect(getRequestEligibility({ ...ready, availableBalance: 0 })).toBe("no_balance");
    expect(getRequestEligibility({ ...ready, availableBalance: -3 })).toBe("no_balance");
    expect(getRequestEligibility({ ...ready, availableBalance: Number.NaN })).toBe("no_balance");
  });

  it("reports identity problems before a missing balance", () => {
    expect(getRequestEligibility({ ...ready, identityStatus: null, availableBalance: 0 })).toBe("no_identity");
    expect(getRequestEligibility({ ...ready, identityStatus: "submitted", availableBalance: 0 })).toBe(
      "pending_verification"
    );
  });

  it("reports an open request before a missing balance", () => {
    expect(getRequestEligibility({ ...ready, hasOpenPayout: true, availableBalance: 0 })).toBe("open_request");
  });
});
