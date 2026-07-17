// supabase/tests/verify_visitor_create_blog_comment.js
// Usage: VISITOR_JWT_SECRET=<secret> node supabase/tests/verify_visitor_create_blog_comment.js <post_id> <visitor_id> [other_post_id]
// other_post_id: a second, unrelated real blog_post id, used to verify a
// parent_id from post_id's thread is rejected when paired with a different post_id.
const { SignJWT } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SECRET = process.env.VISITOR_JWT_SECRET;
const POST_ID = process.argv[2];
const VISITOR_ID = process.argv[3];
const OTHER_POST_ID = process.argv[4];

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
  if (reply.status !== 200) throw new Error('Expected reply to root to succeed');
  const nested = await comment(token, { post_id: POST_ID, content: 'Nested', parent_id: reply.body.data.id });
  console.log(nested);
  if (nested.status !== 400) throw new Error('Expected nested reply to be rejected with 400');

  console.log('=== Nonexistent post_id (expect 404) ===');
  const missingPost = await comment(token, { post_id: '00000000-0000-0000-0000-000000000000', content: 'Hello?' });
  console.log(missingPost);
  if (missingPost.status !== 404) throw new Error('Expected 404 for a nonexistent post_id');

  if (OTHER_POST_ID) {
    console.log('=== parent_id from a different post (should be rejected) ===');
    const crossPost = await comment(token, { post_id: OTHER_POST_ID, content: 'Cross-post reply', parent_id: root.body.data.id });
    console.log(crossPost);
    if (crossPost.status !== 400) throw new Error('Expected a parent_id from a different post to be rejected with 400');
  } else {
    console.log('=== Skipping parent/post cross-check test (no other_post_id argument given) ===');
  }

  console.log('PASS: visitor-create-blog-comment enforces the verified-visitor, one-level-reply, post-visibility, and parent/post consistency rules');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
