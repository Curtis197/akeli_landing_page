import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSupabaseAdmin } from '@/lib/tracking/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import type { OpenPayload, OpenResponse } from '@/lib/tracking/types';

export async function POST(request: NextRequest) {
  try {
    const body: OpenPayload = await request.json();

    if (!body.recipe_id || !body.source) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await getSupabaseAdmin()
      .from('recipe_open')
      .insert({
        recipe_id: body.recipe_id,
        user_id: user?.id ?? null,
        source: body.source,
        opened_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) throw error;

    return NextResponse.json({ id: data.id } satisfies OpenResponse);
  } catch (error) {
    console.error('[track/open]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
