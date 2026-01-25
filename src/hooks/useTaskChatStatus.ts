import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TaskChatStatus {
  hasChat: boolean;
  conversationId: string | null;
  unreadCount: number;
  isLoading: boolean;
}

export function useTaskChatStatus(taskId: string | undefined): TaskChatStatus {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['task-chat-status', taskId, user?.id],
    queryFn: async () => {
      if (!taskId || !user?.id) {
        return { hasChat: false, conversationId: null, unreadCount: 0 };
      }

      // 1. Check if task has any message links
      const { data: taskLinks, error: linkError } = await supabase
        .from('message_task_links')
        .select('message_id')
        .eq('task_id', taskId)
        .limit(1);

      if (linkError || !taskLinks?.length) {
        return { hasChat: false, conversationId: null, unreadCount: 0 };
      }

      // 2. Get conversation_id from the linked message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('id', taskLinks[0].message_id)
        .maybeSingle();

      if (messageError || !message?.conversation_id) {
        return { hasChat: false, conversationId: null, unreadCount: 0 };
      }

      const conversationId = message.conversation_id;

      // 3. Get user's last_read_at for this conversation
      const { data: membership } = await supabase
        .from('conversation_members')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      const lastReadAt = membership?.last_read_at || new Date(0).toISOString();

      // 4. Count unread messages (after last_read_at, not from current user)
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', lastReadAt)
        .neq('user_id', user.id);

      if (countError) {
        console.error('Error counting unread messages:', countError);
      }

      return {
        hasChat: true,
        conversationId,
        unreadCount: count || 0,
      };
    },
    enabled: !!taskId && !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  return {
    hasChat: data?.hasChat ?? false,
    conversationId: data?.conversationId ?? null,
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
  };
}
