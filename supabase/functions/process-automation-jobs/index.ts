import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Job {
  id: string
  workspace_id: string
  event_type: string
  payload: Record<string, unknown>
  attempts: number
  max_attempts: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedSecret = req.headers.get('x-cron-secret')
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }


  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const started = Date.now()
  let processed = 0
  let succeeded = 0
  let failed = 0

  try {
    // Claim a batch of jobs (atomic, FOR UPDATE SKIP LOCKED)
    const { data: jobs, error: claimError } = await supabase.rpc('claim_automation_jobs', { _limit: 20 })

    if (claimError) {
      console.error('[process-automation-jobs] claim error:', claimError)
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobList = (jobs || []) as Job[]
    processed = jobList.length

    // Process jobs in parallel (max 20 per batch is safe)
    await Promise.all(jobList.map(async (job) => {
      try {
        // Invoke execute-automations with the original payload
        const { data, error } = await supabase.functions.invoke('execute-automations', {
          body: {
            event_type: job.event_type,
            ...job.payload,
          },
        })

        if (error) throw new Error(error.message || 'execute-automations invoke failed')

        // Some functions return { error } in body even on 200; treat as failure
        const body = data as { error?: string } | null
        if (body?.error) throw new Error(body.error)

        await supabase.rpc('complete_automation_job', {
          _job_id: job.id,
          _success: true,
          _error: null,
        })
        succeeded++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[process-automation-jobs] job ${job.id} failed:`, message)
        await supabase.rpc('complete_automation_job', {
          _job_id: job.id,
          _success: false,
          _error: message.slice(0, 1000),
        })
        failed++
      }
    }))

    return new Response(
      JSON.stringify({
        processed,
        succeeded,
        failed,
        duration_ms: Date.now() - started,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[process-automation-jobs] fatal:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
