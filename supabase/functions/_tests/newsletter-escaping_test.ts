// send-creator-newsletter emails creator-authored text to many recipients, so every value that reaches
// the HTML must be escaped, image/link URLs must be plain http(s), and Resend refusals must not be
// counted as sent.
//
// Run from the repo root:
//   deno test --allow-env --allow-net --allow-read supabase/functions/_tests/newsletter-escaping_test.ts
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { captureConsole, json, loadHandler, resendMails, stubFetch, type FetchCall } from './harness.ts';

const SERVICE_KEY = 'service-key-test';
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
Deno.env.set('RESEND_API_KEY', 're_test_key');
Deno.env.set('SITE_URL', 'https://a-keli.com');

const CREATOR_NAME = '<b>Chef</b> & "Co"';

type Recipient = { email: string; locale: string; first_name: string | null };

function route(recipients: Recipient[], refuse: string[] = []) {
  return (call: FetchCall) => {
    if (call.url.includes('/rest/v1/creator')) return json({ display_name: CREATOR_NAME });
    if (call.url.includes('/rest/v1/rpc/get_creator_newsletter_emails')) return json(recipients);
    if (call.url.startsWith('https://api.resend.com/emails')) {
      const { to } = JSON.parse(call.body);
      if (refuse.includes(to)) return json({ statusCode: 422, name: 'validation_error', message: 'invalid recipient' }, 422);
      return json({ id: `id-${to}` });
    }
    throw new Error(`unexpected fetch: ${call.url}`);
  };
}

async function publishRecipe(record: Record<string, unknown>, recipients: Recipient[], refuse: string[] = []) {
  const handler = await loadHandler('send-creator-newsletter');
  const stub = stubFetch(route(recipients, refuse));
  const errors = captureConsole('error');
  try {
    const res = await handler(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'recipe',
          old_record: {},
          record: { creator_id: 'creator-1', is_published: true, show_on_website: true, ...record },
        }),
      }),
    );
    return { res, body: await res.json(), mails: resendMails(stub.calls), errors: errors.messages };
  } finally {
    stub.restore();
    errors.restore();
  }
}

const RECIPIENTS: Recipient[] = [
  { email: 'a@example.com', locale: 'fr', first_name: '<i>Bo</i>' },
  { email: 'b@example.com', locale: 'en', first_name: null },
];

Deno.test('newsletter escapes creator name, title and first name and drops an unsafe cover URL', async () => {
  const { res, mails } = await publishRecipe(
    {
      title: '<script>alert(1)</script> Tarte',
      cover_image_url: 'javascript:alert(1)',
      slug: 'a"b<c',
    },
    RECIPIENTS,
  );
  assertEquals(res.status, 200);
  assertEquals(mails.length, 2);
  for (const { html } of mails) {
    assert(!html.includes('<script'), 'raw <script> reached the html');
    assert(!html.includes('<b>'), 'raw <b> from the creator name reached the html');
    assert(!html.includes('<i>'), 'raw <i> from the first name reached the html');
    assert(!html.includes('<img'), 'an unsafe cover URL must not produce an <img>');
    assert(!html.includes('javascript:'), 'a javascript: URL must never appear');
    assert(!html.includes('a"b'), 'a quote in the slug must not reach the link');
    assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt; Tarte');
    assertStringIncludes(html, '&lt;b&gt;Chef&lt;/b&gt; &amp; &quot;Co&quot;');
    assertStringIncludes(html, '<h3>');
  }
  assertStringIncludes(mails[0].html, '&lt;i&gt;Bo&lt;/i&gt;');
});

Deno.test('newsletter keeps a plain https cover image and escapes its alt text', async () => {
  const { mails } = await publishRecipe(
    { title: 'Tarte "maison"', cover_image_url: 'https://cdn.example.com/c.png', slug: 'tarte' },
    [RECIPIENTS[1]],
  );
  assertStringIncludes(mails[0].html, '<img src="https://cdn.example.com/c.png" alt="Tarte &quot;maison&quot;"');
  assertStringIncludes(mails[0].html, 'https://a-keli.com/recipe/tarte');
});

Deno.test('newsletter cannot be tricked into an attribute injection through the cover URL', async () => {
  const { mails } = await publishRecipe(
    { title: 'T', cover_image_url: 'https://x.example/a.png" onerror="alert(1)', slug: 't' },
    [RECIPIENTS[1]],
  );
  assert(!mails[0].html.includes('" onerror='), 'a quote in the URL must not open a new attribute');
});

Deno.test('newsletter counts only mails Resend accepted and logs the refusals', async () => {
  const { res, body, errors } = await publishRecipe({ title: 'T', slug: 't' }, RECIPIENTS, ['b@example.com']);
  assertEquals(res.status, 200);
  assertEquals(body.data.sent, 1);
  assertEquals(body.data.failed, 1);
  assert(
    errors.some((m) => m.includes('[send-creator-newsletter]') && m.includes('b@example.com')),
    'the refused recipient should be logged',
  );
});
