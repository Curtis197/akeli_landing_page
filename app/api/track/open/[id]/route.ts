import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';
import type { ClosePayload } from '@/lib/tracking/types';

const MAX_SESSION_SECONDS = 86_400; // 24 h upper bound

function signSessionId(id: string): string {
  return createHmac('sha256', process.env.TRACKING_CLOSE_SECRET ?? 'dev-secret')
    .update(id)
    .digest('hex');
}

function verifyToken(id: string, token: string): boolean {
  const expected = signSessionId(id);
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: ClosePayload = await request.json();
    const { id } = await params;

    if (!id || !body.closed_at || body.session_duration_seconds === undefined || !body.token) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the per-session HMAC token issued at open time
    if (!verifyToken(id, body.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clamp duration to a sane range
    const duration = Math.max(0, Math.min(Math.round(body.session_duration_seconds), MAX_SESSION_SECONDS));

    await (getSupabaseAdmin() as any)
      .from('recipe_open')
      .update({
        closed_at: body.closed_at,
        session_duration_seconds: duration,
      })
      .eq('id', id)
      .is('closed_at', null); // idempotent — only close once

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/open/close]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
