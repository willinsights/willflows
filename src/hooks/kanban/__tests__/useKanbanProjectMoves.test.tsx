import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import { useKanbanProjectMoves } from '../useKanbanProjectMoves';

// Fictitious board only.
const state = vi.hoisted(() => ({
  toast: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
  rpc: vi.fn(),
}));

vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'ws-demo' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-demo' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/lib/kanban/transferToEditing', () => ({ transferToEditing: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (u: Record<string, unknown>) => { state.updates.push(u); return { eq: async () => ({ error: null }) }; },
      insert: () => ({ then: (cb: () => void) => cb() }),
    }),
    rpc: (...args: unknown[]) => { state.rpc(...args); return { then: (cb: (r: { error: null }) => void) => cb({ error: null }) }; },
  },
}));

type Col = { id: string; name: string; is_final: boolean; projects: Array<{ id: string; name: string; edicao_column_id?: string }> };
type Moves = Parameters<typeof useKanbanProjectMoves>[0];

const columns = (): Col[] => [
  { id: 'col-a', name: 'Por editar', is_final: false, projects: [{ id: 'p1', name: 'Projeto Demo', edicao_column_id: 'col-a' }] },
  { id: 'col-b', name: 'Em edição', is_final: false, projects: [] },
  { id: 'col-z', name: 'Entregue', is_final: true, projects: [] },
];

const setup = () => {
  let cols = columns();
  const setColumns = vi.fn((fn: Col[] | ((prev: Col[]) => Col[])) => { cols = typeof fn === 'function' ? fn(cols) : fn; });
  const hook = renderHook(() => useKanbanProjectMoves({
    phase: 'edicao', columns: cols as unknown as Moves['columns'], setColumns: setColumns as unknown as Moves['setColumns'], fetchColumns: vi.fn(async () => {}), markLocalUpdate: vi.fn(),
  }));
  return { hook, getCols: () => cols };
};

const undoAction = (): ReactElement<{ onClick: () => void }> | undefined => {
  const call = state.toast.mock.calls.find(([arg]) => isValidElement(arg?.action));
  return call?.[0].action;
};

describe('F1c — anular depois de mover um card', () => {
  beforeEach(() => { state.toast.mockReset(); state.updates = []; state.rpc.mockReset(); });

  it('oferece anular num movimento normal e repõe a coluna de origem', async () => {
    const { hook, getCols } = setup();
    await act(async () => { await hook.result.current.moveProject('p1', 'col-b'); });
    expect(state.updates.at(-1)).toMatchObject({ edicao_column_id: 'col-b' });
    const action = undoAction();
    expect(action).toBeDefined();

    state.toast.mockReset();
    await act(async () => { action!.props.onClick(); await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
    expect(state.updates.at(-1)).toMatchObject({ edicao_column_id: 'col-a' });
    expect(getCols().find((c) => c.id === 'col-a')?.projects.map((p) => p.id)).toEqual(['p1']);
    // O próprio anular não oferece outro anular.
    expect(undoAction()).toBeUndefined();
  });

  it('não oferece anular quando o destino é a coluna final (entrega)', async () => {
    state.rpc.mockImplementation(() => undefined);
    const { hook } = setup();
    await act(async () => { await hook.result.current.moveProject('p1', 'col-z').catch(() => {}); });
    expect(undoAction()).toBeUndefined();
  });
});
