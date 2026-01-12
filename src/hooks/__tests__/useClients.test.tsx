import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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
  clientSchema: {},
  validateWithSchema: vi.fn(() => ({ success: true, data: {} })),
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: "new-client", name: "Test Client" }, 
          error: null 
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

import { useClients } from "../useClients";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return clients array", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(Array.isArray(result.current.clients)).toBe(true);
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loading).toBe("boolean");
  });

  it("should provide createClient function", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.createClient).toBe("function");
  });

  it("should provide deleteClient function", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.deleteClient).toBe("function");
  });

  it("should provide refresh function", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should initialize with empty clients array", () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createWrapper(),
    });

    expect(result.current.clients).toEqual([]);
  });
});
