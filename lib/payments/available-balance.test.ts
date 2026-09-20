import { describe, it, expect } from "vitest";
import { exceedsAvailableBalance, hasAvailableBalance } from "./available-balance";

describe("hasAvailableBalance", () => {
  it("is true for any positive amount of at least one cent", () => {
    expect(hasAvailableBalance(0.01)).toBe(true);
    expect(hasAvailableBalance(12.5)).toBe(true);
  });

  it("is false for zero, negative and sub-cent balances", () => {
    expect(hasAvailableBalance(0)).toBe(false);
    expect(hasAvailableBalance(-5)).toBe(false);
    expect(hasAvailableBalance(0.004)).toBe(false);
  });

  it("is false for a missing or invalid balance", () => {
    expect(hasAvailableBalance(Number.NaN)).toBe(false);
    expect(hasAvailableBalance(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("exceedsAvailableBalance", () => {
  it("allows amounts up to and including the available balance", () => {
    expect(exceedsAvailableBalance(0.01, 12.5)).toBe(false);
    expect(exceedsAvailableBalance(12, 12.5)).toBe(false);
    expect(exceedsAvailableBalance(12.5, 12.5)).toBe(false);
  });

  it("rejects amounts above the available balance", () => {
    expect(exceedsAvailableBalance(12.51, 12.5)).toBe(true);
    expect(exceedsAvailableBalance(100, 12.5)).toBe(true);
  });

  it("compares in whole cents so floating point noise does not decide the outcome", () => {
    expect(exceedsAvailableBalance(0.3, 0.1 + 0.2)).toBe(false);
    expect(exceedsAvailableBalance(0.1 + 0.2, 0.3)).toBe(false);
    expect(exceedsAvailableBalance(20.1, 20.099999999999998)).toBe(false);
  });

  it("treats a missing or invalid balance as zero", () => {
    expect(exceedsAvailableBalance(1, 0)).toBe(true);
    expect(exceedsAvailableBalance(1, Number.NaN)).toBe(true);
  });
});
