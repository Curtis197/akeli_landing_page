import { describe, it, expect } from "vitest";
import { renderInlineMarkdown } from "@/lib/utils/render-inline-markdown";

function textOf(nodes: React.ReactNode[]): string {
  return nodes
    .map((n) => (typeof n === "string" ? n : (n as any).props.children))
    .join("");
}

describe("renderInlineMarkdown", () => {
  it("returns plain text unchanged when there is no markdown", () => {
    const result = renderInlineMarkdown("Hello world");
    expect(result).toEqual(["Hello world"]);
  });

  it("renders **bold** as a strong element", () => {
    const result = renderInlineMarkdown("This is **important** text");
    expect(result.length).toBe(3);
    expect((result[1] as any).type).toBe("strong");
    expect((result[1] as any).props.children).toBe("important");
  });

  it("renders *italic* as an em element", () => {
    const result = renderInlineMarkdown("This is *emphasized* text");
    expect((result[1] as any).type).toBe("em");
    expect((result[1] as any).props.children).toBe("emphasized");
  });

  it("handles multiple markers in one string", () => {
    const result = textOf(renderInlineMarkdown("**Bold** and *italic* together"));
    expect(result).toBe("Bold and italic together");
  });

  it("leaves an unterminated marker as literal text", () => {
    const result = renderInlineMarkdown("This has **no closing marker");
    expect(result).toEqual(["This has **no closing marker"]);
  });
});
