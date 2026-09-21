// Shared helpers for the Deno tests in this folder. The leading underscore keeps the folder out of
// `supabase functions deploy`.
//
// A function file is loaded with Deno.serve stubbed (to capture its handler) and fetch stubbed
// (to answer PostgREST and Resend calls), so the real handler runs with no network.
import { assert } from 'jsr:@std/assert@1';

export type Handler = (req: Request) => Promise<Response> | Response;

export async function loadHandler(fn: string): Promise<Handler> {
  let handler: Handler | undefined;
  const realServe = Deno.serve;
  Object.defineProperty(Deno, 'serve', {
    value: (h: Handler) => {
      handler = h;
      return {};
    },
    configurable: true,
    writable: true,
  });
  try {
    await import(new URL(`../${fn}/index.ts`, import.meta.url).href + `?t=${crypto.randomUUID()}`);
  } finally {
    Object.defineProperty(Deno, 'serve', { value: realServe, configurable: true, writable: true });
  }
  assert(handler, `${fn} did not register a Deno.serve handler`);
  return handler;
}

export type FetchCall = { url: string; method: string; headers: Headers; body: string };

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Replaces global fetch; every call is recorded and answered by `route`. Call restore() when done. */
export function stubFetch(route: (call: FetchCall) => Response | Promise<Response>) {
  const realFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const asRequest = input instanceof Request ? input : null;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call: FetchCall = {
      url,
      method: (init?.method ?? asRequest?.method ?? 'GET').toUpperCase(),
      headers: new Headers(init?.headers ?? asRequest?.headers),
      body: typeof init?.body === 'string' ? init.body : asRequest ? await asRequest.text() : '',
    };
    calls.push(call);
    return await route(call);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
}

/** Records console.<method> output (joined into one string per call) instead of printing it. */
export function captureConsole(method: 'error' | 'warn' | 'log') {
  const real = console[method];
  const messages: string[] = [];
  console[method] = (...args: unknown[]) => {
    messages.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  return {
    messages,
    restore: () => {
      console[method] = real;
    },
  };
}

export function resendMails(calls: FetchCall[]): { to: string; subject: string; html: string }[] {
  return calls.filter((c) => c.url.startsWith('https://api.resend.com/emails')).map((c) => JSON.parse(c.body));
}
