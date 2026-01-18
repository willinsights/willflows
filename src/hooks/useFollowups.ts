import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';

export type FollowupStatus = 'open' | 'done';

export interface Followup {
  id: string;
  message_id: string;
  workspace_id: string;
  created_by: string;
  assigned_to: string;
  status: FollowupStatus;
  due_at: string | null;
  note: string | null;
  created_at: string;
  done_at: string | null;
  message?: any;
  created_by_user?: any;
  assigned_to_user?: any;
}

export function useFollowups() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();

  const { data: followups = [], isLoading, error, refetch } = useQuery({
    queryKey: ['followups', user?.id, workspace?.id],
    queryFn: async () => {
      if (!user?.id || !workspace?.id) return [];

      const { data, error } = await supabase
        .from('followups')
        .select(`
          *,
          message:messages(id, body, created_at, conversation_id)
        `)
        .eq('workspace_id', workspace.id)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Followup[];
    },
    enabled: !!user?.id && !!workspace?.id,
  });

  const openFollowups = followups.filter(f => f.status === 'open');
  const doneFollowups = followups.filter(f => f.status === 'done');
  const myFollowups = openFollowups.filter(f => f.assigned_to === user?.id);

  const createFollowup = useMutation({
    mutationFn: async ({ messageId, assignedTo, dueAt, note }: { 
      messageId: string; assignedTo: string; dueAt?: string; note?: string;
    }) => {
      if (!workspace?.id || !user?.id) throw new Error('Workspace ou utilizador não encontrado');

      const { data, error } = await supabase
        .from('followups')
        .insert({
          message_id: messageId,
          workspace_id: workspace.id,
          created_by: user.id,
          assigned_to: assignedTo,
          due_at: dueAt || null,
          note: note || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('FollowUp criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar FollowUp', { description: error.message });
    },
  });

  const markAsDone = useMutation({
    mutationFn: async (followupId: string) => {
      const { error } = await supabase
        .from('followups')
        .update({ status: 'done' as const, done_at: new Date().toISOString() })
        .eq('id', followupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('FollowUp concluído');
    },
  });

  const markAsOpen = useMutation({
    mutationFn: async (followupId: string) => {
      const { error } = await supabase
        .from('followups')
        .update({ status: 'open' as const, done_at: null })
        .eq('id', followupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('FollowUp reaberto');
    },
  });

  return {
    followups, openFollowups, doneFollowups, myFollowups,
    isLoading, error, refetch, createFollowup, markAsDone, markAsOpen,
  };
}
