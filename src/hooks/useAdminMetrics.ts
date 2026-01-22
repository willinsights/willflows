import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, type PlanId, PLAN_DB_MAPPING } from '@/lib/plans';
import { startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';

// ============= Types =============

export interface FinancialMetrics {
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  refundsThisMonth: number;
}

export interface UserMetrics {
  total: number;
  owners: number;
  collaborators: number;
  blocked: number;
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
}

export interface SubscriptionMetrics {
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  canceledThisMonth: number;
  conversionRate: number; // trial → paid %
}

export interface WorkspaceMetrics {
  total: number;
  active: number; // with projects
  averageMembers: number;
  totalProjects: number;
  totalTasks: number;
}

export interface ActivationFunnel {
  signups: number;
  withWorkspace: number;
  withProject: number;
  withPayment: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

export interface MRRDataPoint {
  month: string;
  mrr: number;
}

export interface ConversionDataPoint {
  month: string;
  signups: number;
  paid: number;
  rate: number;
}

export interface AdminMetrics {
  financial: FinancialMetrics;
  users: UserMetrics;
  subscriptions: SubscriptionMetrics;
  workspaces: WorkspaceMetrics;
  activation: ActivationFunnel;
}

// ============= Helper Functions =============

function getPlanMonthlyPrice(plan: string): number {
  const planId: PlanId = PLAN_DB_MAPPING[plan] || 'starter';
  return PLANS[planId]?.prices?.eur?.monthly || 0;
}

// ============= Main Hook =============

export function useAdminMetrics() {
  const now = new Date();
  const startOfThisMonth = startOfMonth(now);
  const endOfThisMonth = endOfMonth(now);
  const oneWeekAgo = subDays(now, 7);
  const oneMonthAgo = subDays(now, 30);

  // Main metrics query - single consolidated fetch
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['admin-metrics-consolidated'],
    queryFn: async (): Promise<AdminMetrics> => {
      // Fetch all data in parallel
      const [
        profilesResult,
        subscriptionsResult,
        workspaceMembersResult,
        workspacesResult,
        projectsResult,
        tasksResult,
        invoicesResult,
        activityResult,
        systemAdminsResult,
      ] = await Promise.all([
        // Profiles
        supabase.from('profiles').select('id, is_blocked, created_at, last_login_at'),
        // Subscriptions
        supabase.from('user_subscriptions').select('*'),
        // Workspace members
        supabase.from('workspace_members').select('user_id, workspace_id, role, is_active'),
        // Workspaces
        supabase.from('workspaces').select('id, subscription_status'),
        // Projects count
        supabase.from('projects').select('id, workspace_id'),
        // Tasks count
        supabase.from('tasks').select('id, workspace_id'),
        // Invoices this month
        supabase.from('subscription_invoices')
          .select('*')
          .gte('created_at', startOfThisMonth.toISOString())
          .lte('created_at', endOfThisMonth.toISOString()),
        // Activity for WAU/MAU
        supabase.from('activity_log')
          .select('user_id, created_at')
          .gte('created_at', oneMonthAgo.toISOString()),
        // System admins (to exclude from metrics)
        supabase.from('system_admins').select('user_id'),
      ]);

      const profiles = profilesResult.data || [];
      const subscriptions = subscriptionsResult.data || [];
      const members = workspaceMembersResult.data || [];
      const workspaces = workspacesResult.data || [];
      const projects = projectsResult.data || [];
      const tasks = tasksResult.data || [];
      const invoices = invoicesResult.data || [];
      const activities = activityResult.data || [];
      const systemAdmins = new Set((systemAdminsResult.data || []).map(a => a.user_id));

      // Filter out system admins from subscription calculations
      const userSubscriptions = subscriptions.filter(s => !systemAdmins.has(s.user_id));

      // ===== Financial Metrics =====
      const activeSubscriptions = userSubscriptions.filter(s => s.subscription_status === 'active');
      const mrr = activeSubscriptions.reduce((sum, s) => sum + getPlanMonthlyPrice(s.subscription_plan), 0);
      const arr = mrr * 12;

      const revenueThisMonth = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.amount_total || 0), 0);
      const refundsThisMonth = invoices
        .filter(i => i.status === 'refunded')
        .reduce((sum, i) => sum + (i.amount_total || 0), 0);

      // ===== User Metrics =====
      const activeMembers = members.filter(m => m.is_active);
      const ownerIds = new Set(activeMembers.filter(m => m.role === 'admin').map(m => m.user_id));
      const collaboratorIds = new Set(
        activeMembers.filter(m => m.role !== 'admin').map(m => m.user_id)
      );

      // WAU/MAU calculation
      const weeklyActiveUsers = new Set(
        activities
          .filter(a => new Date(a.created_at) >= oneWeekAgo)
          .map(a => a.user_id)
      );
      const monthlyActiveUsers = new Set(activities.map(a => a.user_id));

      // ===== Subscription Metrics =====
      const trialingSubs = userSubscriptions.filter(s => s.subscription_status === 'trialing');
      const pastDueSubs = userSubscriptions.filter(s => s.subscription_status === 'past_due');
      const canceledSubs = userSubscriptions.filter(s => s.subscription_status === 'canceled');
      const canceledThisMonth = canceledSubs.filter(s => 
        s.updated_at && new Date(s.updated_at) >= startOfThisMonth
      );

      // Conversion rate: users who went from trial to active
      const totalTrialsEver = userSubscriptions.length;
      const totalPaid = activeSubscriptions.length + canceledSubs.length;
      const conversionRate = totalTrialsEver > 0 ? (totalPaid / totalTrialsEver) * 100 : 0;

      // ===== Workspace Metrics =====
      const workspaceProjectCount = new Map<string, number>();
      projects.forEach(p => {
        workspaceProjectCount.set(p.workspace_id, (workspaceProjectCount.get(p.workspace_id) || 0) + 1);
      });
      const activeWorkspaces = workspaces.filter(w => workspaceProjectCount.has(w.id));
      
      const memberCounts = activeMembers.reduce((acc, m) => {
        acc.set(m.workspace_id, (acc.get(m.workspace_id) || 0) + 1);
        return acc;
      }, new Map<string, number>());
      const avgMembers = memberCounts.size > 0 
        ? Array.from(memberCounts.values()).reduce((a, b) => a + b, 0) / memberCounts.size 
        : 0;

      // ===== Activation Funnel =====
      const totalSignups = profiles.length;
      const usersWithWorkspace = new Set(activeMembers.map(m => m.user_id)).size;
      const usersWithProject = new Set(projects.map(p => p.workspace_id)).size; // workspaces with projects
      const usersWithPayment = activeSubscriptions.length;

      return {
        financial: {
          mrr,
          arr,
          revenueThisMonth,
          refundsThisMonth,
        },
        users: {
          total: profiles.length,
          owners: ownerIds.size,
          collaborators: collaboratorIds.size,
          blocked: profiles.filter(p => p.is_blocked).length,
          wau: weeklyActiveUsers.size,
          mau: monthlyActiveUsers.size,
        },
        subscriptions: {
          active: activeSubscriptions.length,
          trialing: trialingSubs.length,
          pastDue: pastDueSubs.length,
          canceled: canceledSubs.length,
          canceledThisMonth: canceledThisMonth.length,
          conversionRate: Math.round(conversionRate * 10) / 10,
        },
        workspaces: {
          total: workspaces.length,
          active: activeWorkspaces.length,
          averageMembers: Math.round(avgMembers * 10) / 10,
          totalProjects: projects.length,
          totalTasks: tasks.length,
        },
        activation: {
          signups: totalSignups,
          withWorkspace: usersWithWorkspace,
          withProject: usersWithProject,
          withPayment: usersWithPayment,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Alerts query
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const alertsList: Alert[] = [];

      // Check for past due subscriptions
      const { data: pastDue } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('subscription_status', 'past_due');

      if (pastDue && pastDue.length > 0) {
        alertsList.push({
          id: 'past-due',
          type: 'warning',
          title: 'Pagamentos em Atraso',
          message: `${pastDue.length} subscrições com pagamento em atraso`,
          timestamp: now,
        });
      }

      return alertsList;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // MRR History (12 months)
  const { data: mrrHistory = [], isLoading: mrrHistoryLoading } = useQuery({
    queryKey: ['admin-mrr-history'],
    queryFn: async (): Promise<MRRDataPoint[]> => {
      const history: MRRDataPoint[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM yy');

        const { data: activeSubs } = await supabase
          .from('user_subscriptions')
          .select('subscription_plan')
          .eq('subscription_status', 'active')
          .lte('created_at', monthEnd.toISOString());

        const monthMrr = (activeSubs || []).reduce(
          (sum, s) => sum + getPlanMonthlyPrice(s.subscription_plan),
          0
        );

        history.push({ month: monthLabel, mrr: monthMrr });
      }

      return history;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Conversion History (6 months)
  const { data: conversionHistory = [], isLoading: conversionHistoryLoading } = useQuery({
    queryKey: ['admin-conversion-history'],
    queryFn: async (): Promise<ConversionDataPoint[]> => {
      const history: ConversionDataPoint[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM yy');

        const [signupsResult, paidResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('user_subscriptions')
            .select('id')
            .eq('subscription_status', 'active')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
        ]);

        const signups = signupsResult.data?.length || 0;
        const paid = paidResult.data?.length || 0;
        const rate = signups > 0 ? Math.round((paid / signups) * 100) : 0;

        history.push({ month: monthLabel, signups, paid, rate });
      }

      return history;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const refetchAll = () => {
    refetchMetrics();
  };

  return {
    metrics,
    alerts,
    mrrHistory,
    conversionHistory,
    isLoading: metricsLoading || alertsLoading,
    isLoadingHistory: mrrHistoryLoading || conversionHistoryLoading,
    refetch: refetchAll,
  };
}
