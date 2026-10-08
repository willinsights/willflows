import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function check(error: { code?: string; message: string } | null, eventId: string, step: string) {
  if (error) {
    console.error('Email event write failed', { step, code: error.code, message: error.message, event_id: eventId })
    throw new Error(`${step} failed`)
  }
}

async function recordOutcome(
  eventId: string,
  recipient: string,
  logStatus: 'bounced' | 'complained' | 'suppressed',
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  message: string
) {
  const email = recipient.toLowerCase()
  const { error: logErr } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: email,
    status: logStatus,
    error_message: message,
  })
  check(logErr, eventId, 'email_send_log')

  const { error: supErr } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  check(supErr, eventId, 'suppressed_emails')
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordOutcome(event.event_id, event.data.recipient, 'bounced', 'bounce', 'Email bounced')
    },
    'email.complaint': async (event) => {
      await recordOutcome(event.event_id, event.data.recipient, 'complained', 'complaint', 'Spam complaint received')
    },
    'email.unsubscribed': async (event) => {
      const recipient = event.data.recipient
      await recordOutcome(event.event_id, recipient, 'suppressed', 'unsubscribe', 'Recipient unsubscribed')

      // Disable all email preferences for this user (as the previous unsubscribe page did)
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipient)
        .maybeSingle()
      check(profErr, event.event_id, 'profiles')
      if (profile) {
        const { error: prefErr } = await supabase.from('user_preferences').upsert({
          user_id: profile.id,
          email_project_updates: false,
          email_payment_reminders: false,
          email_team_activity: false,
          email_weekly_summary: false,
          email_marketing: false,
        }, { onConflict: 'user_id' })
        check(prefErr, event.event_id, 'user_preferences')
      }
    },
  },
})

Deno.serve((req) => handler(req))
