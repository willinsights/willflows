import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';

export type MessageType = 'text' | 'post' | 'system';

export interface MessageAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
}

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
  attachments?: MessageAttachment[];
  read_by?: { user_id: string; read_at: string }[];
  reply_to?: { id: string; body: string; user_name: string } | null;
}

const PAGE_SIZE = 50;

interface RawPageMessage {
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
  user: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
  attachments: MessageAttachment[];
  reactions_raw: { emoji: string; user_id: string }[];
  reads: { user_id: string; read_at: string }[];
}

function shapeMessage(m: RawPageMessage, currentUserId?: string): Message {
  const groups = (m.reactions_raw || []).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [], reacted_by_me: false };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user_id);
    if (r.user_id === currentUserId) acc[r.emoji].reacted_by_me = true;
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; reacted_by_me: boolean }>);

  const replyTo = (m.metadata as any)?.reply_to ?? null;

  return {
    id: m.id,
    conversation_id: m.conversation_id,
    user_id: m.user_id,
    body: m.body,
    type: m.type,
    parent_message_id: m.parent_message_id,
    metadata: m.metadata,
    is_edited: m.is_edited,
    is_deleted: m.is_deleted,
    created_at: m.created_at,
    updated_at: m.updated_at,
    user: m.user,
    attachments: m.attachments || [],
    reactions: Object.values(groups),
    read_by: m.reads || [],
    reply_to: replyTo,
  };
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!conversationId) return { messages: [] as Message[], nextCursor: null as string | null };

      const { data, error } = await (supabase as any).rpc('get_conversation_page', {
        _conversation_id: conversationId,
        _limit: PAGE_SIZE,
        _before: pageParam,
      });
      if (error) throw error;

      const payload = (data || {}) as { messages: RawPageMessage[]; has_more: boolean; oldest_at: string | null };
      const messages = (payload.messages || []).map((m) => shapeMessage(m, user?.id));
      const nextCursor = payload.has_more && payload.oldest_at ? payload.oldest_at : null;
      return { messages, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    initialPageParam: null as string | null,
    staleTime: 15_000,
  });

  // Reverse for chronological order (oldest first, newest at bottom - WhatsApp style)
  const messages: Message[] = data?.pages.flatMap((page) => page.messages).reverse() || [];

  const sendMessage = useMutation({
    mutationFn: async ({ body, parentMessageId, attachments, mentionedUserIds, replyTo }: { 
      body: string; 
      parentMessageId?: string; 
      attachments?: File[]; 
      mentionedUserIds?: string[];
      replyTo?: { id: string; body: string; user_name: string } | null;
    }) => {

      if (!conversationId || !user?.id) throw new Error('Conversa ou utilizador não encontrado');

      const metadata = replyTo ? { reply_to: replyTo } : null;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          body,
          parent_message_id: parentMessageId || null,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const uniqueUserIds = [...new Set(mentionedUserIds)];
        await supabase.from('message_mentions').insert(
          uniqueUserIds.map(userId => ({
            message_id: data.id,
            mentioned_user_id: userId,
          }))
        );

        const uniqueMentionedIds = uniqueUserIds.filter(id => id !== user.id);
        for (const mentionedUserId of uniqueMentionedIds) {
          await supabase
            .from('conversation_members')
            .upsert(
              { conversation_id: conversationId, user_id: mentionedUserId, role: 'member' },
              { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
            )
            .select();
        }
      }

      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/__+/g, '_');
          const filePath = `${user.id}/${data.id}/${Date.now()}-${sanitizedName}`;

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);

          if (uploadError) {
            toast.error('Erro ao carregar ficheiro', { description: `${file.name}: ${uploadError.message}` });
            continue;
          }

          const { error: attachError } = await supabase.from('message_attachments').insert({
            message_id: data.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });

          if (attachError) {
            toast.error('Erro ao guardar referência do anexo', { description: file.name });
          }
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
  }, [user?.id, conversationId, queryClient]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    await supabase
      .from('message_reads')
      .upsert(
        { message_id: messageId, user_id: user.id },
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      );
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  }, [user?.id, conversationId, queryClient]);

  const updateMessage = useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('messages')
        .update({
          body,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao editar mensagem', { description: error.message });
    },
  });

  // Realtime: append/update/delete in the first page cache without refetching
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.parent_message_id) return;

          const currentData = queryClient.getQueryData(['messages', conversationId]) as any;
          if (currentData?.pages) {
            const allMessages = currentData.pages.flatMap((p: any) => p.messages);
            if (allMessages.some((m: any) => m.id === newMessage.id)) return;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithUser: Message = {
            ...newMessage,
            user: profile || null,
            reactions: [],
            attachments: [],
            read_by: [],
            reply_to: (newMessage.metadata as any)?.reply_to ?? null,
          };

          queryClient.setQueryData(['messages', conversationId], (old: any) => {
            if (!old?.pages?.[0]) return old;
            return {
              ...old,
              pages: old.pages.map((page: any, index: number) =>
                index === 0
                  ? { ...page, messages: [messageWithUser, ...page.messages] }
                  : page
              ),
            };
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updatedMessage = payload.new as any;
          queryClient.setQueryData(['messages', conversationId], (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((m: any) =>
                  m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
                ),
              })),
            };
          });
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const deletedMessage = payload.old as any;
          queryClient.setQueryData(['messages', conversationId], (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.filter((m: any) => m.id !== deletedMessage.id),
              })),
            };
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return { messages, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, sendMessage, updateMessage, toggleReaction, markAsRead, replyingTo, setReplyingTo };
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

      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

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
