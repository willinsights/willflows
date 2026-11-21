// Verify signing-key JWTs without requiring a session_id claim. Never decode unverified identity.
export interface PrivateVideoAuth {
  getClaims: (token: string) => Promise<{
    data: { claims: { sub?: unknown; role?: unknown } } | null;
    error: unknown;
  }>;
}
export async function authenticatePrivateVideo(req: Request, auth: PrivateVideoAuth): Promise<string | null> {
  const token = /^Bearer ([^\s,]+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) return null;
  try {
    const { data, error } = await auth.getClaims(token);
    const claims = data?.claims;
    if (error || claims?.role !== 'authenticated' || typeof claims.sub !== 'string') return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub) ? claims.sub : null;
  } catch {
    return null;
  }
}