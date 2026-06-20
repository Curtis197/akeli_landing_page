// supabase/functions/visitor-signup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs';
import { Resend } from 'https://esm.sh/resend';

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
    const { email, password, locale = 'fr', first_name } = await req.json();

    if (!email || !password || typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ data: null, error: 'Email and password (min 8 chars) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10); // Use 10 rounds for performance in serverless context

    const { data: visitor, error } = await supabase
      .from('visitor')
      .insert({ email, password_hash, locale, first_name: first_name ?? null })
      .select('id')
      .single();

    if (error) {
      // Trigger raised by check_visitor_email_not_akeli
      if (error.message?.includes('email_belongs_to_akeli_user')) {
        return new Response(JSON.stringify({ data: null, error: 'This email belongs to an Akeli account. Please log in via the app.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Unique violation — visitor email already exists
      if (error.code === '23505') {
        return new Response(JSON.stringify({ data: null, error: 'Email already registered.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Generate email verification token
    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const token_hash = await sha256(rawToken);
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    await supabase.from('visitor_auth_token').insert({
      visitor_id: visitor.id,
      token_hash,
      purpose: 'verify_email',
      expires_at,
    });

    const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';
    const verifyUrl = `${siteUrl}/visitor/verify-email?token=${rawToken}&id=${visitor.id}`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'Akeli <no-reply@a-keli.com>',
        to: email,
        subject: locale === 'fr' ? 'Vérifiez votre adresse email' : 'Verify your email address',
        html: locale === 'fr'
          ? `<p>Cliquez <a href="${verifyUrl}">ici</a> pour vérifier votre email. Lien valable 24h.</p>`
          : `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24h.</p>`,
      });
    } else {
      console.warn('RESEND_API_KEY is not configured. Verification email was not sent. URL:', verifyUrl);
    }

    return new Response(JSON.stringify({ data: { visitor_id: visitor.id }, error: null }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[visitor-signup] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
