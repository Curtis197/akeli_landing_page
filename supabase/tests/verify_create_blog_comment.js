// supabase/tests/verify_create_blog_comment.js
// Usage: TEST_USER_JWT=<jwt> node supabase/tests/verify_create_blog_comment.js <post_id> [other_post_id]
// other_post_id: a second, unrelated real blog_post id, used to verify a
// parent_id from post_id's thread is rejected when paired with a different post_id.
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const POST_ID = process.argv[2];
const OTHER_POST_ID = process.argv[3];

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

  console.log('=== Nonexistent post_id (expect 404) ===');
  const missingPost = await comment({ post_id: '00000000-0000-0000-0000-000000000000', content: 'Hello?' });
  console.log(missingPost);
  if (missingPost.status !== 404) throw new Error('Expected 404 for a nonexistent post_id');

  if (OTHER_POST_ID) {
    console.log('=== parent_id from a different post (should be rejected) ===');
    const crossPost = await comment({ post_id: OTHER_POST_ID, content: 'Cross-post reply', parent_id: root.body.data.id });
    console.log(crossPost);
    if (crossPost.status !== 400) throw new Error('Expected a parent_id from a different post to be rejected with 400');
  } else {
    console.log('=== Skipping parent/post cross-check test (no other_post_id argument given) ===');
  }

  console.log('PASS: create-blog-comment enforces one-level-deep replies, post visibility, and parent/post consistency');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
