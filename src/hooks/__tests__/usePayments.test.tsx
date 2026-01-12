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

vi.mock("@/lib/validation-schemas", () => ({
  paymentSchema: {},
  paymentUpdateSchema: {},
  validateWithSchema: vi.fn(() => ({ success: true, data: {} })),
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: "new-payment", amount: 100 }, 
          error: null 
        })),
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

import { usePayments, useTeamPayments } from "../usePayments";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("usePayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return payments array", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(Array.isArray(result.current.payments)).toBe(true);
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loading).toBe("boolean");
  });

  it("should provide createPayment function", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.createPayment).toBe("function");
  });

  it("should provide updatePayment function", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updatePayment).toBe("function");
  });

  it("should provide updatePaymentStatus function", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updatePaymentStatus).toBe("function");
  });

  it("should provide deletePayment function", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.deletePayment).toBe("function");
  });

  it("should provide refresh function", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should return summaries object", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(result.current.summaries).toBeDefined();
    expect(result.current.summaries).toHaveProperty("totalReceivable");
    expect(result.current.summaries).toHaveProperty("totalPayable");
    expect(result.current.summaries).toHaveProperty("totalReceived");
    expect(result.current.summaries).toHaveProperty("totalPaid");
    expect(result.current.summaries).toHaveProperty("overdue");
    expect(result.current.summaries).toHaveProperty("pending");
  });

  it("should have correct initial summary values", () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createWrapper(),
    });

    expect(result.current.summaries.totalReceivable).toBe(0);
    expect(result.current.summaries.totalPayable).toBe(0);
    expect(result.current.summaries.totalReceived).toBe(0);
    expect(result.current.summaries.totalPaid).toBe(0);
    expect(result.current.summaries.overdue).toBe(0);
    expect(result.current.summaries.pending).toBe(0);
  });
});

describe("useTeamPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teamPayments array", () => {
    const { result } = renderHook(() => useTeamPayments(), {
      wrapper: createWrapper(),
    });

    expect(Array.isArray(result.current.teamPayments)).toBe(true);
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => useTeamPayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loading).toBe("boolean");
  });

  it("should provide updateTeamPaymentStatus function", () => {
    const { result } = renderHook(() => useTeamPayments(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updateTeamPaymentStatus).toBe("function");
  });
});
