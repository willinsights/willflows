import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockWorkspace = { id: "ws-1", name: "WS", vat_rate_default: 23 };

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: mockWorkspace, currentWorkspace: mockWorkspace }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { useEffectiveVat, vatSourceLabel } from "../useEffectiveVat";

describe("useEffectiveVat — cascata workspace → cliente → invoice", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("usa taxa do workspace quando cliente não tem override", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ vat_rate: 23, vat_regime: "standard", source: "workspace" }],
      error: null,
    });

    const { result } = renderHook(() => useEffectiveVat(null));

    await waitFor(() => expect(result.current.effectiveVat).not.toBeNull());
    expect(result.current.effectiveVat).toEqual({
      vat_rate: 23,
      vat_regime: "standard",
      source: "workspace",
    });
    expect(rpcMock).toHaveBeenCalledWith("get_effective_vat", {
      p_workspace_id: "ws-1",
      p_client_id: undefined,
    });
  });

  it("usa override do cliente quando definido", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ vat_rate: 6, vat_regime: "reduced", source: "client" }],
      error: null,
    });

    const { result } = renderHook(() => useEffectiveVat("client-1"));

    await waitFor(() => expect(result.current.effectiveVat?.source).toBe("client"));
    expect(result.current.effectiveVat?.vat_rate).toBe(6);
  });

  it("retorna 0% e source=exempt quando cliente está isento", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ vat_rate: 0, vat_regime: "exempt", source: "exempt" }],
      error: null,
    });

    const { result } = renderHook(() => useEffectiveVat("client-exempt"));

    await waitFor(() => expect(result.current.effectiveVat?.source).toBe("exempt"));
    expect(result.current.effectiveVat?.vat_rate).toBe(0);
  });

  it("faz fallback para taxa padrão do workspace em caso de erro na RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });

    const { result } = renderHook(() => useEffectiveVat("client-x"));

    await waitFor(() => expect(result.current.effectiveVat).not.toBeNull());
    expect(result.current.effectiveVat).toEqual({
      vat_rate: 23,
      vat_regime: "standard",
      source: "workspace",
    });
  });

  it("vatSourceLabel devolve rótulo legível para cada origem", () => {
    expect(vatSourceLabel("workspace")).toMatch(/workspace/i);
    expect(vatSourceLabel("client")).toMatch(/cliente/i);
    expect(vatSourceLabel("exempt")).toMatch(/isento/i);
  });
});
