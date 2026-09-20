import { describe, it, expect } from "vitest";
import { parsePayoutRequestAmount } from "./parse-request-amount";

describe("parsePayoutRequestAmount", () => {
  it("accepts whole and decimal amounts", () => {
    expect(parsePayoutRequestAmount("12")).toBe(12);
    expect(parsePayoutRequestAmount("12.5")).toBe(12.5);
    expect(parsePayoutRequestAmount("12.50")).toBe(12.5);
    expect(parsePayoutRequestAmount("0.99")).toBe(0.99);
  });

  it("accepts a French decimal comma and surrounding spaces", () => {
    expect(parsePayoutRequestAmount("12,50")).toBe(12.5);
    expect(parsePayoutRequestAmount("  40 ")).toBe(40);
  });

  it("rejects zero and negative amounts", () => {
    expect(parsePayoutRequestAmount("0")).toBeNull();
    expect(parsePayoutRequestAmount("0.00")).toBeNull();
    expect(parsePayoutRequestAmount("-5")).toBeNull();
  });

  it("rejects more than two decimals", () => {
    expect(parsePayoutRequestAmount("12.505")).toBeNull();
  });

  it("rejects empty, non-numeric and malformed input", () => {
    expect(parsePayoutRequestAmount("")).toBeNull();
    expect(parsePayoutRequestAmount("   ")).toBeNull();
    expect(parsePayoutRequestAmount("abc")).toBeNull();
    expect(parsePayoutRequestAmount("1e3")).toBeNull();
    expect(parsePayoutRequestAmount("12.")).toBeNull();
    expect(parsePayoutRequestAmount("1 000")).toBeNull();
    expect(parsePayoutRequestAmount("12,5,0")).toBeNull();
  });
});
