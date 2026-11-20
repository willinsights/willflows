// Shared guard for "send me a test email" flows.
//
// Rule: a test message may only ever go to the email address the caller signed
// in with AND has verified. A caller-provided address is accepted only when it
// is exactly that same address, so the UI can keep sending its own value.

export interface TestRecipientUser {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
}

export type TestRecipientResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function resolveVerifiedTestRecipient(
  user: TestRecipientUser,
  requestedEmail?: unknown,
): TestRecipientResult {
  const verified = (user.email || '').trim().toLowerCase()

  if (!user.email_confirmed_at) {
    return {
      ok: false,
      status: 403,
      error: 'Confirma o email da tua conta antes de enviar testes',
    }
  }

  if (!EMAIL_RE.test(verified)) {
    return { ok: false, status: 403, error: 'Email da conta inválido' }
  }

  const requested =
    typeof requestedEmail === 'string' ? requestedEmail.trim().toLowerCase() : ''

  if (requested && requested !== verified) {
    return {
      ok: false,
      status: 403,
      error: 'O email de teste tem de ser o email verificado da tua conta',
    }
  }

  return { ok: true, email: verified }
}
