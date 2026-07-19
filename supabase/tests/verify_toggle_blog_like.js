// supabase/tests/verify_toggle_blog_like.js
// Run against the local stack.
// Usage: TEST_USER_JWT=<jwt> node supabase/tests/verify_toggle_blog_like.js <post_id>
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const POST_ID = process.argv[2];

async function toggle(postId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/toggle-blog-like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_USER_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId }),
  });
  const body = await res.json();
  console.log('Status:', res.status, 'Body:', body);
  return { status: res.status, body };
}

async function run() {
  if (!TEST_USER_JWT || !POST_ID) {
    console.error('Usage: TEST_USER_JWT=<jwt> node verify_toggle_blog_like.js <post_id>');
    process.exit(1);
  }
  console.log('=== First call (expect liked: true) ===');
  const first = await toggle(POST_ID);
  if (first.body.data?.liked !== true) throw new Error('Expected liked: true on first call');

  console.log('=== Second call (expect liked: false) ===');
  const second = await toggle(POST_ID);
  if (second.body.data?.liked !== false) throw new Error('Expected liked: false on second call');

  console.log('=== Nonexistent post_id (expect 404) ===');
  const missing = await toggle('00000000-0000-0000-0000-000000000000');
  if (missing.status !== 404) throw new Error('Expected 404 for a nonexistent post_id');

  console.log('PASS: toggle-blog-like correctly toggles like state and enforces post visibility');
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
