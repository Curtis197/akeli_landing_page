import { describe, it, expect } from "vitest";
import { formatQuantity } from "./recipe-formatter";

describe("formatQuantity", () => {
  it("handles null, undefined, and zero values", () => {
    expect(formatQuantity(null, "g")).toBe("");
    expect(formatQuantity(0, "g")).toBe("");
  });

  it("formats non-countable units correctly", () => {
    expect(formatQuantity(100, "g")).toBe("100 g");
    expect(formatQuantity(100.5, "g")).toBe("100.5 g");
    expect(formatQuantity(5.25, "ml")).toBe("5.3 ml");
  });

  it("translates and pluralizes countable units correctly", () => {
    expect(formatQuantity(1, "clove")).toBe("1 gousse");
    expect(formatQuantity(2, "clove")).toBe("2 gousses");
    expect(formatQuantity(1, "bunch")).toBe("1 botte");
    expect(formatQuantity(3, "bunch")).toBe("3 bottes");
    expect(formatQuantity(1, "pinch")).toBe("1 pincée");
    expect(formatQuantity(2, "pinch")).toBe("2 pincées");
  });

  it("handles empty unit names for units like 'piece' or 'unit'", () => {
    expect(formatQuantity(1, "piece")).toBe("1");
    expect(formatQuantity(5, "unit")).toBe("5");
  });

  it("handles fractions correctly for countable units", () => {
    expect(formatQuantity(0.5, "tsp")).toBe("1/2 c.à.c");
    expect(formatQuantity(1.25, "tbsp")).toBe("1 1/4 c.à.s");
    expect(formatQuantity(0.333, "pinch")).toBe("1/3 pincée");
    expect(formatQuantity(2.75, "clove")).toBe("2 3/4 gousses");
  });
});
