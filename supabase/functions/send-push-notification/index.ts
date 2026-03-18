import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    // Internal only — service key auth
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({
        data: null,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmKey) return new Response(JSON.stringify({
      data: null,
      error: 'Push notifications not configured yet'
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), serviceKey);
    const { user_id, title, body, data: notifData } = await req.json();
    if (!user_id || !title || !body) return new Response(JSON.stringify({
      data: null,
      error: 'Missing required fields'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Fetch push token
    const { data: tokenRow } = await supabase.from('push_token').select('token').eq('user_id', user_id).maybeSingle();
    if (!tokenRow?.token) {
      console.log(`[send-push-notification] No push token for user ${user_id}`);
      return new Response(JSON.stringify({
        data: {
          sent: false,
          reason: 'No push token'
        },
        error: null
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Send FCM notification
    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmKey}`
      },
      body: JSON.stringify({
        to: tokenRow.token,
        notification: {
          title,
          body
        },
        data: notifData ?? {}
      })
    });
    const fcmResult = await fcmRes.json();
    // Insert in-app notification
    await supabase.from('notification').insert({
      user_id,
      title,
      body,
      data: notifData ?? {},
      created_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      data: {
        sent: true,
        fcm_result: fcmResult
      },
      error: null
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[send-push-notification] Error:', err);
    return new Response(JSON.stringify({
      data: null,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
