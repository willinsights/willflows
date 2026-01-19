import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { subDays, startOfDay, endOfDay, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type PeriodType = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  revenueInPeriod: number;
  refundsInPeriod: number;
  subscriptions: {
    active: number;
    trialing: number;
    pastDue: number;
    cancelAtPeriodEnd: number;
    canceledInPeriod: number;
  };
  churn: {
    users: number;
    usersPercent: number;
    revenue: number;
    revenuePercent: number;
  };
  activity: {
    wau: number;
    mau: number;
  };
  activation: {
    registrations: number;
    createdWorkspace: number;
    createdProject: number;
    createdTask: number;
    paid: number;
  };
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  count?: number;
  timestamp?: string;
}

export interface MRRDataPoint {
  month: string;
  mrr: number;
}

export interface ConversionDataPoint {
  month: string;
  signups: number;
  paid: number;
  conversionRate: number;
}

export interface ChurnDataPoint {
  month: string;
  churnRate: number;
  churned: number;
}

const PLAN_PRICES: Record<string, number> = {
  essencial: 19,
  pro: 49,
  studio: 99,
};

export function useSaaSCockpit(period: PeriodType, customRange?: DateRange) {
  const { isSuperAdmin } = useSuperAdmin();

  const getDateRange = (): DateRange => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case '7d':
        return { from: subDays(now, 7), to: now };
      case '30d':
        return { from: subDays(now, 30), to: now };
      case '90d':
        return { from: subDays(now, 90), to: now };
      case 'custom':
        return customRange || { from: subDays(now, 30), to: now };
      default:
        return { from: subDays(now, 30), to: now };
    }
  };

  const dateRange = getDateRange();

  // Main metrics query
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['saas-metrics', period, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<SaaSMetrics> => {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7).toISOString();
      const thirtyDaysAgo = subDays(now, 30).toISOString();

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('*');

      const subs = subscriptions || [];
      
      // Calculate MRR from active subscriptions
      const activeSubs = subs.filter(s => s.subscription_status === 'active');
      const mrr = activeSubs.reduce((sum, s) => {
        const plan = s.subscription_plan as string;
        return sum + (PLAN_PRICES[plan] || 0);
      }, 0);

      // Subscription counts
      const active = subs.filter(s => s.subscription_status === 'active').length;
      const trialing = subs.filter(s => s.subscription_status === 'trialing').length;
      const pastDue = subs.filter(s => s.subscription_status === 'past_due').length;
      // cancel_at_period_end not yet in schema, using 0 for now
      const cancelAtPeriodEnd = 0;
      
      // Canceled in period
      const canceledInPeriod = subs.filter(s =>
        s.subscription_status === 'canceled' && 
        s.updated_at && 
        new Date(s.updated_at) >= dateRange.from &&
        new Date(s.updated_at) <= dateRange.to
      ).length;

      // Fetch invoices for revenue
      const { data: invoices } = await supabase
        .from('subscription_invoices')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const invs = invoices || [];
      const revenueInPeriod = invs
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.amount_total / 100), 0);
      const refundsInPeriod = invs
        .filter(i => i.status === 'refunded')
        .reduce((sum, i) => sum + (i.amount_total / 100), 0);

      // Activity metrics (WAU/MAU)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, last_login_at');

      const profs = profiles || [];
      const wau = profs.filter(p => p.last_login_at && new Date(p.last_login_at) >= new Date(sevenDaysAgo)).length;
      const mau = profs.filter(p => p.last_login_at && new Date(p.last_login_at) >= new Date(thirtyDaysAgo)).length;

      // Activation funnel
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const { data: workspaceMembers } = await supabase
        .from('workspace_members')
        .select('user_id, workspace_id')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const usersWithWorkspace = new Set((workspaceMembers || []).map(wm => wm.user_id)).size;

      const { data: projects } = await supabase
        .from('projects')
        .select('created_by')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const usersWithProject = new Set((projects || []).filter(p => p.created_by).map(p => p.created_by)).size;

      const { data: tasks } = await supabase
        .from('tasks')
        .select('created_by')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const usersWithTask = new Set((tasks || []).filter(t => t.created_by).map(t => t.created_by)).size;

      const paidUsers = activeSubs.length;

      // Churn calculation (simplified)
      const totalAtStart = subs.length - (totalUsers || 0);
      const churnUsersPercent = totalAtStart > 0 ? (canceledInPeriod / totalAtStart) * 100 : 0;

      return {
        mrr,
        arr: mrr * 12,
        revenueInPeriod,
        refundsInPeriod,
        subscriptions: {
          active,
          trialing,
          pastDue,
          cancelAtPeriodEnd,
          canceledInPeriod,
        },
        churn: {
          users: canceledInPeriod,
          usersPercent: churnUsersPercent,
          revenue: 0, // Would need more complex calculation
          revenuePercent: 0,
        },
        activity: {
          wau,
          mau,
        },
        activation: {
          registrations: totalUsers || 0,
          createdWorkspace: usersWithWorkspace,
          createdProject: usersWithProject,
          createdTask: usersWithTask,
          paid: paidUsers,
        },
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Alerts query
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['saas-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const alertsList: Alert[] = [];
      const oneHourAgo = subDays(new Date(), 1/24).toISOString();
      const oneDayAgo = subDays(new Date(), 1).toISOString();

      // Check for failed webhooks
      const { count: failedWebhooks } = await supabase
        .from('stripe_webhook_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', oneDayAgo);

      if (failedWebhooks && failedWebhooks > 0) {
        alertsList.push({
          id: 'webhook-failures',
          type: 'error',
          title: 'Webhooks com Falha',
          message: `${failedWebhooks} webhook(s) falharam nas últimas 24h`,
          count: failedWebhooks,
        });
      }

      // Check for past_due subscriptions
      const { count: pastDueCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'past_due');

      if (pastDueCount && pastDueCount > 0) {
        alertsList.push({
          id: 'past-due',
          type: 'warning',
          title: 'Pagamentos em Atraso',
          message: `${pastDueCount} subscrição(ões) com pagamento em atraso`,
          count: pastDueCount,
        });
      }

      // Check for suspicious signups (many in short time)
      const { data: recentSignups } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', oneHourAgo);

      if (recentSignups && recentSignups.length > 10) {
        alertsList.push({
          id: 'suspicious-signups',
          type: 'warning',
          title: 'Signups Suspeitos',
          message: `${recentSignups.length} registos na última hora`,
          count: recentSignups.length,
        });
      }

      return alertsList;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2,
  });

  // MRR over time (last 12 months)
  const { data: mrrHistory = [], isLoading: mrrLoading } = useQuery({
    queryKey: ['mrr-history'],
    queryFn: async (): Promise<MRRDataPoint[]> => {
      const dataPoints: MRRDataPoint[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthEnd = endOfMonth(monthDate);
        
        // Get subscriptions that were active at that month end
        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('subscription_plan, subscription_status, created_at')
          .lte('created_at', monthEnd.toISOString());

        const activeSubs = (subs || []).filter(s => s.subscription_status === 'active' || s.subscription_status === 'trialing');
        const mrr = activeSubs.reduce((sum, s) => {
          const plan = s.subscription_plan as string;
          return sum + (PLAN_PRICES[plan] || 0);
        }, 0);

        dataPoints.push({
          month: format(monthDate, 'MMM yy'),
          mrr,
        });
      }

      return dataPoints;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 30,
  });

  // Conversion data (signups vs paid)
  const { data: conversionHistory = [], isLoading: conversionLoading } = useQuery({
    queryKey: ['conversion-history'],
    queryFn: async (): Promise<ConversionDataPoint[]> => {
      const dataPoints: ConversionDataPoint[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const { count: signups } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { count: paid } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'active')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const s = signups || 0;
        const p = paid || 0;

        dataPoints.push({
          month: format(monthDate, 'MMM yy'),
          signups: s,
          paid: p,
          conversionRate: s > 0 ? (p / s) * 100 : 0,
        });
      }

      return dataPoints;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 30,
  });

  return {
    metrics: metrics || null,
    alerts,
    mrrHistory,
    conversionHistory,
    isLoading: metricsLoading || alertsLoading || mrrLoading || conversionLoading,
    dateRange,
  };
}
