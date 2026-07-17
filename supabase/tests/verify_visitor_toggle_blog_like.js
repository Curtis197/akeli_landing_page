// supabase/tests/verify_visitor_toggle_blog_like.js
// Usage: VISITOR_JWT_SECRET=<same secret the local Edge Functions runtime uses> \
//        node supabase/tests/verify_visitor_toggle_blog_like.js <post_id> <visitor_id>
const { SignJWT } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SECRET = process.env.VISITOR_JWT_SECRET;
const POST_ID = process.argv[2];
const VISITOR_ID = process.argv[3];

async function signToken() {
  const secret = new TextEncoder().encode(SECRET);
  return new SignJWT({ visitor_id: VISITOR_ID, email: 'verify@blog.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function toggle(token) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/visitor-toggle-blog-like`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: POST_ID }),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!SECRET || !POST_ID || !VISITOR_ID) {
    console.error('Usage: VISITOR_JWT_SECRET=<secret> node verify_visitor_toggle_blog_like.js <post_id> <visitor_id>');
    process.exit(1);
  }
  const token = await signToken();

  console.log('=== First call (expect liked: true) ===');
  const first = await toggle(token);
  console.log(first);
  if (first.body.data?.liked !== true) throw new Error('Expected liked: true on first call');

  console.log('=== Second call (expect liked: false) ===');
  const second = await toggle(token);
  console.log(second);
  if (second.body.data?.liked !== false) throw new Error('Expected liked: false on second call');

  console.log('PASS: visitor-toggle-blog-like correctly toggles like state for a verified visitor');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
