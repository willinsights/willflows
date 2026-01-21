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
      
      // Fetch attachments for messages
      const msgIds = (data || []).map(m => m.id);
      const { data: attachments } = msgIds.length > 0
        ? await supabase.from('message_attachments').select('*').in('message_id', msgIds)
        : { data: [] };
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const attachmentMap = (attachments || []).reduce((acc, a) => {
        if (!acc[a.message_id]) acc[a.message_id] = [];
        acc[a.message_id].push(a);
        return acc;
      }, {} as Record<string, typeof attachments>);
      
      const messagesWithUsers = (data || []).map(m => ({
        ...m,
        user: profileMap.get(m.user_id) || null,
        attachments: attachmentMap[m.id] || [],
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

  // Fetch read receipts for all messages
  const { data: readsData } = useQuery({
    queryKey: ['message-reads', conversationId, messageIds.length],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const { data, error } = await supabase
        .from('message_reads')
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

    // Get read receipts for this message
    const msgReads = (readsData || [])
      .filter(r => r.message_id === m.id)
      .map(r => ({ user_id: r.user_id, read_at: r.read_at }));

    // Extract reply_to from metadata
    const metadataObj = m.metadata as Record<string, any> | null;
    const replyTo = metadataObj?.reply_to as { id: string; body: string; user_name: string } | null;

    return {
      ...m,
      metadata: m.metadata as Record<string, any> | null,
      reactions: Object.values(reactionGroups),
      attachments: m.attachments || [],
      read_by: msgReads,
      reply_to: replyTo,
    };
  });

  const sendMessage = useMutation({
    mutationFn: async ({ body, parentMessageId, attachments, mentionedUserIds, replyTo }: { 
      body: string; 
      parentMessageId?: string; 
      attachments?: File[]; 
      mentionedUserIds?: string[];
      replyTo?: { id: string; body: string; user_name: string } | null;
    }) => {
      console.log('[ChatDebug] Starting sendMessage:', { 
        body: body.substring(0, 50), 
        attachmentsCount: attachments?.length || 0, 
        mentionedUserIds,
        conversationId,
        userId: user?.id,
        hasReplyTo: !!replyTo
      });

      if (!conversationId || !user?.id) throw new Error('Conversa ou utilizador não encontrado');

      // Build metadata with reply_to if present
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

      if (error) {
        console.error('[ChatDebug] Message insert FAILED:', error);
        throw error;
      }
      console.log('[ChatDebug] Message inserted successfully, id:', data.id);

      // Save mentions (triggers will create notifications)
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        console.log('[ChatDebug] Saving mentions for users:', mentionedUserIds);
        const uniqueUserIds = [...new Set(mentionedUserIds)];
        const { error: mentionError } = await supabase.from('message_mentions').insert(
          uniqueUserIds.map(userId => ({
            message_id: data.id,
            mentioned_user_id: userId,
          }))
        );
        if (mentionError) {
          console.error('[ChatDebug] Mention insert FAILED:', mentionError);
        } else {
          console.log('[ChatDebug] Mentions saved successfully');
        }
      }

      // Auto-add mentioned users to conversation members (so they can see the chat)
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const uniqueMentionedIds = [...new Set(mentionedUserIds)].filter(id => id !== user.id);
        for (const mentionedUserId of uniqueMentionedIds) {
          // Use upsert to avoid duplicates - ignore errors (user may already be member)
          await supabase
            .from('conversation_members')
            .upsert(
              { conversation_id: conversationId, user_id: mentionedUserId, role: 'member' },
              { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
            )
            .select();
        }
      }

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        console.log('[ChatDebug] Processing', attachments.length, 'attachments');
        for (const file of attachments) {
          console.log('[ChatDebug] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
          
          // Sanitize filename: replace spaces and special chars
          const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/__+/g, '_');
          const filePath = `${user.id}/${data.id}/${Date.now()}-${sanitizedName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('[ChatDebug] Upload FAILED:', uploadError.message, uploadError);
            toast.error('Erro ao carregar ficheiro', { description: `${file.name}: ${uploadError.message}` });
            continue;
          }
          console.log('[ChatDebug] Upload SUCCESS, path:', filePath);

          // Save attachment reference
          const { error: attachError } = await supabase.from('message_attachments').insert({
            message_id: data.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });
          
          if (attachError) {
            console.error('[ChatDebug] Attachment reference FAILED:', attachError);
            toast.error('Erro ao guardar referência do anexo', { description: file.name });
          } else {
            console.log('[ChatDebug] Attachment reference saved:', file.name);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      console.log('[ChatDebug] sendMessage mutation SUCCESS');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setReplyingTo(null);
    },
    onError: (error: Error) => {
      console.error('[ChatDebug] sendMessage mutation ERROR:', error);
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

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    
    // Use upsert to avoid duplicates
    await supabase
      .from('message_reads')
      .upsert(
        { message_id: messageId, user_id: user.id },
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      );
    
    queryClient.invalidateQueries({ queryKey: ['message-reads', conversationId] });
  }, [user?.id, conversationId, queryClient]);

  // Update message (edit within 15 seconds)
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
