import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const rpcMock = vi.fn((..._args: unknown[]) => Promise.resolve({ data: { columns: [] }, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: [string, Record<string, unknown>]) => rpcMock(...args),
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

const flush = () => new Promise(resolve => setTimeout(resolve, 350));

describe('useKanbanData — anti-echo (C-3)', () => {
  beforeEach(() => {
    rpcMock.mockClear();
    Object.keys(handlers).forEach(k => delete handlers[k]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('faz fetch inicial via get_kanban_board', async () => {
    renderHook(() => useKanbanData('edicao'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith(
      'get_kanban_board',
      expect.objectContaining({ p_workspace_id: WORKSPACE_ID, p_user_id: USER_ID })
    ));
  });

  it('suprime evento próprio quando updated_by === userId (sem refetch)', async () => {
    renderHook(() => useKanbanData('edicao'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p1', current_phase: 'edicao', updated_by: USER_ID },
        old: { id: 'p1', current_phase: 'edicao', updated_by: USER_ID },
      });
    });
    await flush();
    expect(rpcMock).toHaveBeenCalledTimes(1); // no extra refetch
  });

  it('dispara refetch quando updated_by é outro utilizador', async () => {
    renderHook(() => useKanbanData('edicao'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p2', current_phase: 'edicao', updated_by: OTHER_USER_ID },
        old: { id: 'p2', current_phase: 'edicao', updated_by: OTHER_USER_ID },
      });
    });
    await flush();
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
  });

  it('TTL fallback: markLocalUpdate suprime evento sem updated_by', async () => {
    const { result } = renderHook(() => useKanbanData('edicao'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    act(() => { result.current.markLocalUpdate('p3'); });

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p3', current_phase: 'edicao', updated_by: null },
        old: { id: 'p3', current_phase: 'edicao', updated_by: null },
      });
    });
    await flush();
    expect(rpcMock).toHaveBeenCalledTimes(1); // suprimido por TTL
  });

  it('TTL fallback expira: após >1500ms o evento sem updated_by causa refetch', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKanbanData('edicao'));
    await vi.waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));

    act(() => { result.current.markLocalUpdate('p4'); });
    act(() => { vi.advanceTimersByTime(2000); });

    act(() => {
      handlers['projects']?.({
        eventType: 'UPDATE',
        new: { id: 'p4', current_phase: 'edicao', updated_by: null },
        old: { id: 'p4', current_phase: 'edicao', updated_by: null },
      });
    });
    act(() => { vi.advanceTimersByTime(400); });
    await vi.waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
  });
});
