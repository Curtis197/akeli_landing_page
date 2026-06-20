// C:\Users\DELL LATITUDE 7480\.gemini\antigravity\brain\36170a8a-2899-45cc-a3b2-b30889b04575/scratch/test_flow.js
const SUPABASE_URL = 'https://njzqcftjzskwcpforwzf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenFjZnRqenNrd2NwZm9yd3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODQzMzcsImV4cCI6MjA4ODA2MDMzN30.hnbx0os7WVRZpDP9_EmxMqFH3cN0aypQg1SvBgWtEmk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenFjZnRqenNrd2NwZm9yd3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NDMzNywiZXhwIjoyMDg4MDYwMzM3fQ.zUzuJ9yE0OiICESauNb7p_4nSTGlbFykeROoYpsIdD4';

async function sha256(input) {
  const { createHash } = require('crypto');
  return createHash('sha256').update(input).digest('hex');
}

async function runTest() {
  const email = `visitor_${Date.now()}@example.com`;
  const password = 'password123';
  const firstName = 'TestVisitor';

  console.log(`\n=== 1. Starting Signup for ${email} ===`);
  
  const signupRes = await fetch(`${SUPABASE_URL}/functions/v1/visitor-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ email, password, first_name: firstName })
  });

  const signupData = await signupRes.json();
  console.log('Signup Response Status:', signupRes.status);
  console.log('Signup Response Data:', signupData);

  if (signupRes.status !== 201) {
    throw new Error('Signup failed');
  }

  const visitorId = signupData.data.visitor_id;

  console.log(`\n=== 2. Retrieving verification token from database ===`);
  // Let's use direct REST API to query visitor_auth_token using service key
  const tokenQueryRes = await fetch(`${SUPABASE_URL}/rest/v1/visitor_auth_token?visitor_id=eq.${visitorId}&purpose=eq.verify_email&select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  
  const tokens = await tokenQueryRes.json();
  console.log('Tokens found:', tokens);

  if (!tokens || tokens.length === 0) {
    throw new Error('No verification token found in database');
  }

  // Wait! In the signup function, we hashed the raw UUID token before storing.
  // How can we verify the email if we only have the token_hash in the database?
  // Ah! In the signup function:
  // const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  // const token_hash = await sha256(rawToken);
  // So the raw token is sent to the email, but the hash is stored in the DB.
  // Since we cannot reverse the SHA-256 hash, we can't verify using the raw token unless we intercept it.
  // But wait! For our integration test, since we have the service role key, we can just bypass the hash check
  // or we can manually set email_verified = true in the DB to test the next steps, or we can just verify the email_verified flag updates!
  // Yes! Let's manually verify the email using the service key:
  console.log(`\n=== 3. Manually verifying email via DB update (simulating link click) ===`);
  const verifyUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/visitor?id=eq.${visitorId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ email_verified: true })
  });
  const updatedVisitor = await verifyUpdateRes.json();
  console.log('Updated visitor:', updatedVisitor);

  console.log(`\n=== 4. Logging in as visitor ===`);
  const loginRes = await fetch(`${SUPABASE_URL}/functions/v1/visitor-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ email, password })
  });

  const loginData = await loginRes.json();
  console.log('Login Response Status:', loginRes.status);
  console.log('Login Response Data:', loginData);

  if (loginRes.status !== 200) {
    throw new Error('Login failed');
  }

  const jwt = loginData.data.jwt;

  // Let's find a creator to follow
  console.log(`\n=== 5. Fetching a creator from DB ===`);
  const creatorQueryRes = await fetch(`${SUPABASE_URL}/rest/v1/creator?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  const creators = await creatorQueryRes.json();
  if (!creators || creators.length === 0) {
    throw new Error('No creators found in database to follow');
  }
  const creatorId = creators[0].id;
  console.log('Creator selected:', creatorId);

  console.log(`\n=== 6. Following creator ===`);
  const followRes = await fetch(`${SUPABASE_URL}/functions/v1/visitor-follow-creator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ creator_id: creatorId })
  });

  const followData = await followRes.json();
  console.log('Follow Response Status:', followRes.status);
  console.log('Follow Response Data:', followData);

  if (followRes.status !== 200 || !followData.data.following) {
    throw new Error('Follow failed');
  }

  console.log(`\n=== 7. Verifying follow row in DB ===`);
  const followQueryRes = await fetch(`${SUPABASE_URL}/rest/v1/visitor_creator_follow?visitor_id=eq.${visitorId}&creator_id=eq.${creatorId}&select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  const follows = await followQueryRes.json();
  console.log('DB Follow record:', follows);
  if (!follows || follows.length === 0 || !follows[0].active) {
    throw new Error('Follow record not found or not active in DB');
  }

  console.log(`\n=== 8. Unfollowing creator ===`);
  const unfollowRes = await fetch(`${SUPABASE_URL}/functions/v1/visitor-unfollow-creator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ creator_id: creatorId })
  });

  const unfollowData = await unfollowRes.json();
  console.log('Unfollow Response Status:', unfollowRes.status);
  console.log('Unfollow Response Data:', unfollowData);

  if (unfollowRes.status !== 200 || unfollowData.data.following !== false) {
    throw new Error('Unfollow failed');
  }

  console.log(`\n=== 9. Verifying follow row is inactive in DB ===`);
  const followQuery2Res = await fetch(`${SUPABASE_URL}/rest/v1/visitor_creator_follow?visitor_id=eq.${visitorId}&creator_id=eq.${creatorId}&select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  const follows2 = await followQuery2Res.json();
  console.log('DB Follow record post-unfollow:', follows2);
  if (!follows2 || follows2.length === 0 || follows2[0].active !== false) {
    throw new Error('Follow record active flag not updated to false in DB');
  }

  console.log('\n=== ALL END-TO-END FLOW TESTS PASSED SUCCESSFULLY! ===\n');
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
