import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface Recipient {
  id: string
  email: string
  full_name: string | null
  last_login_at: string | null
  subscription_status: string | null
}

async function loadEligibleRecipients(admin: ReturnType<typeof createClient>): Promise<Recipient[]> {
  // Dormant window: 30–180 days
  const now = Date.now()
  const from = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
  const to = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, full_name, last_login_at, source, is_internal_test, is_blocked')
    .eq('source', 'public')
    .gte('last_login_at', from)
    .lte('last_login_at', to)
    .order('last_login_at', { ascending: false })

  if (error) throw error

  const filtered = (profiles || []).filter(
    (p: any) => !p.is_internal_test && !p.is_blocked && p.email
  )
  const ids = filtered.map((p: any) => p.id)
  const emails = filtered.map((p: any) => (p.email as string).toLowerCase())

  const [prefsRes, subsRes, suppRes] = await Promise.all([
    admin.from('user_preferences').select('user_id, email_marketing').in('user_id', ids),
    admin
      .from('user_subscriptions')
      .select('user_id, subscription_status')
      .in('user_id', ids),
    admin.from('suppressed_emails').select('email').in('email', emails),
  ])

  const prefsMap = new Map<string, boolean>()
  ;(prefsRes.data || []).forEach((r: any) =>
    prefsMap.set(r.user_id, r.email_marketing !== false)
  )
  const subMap = new Map<string, string | null>()
  ;(subsRes.data || []).forEach((r: any) => subMap.set(r.user_id, r.subscription_status))
  const suppSet = new Set<string>((suppRes.data || []).map((r: any) => r.email.toLowerCase()))

  return filtered
    .filter((p: any) => prefsMap.get(p.id) !== false)
    .filter((p: any) => !suppSet.has((p.email as string).toLowerCase()))
    .map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      last_login_at: p.last_login_at,
      subscription_status: subMap.get(p.id) ?? null,
    }))
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return { error: 'Unauthorized', status: 401 as const }

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userErr } = await authClient.auth.getUser(token)
  if (userErr || !userData?.user) return { error: 'Unauthorized', status: 401 as const }

  // Verify system admin via direct table lookup with service role
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: isAdminRow } = await admin
    .from('system_admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (!isAdminRow) return { error: 'Forbidden', status: 403 as const }

  return { user: userData.user, admin, token }
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  return fullName.trim().split(/\s+/)[0] || ''
}

async function ensureUnsubscribeToken(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string> {
  const normalized = email.toLowerCase()
  const { data: existing } = await admin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .is('used_at', null)
    .maybeSingle()
  if (existing?.token) return existing.token as string

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const { error } = await admin
    .from('email_unsubscribe_tokens')
    .insert({ email: normalized, token })
  if (error) {
    // Race: fetch again
    const { data: retry } = await admin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalized)
      .is('used_at', null)
      .maybeSingle()
    if (retry?.token) return retry.token as string
    throw error
  }
  return token
}

function renderSubject(subjectTpl: string, name: string): string {
  const trimmedName = (name || '').trim()
  let out = subjectTpl
  if (trimmedName) {
    out = out.replace(/\{nome\}/g, trimmedName)
  } else {
    // Remove "{nome}, " / "{nome} " / "{nome}" cleanly and fix leading punctuation
    out = out
      .replace(/\{nome\}\s*[,;:\-–—]\s*/g, '')
      .replace(/\{nome\}\s*/g, '')
      .replace(/^\s*[,;:\-–—]\s*/, '')
    // Capitalize first letter if it became lowercase after removal
    if (out.length > 0) out = out.charAt(0).toUpperCase() + out.slice(1)
  }
  // Strip em/en dashes for consistency with body treatment
  out = out.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim()
  return out
}

async function sendOne(params: {
  admin: ReturnType<typeof createClient>
  userToken: string
  recipient: Recipient
  subject: string
  bodyText: string
}): Promise<{ ok: boolean; error?: string }> {
  const { admin, userToken, recipient, subject, bodyText } = params

  const unsubscribeToken = await ensureUnsubscribeToken(admin, recipient.email)
  const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${unsubscribeToken}`

  const recipientName = firstName(recipient.full_name)
  const resolvedSubject = renderSubject(subject, recipientName)


  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      template: 'reactivation',
      to: recipient.email,
      data: {
        name: recipientName,
        bodyText,
        subject: resolvedSubject,
        unsubscribeUrl,
      },

    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    return { ok: false, error: `[${res.status}] ${txt.slice(0, 200)}` }
  }
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const auth = await requireAdmin(req)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'preview') {
      const recipients = await loadEligibleRecipients(auth.admin)
      return new Response(JSON.stringify({ recipients }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'send-test') {
      const subject = String(body.subject || '').trim()
      const bodyText = String(body.body || '').trim()
      const rawTestEmail = String(body.testEmail || '').trim().toLowerCase()
      if (!subject || !bodyText) {
        return new Response(JSON.stringify({ error: 'subject e body são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const targetEmail = rawTestEmail && EMAIL_RE.test(rawTestEmail)
        ? rawTestEmail
        : (auth.user.email || '').toLowerCase()
      if (!targetEmail || !EMAIL_RE.test(targetEmail)) {
        return new Response(JSON.stringify({ error: 'Email de teste inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const recipient: Recipient = {
        id: auth.user.id,
        email: targetEmail,
        full_name: (auth.user.user_metadata as any)?.full_name ?? null,
        last_login_at: null,
        subscription_status: 'admin-test',
      }
      const result = await sendOne({
        admin: auth.admin,
        userToken: auth.token,
        recipient,
        subject: `[TESTE] ${subject}`,
        bodyText,
      })
      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true, to: recipient.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'send') {
      const subjectTpl = String(body.subject || '').trim()
      const bodyTextTpl = String(body.body || '').trim()
      const subjectActive = String(body.subjectActive || subjectTpl).trim()
      const bodyActiveTpl = String(body.bodyActive || bodyTextTpl).trim()
      const recipientIds: string[] = Array.isArray(body.recipientIds) ? body.recipientIds : []

      if (!subjectTpl || !bodyTextTpl) {
        return new Response(JSON.stringify({ error: 'subject e body são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (recipientIds.length === 0) {
        return new Response(JSON.stringify({ error: 'Sem destinatários selecionados' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (recipientIds.length > 500) {
        return new Response(JSON.stringify({ error: 'Máximo 500 destinatários por envio' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Re-load eligible recipients server-side and intersect with selection
      const eligible = await loadEligibleRecipients(auth.admin)
      const bySelection = new Set(recipientIds)
      const finalList = eligible.filter((r) => bySelection.has(r.id))

      let sent = 0
      let failed = 0
      const errors: Array<{ email: string; error: string }> = []

      for (const rec of finalList) {
        const isActive = rec.subscription_status === 'active'
        const subject = isActive ? subjectActive : subjectTpl
        const bodyText = isActive ? bodyActiveTpl : bodyTextTpl
        try {
          const result = await sendOne({
            admin: auth.admin,
            userToken: auth.token,
            recipient: rec,
            subject,
            bodyText,
          })
          if (result.ok) sent++
          else {
            failed++
            errors.push({ email: rec.email, error: result.error || 'unknown' })
          }
        } catch (e: any) {
          failed++
          errors.push({ email: rec.email, error: e?.message || 'unknown' })
        }
        // small pacing to be gentle on the queue
        await new Promise((r) => setTimeout(r, 80))
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed, total: finalList.length, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('admin-campaign error', error)
    return new Response(JSON.stringify({ error: error?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
