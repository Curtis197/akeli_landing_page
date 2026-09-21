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

// ── HTML safety helpers ───────────────────────────────────────────────────────
// Creator-authored text (name, title) and URLs are emailed to every follower, so nothing
// from the database may reach the HTML unescaped.

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only http(s) URLs may be used as a link or image source. URL.href percent-encodes quotes, angle
// brackets and spaces, and escapeHtml covers the rest, so the result is safe inside an attribute.
function safeUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return escapeHtml(url.href);
  } catch {
    return '';
  }
}

// ── Rate-limit retry ──────────────────────────────────────────────────────────
// Resend answers 429 when too many requests arrive inside its one-second window. The window
// clears quickly, so wait and try the same recipient again before giving up on them. Any other
// refusal is final and is not retried.

const MAX_SEND_ATTEMPTS = 3;

function isRateLimited(error: { statusCode?: number | null; name?: string } | null | undefined): boolean {
  return error?.statusCode === 429 || error?.name === 'rate_limit_exceeded';
}

function retryDelayMs(): number {
  const configured = Number(Deno.env.get('NEWSLETTER_RETRY_DELAY_MS') ?? 1000);
  return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
}

async function sendWithRetry(resend: Resend, email: string, message: Parameters<Resend['emails']['send']>[0]) {
  let result = await resend.emails.send(message);
  for (let attempt = 1; attempt < MAX_SEND_ATTEMPTS && isRateLimited(result.error); attempt++) {
    console.warn(
      `[send-creator-newsletter] Resend rate limit hit for ${email}, retrying (attempt ${attempt + 1} of ${MAX_SEND_ATTEMPTS})`,
    );
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs() * attempt));
    result = await resend.emails.send(message);
  }
  return result;
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

  // 2. Scoped trigger JWT signed with VISITOR_JWT_SECRET (DB webhook triggers).
  //    The trigger mints a short-lived { scope: 'newsletter_trigger' } token from Vault;
  //    no service key is hardcoded in source, the DB, or sent over the wire.
  const jwtSecret = Deno.env.get('VISITOR_JWT_SECRET');
  if (jwtSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      if (payload.scope === 'newsletter_trigger') return true;
    } catch (err) {
      console.warn('[verifyServiceRole] trigger JWT verification failed:', err);
    }
  }

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
  let failedCount = 0;
  const safeCreatorName = escapeHtml(creatorName);
  const safeTitle = escapeHtml(title);
  const safeCover = safeUrl(coverUrl);
  const safeLink = safeUrl(linkUrl);

  for (const recipient of recipients as Recipient[]) {
    const isFr = recipient.locale !== 'en';
    const firstName = recipient.first_name ? `, ${escapeHtml(recipient.first_name)}` : '';
    // The subject is plain text, not HTML, so it keeps the raw creator name.
    const subject = isFr
      ? `${subjectFr} de ${creatorName}`
      : `${subjectEn} from ${creatorName}`;
    const ctaLabel = isFr
      ? (type === 'recipe' ? 'Voir la recette' : "Lire l'article")
      : (type === 'recipe' ? 'View recipe' : 'Read post');

    try {
      // resend.emails.send() does not throw when Resend refuses a request: it returns { data, error }.
      const { error: sendError } = await sendWithRetry(resend, recipient.email, {
        from: 'Akeli <no-reply@a-keli.com>',
        to: recipient.email,
        subject,
        html: isFr
          ? `
            <h2>Bonjour${firstName} !</h2>
            <p><strong>${safeCreatorName}</strong> vient de publier :</p>
            <h3>${safeTitle}</h3>
            ${safeCover ? `<img src="${safeCover}" alt="${safeTitle}" style="max-width:600px;width:100%;border-radius:12px" />` : ''}
            <p><a href="${safeLink}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold">${ctaLabel}</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">Vous recevez cet email car vous suivez ${safeCreatorName} sur Akeli. <a href="${siteUrl}/visitor/unsubscribe">Se désabonner</a></p>
          `
          : `
            <h2>Hello${firstName}!</h2>
            <p><strong>${safeCreatorName}</strong> just published:</p>
            <h3>${safeTitle}</h3>
            ${safeCover ? `<img src="${safeCover}" alt="${safeTitle}" style="max-width:600px;width:100%;border-radius:12px" />` : ''}
            <p><a href="${safeLink}" style="background:#e85d26;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold">${ctaLabel}</a></p>
            <p style="color:#888;font-size:12px;margin-top:32px">You receive this because you follow ${safeCreatorName} on Akeli. <a href="${siteUrl}/visitor/unsubscribe">Unsubscribe</a></p>
          `,
      });

      if (sendError) {
        failedCount++;
        console.error(`[send-creator-newsletter] Resend refused the email to ${recipient.email}:`, sendError);
        continue;
      }
      sentCount++;
    } catch (emailErr) {
      failedCount++;
      console.error(`[send-creator-newsletter] Failed to send email to ${recipient.email}:`, emailErr);
    }
  }

  console.log(`[send-creator-newsletter] type=${type} creator=${creatorId} sent=${sentCount} failed=${failedCount}`);
  return new Response(JSON.stringify({ data: { sent: sentCount, failed: failedCount }, error: null }), {
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
        linkUrl: `${siteUrl}/recipe/${encodeURIComponent(record.slug)}`,
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
        linkUrl: `${siteUrl}/creator/${encodeURIComponent(record.creator_id)}/blog/${encodeURIComponent(record.slug)}`,
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
