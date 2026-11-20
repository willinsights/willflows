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
        return { select: () => ({ eq: () => ({ abortSignal: mock.assignments }) }) };
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

function renderProjects() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
