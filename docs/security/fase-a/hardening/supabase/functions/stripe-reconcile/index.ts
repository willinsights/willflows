import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { withSafeCron } from '../_shared/safe-cron.ts';
// Stripe reconciliation job — compares Stripe subscription status with DB
// state, records discrepancies and notifies super admins by email.
// Designed to be invoked by pg_cron daily (and manually from the admin UI).

import { createClient } from 'npm:@supabase/supabase-js@2.57.2'
import Stripe from 'https://esm.sh/stripe@18.5.0'
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { secretEquals } from "../_shared/timing-safe.ts";


interface ReconcileItem {
  user_id: string | null
  workspace_id: string | null
  workspace_name?: string | null
  user_email?: string | null
  stripe_subscription_id: string
  stripe_customer_id: string | null
  stripe_status: string
  db_status: string
  detail?: string
}

// Allowed-equivalent statuses between Stripe and our DB.
function statusesMatch(stripeStatus: string, dbStatus: string): boolean {
  if (!dbStatus) return false
  if (stripeStatus === dbStatus) return true
  // Map a few common equivalents.
  const equivalents: Record<string, string[]> = {
    active: ['active'],
    trialing: ['trialing', 'trial'],
    past_due: ['past_due'],
    canceled: ['canceled', 'cancelled', 'inactive', 'expired'],
    incomplete: ['incomplete'],
    incomplete_expired: ['incomplete_expired', 'canceled', 'expired'],
    unpaid: ['unpaid', 'past_due'],
    paused: ['paused'],
  }
  const allowed = equivalents[stripeStatus] || [stripeStatus]
  return allowed.includes(dbStatus)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Require CRON_SECRET header for cron/manual admin invocation.
  const cronSecret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secretEquals(cronSecret, provided) && authenticateCronRequest(req) !== null) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }


  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing server configuration');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
    return await withSafeCron(supabase, 'stripe-reconcile', async () => {

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' })

    // Optional: skip email when triggered manually from admin UI.
    let notify = false
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body?.notify === true) throw new Error('Notifications require separate authorised rollout')
      } catch {
        // ignore body parse errors
      }
    }

    // 1. Fetch all subscriptions that have a stripe_subscription_id.
    const { data: subs, error: subsErr } = await supabase
      .from('user_subscriptions')
      .select(
        'id, user_id, subscription_status, stripe_subscription_id, stripe_customer_id',
      )
      .not('stripe_subscription_id', 'is', null)

    if (subsErr) throw subsErr

    const discrepancies: ReconcileItem[] = []
    let checked = 0
    let errors = 0

    // 2. For each subscription, retrieve current Stripe state.
    for (const sub of subs ?? []) {
      const stripeSubId = sub.stripe_subscription_id as string
      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
        checked++
        const stripeStatus = stripeSub.status
        const dbStatus = sub.subscription_status as string
        if (!statusesMatch(stripeStatus, dbStatus)) {
          discrepancies.push({
            user_id: sub.user_id,
            workspace_id: null,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: (sub.stripe_customer_id as string) || null,
            stripe_status: stripeStatus,
            db_status: dbStatus,
            detail: `Status mismatch (stripe=${stripeStatus}, db=${dbStatus})`,
          })
        }
      } catch (err) {
        errors++
        const message = err instanceof Error ? err.message : String(err)
        // Treat "no such subscription" as a discrepancy — DB has a stale ID.
        if (message.toLowerCase().includes('no such subscription')) {
          discrepancies.push({
            user_id: sub.user_id,
            workspace_id: null,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: (sub.stripe_customer_id as string) || null,
            stripe_status: 'not_found',
            db_status: sub.subscription_status as string,
            detail: 'Subscription ID exists in DB but not in Stripe',
          })
        } else {
          console.error('[stripe-reconcile] retrieve failed', {
            stripeSubId,
            message,
          })
        }
      }
    }

    // 3. Enrich with profile email + workspace info.
    if (discrepancies.length > 0) {
      const userIds = [...new Set(discrepancies.map((d) => d.user_id).filter(Boolean))] as string[]
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
        if (profileError) throw new Error('Profile enrichment failed')
        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

        const { data: workspaces, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id, name, stripe_subscription_id')
          .in('stripe_subscription_id', discrepancies.map(d => d.stripe_subscription_id))
        if (workspaceError) throw new Error('Workspace enrichment failed')
        const wsBySubscription = new Map<string, { id: string; name: string }>()
        for (const w of workspaces ?? []) {
          if (wsBySubscription.has(w.stripe_subscription_id as string)) throw new Error('Ambiguous subscription workspace')
          wsBySubscription.set(w.stripe_subscription_id as string, { id: w.id as string, name: w.name as string })
        }

        for (const d of discrepancies) {
          if (d.user_id) {
            d.user_email = (profileMap.get(d.user_id)?.email as string) || null
            const ws = wsBySubscription.get(d.stripe_subscription_id)
            if (ws) {
              d.workspace_id = ws.id
              d.workspace_name = ws.name
            }
          }
        }
      }
    }

    // 4. Insert each discrepancy that isn't already open in the DB.
    let inserted = 0
    for (const d of discrepancies) {
      const { data: created, error: insErr } = await supabase.rpc('record_stripe_discrepancy', {
        p_subscription: d.stripe_subscription_id, p_stripe_status: d.stripe_status, p_db_status: d.db_status,
        p_user: d.user_id, p_customer: d.stripe_customer_id,
        p_details: { detail: d.detail, user_email: d.user_email, workspace_name: d.workspace_name },
      });
      if (insErr) throw new Error('Atomic discrepancy record failed');
      if (created === true) inserted++;
    }

    // 5. Notify super admins by email.
    if (notify && inserted > 0) {
      try {
        const { data: admins } = await supabase
          .from('system_admins')
          .select('user_id')
        const adminIds = (admins ?? []).map((a) => a.user_id as string)
        if (adminIds.length > 0) {
          const { data: adminProfiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', adminIds)
          const adminEmails = (adminProfiles ?? [])
            .map((p) => p.email as string)
            .filter(Boolean)

          for (const email of adminEmails) {
            await supabase.functions.invoke('app-email', {
              body: {
                template: 'admin_subscription_discrepancy',
                to: email,
                data: {
                  totalDiscrepancies: inserted,
                  items: discrepancies.map((d) => ({
                    workspaceName: d.workspace_name,
                    userEmail: d.user_email,
                    stripeSubscriptionId: d.stripe_subscription_id,
                    stripeStatus: d.stripe_status,
                    dbStatus: d.db_status,
                    detail: d.detail,
                  })),
                  adminUrl: 'https://willflow.app/admin/billing',
                },
              },
            })
          }
        }
      } catch (err) {
        console.error('[stripe-reconcile] notify failed', err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked,
        errors,
        discrepancies: discrepancies.length,
        inserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-reconcile] fatal', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
