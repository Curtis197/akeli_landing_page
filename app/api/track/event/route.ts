import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';
import { isLandingEvent } from '@/lib/tracking/landing-events';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.session_id !== 'string' || body.session_id.length === 0 || !isLandingEvent(body.event)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await (getSupabaseAdmin() as any).from('landing_event').insert({
      session_id: body.session_id,
      event: body.event,
      step: typeof body.step === 'number' ? body.step : null,
      locale: typeof body.locale === 'string' ? body.locale : null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/event]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
