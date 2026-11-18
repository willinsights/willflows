import { secretEquals } from './timing-safe.ts';

/** Validate configured service-role or legacy cron credentials, then defer to managed cron auth.
 * Returns null only on success; in particular it preserves a managed-auth 500 on missing setup.
 */
export function workerAuthorization(
  request: Request,
  secrets: { service?: string | null; legacy?: string | null },
  managed: (request: Request) => Response | null,
): Response | null {
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (
    secretEquals(secrets.service, token) ||
    secretEquals(secrets.legacy, request.headers.get('x-cron-secret'))
  ) return null;
  return managed(request);
}
