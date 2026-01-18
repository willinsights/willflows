import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';

export type MessageType = 'text' | 'post' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  body: string;
  type: MessageType;
  parent_message_id: string | null;
  metadata: Record<string, any> | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: { full_name: string | null; avatar_url: string | null; email: string } | null;
  reactions?: { emoji: string; count: number; users: string[]; reacted_by_me: boolean }[];
}

const PAGE_SIZE = 50;

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) return { messages: [], nextCursor: null };

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('parent_message_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { messages: data || [], nextCursor: data?.length === PAGE_SIZE ? pageParam + 1 : null };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    initialPageParam: 0,
  });

  const messages: Message[] = (data?.pages.flatMap(page => page.messages).reverse() || []).map(m => ({
    ...m,
    metadata: m.metadata as Record<string, any> | null,
    reactions: [],
  }));

  const sendMessage = useMutation({
    mutationFn: async ({ body, parentMessageId }: { body: string; parentMessageId?: string }) => {
      if (!conversationId || !user?.id) throw new Error('Conversa ou utilizador não encontrado');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          body,
          parent_message_id: parentMessageId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setReplyingTo(null);
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar mensagem', { description: error.message });
    },
  });

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    }
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  }, [user?.id, conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return { messages, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, sendMessage, toggleReaction, replyingTo, setReplyingTo };
}

export function useThreadMessages(parentMessageId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['thread-messages', parentMessageId],
    queryFn: async () => {
      if (!parentMessageId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('parent_message_id', parentMessageId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!parentMessageId,
  });

  useEffect(() => {
    if (!parentMessageId) return;
    const channel = supabase
      .channel(`thread:${parentMessageId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `parent_message_id=eq.${parentMessageId}` },
        () => queryClient.invalidateQueries({ queryKey: ['thread-messages', parentMessageId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [parentMessageId, queryClient]);

  return { messages, isLoading, error };
}
