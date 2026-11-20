import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface TaskChatStatus {
  hasChat: boolean;
  conversationId: string | null;
  unreadCount: number;
  isLoading: boolean;
}

export function useTaskChatStatus(taskId: string | undefined): TaskChatStatus {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['task-chat-status', taskId, user?.id],
    queryFn: async () => {
      if (!taskId || !user?.id) return null;

      // Get conversation_id from message_task_links
      const { data: links } = await supabase
        .from('message_task_links')
        .select('message_id, messages!inner(conversation_id)')
        .eq('task_id', taskId)
        .limit(1);

      if (!links || links.length === 0) return null;

      const conversationId = (links[0].messages as any)?.conversation_id;
      if (!conversationId) return null;

      // Get user's last_read_at
      const { data: membership } = await supabase
        .from('conversation_members')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      const lastReadAt = membership?.last_read_at || new Date(0).toISOString();

      // Count unread messages
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', lastReadAt)
        .neq('user_id', user.id)
        .eq('is_deleted', false);

      return {
        conversationId,
        unreadCount: count || 0
      };
    },
    enabled: !!taskId && !!user?.id,
    staleTime: 30000,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!data?.conversationId || !user?.id) return;

    const channel = supabase
      .channel(`task-chat-${taskId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${data.conversationId}`,
        },
        () => {
          // Invalidate to refetch unread count
          queryClient.invalidateQueries({ queryKey: ['task-chat-status', taskId, user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${data.conversationId}`,
        },
        (payload) => {
          // Check if it's current user's last_read_at update
          if ((payload.new as any).user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ['task-chat-status', taskId, user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.conversationId, taskId, user?.id, queryClient]);

  const hasChat = !!data?.conversationId;
  const conversationId = data?.conversationId || null;
  const unreadCount = data?.unreadCount || 0;

  return { hasChat, conversationId, unreadCount, isLoading };
}
