import { describe, it, expect, vi, beforeEach } from "vitest";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/tracking/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock }),
}));

import { POST } from "@/app/api/track/blog-view/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/track/blog-view", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/track/blog-view", () => {
  beforeEach(() => rpcMock.mockClear());

  it("rejects missing post_id with 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls increment_post_view with the given post_id", async () => {
    const res = await POST(makeRequest({ post_id: "abc-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("increment_post_view", { p_post_id: "abc-123" });
  });

  it("returns 500 when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ error: new Error("db down") });
    const res = await POST(makeRequest({ post_id: "abc-123" }));
    expect(res.status).toBe(500);
  });
});
