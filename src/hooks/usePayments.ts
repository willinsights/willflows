import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { paymentSchema, paymentUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;

export interface PaymentWithDetails extends Payment {
  clients: { name: string } | null;
  projects: { name: string; project_code: string | null } | null;
}

async function fetchPaymentsFromDb(workspaceId: string): Promise<PaymentWithDetails[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, clients(name), projects(name, project_code)')
    .eq('workspace_id', workspaceId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function usePayments() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const workspaceId = currentWorkspace?.id;

  const { data: payments = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['payments', workspaceId],
    queryFn: () => fetchPaymentsFromDb(workspaceId!),
    enabled: !!workspaceId && !fetchError,
    staleTime: 30000,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('No workspace');
      
      const validation = validateWithSchema(paymentSchema, payment);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...validation.data,
          workspace_id: workspaceId,
        } as any)
        .select('*, clients(name), projects(name, project_code)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', workspaceId] });
      toast({ title: 'Pagamento criado com sucesso' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar pagamento',
        description: handleDatabaseError('createPayment', error),
        variant: 'destructive',
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, updates }: { paymentId: string; updates: Partial<Payment> }) => {
      const validation = validateWithSchema(paymentUpdateSchema, updates);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      const { error } = await supabase
        .from('payments')
        .update({ ...validation.data, updated_at: new Date().toISOString() } as any)
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', workspaceId] });
      toast({ title: 'Pagamento atualizado' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar pagamento',
        description: handleDatabaseError('updatePayment', error),
        variant: 'destructive',
      });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) => {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          paid_at: status === 'pago' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', workspaceId] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: handleDatabaseError('updatePaymentStatus', error),
        variant: 'destructive',
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', workspaceId] });
      toast({ title: 'Pagamento removido' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover pagamento',
        description: handleDatabaseError('deletePayment', error),
        variant: 'destructive',
      });
    },
  });

  const createPayment = useCallback(
    async (payment: Omit<PaymentInsert, 'workspace_id'>) => {
      if (!currentWorkspace) return null;
      return createPaymentMutation.mutateAsync(payment);
    },
    [currentWorkspace, createPaymentMutation]
  );

  const updatePayment = useCallback(
    async (paymentId: string, updates: Partial<Payment>) => {
      return updatePaymentMutation.mutateAsync({ paymentId, updates });
    },
    [updatePaymentMutation]
  );

  const updatePaymentStatus = useCallback(
    async (paymentId: string, status: string) => {
      return updatePaymentStatusMutation.mutateAsync({ paymentId, status });
    },
    [updatePaymentStatusMutation]
  );

  const deletePayment = useCallback(
    async (paymentId: string) => {
      return deletePaymentMutation.mutateAsync(paymentId);
    },
    [deletePaymentMutation]
  );

  // Calculate summaries
  const summaries = useMemo(() => ({
    totalReceivable: payments.filter(p => p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalPayable: payments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalReceived: payments.filter(p => p.is_receivable && p.status === 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalPaid: payments.filter(p => !p.is_receivable && p.status === 'pago').reduce((sum, p) => sum + p.amount, 0),
    overdue: payments.filter(p => p.status === 'vencido').length,
    pending: payments.filter(p => p.status === 'pendente').length,
  }), [payments]);

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    updatePaymentStatus,
    deletePayment,
    refresh: refetch,
    summaries,
  };
}

// Hook for team payments
export function useTeamPayments() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const workspaceId = currentWorkspace?.id;

  const { data: teamPayments = [], isLoading: loading } = useQuery({
    queryKey: ['teamPayments', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      // Get workspace projects first
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId);
      
      const projectIds = projectsData?.map(p => p.id) || [];
      
      if (projectIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_team')
        .select('id, project_id, user_id, phase, payment_amount, payment_status')
        .in('project_id', projectIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const updateTeamPaymentStatusMutation = useMutation({
    mutationFn: async ({ teamId, status }: { teamId: string; status: string }) => {
      const { error } = await supabase
        .from('project_team')
        .update({ payment_status: status as 'pendente' | 'pago' | 'vencido' | 'cancelado' })
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPayments', workspaceId] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: handleDatabaseError('updateTeamPaymentStatus', error),
        variant: 'destructive',
      });
    },
  });

  const updateTeamPaymentStatus = useCallback(
    async (teamId: string, status: string) => {
      return updateTeamPaymentStatusMutation.mutateAsync({ teamId, status });
    },
    [updateTeamPaymentStatusMutation]
  );

  return {
    teamPayments,
    loading,
    updateTeamPaymentStatus,
  };
}
