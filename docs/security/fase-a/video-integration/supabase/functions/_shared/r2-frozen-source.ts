/**
 * Candidate-only immutable ingestion input for Cloudflare Stream.
 *
 * A presigned PUT can still overwrite the caller's object after HEAD. To avoid
 * ingestion racing with that PUT, first copy the exact HEAD version to a
 * service-owned object key, using R2 CopyObject source ETag precondition and
 * destination create-only condition. No client receives a PUT for this prefix.
 *
 * Retain a held outbox reference before attempting the copy; crashes may
 * leave an empty held reference or an orphan snapshot for reconciliation.
 * Never automatically delete a snapshot from this candidate.
 */
export interface FrozenSourceDependencies {
  hold: (key: string) => Promise<void>;
  copyConditional: (sourceKey: string, targetKey: string, sourceEtag: string) => Promise<void>;
  head: (key: string) => Promise<{ size: number; etag: string } | null>;
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function frozenObjectKey(workspaceId: string, operationId: string): string {
  if (!UUID.test(workspaceId) || !UUID.test(operationId))
    throw new Error('FROZEN_KEY_INVALID');
  // Not reachable through the five-segment uploader key issuer.
  return `__willflow_frozen/${workspaceId}/${operationId}`;
}
export async function freezeVideoSource(
  params: { workspaceId: string; operationId: string; key: string; size: number; etag: string },
  deps: FrozenSourceDependencies,
): Promise<string> {
  const { workspaceId, operationId, key, size, etag } = params;
  if (!key || key.startsWith('__willflow_frozen/') ||
      !Number.isSafeInteger(size) || size <= 0 ||
      typeof etag !== 'string' || !/^("[^"\r\n]{1,127}"|[a-zA-Z0-9_-]{1,127})$/.test(etag))
    throw new Error('FROZEN_SOURCE_INVALID');
  const dest = frozenObjectKey(workspaceId, operationId);
  // Write held reference before any external side effect, fail closed on DB error.
  await deps.hold(dest);
  // If the source changed between HEAD and CopyObject, R2 must return 412.
  // A preexisting destination must never be overwritten.
  await deps.copyConditional(key, dest, etag);
  const facts = await deps.head(dest);
  if (!facts || facts.size !== size || !facts.etag)
    throw new Error('FROZEN_SOURCE_UNCONFIRMED');
  return dest;
}
