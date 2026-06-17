import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockWorkspace = { id: "ws-1", name: "WS" };

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ currentWorkspace: mockWorkspace, workspace: mockWorkspace }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Capture the payload passed to insert()
const insertSpy = vi.fn();

const buildFromBuilder = () => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      count: 0,
    }),
  }),
  insert: (payload: Record<string, unknown>) => {
    insertSpy(payload);
    return {
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: "inv-1", ...payload },
            error: null,
          }),
      }),
    };
  },
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => buildFromBuilder()),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u-1" } } }),
    },
  },
}));

import { useProjectInvoices } from "../useProjectInvoices";

describe("useProjectInvoices — persistência de vat_amount e vat_source", () => {
  beforeEach(() => {
    insertSpy.mockReset();
  });

  it("persiste vat_amount calculado e vat_source='workspace' por defeito", async () => {
    const { result } = renderHook(() => useProjectInvoices("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addInvoice({
        project_id: "proj-1",
        client_id: "client-1",
        subtotal: 1000,
        tax_rate: 23,
        vat_source: "workspace",
      });
    });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.subtotal).toBe(1000);
    expect(payload.tax_rate).toBe(23);
    expect(payload.tax_amount).toBeCloseTo(230, 2);
    expect(payload.total).toBeCloseTo(1230, 2);
    expect(payload.vat_rate_applied).toBe(23);
    expect(payload.vat_amount).toBeCloseTo(230, 2);
    expect(payload.vat_source).toBe("workspace");
    expect(payload.vat_override_reason).toBeNull();
  });

  it("persiste vat_source='client' quando taxa vem do override do cliente", async () => {
    const { result } = renderHook(() => useProjectInvoices("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addInvoice({
        project_id: "proj-1",
        client_id: "client-1",
        subtotal: 500,
        tax_rate: 6,
        vat_source: "client",
      });
    });

    const payload = insertSpy.mock.calls[0][0];
    expect(payload.vat_source).toBe("client");
    expect(payload.vat_rate_applied).toBe(6);
    expect(payload.vat_amount).toBeCloseTo(30, 2);
  });

  it("persiste vat_source='manual' + razão quando IVA é personalizado na invoice", async () => {
    const { result } = renderHook(() => useProjectInvoices("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addInvoice({
        project_id: "proj-1",
        client_id: "client-1",
        subtotal: 200,
        tax_rate: 0,
        vat_source: "manual",
        vat_override_reason: "IVA reverso UE",
      });
    });

    const payload = insertSpy.mock.calls[0][0];
    expect(payload.vat_source).toBe("manual");
    expect(payload.vat_override_reason).toBe("IVA reverso UE");
    expect(payload.vat_rate_applied).toBe(0);
    expect(payload.vat_amount).toBe(0);
    expect(payload.total).toBe(200);
  });

  it("cliente isento → vat_amount=0 e total=subtotal", async () => {
    const { result } = renderHook(() => useProjectInvoices("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addInvoice({
        project_id: "proj-1",
        client_id: "client-exempt",
        subtotal: 750,
        tax_rate: 0,
        vat_source: "client",
      });
    });

    const payload = insertSpy.mock.calls[0][0];
    expect(payload.vat_amount).toBe(0);
    expect(payload.total).toBe(750);
    expect(payload.vat_source).toBe("client");
  });
});
