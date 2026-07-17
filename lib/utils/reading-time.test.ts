import { describe, it, expect } from "vitest";
import { computeReadingTimeMin } from "@/lib/utils/reading-time";

describe("computeReadingTimeMin", () => {
  it("returns 1 for empty content", () => {
    expect(computeReadingTimeMin([])).toBe(1);
  });

  it("computes ~200 words per minute, rounded up", () => {
    const text = Array(200).fill("mot").join(" ");
    expect(computeReadingTimeMin([{ type: "paragraph", text }])).toBe(1);
  });

  it("rounds up a partial minute", () => {
    const text = Array(250).fill("mot").join(" "); // 1.25 min
    expect(computeReadingTimeMin([{ type: "paragraph", text }])).toBe(2);
  });

  it("sums text across multiple blocks and ignores blocks without text", () => {
    const blocks = [
      { type: "heading", text: Array(100).fill("mot").join(" ") },
      { type: "divider" },
      { type: "paragraph", text: Array(100).fill("mot").join(" ") },
    ];
    expect(computeReadingTimeMin(blocks)).toBe(1);
  });
});
