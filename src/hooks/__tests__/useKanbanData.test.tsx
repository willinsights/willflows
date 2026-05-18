import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const WORKSPACE_ID = 'ws-1';

const handlers: Record<string, (payload: unknown) => void> = {};

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: WORKSPACE_ID }, fetchError: null }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: USER_ID } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canViewAllProjects: true, isLoading: false }),
}));
vi.mock('@/lib/error-handler', () => ({ handleDatabaseError: vi.fn(() => 'err') }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rpcMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ data: { columns: [] }, error: null })
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...(args as [string, Record<string, unknown>])),
    channel: () => {
      const chain = {
        on: (_evt: string, cfg: { table: string }, handler: (p: unknown) => void) => {
          handlers[cfg.table] = handler;
          return chain;
        },
        subscribe: () => chain,
      };
      return chain;
    },
    removeChannel: vi.fn(),
  },
}));

import { useKanbanData } from '@/hooks/kanban/useKanbanData';

/** Aguarda até que rpcMock pare de crescer durante `stableMs`. */
async function waitForRpcSettled(stableMs = 400) {
  let prev = -1;
  let stableSince = Date.now();
  // Up to 3s overall
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50));
    const curr = rpcMock.mock.calls.length;
    if (curr !== prev) {
      prev = curr;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= stableMs) {
      return curr;
    }
  }
  return rpcMock.mock.calls.length;
}

describe('useKanbanData — anti-echo (C-3)', () => {
  beforeEach(() => {
    rpcMock.mockClear();
    Object.keys(handlers).forEach(k => delete handlers[k]);
  });

  it('faz fetch inicial via get_kanban_board', async () => {
    renderHook(() => useKanbanData('edicao'));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith(
        'get_kanban_board',
        expect.objectContaining({ p_workspace_id: WORKSPACE_ID, p_user_id: USER_ID })
      )
    );
  });

  it('suprime evento próprio quando updated_by === userId (sem refetch extra)', async () => {
    renderHook(() => useKanbanData('edicao'));
    const baseline = await waitForRpcSettled();
    expect(baseline).toBeGreaterThan(0);

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p1', current_phase: 'edicao', updated_by: USER_ID },
        old: { id: 'p1', current_phase: 'edicao', updated_by: USER_ID },
      });
    });
    // Debounce is 300ms; give it room.
    await new Promise(r => setTimeout(r, 600));
    expect(rpcMock).toHaveBeenCalledTimes(baseline);
  });

  it('dispara refetch quando updated_by é outro utilizador', async () => {
    renderHook(() => useKanbanData('edicao'));
    const baseline = await waitForRpcSettled();

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p2', current_phase: 'edicao', updated_by: OTHER_USER_ID },
        old: { id: 'p2', current_phase: 'edicao', updated_by: OTHER_USER_ID },
      });
    });
    await waitFor(() => expect(rpcMock.mock.calls.length).toBeGreaterThan(baseline), {
      timeout: 2000,
    });
  });

  it('TTL fallback: markLocalUpdate suprime evento sem updated_by', async () => {
    const { result } = renderHook(() => useKanbanData('edicao'));
    const baseline = await waitForRpcSettled();

    act(() => {
      result.current.markLocalUpdate('p3');
    });

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p3', current_phase: 'edicao', updated_by: null },
        old: { id: 'p3', current_phase: 'edicao', updated_by: null },
      });
    });
    await new Promise(r => setTimeout(r, 600));
    expect(rpcMock).toHaveBeenCalledTimes(baseline);
  });

  it('TTL fallback expira: evento >1500ms após markLocalUpdate causa refetch', async () => {
    const { result } = renderHook(() => useKanbanData('edicao'));
    const baseline = await waitForRpcSettled();

    act(() => {
      result.current.markLocalUpdate('p4');
    });

    // Esperar TTL (1500ms) + margem
    await new Promise(r => setTimeout(r, 1700));

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p4', current_phase: 'edicao', updated_by: null },
        old: { id: 'p4', current_phase: 'edicao', updated_by: null },
      });
    });
    await waitFor(() => expect(rpcMock.mock.calls.length).toBeGreaterThan(baseline), {
      timeout: 2000,
    });
  });
});
