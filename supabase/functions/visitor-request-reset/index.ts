// supabase/functions/visitor-request-reset/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

  const successResponse = new Response(JSON.stringify({ data: { sent: true }, error: null }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { email } = await req.json();
    if (!email) {
      return successResponse; // Always return 200 to prevent email enumeration
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: visitor, error } = await supabase
      .from('visitor')
      .select('id, locale')
      .eq('email', email)
      .maybeSingle();

    if (error || !visitor) {
      return successResponse; // Always return 200 to prevent email enumeration
    }

    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const token_hash = await sha256(rawToken);
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    const { error: insertError } = await supabase.from('visitor_auth_token').insert({
      visitor_id: visitor.id,
      token_hash,
      purpose: 'reset_password',
      expires_at,
    });

    if (insertError) {
      throw insertError;
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';
    const resetUrl = `${siteUrl}/visitor/reset-password?token=${rawToken}&id=${visitor.id}`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'Akeli <no-reply@a-keli.com>',
        to: email,
        subject: visitor.locale === 'fr' ? 'Réinitialiser votre mot de passe' : 'Reset your password',
        html: visitor.locale === 'fr'
          ? `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe. Lien valable 30 minutes.</p>`
          : `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`,
      });
    } else {
      console.warn('RESEND_API_KEY is not configured. Reset password email was not sent. URL:', resetUrl);
    }

    return successResponse;
  } catch (err) {
    console.error('[visitor-request-reset] error:', err);
    return successResponse; // Return 200 even on error to avoid leaking details
  }
});
