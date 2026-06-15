// ============================================================
// Edge Function: weekly-scale-meal-plans
// Schedule: Every Sunday at 22:00 UTC
// Calls scale_meal_plan_entries() for every user with an active meal plan
//
// Deploy: supabase functions deploy weekly-scale-meal-plans
// Schedule via Supabase Dashboard > Edge Functions > Schedules
//   Cron: 0 22 * * 0  (Sunday 22:00 UTC)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Allow manual trigger via authenticated POST
  // and scheduled invocation from Supabase cron
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role — bypasses RLS
      { auth: { persistSession: false } }
    )

    // Step 1: Fetch all users with an active meal plan ending in the future
    const { data: activePlans, error: plansError } = await supabase
      .from('meal_plan')
      .select('user_id')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0])

    if (plansError) {
      console.error('Failed to fetch active meal plans:', plansError)
      return new Response(
        JSON.stringify({ error: plansError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!activePlans || activePlans.length === 0) {
      console.log('No active meal plans found.')
      return new Response(
        JSON.stringify({ message: 'No active meal plans', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Deduplicate user_ids (a user can have multiple meal plans)
    const uniqueUserIds = [...new Set(activePlans.map(p => p.user_id))]
    console.log(`Processing ${uniqueUserIds.length} users...`)

    // Step 2: Call scale_meal_plan_entries for each user
    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const userId of uniqueUserIds) {
      const { error: scaleError } = await supabase.rpc(
        'scale_meal_plan_entries',
        { p_user_id: userId }
      )

      if (scaleError) {
        console.error(`Error scaling for user ${userId}:`, scaleError.message)
        results.errors.push(`${userId}: ${scaleError.message}`)
        results.skipped++
      } else {
        results.processed++
      }
    }

    console.log('Batch scaling complete:', results)

    return new Response(
      JSON.stringify({
        message: 'Weekly scaling complete',
        ...results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
