import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(htmlPage('Token inválido', 'O link de cancelamento é inválido.', true), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400,
      })
    }

    // Look up token
    const { data: tokenRecord } = await supabase
      .from('email_unsubscribe_tokens')
      .select('email, used_at')
      .eq('token', token)
      .maybeSingle()

    if (!tokenRecord) {
      return new Response(htmlPage('Token inválido', 'O link de cancelamento não foi encontrado ou já expirou.', true), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404,
      })
    }

    if (tokenRecord.used_at) {
      return new Response(htmlPage('Já cancelado', `O email ${maskEmail(tokenRecord.email)} já foi removido das nossas listas.`, false), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Mark token as used
    await supabase
      .from('email_unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    // Add to suppression list
    await supabase
      .from('suppressed_emails')
      .upsert(
        { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe', suppressed_at: new Date().toISOString() },
        { onConflict: 'email' }
      )

    // Disable all email preferences for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', tokenRecord.email)
      .maybeSingle()

    if (profile) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          email_project_updates: false,
          email_payment_reminders: false,
          email_team_activity: false,
          email_weekly_summary: false,
          email_marketing: false,
        }, { onConflict: 'user_id' })
    }

    return new Response(
      htmlPage('Email cancelado', `O email ${maskEmail(tokenRecord.email)} foi removido das nossas listas com sucesso.`, false),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (error) {
    console.error('Error in handle-email-unsubscribe:', error)
    return new Response(htmlPage('Erro', 'Ocorreu um erro ao processar o cancelamento. Tente novamente.', true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500,
    })
  }
})

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${local[1]}***@${domain}`
}

function htmlPage(title: string, message: string, isError: boolean): string {
  const color = isError ? '#dc2626' : '#5B4AE4'
  const icon = isError ? '❌' : '✅'
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — WillFlow</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f3ff; margin: 0; padding: 40px 20px; }
    .card { background: #fff; max-width: 420px; margin: 60px auto; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(91,74,228,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: ${color}; font-size: 22px; margin: 0 0 12px; }
    p { color: #555; font-size: 15px; line-height: 1.6; margin: 0; }
    .logo { color: #5B4AE4; font-weight: bold; font-size: 14px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="logo">WillFlow</p>
  </div>
</body>
</html>`
}
