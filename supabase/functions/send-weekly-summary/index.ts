import { createClient } from 'npm:@supabase/supabase-js@2'
import { format, subDays, startOfWeek, endOfWeek } from 'npm:date-fns@3.6.0'
import { pt } from 'npm:date-fns@3.6.0/locale'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedSecret = req.headers.get('x-cron-secret')
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const weekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 })
    const weekLabel = `${format(weekStart, 'dd/MM')} – ${format(weekEnd, 'dd/MM/yyyy')}`

    // Get all workspaces
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name')

    let emailsSent = 0

    for (const ws of (workspaces || [])) {
      // Get financial summary for the week
      const year = weekEnd.getFullYear()
      const month = weekEnd.getMonth() + 1
      const { data: summary } = await supabase.rpc('get_monthly_summary', {
        p_workspace_id: ws.id,
        p_year: year,
        p_month: month,
      })

      // Projects delivered this week
      const { count: deliveredCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .eq('is_delivered', true)
        .gte('delivered_at', weekStart.toISOString())
        .lte('delivered_at', weekEnd.toISOString())

      // Active projects
      const { count: activeCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .eq('is_delivered', false)

      // Pending payments
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .in('status', ['pendente', 'parcial'])

      // Overdue payments
      const { count: overdueCount } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .in('status', ['pendente', 'parcial'])
        .lt('due_date', now.toISOString())

      // Get members with weekly summary preference enabled
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', ws.id)
        .eq('is_active', true)

      for (const member of (members || [])) {
        // Check user preference
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('email_weekly_summary')
          .eq('user_id', member.user_id)
          .maybeSingle()

        if (prefs?.email_weekly_summary === false) continue

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', member.user_id)
          .single()

        if (!profile?.email) continue

        const summaryRow = Array.isArray(summary) ? summary[0] : summary
        const totalRevenue = Number(summaryRow?.total_revenue || 0)
        const totalCost = Number(summaryRow?.total_cost || 0)
        const profit = totalRevenue - totalCost
        const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0'

        const formatCurrency = (v: number) => `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`

        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              template: 'weekly_summary',
              to: profile.email,
              data: {
                userName: profile.full_name || 'utilizador',
                weekLabel,
                totalRevenue: formatCurrency(totalRevenue),
                totalCost: formatCurrency(totalCost),
                profit: formatCurrency(profit),
                marginPercent: margin,
                projectsDelivered: deliveredCount || 0,
                projectsActive: activeCount || 0,
                pendingPayments: pendingCount || 0,
                overduePayments: overdueCount || 0,
              },
            },
          })
          emailsSent++
        } catch (err) {
          console.error('Failed to send weekly summary', { error: err, userId: member.user_id })
        }
      }
    }

    console.log(`Weekly summary sent to ${emailsSent} users`)

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-weekly-summary:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
