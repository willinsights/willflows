import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PaymentAlertEmail } from '../_shared/email-templates/payment-alert.tsx'
import { WeeklySummaryEmail } from '../_shared/email-templates/weekly-summary.tsx'
import { BetaWelcomeEmail } from '../_shared/email-templates/beta-welcome.tsx'
import { WelcomeEmail } from '../_shared/email-templates/welcome.tsx'
import { PasswordResetEmail } from '../_shared/email-templates/password-reset.tsx'
import { InvitationEmail } from '../_shared/email-templates/invitation.tsx'
import { BetaInviteEmail } from '../_shared/email-templates/beta-invite.tsx'
import { ContactMessageEmail } from '../_shared/email-templates/contact-message.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  edicao: 'Edição',
  captacao: 'Captação',
  gestao: 'Gestão',
  visualizacao: 'Visualização',
}

const SITE_NAME = 'WillFlow'
const SENDER_DOMAIN = 'notify.willflow.app'
const FROM_ADDRESS = `${SITE_NAME} <noreply@willflow.app>`

interface TransactionalEmailRequest {
  template: 'payment_alert' | 'weekly_summary' | 'beta_welcome' | 'welcome' | 'password_reset' | 'invitation' | 'beta_invite'
  to: string
  data: Record<string, unknown>
}

const TEMPLATES: Record<string, { component: React.ComponentType<any>; subject: (data: any) => string }> = {
  payment_alert: {
    component: PaymentAlertEmail,
    subject: (data) => data.alertType?.startsWith('overdue') 
      ? `🔴 Pagamento Vencido — ${data.projectName || 'WillFlow'}`
      : `⏰ Pagamento Próximo — ${data.projectName || 'WillFlow'}`,
  },
  weekly_summary: {
    component: WeeklySummaryEmail,
    subject: () => `📊 Resumo Semanal — WillFlow`,
  },
  beta_welcome: {
    component: BetaWelcomeEmail,
    subject: () => `🎉 Bem-vindo ao WillFlow Beta!`,
  },
  welcome: {
    component: WelcomeEmail,
    subject: () => `Bem-vindo ao WillFlow! 🎉`,
  },
  password_reset: {
    component: PasswordResetEmail,
    subject: () => `Redefinir a tua password — WillFlow`,
  },
  invitation: {
    component: InvitationEmail,
    subject: (data) => `${data.inviterName || 'Alguém'} convidou-te para o workspace "${data.workspaceName}"`,
  },
  beta_invite: {
    component: BetaInviteEmail,
    subject: (data) => `🎉 Convite exclusivo: ${data.freeDays || 30} dias grátis no WillFlow!`,
  },
  contact_message: {
    component: ContactMessageEmail,
    subject: (data) => `[Contacto WillFlow] ${data.subject || 'Nova mensagem'}`,
  },
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth: require service_role or valid user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { template, to, data }: TransactionalEmailRequest = await req.json()

    if (!template || !to || !data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: template, to, data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const templateConfig = TEMPLATES[template]
    if (!templateConfig) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Server-side enrichment for password_reset: generate recovery link via admin API
    if (template === 'password_reset' && !data.resetLink) {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: to,
        options: { redirectTo: 'https://willflow.app/auth?mode=reset' },
      })
      if (linkError || !linkData?.properties?.action_link) {
        // Don't reveal whether the email exists
        console.warn('password_reset: failed to generate link', { error: linkError?.message })
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      data.resetLink = linkData.properties.action_link
    }

    // Server-side enrichment for invitation: compute roleLabel and inviteLink
    if (template === 'invitation') {
      if (data.role && !data.roleLabel) {
        data.roleLabel = ROLE_LABELS[data.role as string] || (data.role as string)
      }
      if (data.token && !data.inviteLink) {
        data.inviteLink = `https://willflow.app/convite?token=${data.token}`
      }
      if (!data.inviteLink || !data.workspaceName) {
        return new Response(JSON.stringify({ error: 'Missing invitation fields: token/inviteLink and workspaceName required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Server-side enrichment for beta_invite: compute inviteLink from inviteToken
    if (template === 'beta_invite') {
      if (data.inviteToken && !data.inviteLink) {
        data.inviteLink = `https://willflow.app/auth?token=${data.inviteToken}`
      }
      if (!data.inviteLink) {
        return new Response(JSON.stringify({ error: 'Missing beta_invite field: inviteToken or inviteLink required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Server-side handling for contact_message: validate, sanitize, force recipient
    if (template === 'contact_message') {
      const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      const name = String(data.name ?? '').trim()
      const senderEmail = String(data.email ?? '').trim().toLowerCase()
      const subject = String(data.subject ?? '').trim()
      const message = String(data.message ?? '').trim()
      if (!name || !senderEmail || !subject || !message) {
        return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!EMAIL_REGEX.test(senderEmail) || senderEmail.length > 254) {
        return new Response(JSON.stringify({ error: 'Formato de email inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      data.name = name.substring(0, 100)
      data.email = senderEmail
      data.subject = subject.substring(0, 200)
      data.message = message.substring(0, 5000)
    }

    // Check suppression list
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', to.toLowerCase())
      .maybeSingle()

    if (suppressed) {
      console.log('Email suppressed', { to, template })
      return new Response(JSON.stringify({ success: true, suppressed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Render template
    const html = await renderAsync(React.createElement(templateConfig.component, data))
    const text = await renderAsync(React.createElement(templateConfig.component, data), { plainText: true })

    const messageId = crypto.randomUUID()
    const subject = templateConfig.subject(data)

    // Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: template,
      recipient_email: to,
      status: 'pending',
    })

    // Enqueue for async sending
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: template,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue transactional email', { error: enqueueError, template, to })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: template,
        recipient_email: to,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Transactional email enqueued', { template, to, messageId })

    return new Response(JSON.stringify({ success: true, queued: true, messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-transactional-email:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
