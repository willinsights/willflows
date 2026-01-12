import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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

  it("should return subscription data when user exists", async () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toBeDefined();
    expect(result.current.subscription?.plan).toBe("pro");
    expect(result.current.subscription?.status).toBe("active");
  });

  it("should calculate limits based on plan", async () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Pro plan limits
    expect(result.current.limits.workspaces).toBeGreaterThan(0);
    expect(result.current.limits.users).toBeGreaterThan(0);
    expect(result.current.limits.projects).toBeGreaterThan(0);
  });

  it("should fetch usage counts", async () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage.workspaces).toBe(1);
    expect(result.current.usage.projects).toBe(15);
    expect(result.current.usage.users).toBe(3);
  });

  it("should provide refresh function", async () => {
    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("should handle errors gracefully", async () => {
    // Override mock to return an error
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "Not found" } })
          ),
        })),
      })),
    });

    const { result } = renderHook(() => useUserSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should handle error without crashing
    expect(result.current.error).toBeDefined();
  });
});
