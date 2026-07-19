import { describe, it, expect } from "vitest";
import { normalizeHandle, normalizeWebsiteUrl, socialLinksSchema } from "@/lib/validations/social-links.schema";

describe("normalizeHandle", () => {
  it("returns a bare handle unchanged", () => {
    expect(normalizeHandle("chef_amina")).toBe("chef_amina");
  });

  it("strips a leading @", () => {
    expect(normalizeHandle("@chef_amina")).toBe("chef_amina");
  });

  it("extracts the handle from a pasted profile URL", () => {
    expect(normalizeHandle("https://instagram.com/chef_amina")).toBe("chef_amina");
  });

  it("extracts the handle from a pasted URL with a trailing slash", () => {
    expect(normalizeHandle("https://instagram.com/chef_amina/")).toBe("chef_amina");
  });

  it("extracts the handle from a www. URL with an @ segment", () => {
    expect(normalizeHandle("https://www.tiktok.com/@chef_amina")).toBe("chef_amina");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeHandle("   ")).toBe("");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("returns an empty string for blank input", () => {
    expect(normalizeWebsiteUrl("  ")).toBe("");
  });

  it("leaves a URL with an existing scheme unchanged", () => {
    expect(normalizeWebsiteUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to a bare domain", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com");
  });
});

describe("socialLinksSchema", () => {
  it("accepts all-empty values", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid handles and a normalized website url", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "chef_amina",
      tiktok_handle: "chef_amina",
      youtube_handle: "ChefAminaCooks",
      website_url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an instagram handle over 30 characters", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "a".repeat(31),
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a youtube handle over 60 characters", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "a".repeat(61),
      website_url: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed website url even after https:// normalization", () => {
    const result = socialLinksSchema.safeParse({
      instagram_handle: "",
      tiktok_handle: "",
      youtube_handle: "",
      website_url: "https://",
    });
    expect(result.success).toBe(false);
  });
});
