import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useToast } from './use-toast';

export interface SubscriptionDiscrepancy {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_status: string | null;
  db_status: string | null;
  discrepancy_type: string;
  details: Record<string, any> | null;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscriptionDiscrepancies() {
  const { isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ['subscription-discrepancies'],
    queryFn: async (): Promise<SubscriptionDiscrepancy[]> => {
      const { data, error } = await (supabase as any)
        .from('subscription_discrepancies')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as SubscriptionDiscrepancy[];
    },
    enabled: isSuperAdmin,
    refetchInterval: 60_000,
  });

  const activeCount = discrepancies.filter((d) => !d.resolved_at).length;

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await (supabase as any)
        .from('subscription_discrepancies')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          notes,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-discrepancies'] });
      toast({ title: 'Divergência marcada como resolvida' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const runReconciliation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-reconcile', {
        body: { trigger: 'manual', notify: false },
      });
      if (error) throw error;
      return data as { checked: number; discrepancies: number; inserted: number; errors: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['subscription-discrepancies'] });
      toast({
        title: 'Reconciliação concluída',
        description: `${data.checked} verificadas · ${data.inserted} novas divergências`,
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erro na reconciliação', description: err.message, variant: 'destructive' });
    },
  });

  return {
    discrepancies,
    activeCount,
    isLoading,
    resolve: resolveMutation.mutate,
    isResolving: resolveMutation.isPending,
    runReconciliation: runReconciliation.mutate,
    isRunning: runReconciliation.isPending,
  };
}
