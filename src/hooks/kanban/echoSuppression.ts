import { LOCAL_ECHO_TTL_MS } from './types';

/**
 * Anti-echo rule used by Kanban realtime handlers.
 *
 * An incoming realtime payload is considered an "echo" (our own write being
 * mirrored back) when EITHER:
 *  - the row's `updated_by` matches the current `userId` (primary signal,
 *    written by the DB trigger `set_updated_by`), OR
 *  - the record id is present in `pending` and was stamped within
 *    `LOCAL_ECHO_TTL_MS` (fallback for writes made without an authenticated
 *    user context, e.g. RPCs or edge functions).
 *
 * Pure function — no React, no Supabase. Exported for direct testing.
 */
export function isOwnEcho(args: {
  newData?: { updated_by?: string | null } | null;
  oldData?: { updated_by?: string | null } | null;
  recordId?: string;
  userId?: string | null;
  pending: Map<string, number>;
  now?: number;
}): boolean {
  const { newData, oldData, recordId, userId, pending, now = Date.now() } = args;

  // Primary: server-stamped updated_by matches current user
  if (userId) {
    const stamp = newData?.updated_by ?? oldData?.updated_by;
    if (stamp && stamp === userId) return true;
  }

  // Fallback: client-side TTL window for writes without auth context
  if (recordId) {
    const ts = pending.get(recordId);
    if (ts !== undefined) {
      if (now - ts <= LOCAL_ECHO_TTL_MS) return true;
      pending.delete(recordId); // expire
    }
  }

  return false;
}
