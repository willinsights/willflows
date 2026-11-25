import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';

export function useClientPayment(projectId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { canManagePayments, canViewAllFinancials } = useFinancialPermissions();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const query = useQuery({
    queryKey: ['finance', 'client-payment', workspaceId, projectId],
    enabled: Boolean(workspaceId && projectId && canViewAllFinancials),
    queryFn: async () => {
      if (!workspaceId || !projectId) throw new Error('Projeto indisponível.');
      const { data, error } = await supabase.from('projects')
        .select('id, name, agreed_value, is_delivered, client_payment_status, client_paid_at, client_payment_due_date')
        .eq('workspace_id', workspaceId).eq('id', projectId).single();
      if (error) throw error;
      return data;
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ projectId: id, paidDate }: { projectId: string; paidDate: string }) => {
      if (!workspaceId || !canManagePayments) throw new Error('Sem permissão para registar pagamentos.');
      const paidAt = new Date(`${paidDate}T12:00:00`).toISOString();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) throw new Error('Data inválida.');
      // Update the existing revenue, never add a second income in payments.
      // Existing RLS/triggers remain authoritative; require a returned row before showing success.
      const { data, error } = await supabase.from('projects')
        .update({ client_payment_status: 'pago', client_paid_at: paidAt })
        .eq('workspace_id', workspaceId).eq('id', id).eq('is_delivered', true)
        .gt('agreed_value', 0)
        .or('client_payment_status.is.null,client_payment_status.in.(pendente,vencido,atrasado)')
        .select('id, agreed_value, client_payment_status, client_paid_at').single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });
  return { ...query, register: mutation.mutateAsync, saving: mutation.isPending, canManagePayments };
}