// visitor-signup and visitor-request-reset send mail with Resend. The HTTP answers stay the same
// (201 / always 200, by design), but a refused send must be logged instead of disappearing.
//
// Run from the repo root:
//   deno test --allow-env --allow-net --allow-read supabase/functions/_tests/visitor-resend-errors_test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { captureConsole, json, loadHandler, resendMails, stubFetch, type FetchCall } from './harness.ts';

Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-key-test');
Deno.env.set('RESEND_API_KEY', 're_test_key');
Deno.env.set('SITE_URL', 'https://a-keli.com');

function route(resendRefuses: boolean) {
  return (call: FetchCall) => {
    if (call.url.includes('/rest/v1/visitor_auth_token')) return new Response(null, { status: 201 });
    if (call.url.includes('/rest/v1/visitor')) {
      const wantsObject = (call.headers.get('accept') ?? '').includes('vnd.pgrst.object');
      const row = { id: 'visitor-1', locale: 'fr' };
      if (call.method === 'POST') return json(row, 201);
      return json(wantsObject ? row : [row]);
    }
    if (call.url.startsWith('https://api.resend.com/emails')) {
      return resendRefuses
        ? json({ statusCode: 403, name: 'validation_error', message: 'The a-keli.com domain is not verified' }, 403)
        : json({ id: 'mail-1' });
    }
    throw new Error(`unexpected fetch: ${call.url}`);
  };
}

async function call(fn: string, body: Record<string, unknown>, resendRefuses: boolean) {
  const handler = await loadHandler(fn);
  const stub = stubFetch(route(resendRefuses));
  const errors = captureConsole('error');
  try {
    const res = await handler(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    await res.text();
    return { status: res.status, mails: resendMails(stub.calls), errors: errors.messages };
  } finally {
    stub.restore();
    errors.restore();
  }
}

const SIGNUP = { email: 'new@example.com', password: 'password123', locale: 'fr', first_name: 'Bo' };
const RESET = { email: 'known@example.com' };

Deno.test('visitor-signup logs a refused verification mail but still answers 201', async () => {
  const refused = await call('visitor-signup', SIGNUP, true);
  assertEquals(refused.status, 201);
  assertEquals(refused.mails.length, 1);
  assert(
    refused.errors.some((m) => m.includes('[visitor-signup]') && m.includes('failed to send')),
    `expected a "failed to send" log, got: ${JSON.stringify(refused.errors)}`,
  );
});

Deno.test('visitor-signup logs nothing when the mail is accepted', async () => {
  const ok = await call('visitor-signup', SIGNUP, false);
  assertEquals(ok.status, 201);
  assertEquals(ok.mails.length, 1);
  assertEquals(ok.errors, []);
});

Deno.test('visitor-request-reset logs a refused reset mail but still answers 200', async () => {
  const refused = await call('visitor-request-reset', RESET, true);
  assertEquals(refused.status, 200);
  assertEquals(refused.mails.length, 1);
  assert(
    refused.errors.some((m) => m.includes('[visitor-request-reset]') && m.includes('failed to send')),
    `expected a "failed to send" log, got: ${JSON.stringify(refused.errors)}`,
  );
});

Deno.test('visitor-request-reset logs nothing when the mail is accepted', async () => {
  const ok = await call('visitor-request-reset', RESET, false);
  assertEquals(ok.status, 200);
  assertEquals(ok.mails.length, 1);
  assertEquals(ok.errors, []);
});
