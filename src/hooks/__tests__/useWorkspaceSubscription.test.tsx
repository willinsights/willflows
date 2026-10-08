import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkspaceSubscription } from '../useWorkspaceSubscription';

const state = vi.hoisted(() => ({
  workspace: {
    id: 'workspace', name: 'Trial', subscription_plan: 'starter',
    subscription_status: 'trialing', trial_ends_at: null as string | null,
  },
}));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({
  workspace: state.workspace, membership: { role: 'admin' }, loading: false, isAdmin: true, canEdit: true,
}) }));
vi.mock('../useSuperAdmin', () => ({ useSuperAdmin: () => ({ isSuperAdmin: false }) }));

describe('Workspace trial duration', () => {
  beforeEach(() => { state.workspace.trial_ends_at = null; });
  it('uses a seven-day fallback when no end date exists', () => {
    expect(renderHook(() => useWorkspaceSubscription()).result.current.trialDaysRemaining).toBe(7);
  });
  it('preserves an existing thirty-day trial instead of truncating it', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-08T14:45:00Z'));
      state.workspace.trial_ends_at = '2026-11-07T14:45:00Z';
      const { result } = renderHook(() => useWorkspaceSubscription());
      expect(result.current.trialDaysRemaining).toBe(30);
      expect(result.current.trialEndsAt).toBe('2026-11-07T14:45:00Z');
    } finally { vi.useRealTimers(); }
  });
});