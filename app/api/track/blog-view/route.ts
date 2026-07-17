import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.post_id) {
      return NextResponse.json({ error: 'Missing post_id' }, { status: 400 });
    }

    const { error } = await (getSupabaseAdmin() as any).rpc('increment_post_view', {
      p_post_id: body.post_id,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/blog-view]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
