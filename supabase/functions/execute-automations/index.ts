import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'WillFlow'
const SENDER_DOMAIN = 'notify.willflow.app'
const FROM_ADDRESS = `${SITE_NAME} <noreply@willflow.app>`
const APP_URL = 'https://willflows.lovable.app'

interface AutomationPayload {
  event_type: string
  project_id: string
  workspace_id: string
  to_column_id?: string
  from_column_id?: string
  triggered_by: string
}

interface Automation {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  action_type: string
  action_config: Record<string, unknown>
  recipient_config: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: AutomationPayload = await req.json()
    const { event_type, project_id, workspace_id, to_column_id, from_column_id, triggered_by } = payload

    if (!event_type || !project_id || !workspace_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch matching active automations
    let query = supabase
      .from('workflow_automations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .eq('trigger_type', event_type)

    const { data: automations, error: autoError } = await query

    if (autoError) {
      console.error('Error fetching automations:', autoError)
      return new Response(JSON.stringify({ error: 'Failed to fetch automations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!automations || automations.length === 0) {
      return new Response(JSON.stringify({ executed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filter automations by trigger config
    const matchingAutomations = automations.filter((auto: Automation) => {
      const config = auto.trigger_config || {}

      if (event_type === 'card_enters_column') {
        return !config.column_id || config.column_id === to_column_id
      }
      if (event_type === 'card_leaves_column') {
        return !config.column_id || config.column_id === from_column_id
      }
      if (event_type === 'card_moved') {
        const fromMatch = !config.from_column_id || config.from_column_id === from_column_id
        const toMatch = !config.to_column_id || config.to_column_id === to_column_id
        return fromMatch && toMatch
      }
      return true // project_created, delivered, etc. match without config
    })

    if (matchingAutomations.length === 0) {
      return new Response(JSON.stringify({ executed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch project data for template variables
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, client_id, workspace_id')
      .eq('id', project_id)
      .single()

    let clientName = ''
    let clientEmail = ''
    if (project?.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', project.client_id)
        .single()
      clientName = client?.name || ''
      clientEmail = client?.email || ''
    }

    // Get workspace name
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspace_id)
      .single()

    // Get triggered by user name
    const { data: triggerUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', triggered_by)
      .single()

    // Get column names
    let toColumnName = ''
    let fromColumnName = ''
    if (to_column_id) {
      const { data: col } = await supabase
        .from('kanban_columns')
        .select('name')
        .eq('id', to_column_id)
        .single()
      toColumnName = col?.name || ''
    }
    if (from_column_id) {
      const { data: col } = await supabase
        .from('kanban_columns')
        .select('name')
        .eq('id', from_column_id)
        .single()
      fromColumnName = col?.name || ''
    }

    const templateVars: Record<string, string> = {
      '{project_name}': project?.name || '',
      '{client_name}': clientName,
      '{user_name}': triggerUser?.full_name || triggerUser?.email || '',
      '{column_name}': toColumnName,
      '{from_column_name}': fromColumnName,
      '{workspace_name}': workspace?.name || '',
      '{link_project}': `${APP_URL}/app/edicao?project=${project_id}`,
    }

    const replaceVars = (text: string): string => {
      let result = text
      for (const [key, value] of Object.entries(templateVars)) {
        result = result.replaceAll(key, value)
      }
      return result
    }

    let executedCount = 0

    for (const automation of matchingAutomations) {
      try {
        // Resolve recipients
        const recipients = await resolveRecipients(
          supabase,
          automation.recipient_config,
          project_id,
          workspace_id,
          clientEmail
        )

        if (recipients.length === 0) {
          await supabase.from('automation_execution_log').insert({
            automation_id: automation.id,
            project_id,
            workspace_id,
            trigger_type: event_type,
            action_type: automation.action_type,
            recipients: [],
            status: 'skipped',
            error_message: 'No recipients resolved',
          })
          continue
        }

        const actionConfig = automation.action_config || {}

        if (automation.action_type === 'send_email') {
          const subject = replaceVars(actionConfig.subject as string || `Atualização: ${project?.name}`)
          const body = replaceVars(actionConfig.body as string || `O projeto ${project?.name} foi atualizado.`)

          // Build HTML email
          const html = buildEmailHtml(subject, body, workspace?.name || SITE_NAME)

          for (const recipient of recipients) {
            if (!recipient.email) continue

            const recipientEmailLower = recipient.email.toLowerCase()

            // Check suppression
            const { data: suppressed } = await supabase
              .from('suppressed_emails')
              .select('id')
              .eq('email', recipientEmailLower)
              .maybeSingle()

            if (suppressed) continue

            // Get or create unsubscribe token
            let unsubscribeToken: string
            const { data: existingToken } = await supabase
              .from('email_unsubscribe_tokens')
              .select('token')
              .eq('email', recipientEmailLower)
              .is('used_at', null)
              .maybeSingle()

            if (existingToken?.token) {
              unsubscribeToken = existingToken.token
            } else {
              unsubscribeToken = crypto.randomUUID()
              await supabase.from('email_unsubscribe_tokens').insert({
                email: recipientEmailLower,
                token: unsubscribeToken,
              })
            }

            const messageId = crypto.randomUUID()

            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: `automation_${automation.id}`,
              recipient_email: recipient.email,
              status: 'pending',
            })

            await supabase.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to: recipient.email,
                from: FROM_ADDRESS,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text: body,
                purpose: 'transactional',
                idempotency_key: `automation-${automation.id}-${project_id}-${messageId}`,
                unsubscribe_token: unsubscribeToken,
                label: `automation_${automation.name}`,
                queued_at: new Date().toISOString(),
              },
            })
          }
        }

        if (automation.action_type === 'notify_in_app') {
          const title = replaceVars(actionConfig.title as string || 'Automação')
          const message = replaceVars(actionConfig.message as string || `O projeto ${project?.name} foi atualizado.`)

          for (const recipient of recipients) {
            if (!recipient.user_id) continue

            await supabase.from('notifications').insert({
              workspace_id,
              user_id: recipient.user_id,
              type: 'info',
              title,
              message,
              entity_type: 'project',
              entity_id: project_id,
            })
          }
        }

        await supabase.from('automation_execution_log').insert({
          automation_id: automation.id,
          project_id,
          workspace_id,
          trigger_type: event_type,
          action_type: automation.action_type,
          recipients: recipients.map(r => ({ email: r.email, user_id: r.user_id, name: r.name })),
          status: 'sent',
        })

        executedCount++
      } catch (err) {
        console.error(`Automation ${automation.id} failed:`, err)
        await supabase.from('automation_execution_log').insert({
          automation_id: automation.id,
          project_id,
          workspace_id,
          trigger_type: event_type,
          action_type: automation.action_type,
          recipients: [],
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return new Response(JSON.stringify({ executed: executedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in execute-automations:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

interface Recipient {
  email?: string
  user_id?: string
  name?: string
}

async function resolveRecipients(
  supabase: any,
  recipientConfig: Record<string, unknown>,
  projectId: string,
  workspaceId: string,
  clientEmail: string
): Promise<Recipient[]> {
  const recipients: Recipient[] = []
  const configs = Array.isArray(recipientConfig) ? recipientConfig : [recipientConfig]

  for (const config of configs) {
    const type = config.type as string
    const value = config.value as string

    switch (type) {
      case 'fixed_emails': {
        const emails = (value || '').split(',').map((e: string) => e.trim()).filter(Boolean)
        for (const email of emails) {
          recipients.push({ email })
        }
        break
      }

      case 'project_team': {
        const { data: team } = await supabase
          .from('project_team')
          .select('user_id')
          .eq('project_id', projectId)
          .not('user_id', 'is', null)

        if (team) {
          for (const member of team) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', member.user_id)
              .single()
            if (profile) {
              recipients.push({ email: profile.email, user_id: member.user_id, name: profile.full_name })
            }
          }
        }
        break
      }

      case 'project_owner': {
        const { data: project } = await supabase
          .from('projects')
          .select('created_by')
          .eq('id', projectId)
          .single()

        if (project?.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', project.created_by)
            .single()
          if (profile) {
            recipients.push({ email: profile.email, user_id: project.created_by, name: profile.full_name })
          }
        }
        break
      }

      case 'project_client': {
        if (clientEmail) {
          recipients.push({ email: clientEmail })
        }
        break
      }

      case 'role': {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('role', value)
          .eq('is_active', true)

        if (members) {
          for (const member of members) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', member.user_id)
              .single()
            if (profile) {
              recipients.push({ email: profile.email, user_id: member.user_id, name: profile.full_name })
            }
          }
        }
        break
      }

      case 'group': {
        const { data: group } = await supabase
          .from('automation_recipient_groups')
          .select('members')
          .eq('id', value)
          .single()

        if (group?.members && Array.isArray(group.members)) {
          for (const member of group.members) {
            if (member.email) {
              recipients.push({ email: member.email })
            }
            if (member.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', member.user_id)
                .single()
              if (profile) {
                recipients.push({ email: profile.email, user_id: member.user_id, name: profile.full_name })
              }
            }
          }
        }
        break
      }
    }
  }

  // Deduplicate by email
  const seen = new Set<string>()
  return recipients.filter(r => {
    const key = r.email || r.user_id || ''
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildEmailHtml(subject: string, body: string, brandName: string): string {
  const bodyHtml = body.replace(/\n/g, '<br/>')
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:24px 32px">
<h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">${brandName}</h1>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:600">${subject}</h2>
<div style="color:#3f3f46;font-size:15px;line-height:1.6">${bodyHtml}</div>
</td></tr>
<tr><td style="padding:16px 32px 24px">
<a href="${APP_URL}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">Abrir WillFlow</a>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7">
<p style="margin:0;color:#a1a1aa;font-size:12px">Enviado automaticamente por ${brandName}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
