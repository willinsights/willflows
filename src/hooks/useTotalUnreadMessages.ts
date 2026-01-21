import { useMemo } from 'react';
import { useConversations } from './useConversations';

export function useTotalUnreadMessages() {
  const { conversations, isLoading } = useConversations();

  const totalUnread = useMemo(() => {
    if (!conversations) return 0;
    return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  }, [conversations]);

  return { totalUnread, isLoading };
}
