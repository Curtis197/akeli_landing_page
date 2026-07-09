import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above const declarations — vi.hoisted is required
const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/tracking/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: () => ({ insert: insertMock }) }),
}));

import { POST } from "@/app/api/track/event/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/track/event", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/track/event", () => {
  beforeEach(() => insertMock.mockClear());

  it("rejects unknown event names with 400 and does not insert", async () => {
    const res = await POST(makeRequest({ session_id: "s-1", event: "hack_attempt" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects missing session_id with 400", async () => {
    const res = await POST(makeRequest({ event: "cta_click" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a valid event and returns ok", async () => {
    const res = await POST(
      makeRequest({
        session_id: "s-1",
        event: "wizard_step",
        step: 2,
        locale: "fr",
        metadata: { source: "hero" },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith({
      session_id: "s-1",
      event: "wizard_step",
      step: 2,
      locale: "fr",
      metadata: { source: "hero" },
    });
  });

  it("defaults optional fields to null", async () => {
    await POST(makeRequest({ session_id: "s-2", event: "lead_submitted" }));
    expect(insertMock).toHaveBeenCalledWith({
      session_id: "s-2",
      event: "lead_submitted",
      step: null,
      locale: null,
      metadata: null,
    });
  });
});
