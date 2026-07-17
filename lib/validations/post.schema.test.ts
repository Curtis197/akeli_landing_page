import { describe, it, expect } from "vitest";
import {
  postBlockSchema,
  postContentSchema,
  postSettingsSchema,
  CATEGORY_OPTIONS,
} from "@/lib/validations/post.schema";

describe("postBlockSchema", () => {
  it("accepts a paragraph block", () => {
    const result = postBlockSchema.safeParse({ id: "a", type: "paragraph", text: "Hello" });
    expect(result.success).toBe(true);
  });

  it("accepts a heading block with level 2 or 3", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "heading", level: 2, text: "T" }).success).toBe(true);
    expect(postBlockSchema.safeParse({ id: "a", type: "heading", level: 4, text: "T" }).success).toBe(false);
  });

  it("accepts a divider block with no other fields", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "divider" }).success).toBe(true);
  });

  it("accepts a recipe_embed block", () => {
    const result = postBlockSchema.safeParse({
      id: "a",
      type: "recipe_embed",
      recipe_id: "uuid-1",
      recipe_title: "Poulet DG",
      recipe_image_url: "https://example.test/img.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown block type", () => {
    expect(postBlockSchema.safeParse({ id: "a", type: "table", text: "x" }).success).toBe(false);
  });
});

describe("postContentSchema", () => {
  it("requires a title of at least 3 characters", () => {
    expect(postContentSchema.safeParse({ title: "ab", language: "fr", blocks: [] }).success).toBe(false);
    expect(postContentSchema.safeParse({ title: "abc", language: "fr", blocks: [] }).success).toBe(true);
  });

  it("restricts language to fr or en", () => {
    expect(postContentSchema.safeParse({ title: "Titre valide", language: "de", blocks: [] }).success).toBe(false);
  });
});

describe("postSettingsSchema", () => {
  it("accepts a valid category", () => {
    expect(postSettingsSchema.safeParse({
      category: "technique", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(true);
  });

  it("rejects an invalid category", () => {
    expect(postSettingsSchema.safeParse({
      category: "not-real", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(false);
  });

  it("caps tags at 8", () => {
    const tags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    expect(postSettingsSchema.safeParse({
      category: "recette", tags, excerpt: "", seo_title: "", seo_description: "", visibility: "public",
    }).success).toBe(false);
  });

  it("restricts visibility to public, followers, or fans", () => {
    expect(postSettingsSchema.safeParse({
      category: "recette", tags: [], excerpt: "", seo_title: "", seo_description: "", visibility: "premium",
    }).success).toBe(false);
  });
});

describe("CATEGORY_OPTIONS", () => {
  it("has exactly the 6 DB-approved values", () => {
    expect(CATEGORY_OPTIONS.map((c) => c.value).sort()).toEqual(
      ["actualite", "culture", "ingredients", "parcours", "recette", "technique"].sort()
    );
  });
});
