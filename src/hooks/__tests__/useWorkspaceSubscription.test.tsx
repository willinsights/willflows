import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkspaceSubscription } from '../useWorkspaceSubscription';

const state = vi.hoisted(() => ({
  workspace: {
    id: 'workspace', name: 'Trial', subscription_plan: 'starter',
    subscription_status: 'trialing', trial_ends_at: null as string | null,
    past_due_since: null as string | null,
  },
}));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({
  workspace: state.workspace, membership: { role: 'admin' }, loading: false, isAdmin: true, isWorkspaceOwner: true, canEdit: true,
}) }));
vi.mock('../useSuperAdmin', () => ({ useSuperAdmin: () => ({ isSuperAdmin: false }) }));

describe('Workspace trial duration', () => {
  beforeEach(() => {
    state.workspace.subscription_status = 'trialing';
    state.workspace.trial_ends_at = null;
    state.workspace.past_due_since = null;
  });
  it('trial without an end date is not valid (same rule as the server)', () => {
    const { result } = renderHook(() => useWorkspaceSubscription());
    expect(result.current.trialDaysRemaining).toBeNull();
    expect(result.current.access.reason).toBe('trial_no_end');
    expect(result.current.isWorkspaceExpired).toBe(true);
    expect(result.current.trialExpired).toBe(true);
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
  it('expires at the saved UTC instant, including fractions of a day', () => {
    vi.useFakeTimers();
    try {
      state.workspace.trial_ends_at = '2026-11-07T14:45:00Z';
      vi.setSystemTime(new Date('2026-11-07T14:44:59Z'));
      expect(renderHook(() => useWorkspaceSubscription()).result.current.trialDaysRemaining).toBe(1);
      vi.setSystemTime(new Date(state.workspace.trial_ends_at));
      const { result } = renderHook(() => useWorkspaceSubscription());
      expect(result.current.trialDaysRemaining).toBe(0);
      expect(result.current.trialExpired).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

describe('Workspace past due grace period', () => {
  beforeEach(() => {
    state.workspace.subscription_status = 'past_due';
    state.workspace.trial_ends_at = null;
    state.workspace.past_due_since = null;
  });

  it('stays active inside the seven-day grace period and counts the days left', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
      state.workspace.past_due_since = '2026-11-18T12:00:00Z';
      const { result } = renderHook(() => useWorkspaceSubscription());
      expect(result.current.isWorkspaceExpired).toBe(false);
      expect(result.current.isPastDueGrace).toBe(true);
      expect(result.current.pastDueDaysLeft).toBe(4);
      expect(result.current.access.reason).toBe('past_due_grace');
    } finally { vi.useRealTimers(); }
  });

  it('blocks once the grace period is over', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
      state.workspace.past_due_since = '2026-11-14T12:00:00Z';
      const { result } = renderHook(() => useWorkspaceSubscription());
      expect(result.current.isWorkspaceExpired).toBe(true);
      expect(result.current.isPastDueGrace).toBe(false);
      expect(result.current.pastDueDaysLeft).toBeNull();
      expect(result.current.access.reason).toBe('past_due_expired');
      expect(result.current.trialExpired).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it('treats a missing past-due date as now (full grace period)', () => {
    const { result } = renderHook(() => useWorkspaceSubscription());
    expect(result.current.isWorkspaceExpired).toBe(false);
    expect(result.current.pastDueDaysLeft).toBe(7);
  });
});
