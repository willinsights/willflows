import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { format, parseISO } from 'date-fns';

export interface MonthlyForecastData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  loading: boolean;
}

export function useMonthlyForecast(selectedMonth: Date): MonthlyForecastData {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<MonthlyForecastData>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    projectCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchForecast = async () => {
      setData(prev => ({ ...prev, loading: true }));
      
      const monthKey = format(selectedMonth, 'yyyy-MM');

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

      let totalRevenue = 0;
      let totalCost = 0;
      let projectCount = 0;

      projects?.forEach(p => {
        // Determine anchor date (delivery_date or fallback to shoot_date)
        const anchorDate = p.delivery_date || p.shoot_date;
        if (!anchorDate) return;

        const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');

        // Include if: month matches OR rollover (delayed + not delivered)
        const isInMonth = projectMonth === monthKey;
        const isRollover = !p.is_delivered && projectMonth < monthKey;

        if (isInMonth || isRollover) {
          totalRevenue += p.agreed_value || 0;
          totalCost += (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
          projectCount++;
        }
      });

      // Add pending team payments to costs
      const pendingTeamCosts = teamPayments?.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0) || 0;
      totalCost += pendingTeamCosts;

      setData({
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        projectCount,
        loading: false,
      });
    };

    fetchForecast();
  }, [currentWorkspace?.id, selectedMonth]);

  return data;
}
