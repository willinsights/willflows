export type VideoApprovalReader = 'legacy' | 'private' | 'invalid';
// A reserved capability prefix can never fall through to legacy token lookup.
export function videoApprovalReader(token: string | undefined): VideoApprovalReader {
  if (!token) return 'invalid';
  if (token.startsWith('wf2_')) return /^wf2_[0-9a-f]{64}$/.test(token) ? 'private' : 'invalid';
  return 'legacy';
}