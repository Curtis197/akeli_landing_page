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
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), serviceKey);
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    // Fetch all active creators
    const { data: creators, error: creatorsError } = await supabase.from('creator').select('user_id').eq('is_active', true);
    if (creatorsError) throw creatorsError;
    let totalProcessed = 0;
    for (const creator of creators ?? []){
      const creatorId = creator.user_id;
      const monthStart = `${monthKey}-01`;
      const monthEnd = `${prevYear}-${String(prevMonth + 2).padStart(2, '0')}-01`;
      // Count active fan subscriptions for this month
      const { count: fanCount } = await supabase.from('fan_subscription').select('id', {
        count: 'exact',
        head: true
      }).eq('creator_id', creatorId).eq('status', 'active').lte('effective_from', `${monthKey}-01`);
      // Count meal consumptions for this month
      const { count: consumptionCount } = await supabase.from('meal_consumption').select('id', {
        count: 'exact',
        head: true
      }).eq('creator_id', creatorId).gte('consumed_at', monthStart).lt('consumed_at', monthEnd);
      const fanRevenue = (fanCount ?? 0) * 1.0;
      const consumptionRevenue = Math.floor((consumptionCount ?? 0) / 90) * 1.0;
      const totalRevenue = fanRevenue + consumptionRevenue;
      if (totalRevenue > 0) {
        // Insert revenue log
        await supabase.from('creator_revenue_log').insert({
          creator_id: creatorId,
          month_key: monthKey,
          fan_count: fanCount ?? 0,
          consumption_count: consumptionCount ?? 0,
          fan_revenue: fanRevenue,
          consumption_revenue: consumptionRevenue,
          total_revenue: totalRevenue
        });
        // Update balance
        await supabase.rpc('increment_creator_balance', {
          p_creator_id: creatorId,
          p_amount: totalRevenue
        });
        totalProcessed++;
      }
    }
    console.log(`[compute-monthly-revenue] month=${monthKey} creators_processed=${totalProcessed}`);
    return new Response(JSON.stringify({
      data: {
        month_key: monthKey,
        creators_processed: totalProcessed
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
    console.error('[compute-monthly-revenue] Error:', err);
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
