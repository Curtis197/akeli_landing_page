import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insertMock, maybeSingleMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ in: () => ({ maybeSingle: maybeSingleMock }) }) }),
      insert: insertMock,
    }),
  }),
}));

import { POST } from "@/app/api/beta-signup/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/beta-signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/beta-signup", () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    maybeSingleMock.mockReset().mockResolvedValue({ data: null, error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SECRET_KEY = "secret";
  });
  afterEach(() => vi.restoreAllMocks());

  it("saves a valid signup, normalizing the email", async () => {
    const res = await POST(makeRequest({ email: "Tester@Example.com", platform: "ios" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith({ email: "tester@example.com", platform: "ios", status: "pending" });
  });

  it("rejects a malformed email", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", platform: "ios" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid platform", async () => {
    const res = await POST(makeRequest({ email: "tester@example.com", platform: "windows" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_platform" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("refuses a second signup while one is already pending or confirmed", async () => {
    maybeSingleMock.mockResolvedValue({ data: { id: "existing-id" }, error: null });
    const res = await POST(makeRequest({ email: "tester@example.com", platform: "android" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_signed_up" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns a server error when the insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "boom" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ email: "tester@example.com", platform: "ios" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server_error" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
