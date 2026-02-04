import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { chatDebug, chatDebugError, isChatDebugEnabled } from '@/lib/debug-flags';

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
  displayName?: string;
  lastMessage?: { body: string; created_at: string; user_name: string } | null;
  unread_count?: number;
  dmParticipant?: { full_name: string | null; avatar_url: string | null; email?: string | null } | null;
}

export function useConversations() {
  const { workspace, membership } = useWorkspace();
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const { canViewAllProjects, isLoading: permissionsLoading } = useFinancialPermissions();
  
  // Utilizadores sem permissão visibility.all_projects só veem canais onde são membros
  // Agora usa permissão dinâmica em vez de verificação hardcoded

  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', workspace?.id, membership?.role, canViewAllProjects],
    queryFn: async () => {
      if (!workspace?.id || !user?.id || permissionsLoading) return [];

      const { data: memberConversations } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at, is_active')
        .eq('user_id', user.id);

      const conversationIds = memberConversations?.map(m => m.conversation_id) || [];
      const memberConversationIdSet = new Set(conversationIds);
      
      // Map last_read_at and is_active by conversation_id
      const lastReadMap: Record<string, string | null> = {};
      const isActiveMap: Record<string, boolean> = {};
      (memberConversations || []).forEach(m => {
        lastReadMap[m.conversation_id] = m.last_read_at;
        isActiveMap[m.conversation_id] = m.is_active ?? false;
      });

      const { data, error: convError } = await supabase
        .from('conversations')
        .select('*, project:projects(id, name, current_phase)')
        .eq('workspace_id', workspace.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      
      // Filter conversations based on role and type
      // - Chats de projeto: só aparecem se is_active = true
      // - Utilizadores restritos: só veem conversas onde são membros
      // - Outros: veem as suas conversas + canais públicos
      // Usa permissão dinâmica canViewAllProjects em vez de verificação hardcoded
      const isUserRestricted = !canViewAllProjects;
      const filtered = (data || []).filter((c: any) => {
        // Chats de projeto só aparecem se is_active = true
        if (c.type === 'project') {
          return isActiveMap[c.id] === true;
        }
        
        if (isUserRestricted) {
          // Papéis restritos só veem conversas onde são membros
          return conversationIds.includes(c.id);
        }
        // Outros papéis veem as suas conversas + canais públicos
        return conversationIds.includes(c.id) || (c.type === 'channel' && !c.is_private);
      });
      
      // Track which conversations are public channels the user has NOT joined
      const isPublicChannelNotJoined = (conv: any) => 
        conv.type === 'channel' && !conv.is_private && !memberConversationIdSet.has(conv.id);

      // Fetch last messages for each conversation
      const convIds = filtered.map(c => c.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, body, created_at, user_id')
        .in('conversation_id', convIds)
        .is('parent_message_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      // Get user IDs from messages to fetch profiles
      const messageUserIds = [...new Set((lastMessages || []).map(m => m.user_id))];
      let messageProfilesMap: Record<string, any> = {};
      
      if (messageUserIds.length > 0) {
        const { data: msgProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', messageUserIds);
        
        (msgProfiles || []).forEach(p => {
          messageProfilesMap[p.id] = p;
        });
      }

      // Group last messages by conversation
      const lastMessageMap: Record<string, any> = {};
      (lastMessages || []).forEach(msg => {
        if (!lastMessageMap[msg.conversation_id]) {
          const profile = messageProfilesMap[msg.user_id];
          lastMessageMap[msg.conversation_id] = {
            ...msg,
            user_name: profile?.full_name || profile?.email?.split('@')[0] || 'Participante'
          };
        }
      });

      // For DMs, fetch the other participant
      const dmConvs = filtered.filter(c => c.type === 'dm');
      let dmParticipantsMap: Record<string, any> = {};
      
      if (dmConvs.length > 0) {
        const { data: dmMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', dmConvs.map(c => c.id));

        // Get other user IDs (not current user)
        const otherUserIds = [...new Set((dmMembers || []).filter(m => m.user_id !== user.id).map(m => m.user_id))];
        
      if (otherUserIds.length > 0) {
          const { data: dmProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', otherUserIds);
          
          const dmProfilesMap: Record<string, any> = {};
          (dmProfiles || []).forEach(p => {
            dmProfilesMap[p.id] = p;
          });

          // Find the other participant for each DM
          (dmMembers || []).forEach(member => {
            if (member.user_id !== user.id) {
              dmParticipantsMap[member.conversation_id] = dmProfilesMap[member.user_id];
            }
          });
        }
      }

      // Fetch all messages for unread count calculation (messages from others)
      const { data: allMessages } = await supabase
        .from('messages')
        .select('conversation_id, created_at, user_id')
        .in('conversation_id', convIds)
        .is('parent_message_id', null)
        .eq('is_deleted', false)
        .neq('user_id', user.id);

      // Calculate unread counts for each conversation
      const unreadCountMap: Record<string, number> = {};
      for (const conv of filtered) {
        // For public channels user hasn't joined, show 0 unread (they'll see badge after first open)
        if (isPublicChannelNotJoined(conv)) {
          unreadCountMap[conv.id] = 0;
          continue;
        }
        
        const lastReadAt = lastReadMap[conv.id];
        if (lastReadAt) {
          // Count messages after last_read_at
          const unreadMsgs = (allMessages || []).filter(
            m => m.conversation_id === conv.id && 
                 new Date(m.created_at) > new Date(lastReadAt)
          );
          unreadCountMap[conv.id] = unreadMsgs.length;
        } else {
          // If never read but is a member, count all messages not from current user
          const unreadMsgs = (allMessages || []).filter(
            m => m.conversation_id === conv.id
          );
          unreadCountMap[conv.id] = unreadMsgs.length;
        }
      }

      return filtered.map((c: any) => {
        const lastMsg = lastMessageMap[c.id];
        const dmParticipant = c.type === 'dm' ? dmParticipantsMap[c.id] : null;
        
        // Para DMs, usar nome do participante ou email como fallback garantido
        let displayName: string | null = c.name;
        if (c.type === 'dm') {
          displayName = dmParticipant?.full_name || dmParticipant?.email?.split('@')[0] || 'Participante';
        } else if (c.type === 'project' && c.project?.name) {
          displayName = c.project.name;
        }
        
        return {
          ...c,
          displayName,
          lastMessage: lastMsg ? {
            body: lastMsg.body,
            created_at: lastMsg.created_at,
            user_name: lastMsg.user_name || 'Participante',
          } : null,
          dmParticipant,
          unread_count: unreadCountMap[c.id] || 0,
        } as Conversation;
      });
    },
    enabled: !!workspace?.id && !!user?.id && !permissionsLoading,
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

  const createDM = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!workspace?.id || !user?.id) throw new Error('Workspace não encontrado');

      // Check if DM already exists between these two users
      const { data: existingMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = existingMembers?.map(m => m.conversation_id) || [];

      if (myConvIds.length > 0) {
        // Find conversations where the other user is also a member AND it's a DM
        const { data: otherMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myConvIds);

        const sharedConvIds = otherMembers?.map(m => m.conversation_id) || [];

        if (sharedConvIds.length > 0) {
          // Check if any of these is a DM
          const { data: dmConvs } = await supabase
            .from('conversations')
            .select('id')
            .in('id', sharedConvIds)
            .eq('type', 'dm')
            .eq('workspace_id', workspace.id)
            .limit(1);

          if (dmConvs && dmConvs.length > 0) {
            // Return existing DM with flag indicating it already existed
            return { ...dmConvs[0], isExisting: true };
          }
        }
      }

      // Create new DM
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspace.id,
          type: 'dm' as const,
          is_private: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both members in a single insert
      const membersToInsert = [
        { conversation_id: conversation.id, user_id: user.id, role: 'admin' },
        { conversation_id: conversation.id, user_id: otherUserId, role: 'member' },
      ];

      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(membersToInsert);

      if (membersError) {
        // If member insert fails, delete the conversation we just created
        await supabase.from('conversations').delete().eq('id', conversation.id);
        throw membersError;
      }

      return { ...conversation, isExisting: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
    },
    onError: (error: Error) => toast.error('Erro ao criar mensagem', { description: error.message }),
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

  const leaveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error('Utilizador não encontrado');

      // Remove user from conversation_members
      const { error: removeError } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (removeError) throw removeError;

      // Check if any members remain
      const { count } = await supabase
        .from('conversation_members')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      // If no members left, archive the conversation
      if (count === 0) {
        await supabase
          .from('conversations')
          .update({ is_archived: true })
          .eq('id', conversationId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      toast.success('Conversa removida');
    },
    onError: (error: Error) => toast.error('Erro ao remover conversa', { description: error.message }),
  });

  const createProjectChat = useMutation({
    mutationFn: async ({ projectId, projectName, workspaceId, attemptId }: { projectId: string; projectName: string; workspaceId: string; attemptId?: string }) => {
      const aid = attemptId || crypto.randomUUID().slice(0, 8);
      
      chatDebug(aid, 'createProjectChat START', {
        projectId,
        projectName,
        workspaceId_received: workspaceId,
        workspaceId_context: workspace?.id,
        userId: user?.id,
      });

      if (!user?.id) {
        chatDebugError(aid, 'No user found', { userId: user?.id });
        throw new Error('Utilizador não encontrado');
      }

      // Check if conversation already exists for this project
      chatDebug(aid, 'Checking for existing conversation...');
      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (existingError) {
        chatDebugError(aid, 'Error checking existing conversation', existingError);
      }

      if (existing) {
        chatDebug(aid, 'Found existing conversation', {
          id: existing.id,
          workspace_id: existing.workspace_id,
          project_id: existing.project_id,
        });
        return existing;
      }

      chatDebug(aid, 'No existing conversation, creating new one...');

      // Create new project conversation using the PROJECT's workspace_id
      const insertPayload = {
        workspace_id: workspaceId,
        type: 'project' as const,
        name: projectName,
        project_id: projectId,
        created_by: user.id,
      };
      
      chatDebug(aid, 'Insert payload for conversations:', insertPayload);

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert(insertPayload)
        .select()
        .single();

      if (convError) {
        chatDebugError(aid, 'ERROR inserting conversation', {
          message: convError.message,
          code: (convError as any).code,
          details: (convError as any).details,
          hint: (convError as any).hint,
        });
        throw convError;
      }

      chatDebug(aid, 'Conversation created successfully', { conversationId: conversation.id });

      // Add creator as member
      const memberPayload = {
        conversation_id: conversation.id,
        user_id: user.id,
        role: 'admin',
      };
      
      chatDebug(aid, 'Insert payload for conversation_members:', memberPayload);

      const { error: memberError } = await supabase.from('conversation_members').insert(memberPayload);

      if (memberError) {
        chatDebugError(aid, 'ERROR inserting conversation_member', {
          message: memberError.message,
          code: (memberError as any).code,
          details: (memberError as any).details,
          hint: (memberError as any).hint,
        });
        // Don't throw - conversation was created successfully
      } else {
        chatDebug(aid, 'Member added successfully');
      }

      chatDebug(aid, 'createProjectChat COMPLETE', { conversationId: conversation.id });
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['project-chat-status'] });
      queryClient.invalidateQueries({ queryKey: ['task-chat-status'] });
    },
    onError: (error: Error) => {
      const errorDetails = isChatDebugEnabled() 
        ? `${error.message} | Code: ${(error as any).code || 'N/A'}`
        : error.message;
      toast.error('Erro ao criar chat', { description: errorDetails });
    },
  });

  useEffect(() => {
    if (!workspace?.id) return;

    const channel = supabase
      .channel(`conversations:${workspace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspace.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['conversations', workspace.id] })
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        () => queryClient.invalidateQueries({ queryKey: ['conversations', workspace.id] }) // Update last message
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspace?.id, queryClient]);

  // Mutation to add member to channel
  const addChannelMember = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      // First check if user is already a member
      const { data: existing } = await supabase
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Already a member, return success silently
        return { conversationId, alreadyMember: true };
      }

      // Insert new member
      const { error } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, user_id: userId, role: 'member' });

      if (error) throw error;
      return { conversationId, alreadyMember: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-members', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      if (!data.alreadyMember) {
        toast.success('Membro adicionado ao canal');
      }
    },
    onError: (error: Error) => toast.error('Erro ao adicionar membro', { description: error.message }),
  });

  // Mutation to remove member from channel
  const removeChannelMember = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-members'] });
      toast.success('Membro removido');
    },
    onError: (error: Error) => toast.error('Erro ao remover membro', { description: error.message }),
  });

  return { 
    conversations, projectChats, channels, dms, isLoading, error, refetch, 
    createChannel, joinChannel, createDM, createProjectChat, leaveConversation,
    addChannelMember, removeChannelMember 
  };
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
      
      const { data: memberData, error } = await supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      if (!memberData || memberData.length === 0) return [];
      
      // Fetch profiles separately
      const userIds = memberData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      
      const profilesMap: Record<string, any> = {};
      (profiles || []).forEach(p => {
        profilesMap[p.id] = p;
      });
      
      return memberData.map(m => ({
        ...m,
        profile: profilesMap[m.user_id] || null
      }));
    },
    enabled: !!conversationId,
  });

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', user.id);
  }, [conversationId, user?.id]);

  return { conversation, members, isLoading, error, markAsRead };
}
