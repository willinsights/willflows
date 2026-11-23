import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKanbanData } from '../useKanbanData';

const state = vi.hoisted(() => ({
  workspaceId: 'workspace-a',
  rpc: vi.fn(),
  toast: vi.fn(),
  channel: { on: vi.fn().mockReturnThis(), subscribe: vi.fn() },
}));

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: state.workspaceId }, fetchError: null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
vi.mock('@/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canViewAllProjects: true, isLoading: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: state.rpc, channel: () => state.channel, removeChannel: vi.fn() },
}));

const board = (id: string) => ({ data: { columns: [{ id, projects: [] }] }, error: null });

describe('useKanbanData', () => {
  beforeEach(() => {
    state.workspaceId = 'workspace-a';
    state.rpc.mockReset();
    state.toast.mockReset();
  });

  it('distinguishes a failed load from an empty board and retries', async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: new Error('Unavailable') });
    state.rpc.mockResolvedValueOnce(board('delivery'));
    const { result } = renderHook(() => useKanbanData('edicao'));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.loading).toBe(false);

    await act(() => result.current.fetchColumns());
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.columns.map(({ id }) => id)).toEqual(['delivery']);
  });

  it('ignores a request that finishes after switching workspace', async () => {
    let finishFirst!: (value: ReturnType<typeof board>) => void;
    state.rpc.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    state.rpc.mockResolvedValueOnce(board('current'));
    const { result, rerender } = renderHook(() => useKanbanData('edicao'));

    state.workspaceId = 'workspace-b';
    rerender();
    await waitFor(() => expect(result.current.columns.map(({ id }) => id)).toEqual(['current']));

    await act(async () => finishFirst(board('stale')));
    expect(result.current.columns.map(({ id }) => id)).toEqual(['current']);
  });
});
