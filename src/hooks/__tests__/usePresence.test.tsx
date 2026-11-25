import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ channels: new Map<string, any>(), removed: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'self' } }) }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'workspace' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  channel: vi.fn((name: string) => {
    const existing = h.channels.get(name);
    if (existing) return existing;
    const handlers: Record<string, () => void> = {};
    const channel = {
      subscribed: false,
      on: vi.fn((type: string, event: { event: string }, cb: () => void) => {
        if (channel.subscribed) throw new Error('Cannot add callbacks after subscribe');
        handlers[event.event] = cb;
        return channel;
      }),
      subscribe: vi.fn((cb: (status: string) => void) => {
        channel.subscribed = true;
        cb('SUBSCRIBED');
        return channel;
      }),
      track: vi.fn(async () => undefined),
      presenceState: () => ({ other: [{ user_id: 'teammate' }] }),
      sync: () => handlers.sync?.(),
    };
    h.channels.set(name, channel);
    return channel;
  }),
  removeChannel: async (channel: unknown) => {
    h.removed(channel);
    for (const [key, value] of h.channels) if (value === channel) h.channels.delete(key);
  },
} }));

import { usePresence } from '../usePresence';

afterEach(async () => { await new Promise(resolve => setTimeout(resolve, 10)); vi.clearAllMocks(); });

describe('shared chat presence', () => {
  it('opens feed and details together without subscribing the same room twice', async () => {
    const feed = renderHook(() => usePresence());
    const details = renderHook(() => usePresence());
    const channel = h.channels.get('workspace-presence:workspace');
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
    act(() => channel.sync());
    expect(feed.result.current.isOnline('teammate')).toBe(true);
    expect(details.result.current.isOnline('teammate')).toBe(true);
    feed.unmount();
    expect(h.removed).not.toHaveBeenCalled();
    details.unmount();
    await waitFor(() => expect(h.removed).toHaveBeenCalledTimes(1));
  });

  it('keeps the subscription during immediate panel remount and heartbeat tracks while connected', async () => {
    vi.useFakeTimers();
    const first = renderHook(() => usePresence());
    first.unmount();
    const reopened = renderHook(() => usePresence());
    const channel = h.channels.get('workspace-presence:workspace');
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(channel.track).toHaveBeenCalledTimes(2);
    reopened.unmount();
    await act(async () => { await vi.runOnlyPendingTimersAsync(); });
    vi.useRealTimers();
  });
});