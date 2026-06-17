import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { subMonths } from 'date-fns';
import {
  getMonthlyMetrics,
  getTimeSeries,
  getMonthlySummary,
  calculateChange,
} from '@/lib/finance/financialEngine';
import type {
  FinancialViewMode,
  FinancialProject,
  TeamPayment,
  CostLinePayment,
  MonthlyMetrics,
  MonthlySummary,
  TimeSeriesPoint,
} from '@/lib/finance/types';

export interface UseFinancialEngineResult {
  metrics: MonthlyMetrics;
  previousMetrics: MonthlyMetrics;
  summary: MonthlySummary;
  timeSeries: TimeSeriesPoint[];
  revenueChange: number | null;
  costChange: number | null;
  profitChange: number | null;
  loading: boolean;
  refresh: () => void;
}

const STALE = 30_000;
const PROJECT_COLS = `
  id, agreed_value, custo_captacao, custo_edicao, custos_extras,
  custos_extras_payment_status, custos_extras_paid_at,
  is_delivered, delivered_at, delivery_date, shoot_date, created_at,
  client_payment_status, client_paid_at, competence_month
`;

export function useFinancialEngine(
  viewMode: FinancialViewMode,
  selectedMonth: Date,
): UseFinancialEngineResult {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const projectsQuery = useQuery({
    queryKey: ['finance', 'engine-projects', workspaceId] as const,
    enabled: !!workspaceId,
    staleTime: STALE,
    queryFn: async (): Promise<FinancialProject[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_COLS)
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      return (data || []) as FinancialProject[];
    },
  });

  const projects = projectsQuery.data ?? [];

  const teamQuery = useQuery({
    queryKey: ['finance', 'engine-team', workspaceId] as const,
    enabled: !!workspaceId && viewMode === 'CAIXA' && projects.length > 0,
    staleTime: STALE,
    queryFn: async (): Promise<TeamPayment[]> => {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, payment_amount, payment_status, paid_at, project_id, user_id')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      return (data || []) as TeamPayment[];
    },
  });

  const teamPayments = viewMode === 'CAIXA' ? (teamQuery.data ?? []) : [];

  // Memoize derived calculations so they recompute only when inputs change
  const metrics = useMemo(
    () => getMonthlyMetrics(projects, viewMode, selectedMonth, teamPayments),
    [projects, viewMode, selectedMonth, teamPayments],
  );

  const previousMetrics = useMemo(() => {
    const previousMonth = subMonths(selectedMonth, 1);
    return getMonthlyMetrics(projects, viewMode, previousMonth, teamPayments);
  }, [projects, viewMode, selectedMonth, teamPayments]);

  const summary = useMemo(() => getMonthlySummary(projects, selectedMonth), [projects, selectedMonth]);

  const timeSeries = useMemo(() => {
    const fromMonth = subMonths(selectedMonth, 5);
    return getTimeSeries(projects, viewMode, fromMonth, selectedMonth, teamPayments);
  }, [projects, viewMode, selectedMonth, teamPayments]);

  const revenueChange = calculateChange(metrics.revenue, previousMetrics.revenue);
  const costChange = calculateChange(metrics.cost, previousMetrics.cost);
  const profitChange = calculateChange(metrics.profit, previousMetrics.profit);

  return {
    metrics,
    previousMetrics,
    summary,
    timeSeries,
    revenueChange,
    costChange,
    profitChange,
    loading: projectsQuery.isLoading || (viewMode === 'CAIXA' && teamQuery.isLoading),
    refresh: () => {
      projectsQuery.refetch();
      if (viewMode === 'CAIXA') teamQuery.refetch();
    },
  };
}
