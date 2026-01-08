import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;

export interface PaymentWithDetails extends Payment {
  clients: { name: string } | null;
  projects: { name: string; project_code: string | null } | null;
}

export function usePayments() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(name), projects(name, project_code)')
        .eq('workspace_id', currentWorkspace.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPayment = async (payment: Omit<PaymentInsert, 'workspace_id'>) => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...payment,
          workspace_id: currentWorkspace.id,
        })
        .select('*, clients(name), projects(name, project_code)')
        .single();

      if (error) throw error;

      toast({ title: 'Pagamento criado com sucesso' });
      setPayments(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Erro ao criar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePayment = async (paymentId: string, updates: Partial<Payment>) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev =>
        prev.map(p => (p.id === paymentId ? { ...p, ...updates } : p))
      );

      toast({ title: 'Pagamento atualizado' });
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Erro ao atualizar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev => prev.filter(p => p.id !== paymentId));
      toast({ title: 'Pagamento removido' });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Erro ao remover pagamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Calculate summaries
  const summaries = {
    totalReceivable: payments.filter(p => p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalPayable: payments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalReceived: payments.filter(p => p.is_receivable && p.status === 'pago').reduce((sum, p) => sum + p.amount, 0),
    totalPaid: payments.filter(p => !p.is_receivable && p.status === 'pago').reduce((sum, p) => sum + p.amount, 0),
    overdue: payments.filter(p => p.status === 'vencido').length,
    pending: payments.filter(p => p.status === 'pendente').length,
  };

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    deletePayment,
    refresh: fetchPayments,
    summaries,
  };
}
