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
    if (!authHeader) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({
      data: null,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    // Verify creator
    const { data: creator } = await supabase.from('creator').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!creator) return new Response(JSON.stringify({
      data: null,
      error: 'Creator profile not found'
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'last_3_months';
    const now = new Date();
    let monthsBack = 3;
    if (period === 'last_6_months') monthsBack = 6;
    else if (period === 'year_to_date') monthsBack = now.getMonth() + 1;
    const fromMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const fromMonthKey = `${fromMonth.getFullYear()}-${String(fromMonth.getMonth() + 1).padStart(2, '0')}`;
    // Fetch revenue logs
    const { data: revenueLogs, error: revenueError } = await supabase.from('creator_revenue_log').select('*').eq('creator_id', user.id).gte('month_key', fromMonthKey).order('month_key', {
      ascending: false
    });
    if (revenueError) throw revenueError;
    // Fetch balance
    const { data: balance } = await supabase.from('creator_balance').select('balance, total_earned').eq('creator_id', user.id).maybeSingle();
    // Fetch fan count
    const { count: fanCount } = await supabase.from('fan_subscription').select('id', {
      count: 'exact',
      head: true
    }).eq('creator_id', user.id).eq('status', 'active');
    // Current month live consumption count
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { count: currentMonthConsumptions } = await supabase.from('meal_consumption').select('id', {
      count: 'exact',
      head: true
    }).eq('creator_id', user.id).gte('consumed_at', `${currentMonthKey}-01`);
    return new Response(JSON.stringify({
      data: {
        revenue_logs: revenueLogs,
        balance: balance?.balance ?? 0,
        total_earned: balance?.total_earned ?? 0,
        fan_count: fanCount ?? 0,
        current_month_consumptions: currentMonthConsumptions ?? 0,
        period
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
    console.error('[get-creator-dashboard] Error:', err);
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
