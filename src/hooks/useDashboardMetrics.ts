import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { startOfMonth, endOfMonth, subMonths, subYears, format, differenceInDays } from 'date-fns';
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

export interface PerformanceMetrics {
  deliveryRate: number;
  avgDeliveryDays: number;
  avgMargin: number;
  projectsByType: {
    fotografia: number;
    video: number;
    foto_video: number;
  };
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

export interface UpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  eventType: string;
  projectName?: string;
}

export interface AnnualComparisonData {
  month: string;
  currentYear: number;
  previousYear: number;
}

export interface PendingPaymentItem {
  id: string;
  description: string | null;
  amount: number;
  dueDate: string | null;
  clientName: string | null;
  projectName: string | null;
  isOverdue: boolean;
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
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    deliveryRate: 0,
    avgDeliveryDays: 0,
    avgMargin: 0,
    projectsByType: { fotografia: 0, video: 0, foto_video: 0 },
  });
  const [urgentProjects, setUrgentProjects] = useState<UrgentProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [annualComparison, setAnnualComparison] = useState<AnnualComparisonData[]>([]);
  const [pendingPaymentItems, setPendingPaymentItems] = useState<PendingPaymentItem[]>([]);
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
      
      // 6 months ago for performance metrics
      const sixMonthsAgo = subMonths(now, 6);
      
      // Fetch projects count by phase
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, current_phase, is_delivered, agreed_value, custo_captacao, custo_edicao, custos_extras, created_at, delivered_at, type')
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

      // Fetch pending payments with details
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, description, due_date, client_id, project_id, clients(name), projects(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_receivable', true)
        .eq('status', 'pendente')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      const pendingPayments = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentsCount = paymentsData?.length || 0;
      
      // Map to PendingPaymentItem format
      const paymentItems: PendingPaymentItem[] = paymentsData?.map(p => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        dueDate: p.due_date,
        clientName: (p.clients as any)?.name || null,
        projectName: (p.projects as any)?.name || null,
        isOverdue: p.due_date ? new Date(p.due_date) < new Date() : false,
      })) || [];
      
      setPendingPaymentItems(paymentItems);

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

      // Calculate PERFORMANCE METRICS (last 6 months)
      const recentProjects = projectsData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= sixMonthsAgo;
      }) || [];
      
      const deliveredProjects = recentProjects.filter(p => p.is_delivered && p.delivered_at);
      const deliveryRate = recentProjects.length > 0 
        ? Math.round((deliveredProjects.length / recentProjects.length) * 100)
        : 0;
      
      // Average delivery time
      const deliveryTimes = deliveredProjects
        .map(p => differenceInDays(new Date(p.delivered_at!), new Date(p.created_at)))
        .filter(days => days >= 0);
      const avgDeliveryDays = deliveryTimes.length > 0
        ? Math.round(deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length)
        : 0;
      
      // Average margin
      const projectsWithRevenue = deliveredProjects.filter(p => p.agreed_value && p.agreed_value > 0);
      const margins = projectsWithRevenue.map(p => {
        const projectCosts = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
        return ((p.agreed_value! - projectCosts) / p.agreed_value!) * 100;
      });
      const avgMargin = margins.length > 0
        ? Math.round(margins.reduce((sum, m) => sum + m, 0) / margins.length)
        : 0;
      
      // Projects by type
      const projectsByType = {
        fotografia: recentProjects.filter(p => p.type === 'fotografia').length,
        video: recentProjects.filter(p => p.type === 'video').length,
        foto_video: recentProjects.filter(p => p.type === 'foto_video').length,
      };

      setPerformanceMetrics({
        deliveryRate,
        avgDeliveryDays,
        avgMargin,
        projectsByType,
      });

      // Calculate monthly data for chart (last 6 months)
      const monthlyStats: MonthlyData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        // Filter only DELIVERED projects in this month
        const monthProjects = projectsData?.filter(p => {
          if (!p.is_delivered || !p.delivered_at) return false;
          const deliveredAt = new Date(p.delivered_at);
          return deliveredAt >= monthStart && deliveredAt <= monthEnd;
        }) || [];
        
        const monthReceita = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
        const monthCustos = monthProjects.reduce((sum, p) => 
          sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
        
        monthlyStats.push({
          month: format(monthDate, 'MMM', { locale: pt }),
          receita: monthReceita,
          custos: monthCustos,
          lucro: monthReceita - monthCustos,
        });
      }
      
      setMonthlyData(monthlyStats);

      // Calculate ANNUAL COMPARISON (current year vs previous year)
      const currentYear = now.getFullYear();
      const previousYear = currentYear - 1;
      const annualData: AnnualComparisonData[] = [];
      
      for (let month = 0; month < 12; month++) {
        const currentYearMonth = new Date(currentYear, month, 1);
        const previousYearMonth = new Date(previousYear, month, 1);
        
        // Only include months up to current month for current year
        if (currentYearMonth > now) {
          annualData.push({
            month: format(currentYearMonth, 'MMM', { locale: pt }),
            currentYear: 0,
            previousYear: 0,
          });
          continue;
        }
        
        const currentYearStart = startOfMonth(currentYearMonth);
        const currentYearEnd = endOfMonth(currentYearMonth);
        const previousYearStart = startOfMonth(previousYearMonth);
        const previousYearEnd = endOfMonth(previousYearMonth);
        
        const currentYearRevenue = projectsData?.filter(p => {
          if (!p.is_delivered || !p.delivered_at) return false;
          const deliveredAt = new Date(p.delivered_at);
          return deliveredAt >= currentYearStart && deliveredAt <= currentYearEnd;
        }).reduce((sum, p) => sum + (p.agreed_value || 0), 0) || 0;
        
        const previousYearRevenue = projectsData?.filter(p => {
          if (!p.is_delivered || !p.delivered_at) return false;
          const deliveredAt = new Date(p.delivered_at);
          return deliveredAt >= previousYearStart && deliveredAt <= previousYearEnd;
        }).reduce((sum, p) => sum + (p.agreed_value || 0), 0) || 0;
        
        annualData.push({
          month: format(currentYearMonth, 'MMM', { locale: pt }),
          currentYear: currentYearRevenue,
          previousYear: previousYearRevenue,
        });
      }
      
      setAnnualComparison(annualData);

      // Fetch UPCOMING EVENTS (next 7 days)
      const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, end_at, location, event_type, project_id, projects(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gte('start_at', now.toISOString())
        .lte('start_at', nextWeekDate.toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      setUpcomingEvents(
        eventsData?.map(e => ({
          id: e.id,
          title: e.title,
          startAt: new Date(e.start_at),
          endAt: e.end_at ? new Date(e.end_at) : null,
          location: e.location,
          eventType: e.event_type,
          projectName: (e.projects as any)?.name,
        })) || []
      );

      // Fetch urgent projects
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

      // Fetch recent activity
      const { data: recentProjectsData } = await supabase
        .from('projects')
        .select('id, name, updated_at, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];
      recentProjectsData?.forEach(p => {
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
    // CRITICAL: If workspace changed, reset data IMMEDIATELY
    if (currentWorkspace?.id !== lastFetchedWorkspaceIdRef.current) {
      setMetrics({
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
      setPerformanceMetrics({
        deliveryRate: 0,
        avgDeliveryDays: 0,
        avgMargin: 0,
        projectsByType: { fotografia: 0, video: 0, foto_video: 0 },
      });
      setUrgentProjects([]);
      setRecentActivity([]);
      setMonthlyData([]);
      setUpcomingEvents([]);
      setAnnualComparison([]);
      setPendingPaymentItems([]);
      setLoading(true);
    }
    
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchMetrics();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  return { 
    metrics, 
    performanceMetrics,
    urgentProjects, 
    recentActivity, 
    monthlyData, 
    upcomingEvents,
    annualComparison,
    pendingPaymentItems,
    loading, 
    refresh: fetchMetrics 
  };
}
