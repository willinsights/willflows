import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'WillFlow'
const SENDER_DOMAIN = 'notify.willflow.app'
const FROM_ADDRESS = `${SITE_NAME} <noreply@willflow.app>`
const APP_URL = 'https://willflows.lovable.app'

function buildEmailHtml(subject: string, body: string, brandName: string): string {
  const bodyHtml = body.replace(/\n/g, '<br/>')
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:24px 32px">
<h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">${brandName} · TESTE</h1>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 16px;color:#18181b;font-size:20px">${subject}</h2>
<div style="color:#3f3f46;font-size:15px;line-height:1.6">${bodyHtml}</div>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7">
<p style="margin:0;color:#a1a1aa;font-size:12px">Email de teste · enviado manualmente para validar template</p>
</td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth: require valid user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { automation_id, recipient_email, project_id } = await req.json()
    if (!automation_id || !recipient_email) {
      return new Response(JSON.stringify({ error: 'Missing automation_id or recipient_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load automation
    const { data: automation, error: aErr } = await supabase
      .from('workflow_automations')
      .select('id, name, action_type, action_config, workspace_id')
      .eq('id', automation_id)
      .single()

    if (aErr || !automation) {
      return new Response(JSON.stringify({ error: 'Automation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (automation.action_type !== 'send_email') {
      return new Response(JSON.stringify({ error: 'Automation is not an email type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pick a project: explicit > most recent with active approval token > most recent
    let project: any = null
    if (project_id) {
      const { data } = await supabase.from('projects')
        .select('id, name, client_id, workspace_id')
        .eq('id', project_id).maybeSingle()
      project = data
    }
    if (!project) {
      const { data: tokenRow } = await supabase
        .from('video_approval_tokens')
        .select('project_id, projects:project_id(id, name, client_id, workspace_id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)
      const match = (tokenRow || []).find((r: any) => r.projects?.workspace_id === automation.workspace_id)
      if (match) project = match.projects
    }
    if (!project) {
      const { data } = await supabase.from('projects')
        .select('id, name, client_id, workspace_id')
        .eq('workspace_id', automation.workspace_id)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()
      project = data
    }

    if (!project) {
      return new Response(JSON.stringify({ error: 'Nenhum projeto encontrado neste workspace para teste' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve client + workspace
    let clientName = ''
    if (project.client_id) {
      const { data: client } = await supabase.from('clients').select('name').eq('id', project.client_id).single()
      clientName = client?.name || ''
    }
    const { data: ws } = await supabase.from('workspaces').select('name').eq('id', project.workspace_id).single()

    // Resolve approval token
    const { data: tokenRow } = await supabase
      .from('video_approval_tokens')
      .select('token')
      .eq('is_active', true)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    const approvalLink = tokenRow?.token ? `https://willflow.app/video-approval/${tokenRow.token}` : ''

    const vars: Record<string, string> = {
      '{project_name}': project.name || '',
      '{client_name}': clientName,
      '{user_name}': userData.user.email || '',
      '{column_name}': '(teste)',
      '{from_column_name}': '(teste)',
      '{workspace_name}': ws?.name || SITE_NAME,
      '{link_project}': `${APP_URL}/app/edicao?project=${project.id}`,
      '{link_aprovacao}': approvalLink,
      '{link_aprovação}': approvalLink,
    }
    const replaceVars = (t: string) => {
      let r = t
      for (const [k, v] of Object.entries(vars)) r = r.replaceAll(k, v)
      return r
    }

    const cfg = (automation.action_config || {}) as any
    const subject = `[TESTE] ${replaceVars(cfg.subject || `Atualização: ${project.name}`)}`
    const body = replaceVars(cfg.body || `Email de teste da automação ${automation.name}.`)
    const html = buildEmailHtml(subject, body, ws?.name || SITE_NAME)

    const recipientEmailLower = recipient_email.toLowerCase()

    // Unsubscribe token
    let unsubscribeToken: string
    const { data: existing } = await supabase
      .from('email_unsubscribe_tokens').select('token')
      .eq('email', recipientEmailLower).is('used_at', null).maybeSingle()
    if (existing?.token) {
      unsubscribeToken = existing.token
    } else {
      unsubscribeToken = crypto.randomUUID()
      await supabase.from('email_unsubscribe_tokens').insert({ email: recipientEmailLower, token: unsubscribeToken })
    }

    const messageId = crypto.randomUUID()
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: `automation_test_${automation.id}`,
      recipient_email: recipient_email,
      status: 'pending',
    })

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient_email,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: body,
        purpose: 'transactional',
        idempotency_key: `automation-test-${automation.id}-${messageId}`,
        unsubscribe_token: unsubscribeToken,
        label: `automation_test_${automation.name}`,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqErr) {
      console.error('enqueue failed', enqErr)
      return new Response(JSON.stringify({ error: 'Failed to enqueue email', details: enqErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: messageId,
      project_used: { id: project.id, name: project.name },
      approval_link_resolved: approvalLink || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('send-test-automation-email error', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
