import { afterEach, describe, expect, it } from 'vitest';
import { clearApprovalLink, loadApprovalLink, saveApprovalLink, type ApprovalLinkScope } from './approval-link-keys';

const TOKEN = 'wf2_' + 'a'.repeat(64);
const DAY = 86_400_000;
const scope: ApprovalLinkScope = { workspaceId: 'ws-1', projectId: 'pr-1', taskId: null };
const other: ApprovalLinkScope = { workspaceId: 'ws-1', projectId: 'pr-2', taskId: null };

afterEach(() => localStorage.clear());

describe('approval link tokens kept in the browser', () => {
  it('returns the saved token for the same card', () => {
    saveApprovalLink(scope, TOKEN, Date.now() + DAY);
    expect(loadApprovalLink(scope)).toBe(TOKEN);
  });

  it('returns nothing for another card', () => {
    saveApprovalLink(scope, TOKEN, Date.now() + DAY);
    expect(loadApprovalLink(other)).toBeNull();
  });

  it('returns nothing after the link expires', () => {
    saveApprovalLink(scope, TOKEN, Date.now() - 1);
    expect(loadApprovalLink(scope)).toBeNull();
  });

  it('forgets the token when cleared', () => {
    saveApprovalLink(scope, TOKEN, Date.now() + DAY);
    clearApprovalLink(scope);
    expect(loadApprovalLink(scope)).toBeNull();
  });

  it('ignores a malformed storage entry', () => {
    localStorage.setItem('wf_approval_link_tokens', 'not-json');
    expect(loadApprovalLink(scope)).toBeNull();
    saveApprovalLink(scope, TOKEN, Date.now() + DAY);
    expect(loadApprovalLink(scope)).toBe(TOKEN);
  });
});
