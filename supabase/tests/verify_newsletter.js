// supabase/tests/verify_newsletter.js
const SUPABASE_URL = 'https://njzqcftjzskwcpforwzf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenFjZnRqenNrd2NwZm9yd3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NDMzNywiZXhwIjoyMDg4MDYwMzM3fQ.zUzuJ9yE0OiICESauNb7p_4nSTGlbFykeROoYpsIdD4';

const CREATOR_ID = '1a1b225a-1328-4d58-976f-253574410c6f'; // Existing creator

async function runVerification() {
  const visitorFollowerEmail = `follower_${Date.now()}@example.com`;
  const visitorFanEmail = `fan_${Date.now()}@example.com`;
  let visitorFollowerId, visitorFanId;

  console.log('=== 1. Creating test fixtures in DB ===');
  
  // Insert verified visitor follower
  const res1 = await fetch(`${SUPABASE_URL}/rest/v1/visitor`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ email: visitorFollowerEmail, email_verified: true, password_hash: 'dummy' })
  });
  const v1 = await res1.json();
  visitorFollowerId = v1[0].id;
  console.log('Created follower visitor:', visitorFollowerId);

  // Insert verified visitor paying fan
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/visitor`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ email: visitorFanEmail, email_verified: true, password_hash: 'dummy' })
  });
  const v2 = await res2.json();
  visitorFanId = v2[0].id;
  console.log('Created fan visitor:', visitorFanId);

  // Follow creator
  await fetch(`${SUPABASE_URL}/rest/v1/visitor_creator_follow`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ visitor_id: visitorFollowerId, creator_id: CREATOR_ID, active: true })
  });
  console.log('Visitor Follower followed Creator');

  // Subscribe to creator (paying fan)
  await fetch(`${SUPABASE_URL}/rest/v1/visitor_fan_subscription`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ visitor_id: visitorFanId, creator_id: CREATOR_ID, status: 'active' })
  });
  console.log('Visitor Fan subscribed to Creator');

  // Follow creator too so fan is also a follower
  await fetch(`${SUPABASE_URL}/rest/v1/visitor_creator_follow`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ visitor_id: visitorFanId, creator_id: CREATOR_ID, active: true })
  });
  console.log('Visitor Fan also followed Creator');

  // ─── Verification 1: Recipe publish webhook ───
  console.log('\n=== 2. Testing Recipe Newsletter webhook payload ===');
  const recipePayload = {
    table: 'recipe',
    record: {
      id: '00000000-0000-0000-0000-000000000001',
      creator_id: CREATOR_ID,
      title: 'Thiéboudienne Authentique',
      slug: 'thieboudienne-authentique',
      cover_image_url: 'https://example.com/thieb.jpg',
      is_published: true,
      show_on_website: true
    },
    old_record: {
      is_published: false,
      show_on_website: false
    }
  };

  const recipeWebhookRes = await fetch(`${SUPABASE_URL}/functions/v1/send-creator-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(recipePayload)
  });
  const recipeWebhookData = await recipeWebhookRes.json();
  console.log('Recipe Webhook Status:', recipeWebhookRes.status);
  console.log('Recipe Webhook Data:', recipeWebhookData);

  // ─── Verification 2: Recipe already published (should skip) ───
  console.log('\n=== 3. Testing Recipe newsletter skip (no transition) ===');
  const recipeSkipPayload = {
    ...recipePayload,
    old_record: { is_published: true, show_on_website: true }
  };
  const recipeSkipRes = await fetch(`${SUPABASE_URL}/functions/v1/send-creator-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(recipeSkipPayload)
  });
  const recipeSkipData = await recipeSkipRes.json();
  console.log('Recipe Skip Status:', recipeSkipRes.status);
  console.log('Recipe Skip Data:', recipeSkipData);

  // ─── Verification 3: Blog Post public publish webhook ───
  console.log('\n=== 4. Testing Public Blog Post Newsletter webhook ===');
  const publicBlogPayload = {
    table: 'blog_post',
    record: {
      id: '00000000-0000-0000-0000-000000000002',
      creator_id: CREATOR_ID,
      slug: 'my-first-post',
      visibility: 'public',
      is_published: true
    },
    old_record: {
      is_published: false
    }
  };

  const publicBlogRes = await fetch(`${SUPABASE_URL}/functions/v1/send-creator-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(publicBlogPayload)
  });
  const publicBlogData = await publicBlogRes.json();
  console.log('Public Blog Status:', publicBlogRes.status);
  console.log('Public Blog Data:', publicBlogData);

  // ─── Verification 4: Blog Post fans-only publish webhook ───
  console.log('\n=== 5. Testing Fans-only Blog Post Newsletter webhook ===');
  const fansBlogPayload = {
    table: 'blog_post',
    record: {
      id: '00000000-0000-0000-0000-000000000003',
      creator_id: CREATOR_ID,
      slug: 'secret-recipe-post',
      visibility: 'fans',
      is_published: true
    },
    old_record: {
      is_published: false
    }
  };

  const fansBlogRes = await fetch(`${SUPABASE_URL}/functions/v1/send-creator-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify(fansBlogPayload)
  });
  const fansBlogData = await fansBlogRes.json();
  console.log('Fans Blog Status:', fansBlogRes.status);
  console.log('Fans Blog Data:', fansBlogData);

  // ─── Clean up fixtures ───
  console.log('\n=== 6. Cleaning up database fixtures ===');
  await fetch(`${SUPABASE_URL}/rest/v1/visitor?id=in.(${visitorFollowerId},${visitorFanId})`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  console.log('DB Clean up completed');
}

runVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
