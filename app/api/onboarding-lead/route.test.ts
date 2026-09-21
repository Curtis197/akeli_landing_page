import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insertMock, sendMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  sendMock: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ insert: insertMock }) }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { POST } from "@/app/api/onboarding-lead/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/onboarding-lead", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const valid = { email: "fan@example.com", calorie_goal: 2000, protein_g: 120, carb_g: 250, fat_g: 70 };

describe("POST /api/onboarding-lead", () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    sendMock.mockReset().mockResolvedValue({ data: { id: "mail-1" }, error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SECRET_KEY = "secret";
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.TESTFLIGHT_PUBLIC_LINK;
    delete process.env.PLAY_OPTIN_LINK;
  });
  afterEach(() => vi.restoreAllMocks());

  it("saves the lead and emails the numbers it stored, not the raw request values", async () => {
    const res = await POST(makeRequest({ ...valid, calorie_goal: "2e3", protein_g: "120.5" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ calorie_goal: 2000, protein_g: 120.5 }));
    const { html, to } = sendMock.mock.calls[0][0];
    expect(to).toBe("fan@example.com");
    expect(html).toContain("2000 kcal");
    expect(html).toContain("120.5g");
    expect(html).not.toContain("2e3");
  });

  it("rejects a non-numeric value before saving or emailing anything", async () => {
    const res = await POST(makeRequest({ ...valid, protein_g: "<b>x</b>" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects infinite and negative values", async () => {
    expect((await POST(makeRequest({ ...valid, calorie_goal: "Infinity" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...valid, carb_g: -5 }))).status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed or markup-laden email address", async () => {
    for (const email of ["not-an-email", "a@b.c<script>", `${"x".repeat(300)}@example.com`, "a b@example.com"]) {
      expect((await POST(makeRequest({ ...valid, email }))).status).toBe(400);
    }
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still requires the original fields", async () => {
    const { calorie_goal: _omit, ...withoutCalories } = valid;
    expect((await POST(makeRequest(withoutCalories))).status).toBe(400);
  });

  it("still answers success when Resend refuses the mail, but logs it", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "domain not verified" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(errorSpy.mock.calls.some((args) => String(args[0]).includes("[onboarding-lead]"))).toBe(true);
  });
});
