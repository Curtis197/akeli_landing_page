import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'curtiscapre@gmail.com';
const MODERATION_URL = 'https://akeli-admin-dashboard.vercel.app/moderation';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const providedSecret = req.headers.get('x-internal-secret');
    const internalSecret = Deno.env.get('INTERNAL_SECRET');
    if (!internalSecret || providedSecret !== internalSecret) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, nameFr, nameEn, categoryHint, notes, submitterName } = await req.json();

    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ data: null, error: 'Missing required field: name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[send-admin-new-submission-email] RESEND_API_KEY missing, skipping send');
      return new Response(JSON.stringify({ data: { sent: false, warning: 'Resend API key missing' }, error: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    const rows = [
      ['Name', name],
      ['Name (FR)', nameFr],
      ['Name (EN)', nameEn],
      ['Category hint', categoryHint],
      ['Notes', notes],
      ['Submitted by', submitterName],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${label}</td><td>${value}</td></tr>`)
      .join('');

    const html = `
      <h2>New ingredient submission</h2>
      <p>A creator submitted a new ingredient that needs review.</p>
      <table>${rows}</table>
      <p style="margin-top:24px"><a href="${MODERATION_URL}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">Review in moderation queue</a></p>
    `;

    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: ADMIN_EMAIL,
      subject: `🆕 New ingredient submission: "${name}"`,
      html,
    });

    console.log('[send-admin-new-submission-email] sent', { name, at: new Date().toISOString() });

    return new Response(JSON.stringify({ data: { sent: true }, error: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-admin-new-submission-email] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
