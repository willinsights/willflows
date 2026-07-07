import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  differenceInDays,
  startOfDay,
  formatDistanceToNow,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import {
  calculateChange,
  getProjectMargin,
} from '@/lib/finance/financialEngine';

// === Public types (kept stable — Dashboard depends on these) ===
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
  projectsByType: { fotografia: number; video: number; foto_video: number };
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

// === RPC response shape ===
interface RpcMonthPoint { month_start: string; revenue: number; cost: number; profit: number }
interface RpcAnnualPoint { month_start: string; current_year: number; previous_year: number }
interface RpcMetricsBucket { revenue: number; cost: number; profit: number; projectCount: number }
interface RpcPrevisao extends RpcMetricsBucket {
  breakdown?: {
    plannedRevenue: number;
    rolloverRevenue: number;
    plannedCost: number;
    rolloverCost: number;
    rolloverCount: number;
  };
}
interface RpcDashboardMetrics {
  workspace_id: string;
  generated_at: string;
  current_month: string;
  previous_month: string;
  phase_counts: { captacao: number; edicao: number };
  realizado_current: RpcMetricsBucket | null;
  realizado_previous: RpcMetricsBucket | null;
  previsao_current: RpcPrevisao | null;
  previsao_previous: RpcMetricsBucket | null;
  monthly_series: RpcMonthPoint[];
  annual_comparison: RpcAnnualPoint[];
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const bucket = (b: RpcMetricsBucket | null): RpcMetricsBucket =>
  b ?? { revenue: 0, cost: 0, profit: 0, projectCount: 0 };

// === Query keys ===
const qk = {
  metrics: (ws: string) => ['dashboard', 'metrics-rpc', ws] as const,
  performance: (ws: string) => ['dashboard', 'performance', ws] as const,
  pending: (ws: string) => ['dashboard', 'pending-payments', ws] as const,
  meusGanhos: (ws: string, uid: string | null, role: string | null) =>
    ['dashboard', 'meus-ganhos', ws, uid, role] as const,
  upcoming: (ws: string, uid: string | null, isAdmin: boolean) =>
    ['dashboard', 'upcoming', ws, uid, isAdmin] as const,
  urgent: (ws: string) => ['dashboard', 'urgent', ws] as const,
  recent: (ws: string) => ['dashboard', 'recent', ws] as const,
};

export function useDashboardMetrics() {
  const { currentWorkspace, fetchError, membership } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id ?? null;
  const enabled = !!workspaceId && !fetchError;
  const isAdmin = membership?.role === 'admin';
  const queryClient = useQueryClient();

  // === 1. RPC: all financial aggregates in one call ===
  const metricsQuery = useQuery({
    queryKey: qk.metrics(workspaceId ?? ''),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RpcDashboardMetrics> => {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_workspace_id: workspaceId!,
      });
      if (error) throw error;
      return data as unknown as RpcDashboardMetrics;
    },
  });

  // === 2. Performance metrics: last 6mo delivered projects (bounded query) ===
  const performanceQuery = useQuery({
    queryKey: qk.performance(workspaceId ?? ''),
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PerformanceMetrics> => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      const { data } = await supabase
        .from('projects')
        .select('id, is_delivered, delivered_at, created_at, type, agreed_value, custo_captacao, custo_edicao, custos_extras')
        .eq('workspace_id', workspaceId!)
        .gte('created_at', sixMonthsAgo.toISOString());

      const recent = data ?? [];
      const delivered = recent.filter(p => p.is_delivered && p.delivered_at);
      const deliveryRate = recent.length > 0 ? Math.round((delivered.length / recent.length) * 100) : 0;

      const times = delivered
        .map(p => differenceInDays(new Date(p.delivered_at!), new Date(p.created_at)))
        .filter(d => d >= 0);
      const avgDeliveryDays = times.length > 0 ? Math.round(times.reduce((s, d) => s + d, 0) / times.length) : 0;

      const withRevenue = delivered.filter(p => p.agreed_value && p.agreed_value > 0);
      const margins = withRevenue.map(p => getProjectMargin(p as any));
      const avgMargin = margins.length > 0 ? Math.round(margins.reduce((s, m) => s + m, 0) / margins.length) : 0;

      return {
        deliveryRate,
        avgDeliveryDays,
        avgMargin,
        projectsByType: {
          fotografia: recent.filter(p => p.type === 'fotografia').length,
          video: recent.filter(p => p.type === 'video').length,
          foto_video: recent.filter(p => p.type === 'foto_video').length,
        },
      };
    },
  });

  // === 3. Pending payments ===
  const pendingQuery = useQuery({
    queryKey: qk.pending(workspaceId ?? ''),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, agreed_value, client_payment_status, client_payment_due_date, delivered_at, created_at, client_id, clients(name)')
        .eq('workspace_id', workspaceId!)
        .in('client_payment_status', ['pendente', 'vencido'])
        .order('client_payment_due_date', { ascending: true, nullsFirst: true })
        .limit(1000);

      const items: PendingPaymentItem[] = (data ?? []).map((p: any) => {
        const fallbackDate = p.delivered_at || p.created_at || null;
        const dueDate = p.client_payment_due_date || (fallbackDate ? String(fallbackDate).slice(0, 10) : null);
        const isOverdue =
          p.client_payment_status === 'vencido' || (dueDate ? new Date(dueDate) < new Date() : false);
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

      items.sort((a, b) => {
        const aT = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bT = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aT - bT;
      });

      const totalAmount = items.reduce((s, p) => s + (p.amount || 0), 0);
      return {
        items: items.slice(0, 50),
        totalAmount,
        count: items.length,
      };
    },
  });

  // === 4. Personal earnings (only for gestao role) ===
  const meusGanhosQuery = useQuery({
    queryKey: qk.meusGanhos(workspaceId ?? '', user?.id ?? null, membership?.role ?? null),
    enabled: enabled && !!user?.id && membership?.role === 'gestao',
    staleTime: 60 * 1000,
    queryFn: async (): Promise<number> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const { data } = await supabase
        .from('project_team')
        .select('payment_amount, payment_status, projects!inner(created_at, workspace_id)')
        .eq('user_id', user!.id)
        .eq('projects.workspace_id', workspaceId!);
      return (data ?? [])
        .filter((tp: any) => {
          const createdAt = new Date(tp.projects?.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        })
        .reduce((s: number, tp: any) => s + (tp.payment_amount || 0), 0);
    },
  });

  // === 5. Upcoming events (7 days: calendar events + shoots + tasks) ===
  const upcomingQuery = useQuery({
    queryKey: qk.upcoming(workspaceId ?? '', user?.id ?? null, isAdmin),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UpcomingEvent[]> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Non-admin: fetch project ids where user is in the captacao team
      let userCaptacaoProjectIds: string[] = [];
      if (!isAdmin && user?.id) {
        const { data } = await supabase
          .from('project_team')
          .select('project_id')
          .eq('user_id', user.id)
          .eq('phase', 'captacao');
        userCaptacaoProjectIds = (data ?? []).map(t => t.project_id);
      }

      // Calendar events. RLS blocks private events of others; server filter is defence-in-depth.
      let eventsQuery = supabase
        .from('calendar_events')
        .select('id, title, start_at, end_at, location, event_type, project_id, description, video_call_url, all_day, is_private, created_by, projects(name)')
        .eq('workspace_id', workspaceId!)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', nextWeekDate.toISOString())
        .order('start_at', { ascending: true })
        .limit(10);
      if (!isAdmin && user?.id) {
        eventsQuery = eventsQuery.or(`is_private.eq.false,created_by.eq.${user.id}`);
      }
      const { data: eventsData } = await eventsQuery;

      // Shoots
      let shootsData: any[] = [];
      if (isAdmin) {
        const { data } = await supabase
          .from('projects')
          .select('id, name, shoot_date, shoot_start_time, clients(name)')
          .eq('workspace_id', workspaceId!)
          .eq('is_delivered', false)
          .gte('shoot_date', format(todayStart, 'yyyy-MM-dd'))
          .lte('shoot_date', format(nextWeekDate, 'yyyy-MM-dd'))
          .order('shoot_date', { ascending: true })
          .limit(10);
        shootsData = data ?? [];
      } else if (userCaptacaoProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, name, shoot_date, shoot_start_time, clients(name)')
          .eq('workspace_id', workspaceId!)
          .eq('is_delivered', false)
          .in('id', userCaptacaoProjectIds)
          .gte('shoot_date', format(todayStart, 'yyyy-MM-dd'))
          .lte('shoot_date', format(nextWeekDate, 'yyyy-MM-dd'))
          .order('shoot_date', { ascending: true })
          .limit(10);
        shootsData = data ?? [];
      }

      // Tasks
      let tasksData: any[] = [];
      if (isAdmin) {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, due_date, due_time, project_id, is_completed, projects(name)')
          .eq('workspace_id', workspaceId!)
          .eq('is_completed', false)
          .gte('due_date', format(todayStart, 'yyyy-MM-dd'))
          .lte('due_date', format(nextWeekDate, 'yyyy-MM-dd'))
          .order('due_date', { ascending: true })
          .limit(15);
        tasksData = data ?? [];
      } else if (user?.id) {
        const { data: assigns } = await supabase
          .from('task_assignees')
          .select('task_id')
          .eq('user_id', user.id);
        const ids = (assigns ?? []).map(a => a.task_id);
        if (ids.length > 0) {
          const { data } = await supabase
            .from('tasks')
            .select('id, title, due_date, due_time, project_id, is_completed, projects(name)')
            .eq('workspace_id', workspaceId!)
            .eq('is_completed', false)
            .in('id', ids)
            .gte('due_date', format(todayStart, 'yyyy-MM-dd'))
            .lte('due_date', format(nextWeekDate, 'yyyy-MM-dd'))
            .order('due_date', { ascending: true })
            .limit(15);
          tasksData = data ?? [];
        }
      }

      const calendarEvents: UpcomingEvent[] = (eventsData ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        startAt: new Date(e.start_at),
        endAt: e.end_at ? new Date(e.end_at) : null,
        location: e.location,
        eventType: e.event_type,
        projectName: e.projects?.name,
        description: e.description,
        videoCallUrl: e.video_call_url,
        allDay: e.all_day,
      }));
      const shootEvents: UpcomingEvent[] = shootsData.map((p: any) => ({
        id: `shoot-${p.id}`,
        title: p.name,
        startAt: new Date(`${p.shoot_date}T${p.shoot_start_time || '09:00:00'}`),
        endAt: null,
        location: null,
        eventType: 'sessao',
        projectName: p.name,
        description: `Captação: ${p.clients?.name || 'Sem cliente'}`,
        videoCallUrl: null,
        allDay: !p.shoot_start_time,
      }));
      const taskEvents: UpcomingEvent[] = tasksData.map((t: any) => ({
        id: `task-${t.id}`,
        title: t.title,
        startAt: new Date(`${t.due_date}T${t.due_time || '09:00:00'}`),
        endAt: null,
        location: null,
        eventType: 'deadline',
        projectName: t.projects?.name,
        description: 'Tarefa',
        videoCallUrl: null,
        allDay: !t.due_time,
      }));

      return [...calendarEvents, ...shootEvents, ...taskEvents]
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
        .slice(0, 5);
    },
  });

  // === 6. Urgent projects ===
  const urgentQuery = useQuery({
    queryKey: qk.urgent(workspaceId ?? ''),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UrgentProject[]> => {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('projects')
        .select('id, name, type, priority, delivery_date, clients(name)')
        .eq('workspace_id', workspaceId!)
        .eq('is_delivered', false)
        .or(`priority.in.(alta,urgente),delivery_date.lte.${nextWeek}`)
        .order('priority', { ascending: false })
        .order('delivery_date', { ascending: true })
        .limit(5);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        client: p.clients?.name || 'Sem cliente',
        date: p.delivery_date || '',
        type: p.type,
        priority: p.priority,
      }));
    },
  });

  // === 7. Recent activity ===
  const recentQuery = useQuery({
    queryKey: qk.recent(workspaceId ?? ''),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RecentActivity[]> => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, updated_at, created_at')
        .eq('workspace_id', workspaceId!)
        .order('updated_at', { ascending: false })
        .limit(5);
      return (data ?? []).map((p: any) => {
        const isNew = new Date(p.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        return {
          id: p.id,
          action: isNew ? 'Projeto criado' : 'Projeto atualizado',
          target: p.name,
          time: formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: pt }),
          user: 'Sistema',
        };
      });
    },
  });

  // === Derive final shape from RPC response ===
  const rpc = metricsQuery.data;
  const realCur = bucket(rpc?.realizado_current ?? null);
  const realPrev = bucket(rpc?.realizado_previous ?? null);
  const prevCur = bucket(rpc?.previsao_current ?? null);

  const previsaoMargemPercent =
    prevCur.revenue > 0 ? Math.round((prevCur.profit / prevCur.revenue) * 100) : 0;

  const metrics: DashboardMetrics = {
    captacao: rpc?.phase_counts?.captacao ?? 0,
    edicao: rpc?.phase_counts?.edicao ?? 0,
    entregues: num(realCur.projectCount),
    receita: num(realCur.revenue),
    custos: num(realCur.cost),
    lucro: num(realCur.profit),
    pendingPayments: pendingQuery.data?.totalAmount ?? 0,
    pendingPaymentsCount: pendingQuery.data?.count ?? 0,
    receitaChange: calculateChange(num(realCur.revenue), num(realPrev.revenue)),
    custosChange: calculateChange(num(realCur.cost), num(realPrev.cost)),
    lucroChange: calculateChange(num(realCur.profit), num(realPrev.profit)),
    entreguesChange: calculateChange(num(realCur.projectCount), num(realPrev.projectCount)),
    meusGanhos: meusGanhosQuery.data ?? 0,
    previsaoReceita: num(prevCur.revenue),
    previsaoCustos: num(prevCur.cost),
    previsaoLucro: num(prevCur.profit),
    previsaoMargemPercent,
    projetosAtivos: num(prevCur.projectCount),
  };

  const monthlyData: MonthlyData[] = (rpc?.monthly_series ?? []).map((p, i, arr) => {
    const base: MonthlyData = {
      month: format(new Date(p.month_start), 'MMM', { locale: pt }),
      receita: num(p.revenue),
      custos: num(p.cost),
      lucro: num(p.profit),
    };
    if (i === arr.length - 1) {
      base.receitaPrevisao = num(prevCur.revenue);
      base.custosPrevisao = num(prevCur.cost);
      base.lucroPrevisao = num(prevCur.profit);
    }
    return base;
  });

  const annualComparison: AnnualComparisonData[] = (rpc?.annual_comparison ?? []).map(p => ({
    month: format(new Date(p.month_start), 'MMM', { locale: pt }),
    currentYear: num(p.current_year),
    previousYear: num(p.previous_year),
  }));

  const performanceMetrics: PerformanceMetrics =
    performanceQuery.data ?? {
      deliveryRate: 0,
      avgDeliveryDays: 0,
      avgMargin: 0,
      projectsByType: { fotografia: 0, video: 0, foto_video: 0 },
    };

  // Any error surfaces via logger; UI keeps rendering with zeros
  if (metricsQuery.error) logger.error('[dashboard-metrics] rpc error', metricsQuery.error);

  const loading =
    enabled &&
    (metricsQuery.isPending ||
      performanceQuery.isPending ||
      pendingQuery.isPending ||
      upcomingQuery.isPending ||
      urgentQuery.isPending ||
      recentQuery.isPending);

  const refresh = () => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return {
    metrics,
    performanceMetrics,
    urgentProjects: urgentQuery.data ?? [],
    recentActivity: recentQuery.data ?? [],
    monthlyData,
    upcomingEvents: upcomingQuery.data ?? [],
    annualComparison,
    pendingPaymentItems: pendingQuery.data?.items ?? [],
    loading,
    refresh,
  };
}
