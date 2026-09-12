import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'curtiscapre@gmail.com';

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

    const { recipeId, title, mode, isPublished, creatorName } = await req.json();

    if (!recipeId || typeof recipeId !== 'string') {
      return new Response(JSON.stringify({ data: null, error: 'Missing required field: recipeId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!title || typeof title !== 'string') {
      return new Response(JSON.stringify({ data: null, error: 'Missing required field: title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[send-admin-new-recipe-email] RESEND_API_KEY missing, skipping send');
      return new Response(JSON.stringify({ data: { sent: false, warning: 'Resend API key missing' }, error: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    const recipeUrl = `https://akeli-admin-dashboard.vercel.app/recipes/${recipeId}`;
    const rows = [
      ['Title', title],
      ['Mode', mode],
      ['Status', isPublished ? 'Published' : 'Draft'],
      ['Creator', creatorName],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${label}</td><td>${value}</td></tr>`)
      .join('');

    const html = `
      <h2>New recipe added</h2>
      <p>A creator added a new recipe.</p>
      <table>${rows}</table>
      <p style="margin-top:24px"><a href="${recipeUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">View recipe</a></p>
    `;

    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: ADMIN_EMAIL,
      subject: `🍽️ New recipe added: "${title}"`,
      html,
    });

    console.log('[send-admin-new-recipe-email] sent', { recipeId, title, at: new Date().toISOString() });

    return new Response(JSON.stringify({ data: { sent: true }, error: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-admin-new-recipe-email] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
