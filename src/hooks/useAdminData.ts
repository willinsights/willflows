/**
 * Centralized Admin Data Hook - Single Source of Truth
 * Replaces redundant hooks: useAdminMetrics, useSaaSCockpit, useSystemStats, useUsersSummary
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { PLANS, PLAN_DB_MAPPING, type PlanId } from '@/lib/plans';
import { startOfDay, subDays, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { useMemo } from 'react';

// ============ TYPES ============

export interface FinancialMetrics {
  mrr: number;
  arr: number;
  revenue30d: number;
  refunds30d: number;
}

export interface SubscriptionMetrics {
  total: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled30d: number;
  byPlan: Record<string, number>;
}

export interface UserMetrics {
  totalProfiles: number;
  workspaceOwners: number;
  collaborators: number;
  pendingInvites: number;
  waitlistCount: number;
  blockedUsers: number;
}

export interface ActivityMetrics {
  todayViews: number;
  weekViews: number;
  monthViews: number;
  wau: number;
  mau: number;
}

export interface ActivationFunnel {
  registered: number;
  withWorkspace: number;
  withProject: number;
  paid: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
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

export interface DailyVisits {
  date: string;
  views: number;
  uniqueSessions: number;
}

export interface PageAnalytics {
  pagePath: string;
  pageTitle: string | null;
  viewCount: number;
  uniqueSessions: number;
}

export interface BlogViewAnalytics {
  postId: string;
  postTitle: string;
  postSlug: string;
  viewCount: number;
  uniqueSessions: number;
  publishedAt: string | null;
}

// ============ HELPERS ============

function getPlanMonthlyPrice(plan: string): number {
  const normalizedPlan = PLAN_DB_MAPPING[plan] || 'starter';
  return PLANS[normalizedPlan as PlanId]?.prices?.eur?.monthly || 0;
}

// ============ MAIN HOOK ============

export function useAdminData() {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  // -------- CORE DATA QUERY --------
  // Fetches all essential data in one query for consistency
  const coreDataQuery = useQuery({
    queryKey: ['admin-core-data'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const today = startOfDay(new Date()).toISOString();

      const [
        profilesRes,
        workspacesRes,
        membersRes,
        projectsRes,
        subscriptionsRes,
        waitlistRes,
        pageViewsMonthRes,
        pageViewsWeekRes,
        pageViewsTodayRes,
        activityLogRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, created_at, last_login_at, is_blocked'),
        supabase.from('workspaces').select('id, name, subscription_status, subscription_plan, created_at'),
        supabase.from('workspace_members').select('id, user_id, workspace_id, role, is_active'),
        supabase.from('projects').select('id, workspace_id'),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('beta_waitlist').select('id, email, name, invited_at, created_at'),
        supabase.from('page_views').select('id, session_id, created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('activity_log').select('id, user_id, created_at').gte('created_at', thirtyDaysAgo),
      ]);

      return {
        profiles: profilesRes.data || [],
        workspaces: workspacesRes.data || [],
        members: membersRes.data || [],
        projects: projectsRes.data || [],
        subscriptions: subscriptionsRes.data || [],
        waitlist: waitlistRes.data || [],
        pageViewsMonth: pageViewsMonthRes.data || [],
        pageViewsWeekCount: pageViewsWeekRes.count || 0,
        pageViewsTodayCount: pageViewsTodayRes.count || 0,
        activityLog: activityLogRes.data || [],
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  // -------- COMPUTED METRICS (Memoized) --------

  const financial = useMemo<FinancialMetrics>(() => {
    if (!coreDataQuery.data) return { mrr: 0, arr: 0, revenue30d: 0, refunds30d: 0 };
    
    const { subscriptions } = coreDataQuery.data;
    
    // Calculate MRR from active subscriptions (use subscription_status and subscription_plan)
    const mrr = subscriptions
      .filter(s => s.subscription_status === 'active')
      .reduce((sum, s) => sum + getPlanMonthlyPrice(s.subscription_plan || 'starter'), 0);

    return {
      mrr,
      arr: mrr * 12,
      revenue30d: 0, // Would need invoices table
      refunds30d: 0, // Would need refunds data
    };
  }, [coreDataQuery.data]);

  const subscriptionMetrics = useMemo<SubscriptionMetrics>(() => {
    if (!coreDataQuery.data) return { total: 0, active: 0, trialing: 0, pastDue: 0, canceled30d: 0, byPlan: {} };
    
    const { subscriptions } = coreDataQuery.data;

    const byPlan: Record<string, number> = {};
    subscriptions.forEach(s => {
      const plan = s.subscription_plan || 'starter';
      byPlan[plan] = (byPlan[plan] || 0) + 1;
    });

    return {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.subscription_status === 'active').length,
      trialing: subscriptions.filter(s => s.subscription_status === 'trialing').length,
      pastDue: subscriptions.filter(s => s.subscription_status === 'past_due').length,
      canceled30d: 0, // Would need canceled_at column
      byPlan,
    };
  }, [coreDataQuery.data]);

  const userMetrics = useMemo<UserMetrics>(() => {
    if (!coreDataQuery.data) return { totalProfiles: 0, workspaceOwners: 0, collaborators: 0, pendingInvites: 0, waitlistCount: 0, blockedUsers: 0 };
    
    const { profiles, members, waitlist } = coreDataQuery.data;

    // Owners = users who are admin in at least one workspace
    const ownerIds = new Set(
      members.filter(m => m.role === 'admin' && m.is_active).map(m => m.user_id)
    );

    // Collaborators = users who are NOT admin in any workspace but are members
    const allMemberIds = new Set(members.filter(m => m.is_active).map(m => m.user_id));
    const collaboratorIds = [...allMemberIds].filter(id => !ownerIds.has(id));

    // Waitlist not yet invited
    const waitlistPending = waitlist.filter(w => !w.invited_at).length;

    // Blocked users
    const blockedUsers = profiles.filter(p => p.is_blocked).length;

    return {
      totalProfiles: profiles.length,
      workspaceOwners: ownerIds.size,
      collaborators: collaboratorIds.length,
      pendingInvites: 0, // Would need separate query
      waitlistCount: waitlistPending,
      blockedUsers,
    };
  }, [coreDataQuery.data]);

  const activityMetrics = useMemo<ActivityMetrics>(() => {
    if (!coreDataQuery.data) return { todayViews: 0, weekViews: 0, monthViews: 0, wau: 0, mau: 0 };
    
    const { pageViewsMonth, pageViewsWeekCount, pageViewsTodayCount, activityLog } = coreDataQuery.data;
    const sevenDaysAgo = subDays(new Date(), 7);

    // WAU from activity_log (unique users in last 7 days)
    const wauUsers = new Set(
      activityLog
        .filter(a => new Date(a.created_at) > sevenDaysAgo)
        .map(a => a.user_id)
    );

    // MAU from activity_log (unique users in last 30 days)
    const mauUsers = new Set(activityLog.map(a => a.user_id));

    return {
      todayViews: pageViewsTodayCount,
      weekViews: pageViewsWeekCount,
      monthViews: pageViewsMonth.length,
      wau: wauUsers.size,
      mau: mauUsers.size,
    };
  }, [coreDataQuery.data]);

  const activationFunnel = useMemo<ActivationFunnel>(() => {
    if (!coreDataQuery.data) return { registered: 0, withWorkspace: 0, withProject: 0, paid: 0 };
    
    const { profiles, members, projects, subscriptions } = coreDataQuery.data;

    // Users with at least one workspace membership
    const usersWithWorkspace = new Set(members.filter(m => m.is_active).map(m => m.user_id));

    // Workspaces with at least one project
    const workspacesWithProject = new Set(projects.map(p => p.workspace_id));
    
    // Users in workspaces that have projects
    const usersWithProject = new Set(
      members
        .filter(m => m.is_active && workspacesWithProject.has(m.workspace_id))
        .map(m => m.user_id)
    );

    // Users with active subscriptions
    const paidUsers = subscriptions.filter(s => s.subscription_status === 'active').length;

    return {
      registered: profiles.length,
      withWorkspace: usersWithWorkspace.size,
      withProject: usersWithProject.size,
      paid: paidUsers,
    };
  }, [coreDataQuery.data]);

  // -------- ALERTS QUERY --------
  const alertsQuery = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const alerts: Alert[] = [];
      
      // Check for past due subscriptions
      const { data: pastDue } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('subscription_status', 'past_due');

      if (pastDue && pastDue.length > 0) {
        alerts.push({
          id: 'past-due',
          type: 'warning',
          title: 'Pagamentos em Atraso',
          message: `${pastDue.length} subscrições com pagamento pendente`,
        });
      }

      return alerts;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // -------- MRR HISTORY QUERY --------
  const mrrHistoryQuery = useQuery({
    queryKey: ['admin-mrr-history'],
    queryFn: async (): Promise<MRRDataPoint[]> => {
      const history: MRRDataPoint[] = [];

      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM yy');

        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('subscription_plan, subscription_status')
          .eq('subscription_status', 'active')
          .lte('created_at', monthEnd.toISOString());

        const mrr = (subs || []).reduce((sum, s) => sum + getPlanMonthlyPrice(s.subscription_plan || 'starter'), 0);

        history.push({ month: monthLabel, mrr });
      }

      return history;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // -------- CONVERSION HISTORY QUERY --------
  const conversionHistoryQuery = useQuery({
    queryKey: ['admin-conversion-history'],
    queryFn: async (): Promise<ConversionDataPoint[]> => {
      const history: ConversionDataPoint[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM yy');

        const [signupsRes, paidRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('user_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
        ]);

        const signups = signupsRes.count || 0;
        const paid = paidRes.count || 0;
        const rate = signups > 0 ? Math.round((paid / signups) * 100) : 0;

        history.push({ month: monthLabel, signups, paid, rate });
      }

      return history;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // -------- PAGE ANALYTICS QUERY --------
  const pageAnalyticsQuery = useQuery({
    queryKey: ['admin-page-analytics'],
    queryFn: async (): Promise<PageAnalytics[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data: pageViews, error } = await supabase
        .from('page_views')
        .select('page_path, page_title, session_id')
        .gte('created_at', thirtyDaysAgo);

      if (error) throw error;

      // Aggregate by page path
      const pageMap: Record<string, { title: string | null; views: number; sessions: Set<string> }> = {};
      
      pageViews?.forEach(pv => {
        if (!pageMap[pv.page_path]) {
          pageMap[pv.page_path] = { title: pv.page_title, views: 0, sessions: new Set() };
        }
        pageMap[pv.page_path].views++;
        pageMap[pv.page_path].sessions.add(pv.session_id);
      });

      return Object.entries(pageMap)
        .map(([path, data]) => ({
          pagePath: path,
          pageTitle: data.title,
          viewCount: data.views,
          uniqueSessions: data.sessions.size,
        }))
        .sort((a, b) => b.viewCount - a.viewCount);
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // -------- DAILY VISITS QUERY --------
  const dailyVisitsQuery = useQuery({
    queryKey: ['admin-daily-visits'],
    queryFn: async (): Promise<DailyVisits[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data: pageViews, error } = await supabase
        .from('page_views')
        .select('created_at, session_id')
        .gte('created_at', thirtyDaysAgo);

      if (error) throw error;

      // Aggregate by day
      const dayMap: Record<string, { views: number; sessions: Set<string> }> = {};
      
      // Initialize all 30 days
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dayMap[date] = { views: 0, sessions: new Set() };
      }

      pageViews?.forEach(pv => {
        const date = format(new Date(pv.created_at), 'yyyy-MM-dd');
        if (dayMap[date]) {
          dayMap[date].views++;
          dayMap[date].sessions.add(pv.session_id);
        }
      });

      return Object.entries(dayMap)
        .map(([date, data]) => ({
          date,
          views: data.views,
          uniqueSessions: data.sessions.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // -------- BLOG ANALYTICS QUERY --------
  const blogAnalyticsQuery = useQuery({
    queryKey: ['admin-blog-analytics'],
    queryFn: async (): Promise<BlogViewAnalytics[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [viewsRes, postsRes] = await Promise.all([
        supabase
          .from('blog_views')
          .select('post_id, session_id')
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('blog_posts')
          .select('id, title, slug, published_at'),
      ]);

      if (viewsRes.error) throw viewsRes.error;
      if (postsRes.error) throw postsRes.error;

      // Aggregate views by post
      const postViewMap: Record<string, { views: number; sessions: Set<string> }> = {};
      
      viewsRes.data?.forEach(bv => {
        if (!postViewMap[bv.post_id]) {
          postViewMap[bv.post_id] = { views: 0, sessions: new Set() };
        }
        postViewMap[bv.post_id].views++;
        postViewMap[bv.post_id].sessions.add(bv.session_id);
      });

      return (postsRes.data || []).map(post => ({
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        viewCount: postViewMap[post.id]?.views || 0,
        uniqueSessions: postViewMap[post.id]?.sessions?.size || 0,
        publishedAt: post.published_at,
      })).sort((a, b) => b.viewCount - a.viewCount);
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // -------- REFETCH ALL --------
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-core-data'] });
    queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-mrr-history'] });
    queryClient.invalidateQueries({ queryKey: ['admin-conversion-history'] });
    queryClient.invalidateQueries({ queryKey: ['admin-page-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['admin-daily-visits'] });
    queryClient.invalidateQueries({ queryKey: ['admin-blog-analytics'] });
  };

  return {
    // Raw data
    data: coreDataQuery.data,
    
    // Computed metrics
    financial,
    subscriptions: subscriptionMetrics,
    users: userMetrics,
    activity: activityMetrics,
    funnel: activationFunnel,
    
    // Other data
    alerts: alertsQuery.data || [],
    mrrHistory: mrrHistoryQuery.data || [],
    conversionHistory: conversionHistoryQuery.data || [],
    pageAnalytics: pageAnalyticsQuery.data || [],
    dailyVisits: dailyVisitsQuery.data || [],
    blogAnalytics: blogAnalyticsQuery.data || [],
    
    // Loading states
    isLoading: coreDataQuery.isLoading,
    isLoadingCharts: mrrHistoryQuery.isLoading || conversionHistoryQuery.isLoading,
    isLoadingAnalytics: pageAnalyticsQuery.isLoading || dailyVisitsQuery.isLoading || blogAnalyticsQuery.isLoading,
    
    // Actions
    refetch: refetchAll,
  };
}
