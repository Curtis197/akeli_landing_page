// supabase/tests/verify_visitor_create_blog_comment.js
// Usage: VISITOR_JWT_SECRET=<secret> node supabase/tests/verify_visitor_create_blog_comment.js <post_id> <visitor_id>
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

async function comment(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/visitor-create-blog-comment`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!SECRET || !POST_ID || !VISITOR_ID) {
    console.error('Usage: VISITOR_JWT_SECRET=<secret> node verify_visitor_create_blog_comment.js <post_id> <visitor_id>');
    process.exit(1);
  }
  const token = await signToken();

  console.log('=== Root comment ===');
  const root = await comment(token, { post_id: POST_ID, content: 'Visitor says hi!' });
  console.log(root);
  if (root.status !== 200) throw new Error('Expected root comment to succeed');

  console.log('=== Reply to a reply (should be rejected) ===');
  const reply = await comment(token, { post_id: POST_ID, content: 'Reply', parent_id: root.body.data.id });
  const nested = await comment(token, { post_id: POST_ID, content: 'Nested', parent_id: reply.body.data.id });
  console.log(nested);
  if (nested.status !== 400) throw new Error('Expected nested reply to be rejected with 400');

  console.log('PASS: visitor-create-blog-comment enforces the verified-visitor + one-level-reply rules');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
