import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetch-all';
import type { FinancialProject } from '@/lib/finance/types';

const PROJECT_COLS = `id, agreed_value, custo_captacao, custo_edicao, custos_extras,
  custos_extras_payment_status, custos_extras_paid_at, is_delivered, delivered_at,
  delivery_date, shoot_date, created_at, client_payment_status, client_paid_at, competence_month`;

export function useFinancialProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'engine-projects', workspaceId] as const,
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<FinancialProject[]> => {
      if (!workspaceId) throw new Error('Selecione um workspace para consultar os projetos.');
      return await fetchAllRows(() => supabase.from('projects').select(PROJECT_COLS).eq('workspace_id', workspaceId)) as FinancialProject[];
    },
  });
}
