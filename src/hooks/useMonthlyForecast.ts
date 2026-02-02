import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { format, parseISO, subMonths } from 'date-fns';

export interface MonthlyForecastData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  // Change indicators (previous month comparison)
  revenueChange: number | null;
  costChange: number | null;
  profitChange: number | null;
  loading: boolean;
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function useMonthlyForecast(selectedMonth: Date): MonthlyForecastData {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<MonthlyForecastData>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    projectCount: 0,
    revenueChange: null,
    costChange: null,
    profitChange: null,
    loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchForecast = async () => {
      setData(prev => ({ ...prev, loading: true }));
      
      const monthKey = format(selectedMonth, 'yyyy-MM');
      const previousMonth = subMonths(selectedMonth, 1);
      const previousMonthKey = format(previousMonth, 'yyyy-MM');

      // Fetch projects from workspace
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id, is_delivered, delivery_date, shoot_date,
          agreed_value, custo_captacao, custo_edicao, custos_extras
        `)
        .eq('workspace_id', currentWorkspace.id);

      // Fetch pending team payments for the month
      const { data: teamPayments } = await supabase
        .from('project_team')
        .select(`
          payment_amount,
          payment_status,
          projects!inner(workspace_id)
        `)
        .eq('projects.workspace_id', currentWorkspace.id)
        .eq('payment_status', 'pendente');

      // Calculate totals for selected month
      let totalRevenue = 0;
      let totalCost = 0;
      let projectCount = 0;

      // Calculate totals for previous month
      let prevRevenue = 0;
      let prevCost = 0;

      projects?.forEach(p => {
        // Determine anchor date (delivery_date or fallback to shoot_date)
        const anchorDate = p.delivery_date || p.shoot_date;
        if (!anchorDate) return;

        const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');
        const projectCosts = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);

        // Include in selected month if: month matches OR rollover (delayed + not delivered)
        const isInMonth = projectMonth === monthKey;
        const isRollover = !p.is_delivered && projectMonth < monthKey;

        if (isInMonth || isRollover) {
          totalRevenue += p.agreed_value || 0;
          totalCost += projectCosts;
          projectCount++;
        }

        // Include in previous month if: month matches OR rollover
        const isInPrevMonth = projectMonth === previousMonthKey;
        const isPrevRollover = !p.is_delivered && projectMonth < previousMonthKey;

        if (isInPrevMonth || isPrevRollover) {
          prevRevenue += p.agreed_value || 0;
          prevCost += projectCosts;
        }
      });

      // Add pending team payments to costs (both months use the same pending payments)
      const pendingTeamCosts = teamPayments?.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0) || 0;
      totalCost += pendingTeamCosts;
      prevCost += pendingTeamCosts;

      const totalProfit = totalRevenue - totalCost;
      const prevProfit = prevRevenue - prevCost;

      setData({
        totalRevenue,
        totalCost,
        totalProfit,
        projectCount,
        revenueChange: calculateChange(totalRevenue, prevRevenue),
        costChange: calculateChange(totalCost, prevCost),
        profitChange: calculateChange(totalProfit, prevProfit),
        loading: false,
      });
    };

    fetchForecast();
  }, [currentWorkspace?.id, selectedMonth]);

  return data;
}
