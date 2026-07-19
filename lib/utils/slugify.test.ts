import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("lowercases and hyphenates a simple title", () => {
    expect(slugify("Mon Article de Blog", "abc123def")).toBe("mon-article-de-blog-abc123");
  });

  it("strips accents", () => {
    expect(slugify("Le Café Préféré", "xyz789abc")).toBe("le-cafe-prefere-xyz789");
  });

  it("strips punctuation", () => {
    expect(slugify("Qu'est-ce que c'est ?!", "111222333")).toBe("quest-ce-que-cest-111222");
  });

  it("collapses multiple spaces into one hyphen", () => {
    expect(slugify("Trop    d'espaces", "aaabbbccc")).toBe("trop-despaces-aaabbb");
  });

  it("always appends only the first 6 characters of the id", () => {
    expect(slugify("Titre", "0123456789abcdef")).toBe("titre-012345");
  });
});
