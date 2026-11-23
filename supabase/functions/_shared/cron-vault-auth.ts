// A1: scheduled jobs authenticate with a Vault-managed bearer (wfcron_...).
// The token lives only in Vault; cron commands read it at run time and the
// functions verify its SHA-256 digest through a service-only RPC. Existing
// credentials (x-cron-secret, managed LOVABLE_CRON_SECRET) stay accepted until
// the cutover is confirmed, so this is additive.
import { createHash } from "node:crypto";

export const CRON_TOKEN_PATTERN = /^Bearer (wfcron_[0-9a-f]{64})$/;

export function cronTokenDigest(header: string | null): string | null {
  const token = CRON_TOKEN_PATTERN.exec(header ?? "")?.[1];
  return token ? createHash("sha256").update(token).digest("hex") : null;
}

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

/** True only when the request carries a Vault cron token whose digest the database confirms. */
export async function isVaultCronRequest(req: Request, rpc: Rpc): Promise<boolean> {
  const digest = cronTokenDigest(req.headers.get("authorization"));
  if (!digest) return false;
  try {
    const { data, error } = await rpc("verify_cron_digest", { p_digest: digest });
    return !error && data === true;
  } catch {
    return false;
  }
}
