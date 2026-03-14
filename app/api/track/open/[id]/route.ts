import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/tracking/supabase-admin';
import type { ClosePayload } from '@/lib/tracking/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: ClosePayload = await request.json();
    const { id } = await params;

    if (!id || !body.closed_at || body.session_duration_seconds === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await supabaseAdmin
      .from('recipe_open')
      .update({
        closed_at: body.closed_at,
        session_duration_seconds: body.session_duration_seconds,
      })
      .eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/open/close]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
