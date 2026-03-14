import type {
  ImpressionPayload,
  OpenPayload,
  OpenResponse,
  ClosePayload,
} from './types';

// Fire-and-forget — ne throw jamais côté appelant
export async function trackImpression(payload: ImpressionPayload): Promise<void> {
  try {
    await fetch('/api/track/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencieux
  }
}

// Retourne l'id de la session ou null en cas d'erreur
export async function trackOpen(payload: OpenPayload): Promise<string | null> {
  try {
    const res = await fetch('/api/track/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data: OpenResponse = await res.json();
    return data.id;
  } catch {
    return null;
  }
}

// Fire-and-forget — utilisé dans beforeunload / cleanup
export function trackClose(openId: string, openedAt: Date): void {
  const closedAt = new Date();
  const sessionDurationSeconds = Math.round(
    (closedAt.getTime() - openedAt.getTime()) / 1000
  );

  const payload: ClosePayload = {
    closed_at: closedAt.toISOString(),
    session_duration_seconds: sessionDurationSeconds,
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `/api/track/open/${openId}`,
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
  } else {
    fetch(`/api/track/open/${openId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
