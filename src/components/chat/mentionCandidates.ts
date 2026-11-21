// Quem pode ser mencionado numa conversa, alinhado com a regra do servidor
// (política "Message author can add mentions" em message_mentions):
// só é aceite quem já é membro da conversa ou, em canal público, qualquer
// membro ativo do workspace.

export interface MentionCandidate {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface WorkspaceMemberLike {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface ConversationLike {
  type: string;
  is_private: boolean;
  created_by: string | null;
}

interface MembershipLike {
  role: string;
  is_active: boolean;
}

const MEMBER_MANAGER_ROLES = ['admin', 'edicao'];

export function isPublicChannel(conversation: Pick<ConversationLike, 'type' | 'is_private'> | null | undefined): boolean {
  return conversation?.type === 'channel' && !conversation.is_private;
}

// Espelha can_manage_conversation_members: criador da conversa ou papel
// admin/edicao ativo no workspace. O servidor continua a ser a autoridade.
export function canManageConversationMembers(
  conversation: Pick<ConversationLike, 'created_by'> | null | undefined,
  userId: string | null | undefined,
  membership: MembershipLike | null | undefined,
): boolean {
  if (!conversation || !userId) return false;
  if (conversation.created_by === userId) return true;
  return !!membership && membership.is_active && MEMBER_MANAGER_ROLES.includes(membership.role);
}

export function getMentionCandidates({
  conversation,
  workspaceMembers,
  conversationMemberIds,
  canManageMembers,
}: {
  conversation: Pick<ConversationLike, 'type' | 'is_private'> | null | undefined;
  workspaceMembers: WorkspaceMemberLike[];
  conversationMemberIds: string[];
  canManageMembers: boolean;
}): MentionCandidate[] {
  if (!conversation || conversation.type === 'dm') return [];

  const allowAllWorkspaceMembers = isPublicChannel(conversation) || canManageMembers;
  const memberIds = new Set(conversationMemberIds);

  return workspaceMembers
    .filter((m) => m.user_id)
    .filter((m) => allowAllWorkspaceMembers || memberIds.has(m.user_id))
    .map((m) => ({
      id: m.user_id,
      user_id: m.user_id,
      full_name: m.full_name || null,
      avatar_url: m.avatar_url || null,
      email: m.email,
    }));
}
