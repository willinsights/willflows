import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type FeedbackType = 'bug' | 'improvement';

export interface Feedback {
  id: string;
  user_id: string;
  workspace_id: string | null;
  type: FeedbackType;
  title: string;
  description: string;
  screenshot_url: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  workspace_name?: string;
}

export interface FeedbackFilters {
  type?: FeedbackType | 'all';
  status?: FeedbackStatus | 'all';
  search?: string;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  bugs: number;
  improvements: number;
}

export function useFeedbackAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedbackFilters>({
    type: 'all',
    status: 'all',
  });

  // Fetch all feedback with profile and workspace info
  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-feedback', filters],
    queryFn: async () => {
      let query = supabase
        .from('feedback')
        .select(`
          *,
          profiles:user_id (email, full_name),
          workspaces:workspace_id (name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Transform data to include user info
      return (data || []).map((item: any) => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.full_name,
        workspace_name: item.workspaces?.name,
      })) as Feedback[];
    },
  });

  // Calculate stats
  const stats: FeedbackStats = {
    total: feedback.length,
    pending: feedback.filter(f => f.status === 'pending').length,
    reviewed: feedback.filter(f => f.status === 'reviewed').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
    dismissed: feedback.filter(f => f.status === 'dismissed').length,
    bugs: feedback.filter(f => f.type === 'bug').length,
    improvements: feedback.filter(f => f.type === 'improvement').length,
  };

  // Update feedback status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const { error } = await supabase
        .from('feedback')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast({
        title: 'Status atualizado',
        description: 'O estado do feedback foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete feedback
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast({
        title: 'Feedback eliminado',
        description: 'O feedback foi eliminado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao eliminar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    feedback,
    stats,
    isLoading,
    filters,
    setFilters,
    refetch,
    updateStatus: (id: string, status: FeedbackStatus) => 
      updateStatusMutation.mutateAsync({ id, status }),
    deleteFeedback: (id: string) => deleteMutation.mutateAsync(id),
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
