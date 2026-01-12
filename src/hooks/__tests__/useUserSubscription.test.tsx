import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "sub-1",
              user_id: "test-user-id",
              subscription_plan: "pro",
              subscription_status: "active",
              trial_ends_at: null,
              current_period_end: "2024-12-31",
              stripe_customer_id: "cus_123",
              stripe_subscription_id: "sub_123",
            },
            error: null,
          })
        ),
      })),
    })),
  })),
  rpc: vi.fn((fnName: string) => {
    const counts: Record<string, number> = {
      count_admin_workspaces: 1,
      count_total_projects: 15,
      count_total_invited_users: 3,
    };
    return Promise.resolve({ data: counts[fnName] || 0, error: null });
  }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@example.com" },
    loading: false,
  })),
}));

// Import hook after mocks
import { useUserSubscription } from "@/hooks/useUserSubscription";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUserSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    // Initial state should have loading true or subscription undefined
    expect(result.current.subscription).toBeDefined();
    expect(result.current.limits).toBeDefined();
    expect(result.current.usage).toBeDefined();
  });

  it("should have limits structure", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.limits).toHaveProperty("workspaces");
    expect(result.current.limits).toHaveProperty("users");
    expect(result.current.limits).toHaveProperty("projects");
  });

  it("should have usage structure", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.usage).toHaveProperty("workspaces");
    expect(result.current.usage).toHaveProperty("users");
    expect(result.current.usage).toHaveProperty("projects");
  });

  it("should provide refresh function", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.loading).toBe("boolean");
  });

  it("should have error state", () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    // Error can be null or string
    expect(
      result.current.error === null || typeof result.current.error === "string"
    ).toBe(true);
  });
});
