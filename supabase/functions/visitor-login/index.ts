// supabase/functions/visitor-login/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';
import { signVisitorJWT } from '../_shared/visitor-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ data: null, error: 'Email and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitor, error } = await supabase
      .from('visitor')
      .select('id, email, password_hash, email_verified')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Use constant-time comparison by always calling bcrypt.compare to prevent timing attacks
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyDummyHashForTimingAttackPrevention';
    const validPassword = visitor
      ? await bcrypt.compare(password, visitor.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!visitor || !validPassword) {
      return new Response(JSON.stringify({ data: null, error: 'Invalid email or password' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visitor.email_verified) {
      return new Response(JSON.stringify({ data: null, error: 'Please verify your email before logging in' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = await signVisitorJWT(visitor.id, visitor.email);

    return new Response(JSON.stringify({ data: { jwt, visitor_id: visitor.id }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-login] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
