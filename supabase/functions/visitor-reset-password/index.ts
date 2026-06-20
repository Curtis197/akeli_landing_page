// supabase/functions/visitor-reset-password/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, visitor_id, new_password } = await req.json();

    if (!token || !visitor_id || !new_password || new_password.length < 8) {
      return new Response(JSON.stringify({ data: null, error: 'token, visitor_id, and new_password (min 8 chars) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token_hash = await sha256(token);

    const { data: tokenRow, error: tokenError } = await supabase
      .from('visitor_auth_token')
      .select('id, expires_at, used_at')
      .eq('visitor_id', visitor_id)
      .eq('token_hash', token_hash)
      .eq('purpose', 'reset_password')
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid or expired reset token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ data: null, error: 'Token already used' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ data: null, error: 'Token expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash new password and update
    const password_hash = await bcrypt.hash(new_password, 10);

    const [tokenUpdate, visitorUpdate] = await Promise.all([
      supabase.from('visitor_auth_token').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id),
      supabase.from('visitor').update({ password_hash }).eq('id', visitor_id),
    ]);

    if (tokenUpdate.error || visitorUpdate.error) {
      throw new Error(`Failed to reset password: ${tokenUpdate.error?.message || visitorUpdate.error?.message}`);
    }

    return new Response(JSON.stringify({ data: { reset: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-reset-password] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
