import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock modules before importing the hook
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@example.com" },
    loading: false,
  })),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: vi.fn(() => ({
    currentWorkspace: {
      id: "test-workspace-id",
      name: "Test Workspace",
      slug: "test-workspace",
      currency: "EUR",
      locale: "pt-PT",
      timezone: "Europe/Lisbon",
      country: "PT",
      subscription_plan: "pro",
      subscription_status: "active",
      trial_ends_at: null,
    },
    setCurrentWorkspace: vi.fn(),
    loading: false,
  })),
}));

// Import hook after mocks
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCurrentWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return workspace info when workspace exists", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    expect(result.current.workspaceId).toBe("test-workspace-id");
    expect(result.current.workspaceName).toBe("Test Workspace");
    expect(result.current.hasWorkspace).toBe(true);
  });

  it("should return correct regional settings", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currency).toBe("EUR");
    expect(result.current.locale).toBe("pt-PT");
    expect(result.current.timezone).toBe("Europe/Lisbon");
    expect(result.current.country).toBe("PT");
  });

  it("should return subscription details", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    expect(result.current.subscriptionPlan).toBe("pro");
    expect(result.current.subscriptionStatus).toBe("active");
    expect(result.current.isTrialing).toBe(false);
  });

  it("should format currency correctly for EUR", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    const formatted = result.current.formatCurrency(1234.56);
    expect(formatted).toContain("1");
    expect(formatted).toContain("234");
  });

  it("should format date correctly", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    const date = new Date("2024-01-15");
    const formatted = result.current.formatDate(date);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });

  it("should provide permission helpers", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isAdmin).toBe("boolean");
    expect(typeof result.current.canEdit).toBe("boolean");
    expect(typeof result.current.canManageTeam).toBe("boolean");
  });

  it("should provide state flags", () => {
    const { result } = renderHook(() => useCurrentWorkspace(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isLoading).toBe("boolean");
    expect(typeof result.current.hasError).toBe("boolean");
    expect(typeof result.current.hasWorkspace).toBe("boolean");
  });
});
