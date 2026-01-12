import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { logger } from '@/lib/logger';

export interface DashboardMetrics {
  captacao: number;
  edicao: number;
  entregues: number;
  receita: number;
  custos: number;
  lucro: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  // Month-over-month changes (null = no previous data)
  receitaChange: number | null;
  custosChange: number | null;
  lucroChange: number | null;
  entreguesChange: number | null;
}

export interface UrgentProject {
  id: string;
  name: string;
  client: string;
  date: string;
  type: string;
  priority: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  target: string;
  time: string;
  user: string;
}

export interface MonthlyData {
  month: string;
  receita: number;
  custos: number;
  lucro: number;
}

export function useDashboardMetrics() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    captacao: 0,
    edicao: 0,
    entregues: 0,
    receita: 0,
    custos: 0,
    lucro: 0,
    pendingPayments: 0,
    pendingPaymentsCount: 0,
    receitaChange: null,
    custosChange: null,
    lucroChange: null,
    entreguesChange: null,
  });
  const [urgentProjects, setUrgentProjects] = useState<UrgentProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      
      // Current month boundaries
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      
      // Previous month boundaries
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));
      
      // Fetch projects count by phase
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, current_phase, is_delivered, agreed_value, custo_captacao, custo_edicao, custos_extras, created_at, delivered_at')
        .eq('workspace_id', currentWorkspace.id);

      const captacao = projectsData?.filter(p => p.current_phase === 'captacao' && !p.is_delivered).length || 0;
      const edicao = projectsData?.filter(p => p.current_phase === 'edicao' && !p.is_delivered).length || 0;
      
      // Count delivered projects for current month
      const entregues = projectsData?.filter(p => {
        if (!p.is_delivered || !p.delivered_at) return false;
        const deliveredAt = new Date(p.delivered_at);
        return deliveredAt >= currentMonthStart && deliveredAt <= currentMonthEnd;
      }).length || 0;
      
      // Count delivered projects for previous month
      const entreguesPrevious = projectsData?.filter(p => {
        if (!p.is_delivered || !p.delivered_at) return false;
        const deliveredAt = new Date(p.delivered_at);
        return deliveredAt >= previousMonthStart && deliveredAt <= previousMonthEnd;
      }).length || 0;

      // Calculate financial metrics for CURRENT MONTH only
      const currentMonthProjects = projectsData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
      }) || [];
      
      const receita = currentMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      const custos = currentMonthProjects.reduce((sum, p) => 
        sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
      const lucro = receita - custos;
      
      // Calculate financial metrics for PREVIOUS MONTH
      const previousMonthProjects = projectsData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
      }) || [];
      
      const receitaPrevious = previousMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
      const custosPrevious = previousMonthProjects.reduce((sum, p) => 
        sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
      const lucroPrevious = receitaPrevious - custosPrevious;
      
      // Calculate percentage changes
      const receitaChange = receitaPrevious > 0 
        ? Math.round(((receita - receitaPrevious) / receitaPrevious) * 100)
        : null;
      
      const custosChange = custosPrevious > 0 
        ? Math.round(((custos - custosPrevious) / custosPrevious) * 100)
        : null;
      
      const lucroChange = lucroPrevious !== 0 
        ? Math.round(((lucro - lucroPrevious) / Math.abs(lucroPrevious)) * 100)
        : null;
      
      const entreguesChange = entreguesPrevious > 0 
        ? Math.round(((entregues - entreguesPrevious) / entreguesPrevious) * 100)
        : null;

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_receivable', true)
        .eq('status', 'pendente');

      const pendingPayments = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentsCount = paymentsData?.length || 0;

      setMetrics({
        captacao,
        edicao,
        entregues,
        receita,
        custos,
        lucro,
        pendingPayments,
        pendingPaymentsCount,
        receitaChange,
        custosChange,
        lucroChange,
        entreguesChange,
      });

      // Calculate monthly data for chart (last 6 months)
      const monthlyStats: MonthlyData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        
        const monthProjects = projectsData?.filter(p => {
          const createdAt = new Date(p.created_at);
          return createdAt >= monthStart && createdAt < monthEnd;
        }) || [];
        
        const monthReceita = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
        const monthCustos = monthProjects.reduce((sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0), 0);
        
        monthlyStats.push({
          month: format(monthDate, 'MMM', { locale: pt }),
          receita: monthReceita,
          custos: monthCustos,
          lucro: monthReceita - monthCustos,
        });
      }
      
      setMonthlyData(monthlyStats);

      // Fetch urgent projects (high priority or near deadline)
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: urgentData } = await supabase
        .from('projects')
        .select('id, name, type, priority, delivery_date, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', false)
        .or(`priority.in.(alta,urgente),delivery_date.lte.${nextWeek}`)
        .order('priority', { ascending: false })
        .order('delivery_date', { ascending: true })
        .limit(5);

      setUrgentProjects(
        urgentData?.map(p => ({
          id: p.id,
          name: p.name,
          client: (p.clients as any)?.name || 'Sem cliente',
          date: p.delivery_date || '',
          type: p.type,
          priority: p.priority,
        })) || []
      );

      // Fetch recent activity (based on updated_at)
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('id, name, updated_at, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];
      recentProjects?.forEach(p => {
        const isNew = new Date(p.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        const updatedAt = new Date(p.updated_at);
        const diff = Date.now() - updatedAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        let timeStr = 'Agora';
        if (hours >= 24) {
          timeStr = `Há ${Math.floor(hours / 24)} dias`;
        } else if (hours > 0) {
          timeStr = `Há ${hours} horas`;
        }

        activities.push({
          id: p.id,
          action: isNew ? 'Projeto criado' : 'Projeto atualizado',
          target: p.name,
          time: timeStr,
          user: 'Sistema',
        });
      });

      setRecentActivity(activities);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching dashboard metrics:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    // Only fetch if workspace ID changed and we have a valid workspace
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchMetrics();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  return { metrics, urgentProjects, recentActivity, monthlyData, loading, refresh: fetchMetrics };
}
