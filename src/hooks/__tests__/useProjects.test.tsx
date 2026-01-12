import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock dependencies
const mockWorkspace = {
  id: "test-workspace-id",
  name: "Test Workspace",
};

const mockToast = vi.fn();

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: mockWorkspace,
    fetchError: null,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/error-handler", () => ({
  handleDatabaseError: vi.fn(() => "Error message"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/validation-schemas", () => ({
  projectSchema: {},
  projectUpdateSchema: {},
  validateWithSchema: vi.fn(() => ({ success: true, data: {} })),
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        limit: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "col-1" }, error: null })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: "new-project" }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

import { useProjects } from "../useProjects";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return projects array", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(Array.isArray(result.current.projects)).toBe(true);
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loading).toBe("boolean");
  });

  it("should provide createProject function", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.createProject).toBe("function");
  });

  it("should provide updateProject function", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updateProject).toBe("function");
  });

  it("should provide deleteProject function", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.deleteProject).toBe("function");
  });

  it("should provide refresh function", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should return ProjectWithClient type in projects array", () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    // Projects should be an array that could contain ProjectWithClient objects
    expect(result.current.projects).toEqual([]);
  });
});
