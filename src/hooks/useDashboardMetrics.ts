import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays, startOfDay, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import {
  getMonthlyMetrics,
  getTimeSeries,
  calculateChange,
  getProjectMargin,
} from '@/lib/finance/financialEngine';
import type { FinancialProject } from '@/lib/finance/types';

export interface DashboardMetrics {
  captacao: number;
  edicao: number;
  entregues: number;
  receita: number;
  custos: number;
  lucro: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  receitaChange: number | null;
  custosChange: number | null;
  lucroChange: number | null;
  entreguesChange: number | null;
  meusGanhos: number;
  previsaoReceita: number;
  previsaoCustos: number;
  previsaoLucro: number;
  previsaoMargemPercent: number;
  projetosAtivos: number;
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
  receitaPrevisao?: number;
  custosPrevisao?: number;
  lucroPrevisao?: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  eventType: string;
  projectName?: string;
  description?: string | null;
  videoCallUrl?: string | null;
  allDay?: boolean;
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
  const { currentWorkspace, fetchError, membership } = useWorkspace();
  const { user } = useAuth();
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
    meusGanhos: 0,
    previsaoReceita: 0,
    previsaoCustos: 0,
    previsaoLucro: 0,
    previsaoMargemPercent: 0,
    projetosAtivos: 0,
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
  
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const sixMonthsAgo = subMonths(now, 6);
      
      // Fetch projects with ALL fields needed by financial engine
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id, current_phase, is_delivered, agreed_value, custo_captacao, custo_edicao,
          custos_extras, custos_extras_payment_status, custos_extras_paid_at,
          created_at, delivered_at, delivery_date, shoot_date, type, item_type,
          competence_month, client_payment_status, client_paid_at
        `)
        .eq('workspace_id', currentWorkspace.id);

      // Map to FinancialProject for engine (single source of truth)
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

      // Phase counts (non-financial, keep manual)
      const captacao = projectsData?.filter(p => p.current_phase === 'captacao' && !p.is_delivered && p.item_type !== 'reuniao').length || 0;
      const edicao = projectsData?.filter(p => p.current_phase === 'edicao' && !p.is_delivered && p.item_type !== 'reuniao').length || 0;

      // === FINANCIAL METRICS — delegated to engine (single source of truth) ===
      const currentMetrics = getMonthlyMetrics(mappedProjects, 'REALIZADO', now);
      const prevMetrics = getMonthlyMetrics(mappedProjects, 'REALIZADO', subMonths(now, 1));
      
      const receita = currentMetrics.revenue;
      const custos = currentMetrics.cost;
      const lucro = currentMetrics.profit;
      const entregues = currentMetrics.projectCount;

      const receitaChange = calculateChange(receita, prevMetrics.revenue);
      const custosChange = calculateChange(custos, prevMetrics.cost);
      const lucroChange = calculateChange(lucro, prevMetrics.profit);
      const entreguesChange = calculateChange(entregues, prevMetrics.projectCount);

      // === FORECAST — delegated to engine ===
      const forecastMetrics = getMonthlyMetrics(mappedProjects, 'PREVISAO', now);
      const previsaoReceita = forecastMetrics.revenue;
      const previsaoCustos = forecastMetrics.cost;
      const previsaoLucro = forecastMetrics.profit;
      const previsaoMargemPercent = previsaoReceita > 0 
        ? Math.round((previsaoLucro / previsaoReceita) * 100) 
        : 0;
      const projetosAtivos = forecastMetrics.projectCount;

      // === PENDING CLIENT PAYMENTS (unique to dashboard) ===
      const { data: pendingProjectsData } = await supabase
        .from('projects')
        .select(
          [
            'id',
            'name',
            'agreed_value',
            'client_payment_status',
            'client_payment_due_date',
            'delivered_at',
            'created_at',
            'client_id',
            'clients(name)',
          ].join(',')
        )
        .eq('workspace_id', currentWorkspace.id)
        .in('client_payment_status', ['pendente', 'vencido'])
        .order('client_payment_due_date', { ascending: true, nullsFirst: true })
        .limit(1000);

      const normalizedItems: PendingPaymentItem[] = (pendingProjectsData || []).map((p: any) => {
        const fallbackDate = p.delivered_at || p.created_at || null;
        const dueDate = p.client_payment_due_date || (fallbackDate ? String(fallbackDate).slice(0, 10) : null);
        const isOverdue =
          p.client_payment_status === 'vencido' ||
          (dueDate ? new Date(dueDate) < new Date() : false);

        return {
          id: p.id,
          description: p.name ? `Pagamento do projeto: ${p.name}` : 'Pagamento do projeto',
          amount: Number(p.agreed_value || 0),
          dueDate,
          clientName: (p.clients as any)?.name || null,
          projectName: p.name || null,
          isOverdue,
        };
      });

      const sortedItems = normalizedItems.sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });

      setPendingPaymentItems(sortedItems.slice(0, 50));
      const pendingPayments = sortedItems.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingPaymentsCount = sortedItems.length;

      // === PERSONAL EARNINGS (unique to collaborators) ===
      let meusGanhos = 0;
      if (user?.id && membership?.role === 'gestao') {
        const { data: myTeamPayments } = await supabase
          .from('project_team')
          .select('payment_amount, payment_status, projects!inner(created_at, workspace_id)')
          .eq('user_id', user.id)
          .eq('projects.workspace_id', currentWorkspace.id);
        
        meusGanhos = myTeamPayments?.filter(tp => {
          const projectCreatedAt = new Date((tp.projects as any).created_at);
          return projectCreatedAt >= currentMonthStart && projectCreatedAt <= currentMonthEnd;
        }).reduce((sum, tp) => sum + (tp.payment_amount || 0), 0) || 0;
      }

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
        meusGanhos,
        previsaoReceita,
        previsaoCustos,
        previsaoLucro,
        previsaoMargemPercent,
        projetosAtivos,
      });

      // === PERFORMANCE METRICS (last 6 months, unique to dashboard) ===
      const recentProjects = projectsData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= sixMonthsAgo;
      }) || [];
      
      const deliveredProjects = recentProjects.filter(p => p.is_delivered && p.delivered_at);
      const deliveryRate = recentProjects.length > 0 
        ? Math.round((deliveredProjects.length / recentProjects.length) * 100)
        : 0;
      
      const deliveryTimes = deliveredProjects
        .map(p => differenceInDays(new Date(p.delivered_at!), new Date(p.created_at)))
        .filter(days => days >= 0);
      const avgDeliveryDays = deliveryTimes.length > 0
        ? Math.round(deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length)
        : 0;
      
      const projectsWithRevenue = deliveredProjects.filter(p => p.agreed_value && p.agreed_value > 0);
      const margins = projectsWithRevenue.map(p => {
        const projectCosts = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
        return ((p.agreed_value! - projectCosts) / p.agreed_value!) * 100;
      });
      const avgMargin = margins.length > 0
        ? Math.round(margins.reduce((sum, m) => sum + m, 0) / margins.length)
        : 0;
      
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

      // === MONTHLY CHART DATA — delegated to engine ===
      const fromMonth = subMonths(now, 5);
      const realizadoSeries = getTimeSeries(mappedProjects, 'REALIZADO', fromMonth, now);
      
      const monthlyStats: MonthlyData[] = realizadoSeries.map((point, i) => ({
        month: point.month,
        receita: point.revenue,
        custos: point.cost,
        lucro: point.profit,
        ...(i === realizadoSeries.length - 1 ? {
          receitaPrevisao: forecastMetrics.revenue,
          custosPrevisao: forecastMetrics.cost,
          lucroPrevisao: forecastMetrics.profit,
        } : {}),
      }));
      setMonthlyData(monthlyStats);

      // === ANNUAL COMPARISON — delegated to engine ===
      const currentYear = now.getFullYear();
      const annualData: AnnualComparisonData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const prevYearMonth = new Date(currentYear - 1, monthDate.getMonth(), 1);
        annualData.push({
          month: format(monthDate, 'MMM', { locale: pt }),
          currentYear: getMonthlyMetrics(mappedProjects, 'REALIZADO', monthDate).revenue,
          previousYear: getMonthlyMetrics(mappedProjects, 'REALIZADO', prevYearMonth).revenue,
        });
      }
      setAnnualComparison(annualData);

      // === UPCOMING EVENTS (next 7 days) ===
      const todayStart = startOfDay(now);
      const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const isAdmin = membership?.role === 'admin';

      let userCaptacaoProjectIds: string[] = [];
      if (!isAdmin && user?.id) {
        const { data: teamData } = await supabase
          .from('project_team')
          .select('project_id')
          .eq('user_id', user.id)
          .eq('phase', 'captacao');
        
        userCaptacaoProjectIds = teamData?.map(t => t.project_id) || [];
      }

      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, end_at, location, event_type, project_id, description, video_call_url, all_day, is_private, created_by, projects(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', nextWeekDate.toISOString())
        .order('start_at', { ascending: true })
        .limit(10);

      const filteredEvents = eventsData?.filter(event => {
        if (event.is_private) {
          return event.created_by === user?.id;
        }
        return isAdmin;
      }) || [];

      const { data: shootsData } = await supabase
        .from('projects')
        .select('id, name, shoot_date, shoot_start_time, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', false)
        .gte('shoot_date', format(todayStart, 'yyyy-MM-dd'))
        .lte('shoot_date', format(nextWeekDate, 'yyyy-MM-dd'))
        .order('shoot_date', { ascending: true })
        .limit(10);

      const filteredShoots = isAdmin 
        ? shootsData || []
        : (shootsData || []).filter(p => userCaptacaoProjectIds.includes(p.id));

      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id, title, due_date, due_time, project_id, is_completed,
          projects(name),
          task_assignees(user_id)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_completed', false)
        .gte('due_date', format(todayStart, 'yyyy-MM-dd'))
        .lte('due_date', format(nextWeekDate, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(15);

      const filteredTasks = isAdmin
        ? tasksData || []
        : (tasksData || []).filter(task => 
            (task.task_assignees as any[])?.some(a => a.user_id === user?.id)
          );

      const calendarEvents: UpcomingEvent[] = filteredEvents.map(e => ({
        id: e.id,
        title: e.title,
        startAt: new Date(e.start_at),
        endAt: e.end_at ? new Date(e.end_at) : null,
        location: e.location,
        eventType: e.event_type,
        projectName: (e.projects as any)?.name,
        description: e.description,
        videoCallUrl: e.video_call_url,
        allDay: e.all_day,
      }));

      const shootEvents: UpcomingEvent[] = filteredShoots.map(p => ({
        id: `shoot-${p.id}`,
        title: p.name,
        startAt: new Date(`${p.shoot_date}T${p.shoot_start_time || '09:00:00'}`),
        endAt: null,
        location: null,
        eventType: 'sessao',
        projectName: p.name,
        description: `Captação: ${(p.clients as any)?.name || 'Sem cliente'}`,
        videoCallUrl: null,
        allDay: !p.shoot_start_time,
      }));

      const taskEvents: UpcomingEvent[] = filteredTasks.map(t => ({
        id: `task-${t.id}`,
        title: t.title,
        startAt: new Date(`${t.due_date}T${t.due_time || '09:00:00'}`),
        endAt: null,
        location: null,
        eventType: 'deadline',
        projectName: (t.projects as any)?.name,
        description: 'Tarefa',
        videoCallUrl: null,
        allDay: !t.due_time,
      }));

      const allEvents = [...calendarEvents, ...shootEvents, ...taskEvents]
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
        .slice(0, 5);

      setUpcomingEvents(allEvents);

      // === URGENT PROJECTS ===
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

      // === RECENT ACTIVITY ===
      const { data: recentProjectsData } = await supabase
        .from('projects')
        .select('id, name, updated_at, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];
      recentProjectsData?.forEach(p => {
        const isNew = new Date(p.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        const timeStr = formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: pt });

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
        meusGanhos: 0,
        previsaoReceita: 0,
        previsaoCustos: 0,
        previsaoLucro: 0,
        previsaoMargemPercent: 0,
        projetosAtivos: 0,
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
