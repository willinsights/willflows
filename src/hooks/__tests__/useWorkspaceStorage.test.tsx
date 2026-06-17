import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const GB = 1024 * 1024 * 1024;

let mockStorageRow: Record<string, unknown> | null = null;

const mockWorkspace = { id: "ws-1", name: "WS" };

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: mockWorkspace, currentWorkspace: mockWorkspace }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockStorageRow, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: mockStorageRow, error: null }),
        }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}));

import { useWorkspaceStorage } from "../useWorkspaceStorage";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useWorkspaceStorage — quota check (client-side)", () => {
  beforeEach(() => {
    mockStorageRow = null;
  });

  it("permite upload quando há espaço disponível", async () => {
    mockStorageRow = {
      id: "s-1",
      workspace_id: "ws-1",
      storage_used_bytes: 2 * GB,
      storage_limit_bytes: 10 * GB,
      base_storage_bytes: 10 * GB,
      extra_storage_bytes: 0,
      stripe_addon_subscription_id: null,
      addon_tier: null,
      last_calculated_at: new Date().toISOString(),
    };

    const { result } = renderHook(() => useWorkspaceStorage(), { wrapper });
    await waitFor(() => expect(result.current.storage.usedBytes).toBe(2 * GB));

    expect(result.current.storage.canUpload(1 * GB)).toBe(true);
    expect(result.current.storage.isFull).toBe(false);
    expect(result.current.storage.isNearLimit).toBe(false);
  });

  it("bloqueia upload que excede o limite", async () => {
    mockStorageRow = {
      id: "s-1",
      workspace_id: "ws-1",
      storage_used_bytes: 9 * GB,
      storage_limit_bytes: 10 * GB,
      base_storage_bytes: 10 * GB,
      extra_storage_bytes: 0,
      stripe_addon_subscription_id: null,
      addon_tier: null,
      last_calculated_at: new Date().toISOString(),
    };

    const { result } = renderHook(() => useWorkspaceStorage(), { wrapper });
    await waitFor(() => expect(result.current.storage.usedBytes).toBe(9 * GB));

    expect(result.current.storage.canUpload(2 * GB)).toBe(false);
    expect(result.current.storage.canUpload(1 * GB)).toBe(true);
  });

  it("marca como isFull quando used >= limit", async () => {
    mockStorageRow = {
      id: "s-1",
      workspace_id: "ws-1",
      storage_used_bytes: 10 * GB,
      storage_limit_bytes: 10 * GB,
      base_storage_bytes: 10 * GB,
      extra_storage_bytes: 0,
      stripe_addon_subscription_id: null,
      addon_tier: null,
      last_calculated_at: new Date().toISOString(),
    };

    const { result } = renderHook(() => useWorkspaceStorage(), { wrapper });
    await waitFor(() => expect(result.current.storage.isFull).toBe(true));

    expect(result.current.storage.canUpload(1)).toBe(false);
    expect(result.current.storage.percentUsed).toBe(100);
    expect(result.current.storage.remainingBytes).toBe(0);
  });

  it("isNearLimit a >= 80% e percentUsed correcto", async () => {
    mockStorageRow = {
      id: "s-1",
      workspace_id: "ws-1",
      storage_used_bytes: 8 * GB,
      storage_limit_bytes: 10 * GB,
      base_storage_bytes: 10 * GB,
      extra_storage_bytes: 0,
      stripe_addon_subscription_id: null,
      addon_tier: null,
      last_calculated_at: new Date().toISOString(),
    };

    const { result } = renderHook(() => useWorkspaceStorage(), { wrapper });
    await waitFor(() => expect(result.current.storage.percentUsed).toBe(80));
    expect(result.current.storage.isNearLimit).toBe(true);
    expect(result.current.storage.isFull).toBe(false);
  });
});
