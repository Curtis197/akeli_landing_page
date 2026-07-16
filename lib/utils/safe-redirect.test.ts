import { describe, it, expect } from "vitest";
import { sanitizeNextPath } from "./safe-redirect";

describe("sanitizeNextPath", () => {
  it("accepts a same-site relative path", () => {
    expect(sanitizeNextPath("/fr/auth/reset-password")).toBe("/fr/auth/reset-password");
  });

  it("accepts a relative path with a query string", () => {
    expect(sanitizeNextPath("/fr/dashboard?tab=stats")).toBe("/fr/dashboard?tab=stats");
  });

  it("rejects null and empty values", () => {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com/phish")).toBeNull();
    expect(sanitizeNextPath("http://evil.com")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.com/phish")).toBeNull();
  });

  it("rejects backslash protocol-relative URLs", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBeNull();
  });

  it("rejects paths that do not start with a slash", () => {
    expect(sanitizeNextPath("fr/dashboard")).toBeNull();
    expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects paths containing ASCII control characters", () => {
    expect(sanitizeNextPath("/\t/evil.com")).toBeNull();
    expect(sanitizeNextPath("/\n/evil.com")).toBeNull();
    expect(sanitizeNextPath("/\r/evil.com")).toBeNull();
    expect(sanitizeNextPath("/fr/dash board")).toBeNull();
  });
});
