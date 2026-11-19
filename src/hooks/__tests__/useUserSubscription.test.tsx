import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
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
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: "test-user-id" } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
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

  it("loads the signed-in account's subscription and usage", async () => {
    const { result } = renderHook(() => useUserSubscription(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.subscription).toMatchObject({ plan: "pro", status: "active" }));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.usage).toEqual({ workspaces: 1, users: 3, projects: 15 });
    expect(result.current.limits).toBeDefined();
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
