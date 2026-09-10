import { Resend } from 'https://esm.sh/resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { email, locale, firstName, ingredientName } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ data: null, error: 'Missing required field: email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!ingredientName || typeof ingredientName !== 'string') {
      return new Response(JSON.stringify({ data: null, error: 'Missing required field: ingredientName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[send-ingredient-approved-email] RESEND_API_KEY missing, skipping send');
      return new Response(JSON.stringify({ data: { sent: false, warning: 'Resend API key missing' }, error: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    const isFr = locale !== 'en';
    const greetingName = firstName ? `, ${firstName}` : '';
    const subject = isFr ? `✅ "${ingredientName}" a été validé` : `✅ "${ingredientName}" has been approved`;

    const html = isFr
      ? `
        <h2>Bonjour${greetingName} !</h2>
        <p>Bonne nouvelle : l'ingrédient que vous avez proposé, <strong>${ingredientName}</strong>, vient d'être validé par l'équipe Akeli.</p>
        <p>Vous pouvez maintenant l'utiliser dans vos recettes et publier celles qui l'attendaient.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">Ouvrez l'application Akeli pour continuer.</p>
      `
      : `
        <h2>Hello${greetingName}!</h2>
        <p>Good news: the ingredient you submitted, <strong>${ingredientName}</strong>, has just been approved by the Akeli team.</p>
        <p>You can now use it in your recipes and publish any that were waiting on it.</p>
        <p style="color:#888;font-size:12px;margin-top:32px">Open the Akeli app to continue.</p>
      `;

    await resend.emails.send({
      from: 'Akeli <no-reply@a-keli.com>',
      to: email,
      subject,
      html,
    });

    console.log('[send-ingredient-approved-email] sent', { email, ingredientName, at: new Date().toISOString() });

    return new Response(JSON.stringify({ data: { sent: true }, error: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-ingredient-approved-email] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
