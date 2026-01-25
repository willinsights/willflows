import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface ProjectChatStatus {
  hasChat: boolean;
  conversationId: string | null;
  unreadCount: number;
  isLoading: boolean;
}

export function useProjectChatStatus(projectId: string | undefined): ProjectChatStatus {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['project-chat-status', projectId, user?.id],
    queryFn: async () => {
      if (!projectId || !user?.id) return null;

      // Get project conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('project_id', projectId)
        .eq('type', 'project')
        .maybeSingle();

      if (!conversation) return null;

      const conversationId = conversation.id;

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
    enabled: !!projectId && !!user?.id,
    staleTime: 30000,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!data?.conversationId || !user?.id) return;

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${data.conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-chat-status', projectId, user.id] });
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
          if ((payload.new as any).user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ['project-chat-status', projectId, user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.conversationId, projectId, user?.id, queryClient]);

  const hasChat = !!data?.conversationId;
  const conversationId = data?.conversationId || null;
  const unreadCount = data?.unreadCount || 0;

  return { hasChat, conversationId, unreadCount, isLoading };
}
