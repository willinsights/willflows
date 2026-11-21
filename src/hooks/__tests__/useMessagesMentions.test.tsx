import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  // Ordem das escritas feitas pelo envio, ex.: "member:rui", "mention:rui"
  calls: [] as string[],
  rejectedMentions: new Set<string>(),
  rejectedMembers: new Set<string>(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "autor" } }),
}));

vi.mock("@/hooks/useAppToast", () => ({
  useAppToast: () => h.toast,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => {
  const realtimeChannel: any = {};
  realtimeChannel.on = vi.fn(() => realtimeChannel);
  realtimeChannel.subscribe = vi.fn(() => realtimeChannel);

  const from = vi.fn((table: string) => {
    if (table === "messages") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: "msg-1" }, error: null })),
          })),
        })),
      };
    }
    if (table === "message_mentions") {
      return {
        insert: vi.fn((row: { mentioned_user_id: string }) => {
          h.calls.push(`mention:${row.mentioned_user_id}`);
          return Promise.resolve({
            error: h.rejectedMentions.has(row.mentioned_user_id)
              ? { message: "new row violates row-level security policy" }
              : null,
          });
        }),
      };
    }
    if (table === "conversation_members") {
      return {
        upsert: vi.fn((row: { user_id: string }) => {
          h.calls.push(`member:${row.user_id}`);
          return {
            select: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: h.rejectedMembers.has(row.user_id) ? { message: "denied" } : null,
              })
            ),
          };
        }),
      };
    }
    throw new Error(`Tabela inesperada no teste: ${table}`);
  });

  return {
    supabase: {
      from,
      rpc: vi.fn(() => Promise.resolve({ data: { messages: [], has_more: false, oldest_at: null }, error: null })),
      channel: vi.fn(() => realtimeChannel),
      removeChannel: vi.fn(),
    },
  };
});

import { useMessages } from "../useMessages";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useMessages - menções", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.calls.length = 0;
    h.rejectedMentions.clear();
    h.rejectedMembers.clear();
  });

  it("uma menção recusada não impede as outras e gera aviso sem bloquear o envio", async () => {
    h.rejectedMentions.add("rui");
    const { result } = renderHook(() => useMessages("conv-1"), { wrapper: createWrapper() });

    let sent: any;
    await act(async () => {
      sent = await result.current.sendMessage.mutateAsync({
        body: "Olá @Ana @Rui @Eva",
        mentionedUserIds: ["ana", "rui", "eva", "ana"],
        mentionNames: { ana: "Ana", rui: "Rui", eva: "Eva" },
      });
    });

    expect(sent).toEqual({ id: "msg-1" });
    // Uma inserção por pessoa (sem duplicados) e as seguintes à recusa continuam.
    expect(h.calls).toEqual(["mention:ana", "mention:rui", "mention:eva"]);
    expect(h.toast.warning).toHaveBeenCalledTimes(1);
    expect(h.toast.warning.mock.calls[0][0]).toBe("Não foi possível notificar Rui");
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("sem falhas não mostra aviso nem tenta adicionar membros por omissão", async () => {
    const { result } = renderHook(() => useMessages("conv-1"), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage.mutateAsync({ body: "Olá @Ana", mentionedUserIds: ["ana"] });
    });

    expect(h.calls).toEqual(["mention:ana"]);
    expect(h.toast.warning).not.toHaveBeenCalled();
  });

  it("sem nomes conhecidos o aviso refere o número de pessoas", async () => {
    h.rejectedMentions.add("ana");
    h.rejectedMentions.add("rui");
    const { result } = renderHook(() => useMessages("conv-1"), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage.mutateAsync({ body: "Olá", mentionedUserIds: ["ana", "rui"] });
    });

    expect(h.toast.warning.mock.calls[0][0]).toBe("Não foi possível notificar 2 pessoas mencionadas");
  });

  it("quem gere membros adiciona o mencionado à conversa antes de inserir a menção", async () => {
    const { result } = renderHook(() => useMessages("conv-1"), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage.mutateAsync({
        body: "Olá @Rui @Eva",
        mentionedUserIds: ["rui", "autor", "eva"],
        addMentionedToConversation: true,
      });
    });

    // O próprio autor não é readicionado à conversa.
    expect(h.calls).toEqual(["member:rui", "mention:rui", "mention:autor", "member:eva", "mention:eva"]);
    expect(h.toast.warning).not.toHaveBeenCalled();
  });
});
