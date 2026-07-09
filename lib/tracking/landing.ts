"use client";

import type { LandingEventName } from "./landing-events";

const SESSION_KEY = "akeli_lp_session";

// One id per browser session so funnel events can be joined into a path.
export function getLandingSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

// Fire-and-forget: tracking must never break or slow the page.
export function trackLandingEvent(
  event: LandingEventName,
  data?: { step?: number; metadata?: Record<string, string> }
): void {
  try {
    fetch("/api/track/event", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getLandingSessionId(),
        event,
        step: data?.step ?? null,
        locale: typeof document !== "undefined" ? document.documentElement.lang || null : null,
        metadata: data?.metadata ?? null,
      }),
    }).catch(() => {});
  } catch {
    // ignore — never surface tracking failures
  }
}
