import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetch-all';
import type { CostLinePayment } from '@/lib/finance/types';

export function useFinancialCostLines(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'engine-cost-lines', workspaceId, 'categories-v2'] as const,
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<CostLinePayment[]> => {
      if (!workspaceId) throw new Error('Selecione um workspace para consultar os custos.');
      const data = await fetchAllRows(() =>
        supabase
          .from('project_cost_lines')
          .select('id, project_id, actual_amount, payment_status, paid_at, category, estimated_amount')
          .eq('workspace_id', workspaceId)
          .neq('payment_status', 'cancelado')
      );
      return data as CostLinePayment[];
    },
  });
}
