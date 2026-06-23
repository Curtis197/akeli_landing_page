// supabase/functions/send-creator-newsletter/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';
import { jwtVerify } from 'https://esm.sh/jose';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recipient {
  email: string;
  locale: string;
  first_name: string | null;
}

interface NewsletterPayload {
  creatorId: string;
  rpc: 'get_creator_newsletter_emails' | 'get_creator_fan_emails';
  subjectFr: string;
  subjectEn: string;
  title: string;
  coverUrl: string | null;
  linkUrl: string;
  type: 'recipe' | 'blog';
}

// ── Service Role Verification Helper ──────────────────────────────────────────

async function verifyServiceRole(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();

  // 1. Direct string match with current env service key
  const envServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (envServiceKey && token === envServiceKey.trim()) {
    return true;
  }

  // 2. Decode and verify role claim via JWT signature
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  if (jwtSecret) {
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      return payload.role === 'service_role';
    } catch (err) {
      console.warn('[verifyServiceRole] JWT signature verification failed:', err);
    }
  }

  // Hardcoded legacy service-key fallback removed: that key was leaked and rotated.
  // Trigger/admin calls must present a service_role JWT signed by the current
  // SUPABASE_JWT_SECRET (verified above). No secret is embedded in source.
  return false;
}

// ── Shared send helper ────────────────────────────────────────────────────────

async function sendNewsletter(
  supabase: ReturnType<typeof createClient>,
  resend: Resend | null,
  { creatorId, rpc, subjectFr, subjectEn, title, coverUrl, linkUrl, type }: NewsletterPayload
): Promise<Response> {
  const { data: creator, error: creatorError } = await supabase
    .from('creator')
    .select('display_name')
    .eq('id', creatorId)
    .single();

  if (creatorError) {
    console.error(`[send-creator-newsletter] Error fetching creator ${creatorId}:`, creatorError);
  }
  const creatorName = creator?.display_name ?? 'Votre créateur';

  // Fetch recipients via RPC
  const { data: recipients, error: rpcError } = await supabase.rpc(rpc, { p_creator_id: creatorId });

  if (rpcError) {
    console.error(`[send-creator-newsletter] RPC error for ${rpc}:`, rpcError);
    return new Response(JSON.stringify({ data: null, error: `Recipient fetch failed: ${rpcError.message}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!recipients || recipients.length === 0) {
    console.log(`[send-creator-newsletter] type=${type} creator=${creatorId} has no recipients, skipping`);
    return new Response(JSON.stringify({ data: { sent: 0 }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!resend) {
    console.warn(`[send-creator-newsletter] Resend is not configured. Dry-running for ${recipients.length} recipients.`);
    return new Response(JSON.stringify({ data: { sent: 0, warning: 'Resend API key missing' }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';
  let sentCount = 0;

  for (const recipient of recipients as Recipient[]) {
    const isFr = recipient.locale !== 'en';
    const firstName = recipient.first_name ? `, ${recipient.first_name}` : '';
    const subject = isFr
      ? `${subjectFr} de ${creatorName}`
      : `${subjectEn} from ${creatorName}`;
    const ctaLabel = isFr
      ? (type === 'recipe' ? 'Voir la recette' : "Lire l'article")
      : (type === 'recipe' ? 'View recipe' : 'Read post');

    try {
      await resend.emails.send({
        from: 'Akeli <no-reply@a-keli.com>',
        to: recipient.email,
        subject,
        html: isFr
          ? `
            <h2>Bonjour${firstName} !</h2>
            <p><strong>${creatorName}</strong> vient de publier :</p>
            <h3>${title}</h3>
            ${coverUrl ? `<img src="${coverUrl}" alt="${title}" style="max-width:600px;width:100%;border-radius:12px" />` : ''}
            <p><a href="${linkUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold">${ctaLabel}</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">Vous recevez cet email car vous suivez ${creatorName} sur Akeli. <a href="${siteUrl}/visitor/unsubscribe">Se désabonner</a></p>
          `
          : `
            <h2>Hello${firstName}!</h2>
            <p><strong>${creatorName}</strong> just published:</p>
            <h3>${title}</h3>
            ${coverUrl ? `<img src="${coverUrl}" alt="${title}" style="max-width:600px;width:100%;border-radius:12px" />` : ''}
            <p><a href="${linkUrl}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold">${ctaLabel}</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">You receive this because you follow ${creatorName} on Akeli. <a href="${siteUrl}/visitor/unsubscribe">Unsubscribe</a></p>
          `,
      });
      sentCount++;
    } catch (emailErr) {
      console.error(`[send-creator-newsletter] Failed to send email to ${recipient.email}:`, emailErr);
    }
  }

  console.log(`[send-creator-newsletter] type=${type} creator=${creatorId} sent=${sentCount}`);
  return new Response(JSON.stringify({ data: { sent: sentCount }, error: null }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const isAuthorized = await verifyServiceRole(authHeader);

    if (!isAuthorized) {
      return new Response(JSON.stringify({ data: null, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { table, record, old_record } = payload;

    if (!record) {
      return new Response(JSON.stringify({ data: null, error: 'Webhook payload missing record' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const siteUrl = Deno.env.get('SITE_URL') || 'https://a-keli.com';

    // ── Recipe ───────────────────────────────────────────────────────────────

    if (table === 'recipe') {
      const wasLive = old_record?.is_published && old_record?.show_on_website;
      const isNowLive = record?.is_published && record?.show_on_website;

      if (wasLive || !isNowLive) {
        return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return sendNewsletter(supabase, resend, {
        creatorId: record.creator_id,
        rpc: 'get_creator_newsletter_emails',
        subjectFr: '🍽️ Nouvelle recette',
        subjectEn: '🍽️ New recipe',
        title: record.title,
        coverUrl: record.cover_image_url ?? null,
        linkUrl: `${siteUrl}/recipe/${record.slug}`,
        type: 'recipe',
      });
    }

    // ── Blog post ─────────────────────────────────────────────────────────────

    if (table === 'blog_post') {
      const wasPublished = old_record?.is_published;
      const isNowPublished = record?.is_published;

      if (wasPublished || !isNowPublished) {
        return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch FR title — fallback to first available locale
      const { data: frTranslation } = await supabase
        .from('blog_post_translation')
        .select('title')
        .eq('post_id', record.id)
        .eq('locale', 'fr')
        .maybeSingle();

      let postTitle = frTranslation?.title;
      if (!postTitle) {
        const { data: anyTranslation } = await supabase
          .from('blog_post_translation')
          .select('title')
          .eq('post_id', record.id)
          .limit(1)
          .maybeSingle();
        postTitle = anyTranslation?.title ?? 'Nouvel article';
      }

      const rpc = record.visibility === 'fans'
        ? 'get_creator_fan_emails'
        : 'get_creator_newsletter_emails';

      return sendNewsletter(supabase, resend, {
        creatorId: record.creator_id,
        rpc,
        subjectFr: '✍️ Nouvel article',
        subjectEn: '✍️ New post',
        title: postTitle,
        coverUrl: record.cover_image_url ?? null,
        linkUrl: `${siteUrl}/blog/${record.slug}`,
        type: 'blog',
      });
    }

    return new Response(JSON.stringify({ data: { skipped: true }, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-creator-newsletter] error:', err);
    return new Response(JSON.stringify({ data: null, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
