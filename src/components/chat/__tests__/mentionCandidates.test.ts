import { describe, it, expect } from "vitest";
import {
  getMentionCandidates,
  canManageConversationMembers,
  isPublicChannel,
} from "../mentionCandidates";

const workspaceMembers = [
  { user_id: "ana", full_name: "Ana", avatar_url: null, email: "ana@example.com" },
  { user_id: "rui", full_name: "Rui", avatar_url: null, email: "rui@example.com" },
  { user_id: "eva", full_name: "Eva", avatar_url: null, email: "eva@example.com" },
];

const ids = (list: { user_id: string }[]) => list.map((m) => m.user_id);

describe("getMentionCandidates", () => {
  it("num chat de projeto só oferece os membros da conversa", () => {
    const result = getMentionCandidates({
      conversation: { type: "project", is_private: false },
      workspaceMembers,
      conversationMemberIds: ["ana", "rui"],
      canManageMembers: false,
    });
    expect(ids(result)).toEqual(["ana", "rui"]);
  });

  it("num canal privado só oferece os membros da conversa", () => {
    const result = getMentionCandidates({
      conversation: { type: "channel", is_private: true },
      workspaceMembers,
      conversationMemberIds: ["eva"],
      canManageMembers: false,
    });
    expect(ids(result)).toEqual(["eva"]);
  });

  it("num canal público oferece todos os membros ativos do workspace", () => {
    const result = getMentionCandidates({
      conversation: { type: "channel", is_private: false },
      workspaceMembers,
      conversationMemberIds: ["ana"],
      canManageMembers: false,
    });
    expect(ids(result)).toEqual(["ana", "rui", "eva"]);
  });

  it("quem gere membros vê todo o workspace mesmo num chat de projeto", () => {
    const result = getMentionCandidates({
      conversation: { type: "project", is_private: false },
      workspaceMembers,
      conversationMemberIds: ["ana"],
      canManageMembers: true,
    });
    expect(ids(result)).toEqual(["ana", "rui", "eva"]);
  });

  it("não oferece ninguém em DM nem enquanto a conversa não está carregada", () => {
    const base = { workspaceMembers, conversationMemberIds: ["ana"], canManageMembers: true };
    expect(getMentionCandidates({ ...base, conversation: { type: "dm", is_private: true } })).toEqual([]);
    expect(getMentionCandidates({ ...base, conversation: undefined })).toEqual([]);
  });
});

describe("canManageConversationMembers", () => {
  const conversation = { created_by: "ana" };

  it("aceita o criador da conversa", () => {
    expect(canManageConversationMembers(conversation, "ana", { role: "captacao", is_active: true })).toBe(true);
  });

  it("aceita admin e edicao ativos no workspace", () => {
    expect(canManageConversationMembers(conversation, "rui", { role: "admin", is_active: true })).toBe(true);
    expect(canManageConversationMembers(conversation, "rui", { role: "edicao", is_active: true })).toBe(true);
  });

  it("recusa outros papéis, membros inativos e dados em falta", () => {
    expect(canManageConversationMembers(conversation, "rui", { role: "gestao", is_active: true })).toBe(false);
    expect(canManageConversationMembers(conversation, "rui", { role: "admin", is_active: false })).toBe(false);
    expect(canManageConversationMembers(conversation, "rui", null)).toBe(false);
    expect(canManageConversationMembers(undefined, "rui", { role: "admin", is_active: true })).toBe(false);
  });
});

describe("isPublicChannel", () => {
  it("só é público o canal não privado", () => {
    expect(isPublicChannel({ type: "channel", is_private: false })).toBe(true);
    expect(isPublicChannel({ type: "channel", is_private: true })).toBe(false);
    expect(isPublicChannel({ type: "project", is_private: false })).toBe(false);
    expect(isPublicChannel(undefined)).toBe(false);
  });
});
