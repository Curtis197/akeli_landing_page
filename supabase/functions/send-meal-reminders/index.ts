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
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    // Fetch active reminders matching current hour (±5 min)
    const { data: reminders, error: remindersError } = await supabase.from('meal_reminder').select('user_id, meal_type, timezone, reminder_time').eq('is_active', true);
    if (remindersError) throw remindersError;
    let sent = 0;
    for (const reminder of reminders ?? []){
      const [rHour, rMinute] = reminder.reminder_time.split(':').map(Number);
      // Convert user timezone offset (simplified — assumes UTC offset stored)
      const minuteDiff = Math.abs(rHour * 60 + rMinute - (currentHour * 60 + currentMinute));
      if (minuteDiff > 5 && minuteDiff < 1435) continue; // 1440 - 5 for midnight wrap
      const mealLabels = {
        breakfast: 'Petit-déjeuner',
        lunch: 'Déjeuner',
        dinner: 'Dêner',
        snack: 'Collation'
      };
      const mealLabel = mealLabels[reminder.meal_type] ?? reminder.meal_type;
      // Call send-push-notification internally
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({
          user_id: reminder.user_id,
          title: `⏰ ${mealLabel}`,
          body: 'Il est temps de marquer votre repas comme consommé !',
          data: {
            type: 'meal_reminder',
            meal_type: reminder.meal_type
          }
        })
      });
      sent++;
    }
    console.log(`[send-meal-reminders] hour=${currentHour} sent=${sent}`);
    return new Response(JSON.stringify({
      data: {
        sent
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
    console.error('[send-meal-reminders] Error:', err);
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
