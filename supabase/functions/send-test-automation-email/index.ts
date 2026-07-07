import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'WillFlow'
const APP_URL = 'https://willflows.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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

    // Only workspace admins for the automation's workspace may send test emails
    const { data: adminCheck } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', automation.workspace_id)
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle()
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pick project: explicit > most recent with active approval token > most recent
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

    let clientName = ''
    if (project.client_id) {
      const { data: client } = await supabase.from('clients').select('name').eq('id', project.client_id).single()
      clientName = client?.name || ''
    }
    const { data: ws } = await supabase.from('workspaces').select('name').eq('id', project.workspace_id).single()

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
    const subject = replaceVars(cfg.subject || `Atualização: ${project.name}`)
    const body = replaceVars(cfg.body || `Email de teste da automação ${automation.name}.`)
    const brandName = ws?.name || SITE_NAME

    // Delegate sending to unified pipeline
    const { data: sendData, error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        template: 'automation_test',
        to: recipient_email,
        data: { subject, body, brandName },
      },
    })

    if (sendErr || (sendData as any)?.error) {
      const msg = sendErr?.message || (sendData as any)?.error || 'Failed to send'
      console.error('send-transactional-email failed', msg)
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: (sendData as any)?.messageId,
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
