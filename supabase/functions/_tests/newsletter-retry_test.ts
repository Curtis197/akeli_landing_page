// When Resend answers "too many requests" (429), send-creator-newsletter waits and retries a
// recipient a limited number of times instead of counting the mail as lost straight away. Anything
// else Resend refuses is not retried.
//
// Run from the repo root:
//   deno test --allow-env --allow-net --allow-read supabase/functions/_tests/newsletter-retry_test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { captureConsole, json, loadHandler, stubFetch, type FetchCall } from './harness.ts';

const SERVICE_KEY = 'service-key-test';
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
Deno.env.set('RESEND_API_KEY', 're_test_key');
Deno.env.set('SITE_URL', 'https://a-keli.com');
Deno.env.set('NEWSLETTER_RETRY_DELAY_MS', '1'); // keep the tests instant

const RATE_LIMITED = { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests' };
const INVALID = { statusCode: 422, name: 'validation_error', message: 'invalid recipient' };

type Recipient = { email: string; locale: string; first_name: string | null };
type Step = 'ok' | 'rate_limited' | 'invalid';

/** Each recipient gets its scripted answers from Resend in order; anything unscripted is a success. */
function route(recipients: Recipient[], script: Record<string, Step[]>) {
  const remaining = new Map(Object.entries(script).map(([k, v]) => [k, [...v]]));
  return (call: FetchCall) => {
    if (call.url.includes('/rest/v1/creator')) return json({ display_name: 'Chef' });
    if (call.url.includes('/rest/v1/rpc/get_creator_newsletter_emails')) return json(recipients);
    if (call.url.startsWith('https://api.resend.com/emails')) {
      const { to } = JSON.parse(call.body);
      const step = remaining.get(to)?.shift() ?? 'ok';
      if (step === 'rate_limited') return json(RATE_LIMITED, 429);
      if (step === 'invalid') return json(INVALID, 422);
      return json({ id: `id-${to}` });
    }
    throw new Error(`unexpected fetch: ${call.url}`);
  };
}

async function publish(recipients: Recipient[], script: Record<string, Step[]>) {
  const handler = await loadHandler('send-creator-newsletter');
  const stub = stubFetch(route(recipients, script));
  const errors = captureConsole('error');
  const warnings = captureConsole('warn');
  try {
    const res = await handler(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'recipe',
          old_record: {},
          record: { creator_id: 'creator-1', is_published: true, show_on_website: true, title: 'Tarte', slug: 'tarte' },
        }),
      }),
    );
    const body = await res.json();
    const attempts = (email: string) =>
      stub.calls.filter((c) => c.url.startsWith('https://api.resend.com/emails') && JSON.parse(c.body).to === email).length;
    return { status: res.status, body, attempts, errors: errors.messages, warnings: warnings.messages };
  } finally {
    stub.restore();
    errors.restore();
    warnings.restore();
  }
}

const A: Recipient = { email: 'a@example.com', locale: 'fr', first_name: null };
const B: Recipient = { email: 'b@example.com', locale: 'en', first_name: null };

Deno.test('a mail refused with 429 is retried and counted as sent once it goes through', async () => {
  const r = await publish([A, B], { 'a@example.com': ['rate_limited', 'ok'] });
  assertEquals(r.status, 200);
  assertEquals(r.body.data.sent, 2);
  assertEquals(r.body.data.failed, 0);
  assertEquals(r.attempts('a@example.com'), 2);
  assertEquals(r.attempts('b@example.com'), 1);
  assertEquals(r.errors, []);
  assert(r.warnings.some((m) => m.includes('a@example.com')), 'the retry should be logged as a warning');
});

Deno.test('a recipient that keeps hitting 429 is tried exactly three times, then logged as failed', async () => {
  const r = await publish([A, B], { 'a@example.com': ['rate_limited', 'rate_limited', 'rate_limited', 'ok'] });
  assertEquals(r.body.data.sent, 1);
  assertEquals(r.body.data.failed, 1);
  assertEquals(r.attempts('a@example.com'), 3);
  assertEquals(r.attempts('b@example.com'), 1);
  assert(
    r.errors.some((m) => m.includes('[send-creator-newsletter]') && m.includes('a@example.com')),
    'the exhausted recipient should be logged as an error',
  );
});

Deno.test('errors other than 429 are not retried', async () => {
  const r = await publish([A], { 'a@example.com': ['invalid', 'ok'] });
  assertEquals(r.body.data.sent, 0);
  assertEquals(r.body.data.failed, 1);
  assertEquals(r.attempts('a@example.com'), 1);
});

Deno.test('a mail that goes through first time is sent once, with nothing logged', async () => {
  const r = await publish([A, B], {});
  assertEquals(r.body.data.sent, 2);
  assertEquals(r.body.data.failed, 0);
  assertEquals(r.attempts('a@example.com'), 1);
  assertEquals(r.attempts('b@example.com'), 1);
  assertEquals(r.errors, []);
  assertEquals(r.warnings, []);
});
