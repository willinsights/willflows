// Shared rate limiting for public (token-based) endpoints.
// Backed by public.check_public_rate_limit / public.log_public_access_attempt.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export function clientIdentifier(req: Request, token?: string | null): string {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const tokenPart = token ? token.substring(0, 12) : 'no-token';
  return `${ip}|${tokenPart}`;
}

export async function isRateLimited(
  supabase: SupabaseLike,
  identifier: string,
  action: string,
  maxFailures = 10,
  windowMinutes = 15,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_public_rate_limit', {
      _identifier: identifier,
      _action: action,
      _max_failures: maxFailures,
      _window_minutes: windowMinutes,
    });
    if (error) {
      console.error('[rate-limit] check failed:', error.message);
      return false; // never block legitimate traffic on infra failure
    }
    return data === false;
  } catch (e) {
    console.error('[rate-limit] check error:', e);
    return false;
  }
}

export async function logAttempt(
  supabase: SupabaseLike,
  identifier: string,
  action: string,
  succeeded: boolean,
): Promise<void> {
  try {
    await supabase.rpc('log_public_access_attempt', {
      _identifier: identifier,
      _action: action,
      _succeeded: succeeded,
    });
  } catch (e) {
    console.error('[rate-limit] log error:', e);
  }
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Demasiadas tentativas. Tente novamente dentro de alguns minutos.' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
