import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { mockFetchAllRows, mockTeamQuery } = vi.hoisted(() => ({
  mockFetchAllRows: vi.fn(),
  mockTeamQuery: vi.fn(),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: "test-workspace-id", name: "Test Workspace" },
    fetchError: false,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}));

vi.mock("@/hooks/useFinancialPermissions", () => ({
  useFinancialPermissions: () => ({
    canViewAllFinancials: true,
    canViewAllProjects: true,
    isLoading: false,
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/fetch-all", () => ({
  fetchAllRows: mockFetchAllRows,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mockTeamQuery,
      })),
    })),
  },
}));

import { useFilteredProjects } from "../useFilteredProjects";

describe("useFilteredProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamQuery.mockResolvedValue({ data: [], error: null });
  });

  it("começa em carregamento e termina sem erro quando a leitura corre bem", async () => {
    mockFetchAllRows.mockResolvedValue([{ id: "p1", name: "Projeto 1" }]);

    const { result } = renderHook(() => useFilteredProjects());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.projects).toHaveLength(1);
  });

  it("expõe o erro quando a leitura falha e limpa-o ao tentar de novo", async () => {
    mockFetchAllRows.mockRejectedValueOnce(new Error("falha"));

    const { result } = renderHook(() => useFilteredProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.projects).toHaveLength(0);

    mockFetchAllRows.mockResolvedValue([{ id: "p1", name: "Projeto 1" }]);
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe(false);
    expect(result.current.projects).toHaveLength(1);
  });
});
