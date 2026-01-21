/**
 * Email Validation Module
 * Validates email format, DNS MX records, and blocks disposable emails
 */

// RFC 5322 compliant email regex (covers 99.99% of valid cases)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// List of known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  // Popular temporary email services
  'tempmail.com', 'temp-mail.org', 'tempail.com', 'mytemp.email',
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net',
  '10minutemail.com', '10minutemail.net', '10minemail.com',
  'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'throwaway.email', 'throwawaymail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'fakeinbox.com', 'fakemailgenerator.com',
  'trashmail.com', 'trashmail.net', 'trashmail.org',
  'getnada.com', 'nada.email',
  'mohmal.com', 'mohmal.tech',
  'emailondeck.com',
  'dispostable.com',
  'maildrop.cc',
  'sharklasers.com', 'guerrillamailblock.com',
  'spam4.me', 'spamgourmet.com',
  'getairmail.com',
  'moakt.com', 'moakt.ws',
  'tempinbox.com',
  'mailnesia.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'mintemail.com',
  'mt2009.com', 'mt2014.com', 'mt2015.com',
  'emailfake.com',
  'crazymailing.com',
  'tempsky.com',
  'burnermail.io',
  'mailsac.com',
  'inboxkitten.com',
  'minuteinbox.com',
  'emailtemporario.com.br',
  'correotemporal.org',
  'emailtemporal.org',
  'tempmailaddress.com',
  'fakemail.net',
  'dropmail.me',
  'harakirimail.com',
  'mailcatch.com',
  'spambox.us',
  'tempomail.fr',
  'tmpmail.org', 'tmpmail.net',
  'anonymbox.com',
  'emailsensei.com',
]);

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'DISPOSABLE_EMAIL' | 'INVALID_DOMAIN' | 'NO_MX_RECORD';
  checks: {
    format: boolean;
    notDisposable: boolean;
    mxRecord: boolean;
  };
}

/**
 * Full email validation with DNS MX lookup
 * Use this for critical emails (password reset, invitations)
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const result: EmailValidationResult = {
    valid: false,
    checks: { format: false, notDisposable: false, mxRecord: false }
  };

  // Normalize email
  const normalizedEmail = email?.trim().toLowerCase();

  // 1. Check basic presence
  if (!normalizedEmail || typeof normalizedEmail !== 'string') {
    result.error = 'Email é obrigatório';
    result.errorCode = 'INVALID_FORMAT';
    return result;
  }

  // 2. Check length (RFC 5321 limit)
  if (normalizedEmail.length > 254) {
    result.error = 'Email demasiado longo';
    result.errorCode = 'INVALID_FORMAT';
    return result;
  }

  // 3. Validate format with regex
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    result.error = 'Formato de email inválido';
    result.errorCode = 'INVALID_FORMAT';
    return result;
  }
  result.checks.format = true;

  // Extract domain
  const domain = normalizedEmail.split('@')[1];

  // 4. Check for disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    result.error = 'Emails temporários não são permitidos';
    result.errorCode = 'DISPOSABLE_EMAIL';
    return result;
  }
  result.checks.notDisposable = true;

  // 5. Verify MX records via DNS lookup
  try {
    const mxRecords = await Deno.resolveDns(domain, 'MX');
    if (!mxRecords || mxRecords.length === 0) {
      result.error = 'Este domínio não aceita emails';
      result.errorCode = 'NO_MX_RECORD';
      return result;
    }
    result.checks.mxRecord = true;
  } catch (error) {
    // DNS lookup failed - domain probably doesn't exist
    result.error = 'Domínio de email não existe';
    result.errorCode = 'INVALID_DOMAIN';
    return result;
  }

  result.valid = true;
  return result;
}

/**
 * Quick format-only validation (no DNS lookup)
 * Use this for non-critical validations or high-volume operations
 */
export function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return EMAIL_REGEX.test(normalized) && normalized.length <= 254;
}

/**
 * Check if email domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}
