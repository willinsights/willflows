// Approval link tokens are shown once at creation and never stored server-side,
// so the browser keeps the last generated link per card to offer copy again.
const APPROVAL_LINK_KEYS = 'wf_approval_link_tokens';

export type ApprovalLinkScope = { workspaceId: string; projectId: string; taskId?: string | null };
export type StoredApprovalLink = { token: string; expiresAt: number };

const key = ({ workspaceId, projectId, taskId }: ApprovalLinkScope) =>
  JSON.stringify([workspaceId, projectId, taskId ?? null]);

function readAll(): Record<string, StoredApprovalLink> {
  try {
    const parsed = JSON.parse(localStorage.getItem(APPROVAL_LINK_KEYS) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveApprovalLink(scope: ApprovalLinkScope, token: string, expiresAt: number): void {
  try {
    localStorage.setItem(APPROVAL_LINK_KEYS, JSON.stringify({ ...readAll(), [key(scope)]: { token, expiresAt } }));
  } catch {
    // Private browsing: the link stays available until the card is reopened.
  }
}

export function loadApprovalLink(scope: ApprovalLinkScope): string | null {
  const entry = readAll()[key(scope)];
  if (!entry || typeof entry.token !== 'string' || !/^wf2_[0-9a-f]{64}$/.test(entry.token)) return null;
  if (typeof entry.expiresAt !== 'number' || entry.expiresAt <= Date.now()) return null;
  return entry.token;
}

export function clearApprovalLink(scope: ApprovalLinkScope): void {
  try {
    const { [key(scope)]: _removed, ...rest } = readAll();
    localStorage.setItem(APPROVAL_LINK_KEYS, JSON.stringify(rest));
  } catch {
    // Nothing to forget when storage is unavailable.
  }
}
