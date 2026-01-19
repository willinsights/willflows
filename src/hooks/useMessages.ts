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

      // Get messages first
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('parent_message_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Fetch profiles for users
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = userIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] };
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const messagesWithUsers = (data || []).map(m => ({
        ...m,
        user: profileMap.get(m.user_id) || null
      }));
      
      return { messages: messagesWithUsers, nextCursor: data?.length === PAGE_SIZE ? pageParam + 1 : null };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    initialPageParam: 0,
  });

  // Fetch reactions for all messages
  const messageIds = data?.pages.flatMap(page => page.messages.map(m => m.id)) || [];
  
  const { data: reactionsData } = useQuery({
    queryKey: ['message-reactions', conversationId, messageIds.length],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);
      if (error) throw error;
      return data || [];
    },
    enabled: messageIds.length > 0,
  });

  const messages: Message[] = (data?.pages.flatMap(page => page.messages).reverse() || []).map(m => {
    // Group reactions by emoji
    const msgReactions = (reactionsData || []).filter(r => r.message_id === m.id);
    const reactionGroups = msgReactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, users: [], reacted_by_me: false };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user_id);
      if (r.user_id === user?.id) {
        acc[r.emoji].reacted_by_me = true;
      }
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: string[]; reacted_by_me: boolean }>);

    return {
      ...m,
      metadata: m.metadata as Record<string, any> | null,
      reactions: Object.values(reactionGroups),
    };
  });

  const sendMessage = useMutation({
    mutationFn: async ({ body, parentMessageId, attachments, mentionedUserIds }: { body: string; parentMessageId?: string; attachments?: File[]; mentionedUserIds?: string[] }) => {
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

      // Save mentions (triggers will create notifications)
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const uniqueUserIds = [...new Set(mentionedUserIds)];
        await supabase.from('message_mentions').insert(
          uniqueUserIds.map(userId => ({
            message_id: data.id,
            mentioned_user_id: userId,
          }))
        );
      }

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const filePath = `${user.id}/${data.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          // Save attachment reference
          await supabase.from('message_attachments').insert({
            message_id: data.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });
        }
      }

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
    queryClient.invalidateQueries({ queryKey: ['message-reactions', conversationId] });
  }, [user?.id, conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['message-reactions', conversationId] });
        }
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
      
      // Fetch profiles
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] };
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      // Map to Message type with proper metadata handling
      return (data || []).map(m => ({
        ...m,
        metadata: m.metadata as Record<string, any> | null,
        user: profileMap.get(m.user_id) || null,
        reactions: [],
      })) as Message[];
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
