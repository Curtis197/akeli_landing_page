// supabase/tests/verify_create_blog_comment.js
// Usage: TEST_USER_JWT=<jwt> node supabase/tests/verify_create_blog_comment.js <post_id>
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const POST_ID = process.argv[2];

async function comment(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-blog-comment`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TEST_USER_JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  if (!TEST_USER_JWT || !POST_ID) {
    console.error('Usage: TEST_USER_JWT=<jwt> node verify_create_blog_comment.js <post_id>');
    process.exit(1);
  }

  console.log('=== Root comment ===');
  const root = await comment({ post_id: POST_ID, content: 'Great post!' });
  console.log(root);
  if (root.status !== 200) throw new Error('Expected root comment to succeed');

  console.log('=== Reply to root ===');
  const reply = await comment({ post_id: POST_ID, content: 'Thanks!', parent_id: root.body.data.id });
  console.log(reply);
  if (reply.status !== 200) throw new Error('Expected reply to succeed');

  console.log('=== Reply to a reply (should be rejected) ===');
  const nested = await comment({ post_id: POST_ID, content: 'Nested', parent_id: reply.body.data.id });
  console.log(nested);
  if (nested.status !== 400) throw new Error('Expected nested reply to be rejected with 400');

  console.log('PASS: create-blog-comment enforces one-level-deep replies');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
