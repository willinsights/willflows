import { createHash } from "node:crypto";

export async function vaultWorkerAuthorization(
  request: Request,
  verify: (digest: string) => Promise<boolean>,
): Promise<Response | null> {
  const token = /^Bearer (wfworker_[0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response(null, { status: 401 });
  try {
    const digest = createHash("sha256").update(token).digest("hex");
    return await verify(digest) ? null : new Response(null, { status: 401 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
