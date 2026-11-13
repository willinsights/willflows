import { useFinancialProjects } from './useFinancialProjects';
import { useFinancialCostLines } from './useFinancialCostLines';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkLogs } from '@/hooks/useWorkLogs';
import { subMonths } from 'date-fns';
import {
  withFinancialCostLines,
  getMonthlyMetrics,
  getTimeSeries,
  getMonthlySummary,
  calculateChange,
} from '@/lib/finance/financialEngine';
import type {
  FinancialViewMode,
  FinancialProject,
  TeamPayment,
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
  error: unknown;
  refresh: () => void;
}

const STALE = 30_000;
export function useFinancialEngine(
  viewMode: FinancialViewMode,
  selectedMonth: Date,
): UseFinancialEngineResult {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const projectsQuery = useFinancialProjects(workspaceId);

  const costLinesQuery = useFinancialCostLines(workspaceId);

  const rawProjects = projectsQuery.data ?? [];
  const costLinePayments = costLinesQuery.data ?? [];

  const projects = useMemo(
    () => withFinancialCostLines(rawProjects, costLinePayments),
    [rawProjects, costLinePayments],
  );

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

  const { workLogs, isFetching: logsFetching, error: logsError, refetch: refetchLogs } = useWorkLogs();

  const teamPayments = viewMode === 'CAIXA' ? (teamQuery.data ?? []) : [];

  // Memoize derived calculations so they recompute only when inputs change
  const metrics = useMemo(
    () => getMonthlyMetrics(projects, viewMode, selectedMonth, teamPayments, costLinePayments, workLogs),
    [projects, viewMode, selectedMonth, teamPayments, costLinePayments, workLogs],
  );

  const previousMetrics = useMemo(() => {
    const previousMonth = subMonths(selectedMonth, 1);
    return getMonthlyMetrics(projects, viewMode, previousMonth, teamPayments, costLinePayments, workLogs);
  }, [projects, viewMode, selectedMonth, teamPayments, costLinePayments, workLogs]);

  const summary = useMemo(() => getMonthlySummary(projects, selectedMonth), [projects, selectedMonth]);

  const timeSeries = useMemo(() => {
    const fromMonth = subMonths(selectedMonth, 5);
    return getTimeSeries(projects, viewMode, fromMonth, selectedMonth, teamPayments, costLinePayments, workLogs);
  }, [projects, viewMode, selectedMonth, teamPayments, costLinePayments, workLogs]);

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
    loading: projectsQuery.isFetching || costLinesQuery.isFetching || !!logsFetching || (viewMode === 'CAIXA' && teamQuery.isFetching),
    error: projectsQuery.error || costLinesQuery.error || logsError || (viewMode === 'CAIXA' ? teamQuery.error : null),
    refresh: () => {
      refetchLogs?.();
      projectsQuery.refetch();
      costLinesQuery.refetch();
      if (viewMode === 'CAIXA') teamQuery.refetch();
    },
  };
}
