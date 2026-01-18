import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';

export type ConversationType = 'channel' | 'project' | 'dm';

export interface Conversation {
  id: string;
  workspace_id: string;
  type: ConversationType;
  name: string | null;
  project_id: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string; current_phase: string } | null;
}

export function useConversations() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id || !user?.id) return [];

      const { data: memberConversations } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const conversationIds = memberConversations?.map(m => m.conversation_id) || [];

      const { data, error: convError } = await supabase
        .from('conversations')
        .select('*, project:projects(id, name, current_phase)')
        .eq('workspace_id', workspace.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      
      // Filter to show member conversations + public channels
      return (data || []).filter((c: any) => 
        conversationIds.includes(c.id) || (c.type === 'channel' && !c.is_private)
      ) as Conversation[];
    },
    enabled: !!workspace?.id && !!user?.id,
    staleTime: 30000,
  });

  const projectChats = conversations.filter(c => c.type === 'project');
  const channels = conversations.filter(c => c.type === 'channel');
  const dms = conversations.filter(c => c.type === 'dm');

  const createChannel = useMutation({
    mutationFn: async ({ name, isPrivate = false }: { name: string; isPrivate?: boolean }) => {
      if (!workspace?.id || !user?.id) throw new Error('Workspace não encontrado');

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ workspace_id: workspace.id, type: 'channel' as const, name, is_private: isPrivate, created_by: user.id })
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from('conversation_members').insert({ conversation_id: conversation.id, user_id: user.id, role: 'admin' });
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      toast.success('Canal criado');
    },
    onError: (error: Error) => toast.error('Erro ao criar canal', { description: error.message }),
  });

  const joinChannel = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error('Utilizador não encontrado');
      const { error } = await supabase.from('conversation_members').insert({ conversation_id: conversationId, user_id: user.id, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      toast.success('Entrou no canal');
    },
  });

  useEffect(() => {
    if (!workspace?.id) return;

    const channel = supabase
      .channel(`conversations:${workspace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspace.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['conversations', workspace.id] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspace?.id, queryClient]);

  return { conversations, projectChats, channels, dms, isLoading, error, refetch, createChannel, joinChannel };
}

export function useConversation(conversationId: string | undefined) {
  const { user } = useAuth();

  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from('conversations')
        .select('*, project:projects(id, name, current_phase, shoot_date, delivery_date)')
        .eq('id', conversationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['conversation-members', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase.from('conversation_members').select('*').eq('conversation_id', conversationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', user.id);
  }, [conversationId, user?.id]);

  return { conversation, members, isLoading, error, markAsRead };
}
