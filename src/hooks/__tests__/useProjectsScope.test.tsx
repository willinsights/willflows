import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  workspaceId: 'workspace-a',
  canViewAllProjects: true,
  permissionsLoading: false,
  assignments: vi.fn(),
  projects: vi.fn(),
}));

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: mock.workspaceId }, fetchError: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({
    canViewAllProjects: mock.canViewAllProjects,
    isLoading: mock.permissionsLoading,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      if (table === 'project_team') {
        return { select: () => ({ eq: () => ({ order: () => ({ abortSignal: () => ({ range: () => mock.assignments() }) }) }) }) };
      }
      const query = {
        select: () => query,
        eq: (_field: string, workspaceId: string) => {
          const scoped = {
            order: () => scoped,
            in: () => scoped,
            abortSignal: () => ({ range: () => mock.projects(workspaceId) }),
          };
          return scoped;
        },
      };
      return query;
    },
  },
}));

import { useProjects } from '../useProjects';
import { PROJECTS_CHANGED_EVENT, queryClient as sharedQueryClient } from '@/lib/query-client';

const wait = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });

function renderProjects(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return renderHook(() => useProjects(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe('project list visibility scope', () => {
  beforeEach(() => {
    mock.workspaceId = 'workspace-a';
    mock.canViewAllProjects = true;
    mock.permissionsLoading = false;
    mock.assignments.mockReset();
    mock.projects.mockReset();
  });

  it('ignores an earlier workspace response that resolves after changing workspaces', async () => {
    let resolveA!: (value: { data: { id: string }[]; error: null }) => void;
    const pendingA = new Promise<{ data: { id: string }[]; error: null }>(resolve => {
      resolveA = resolve;
    });
    mock.projects.mockImplementation((workspaceId: string) =>
      workspaceId === 'workspace-a' ? pendingA : Promise.resolve({ data: [{ id: 'project-b' }], error: null }),
    );
    const { result, rerender } = renderProjects();
    await waitFor(() => expect(mock.projects).toHaveBeenCalledWith('workspace-a'));

    mock.workspaceId = 'workspace-b';
    rerender();
    expect(result.current.projects).toEqual([]);
    await waitFor(() => expect(result.current.projects).toEqual([{ id: 'project-b' }]));

    await act(async () => resolveA({ data: [{ id: 'project-a' }], error: null }));
    expect(result.current.projects).toEqual([{ id: 'project-b' }]);
  });

  it('hides prior results on a permission change and distinguishes an assignment error from an empty list', async () => {
    mock.projects.mockResolvedValue({ data: [{ id: 'admin-project' }], error: null });
    const { result, rerender } = renderProjects();
    await waitFor(() => expect(result.current.projects).toEqual([{ id: 'admin-project' }]));

    mock.permissionsLoading = true;
    rerender();
    expect(result.current.projects).toEqual([]);

    const error = new Error('Assignment lookup failed');
    mock.assignments.mockResolvedValue({ data: null, error });
    mock.canViewAllProjects = false;
    mock.permissionsLoading = false;
    rerender();

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.projects).toEqual([]);
    expect(mock.projects).toHaveBeenCalledTimes(1);

    mock.assignments.mockResolvedValue({ data: [], error: null });
    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.projects).toEqual([]);
  });

  it("refetches exactly once when ['projects'] is invalidated and still notifies other listeners", async () => {
    mock.projects.mockResolvedValue({ data: [{ id: 'project-a' }], error: null });
    const onChanged = vi.fn();
    window.addEventListener(PROJECTS_CHANGED_EVENT, onChanged);
    const { result, unmount } = renderProjects(sharedQueryClient);
    try {
      await waitFor(() => expect(result.current.projects).toEqual([{ id: 'project-a' }]));
      expect(mock.projects).toHaveBeenCalledTimes(1);

      await act(async () => {
        await sharedQueryClient.invalidateQueries({ queryKey: ['projects'] });
      });
      expect(mock.projects).toHaveBeenCalledTimes(2);

      // Bridge (150 ms) + listener debounce (300 ms): the echo must not trigger a third fetch.
      await wait(700);
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(mock.projects).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, onChanged);
      unmount();
    }
  });

  it('still refetches on a projects-changed event dispatched outside react-query', async () => {
    mock.projects.mockResolvedValue({ data: [{ id: 'project-a' }], error: null });
    const { result } = renderProjects();
    await waitFor(() => expect(result.current.projects).toEqual([{ id: 'project-a' }]));

    act(() => {
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    });
    await waitFor(() => expect(mock.projects).toHaveBeenCalledTimes(2));
  });

  it('keeps both project consumers loaded while a newly mounted consumer refreshes shared data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mock.projects.mockResolvedValueOnce({ data: [{ id: 'project-a' }], error: null });
    const parent = renderProjects(client);
    await waitFor(() => expect(parent.result.current.loading).toBe(false));

    let finishRefresh: ((value: { data: { id: string }[]; error: null }) => void) | undefined;
    mock.projects.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
    const child = renderProjects(client);
    await waitFor(() => expect(mock.projects).toHaveBeenCalledTimes(2));
    await wait(30);
    expect(parent.result.current.loading).toBe(false);
    expect(child.result.current.loading).toBe(false);
    expect(parent.result.current.projects).toEqual([{ id: 'project-a' }]);
    expect(child.result.current.projects).toEqual([{ id: 'project-a' }]);

    if (!finishRefresh) throw new Error('Shared refresh never started');
    await act(async () => finishRefresh?.({ data: [{ id: 'project-updated' }], error: null }));
    await waitFor(() => expect(parent.result.current.projects).toEqual([{ id: 'project-updated' }]));
    expect(child.result.current.projects).toEqual([{ id: 'project-updated' }]);
    expect(mock.projects).toHaveBeenCalledTimes(2);
    parent.unmount(); child.unmount(); client.clear();
  });
});
