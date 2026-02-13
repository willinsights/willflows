import { useState, useEffect, useCallback } from 'react';
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

export function useFinancialEngine(
  viewMode: FinancialViewMode,
  selectedMonth: Date,
): UseFinancialEngineResult {
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [teamPayments, setTeamPayments] = useState<TeamPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);

    try {
      // Always fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id, agreed_value, custo_captacao, custo_edicao, custos_extras,
          custos_extras_payment_status, custos_extras_paid_at,
          is_delivered, delivered_at, delivery_date, shoot_date, created_at,
          client_payment_status, client_paid_at, competence_month
        `)
        .eq('workspace_id', currentWorkspace.id);

      const mappedProjects: FinancialProject[] = (projectsData || []).map(p => ({
        id: p.id,
        agreed_value: p.agreed_value,
        custo_captacao: p.custo_captacao,
        custo_edicao: p.custo_edicao,
        custos_extras: p.custos_extras,
        custos_extras_payment_status: p.custos_extras_payment_status,
        custos_extras_paid_at: p.custos_extras_paid_at,
        is_delivered: p.is_delivered,
        delivered_at: p.delivered_at,
        delivery_date: p.delivery_date,
        shoot_date: p.shoot_date,
        created_at: p.created_at,
        client_payment_status: p.client_payment_status,
        client_paid_at: p.client_paid_at,
        competence_month: p.competence_month,
      }));

      setProjects(mappedProjects);

      // Fetch team payments only for CAIXA mode
      if (viewMode === 'CAIXA') {
        const { data: teamData } = await supabase
          .from('project_team')
          .select('id, payment_amount, payment_status, paid_at, project_id, user_id')
          .in('project_id', mappedProjects.map(p => p.id));

        setTeamPayments((teamData || []).map(t => ({
          id: t.id,
          payment_amount: t.payment_amount,
          payment_status: t.payment_status,
          paid_at: t.paid_at,
          project_id: t.project_id,
          user_id: t.user_id,
        })));
      } else {
        setTeamPayments([]);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate metrics
  const metrics = getMonthlyMetrics(projects, viewMode, selectedMonth, teamPayments);
  const previousMonth = subMonths(selectedMonth, 1);
  const previousMetrics = getMonthlyMetrics(projects, viewMode, previousMonth, teamPayments);
  const summary = getMonthlySummary(projects, selectedMonth);

  // Time series (last 6 months ending at selected month)
  const fromMonth = subMonths(selectedMonth, 5);
  const timeSeries = getTimeSeries(projects, viewMode, fromMonth, selectedMonth, teamPayments);

  // Changes
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
    loading,
    refresh: fetchData,
  };
}
