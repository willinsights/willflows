import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { subDays, format } from 'date-fns';

export interface SystemOverview {
  totalUsers: number;
  totalWorkspaces: number;
  totalProjects: number;
  activeSubscriptions: number;
  trialUsers: number;
  paidUsers: number;
}

export interface AccountReport {
  userId: string;
  email: string;
  fullName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  workspaceName: string | null;
  workspaceId: string | null;
  projectCount: number;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
}

export interface PageAnalytics {
  pagePath: string;
  pageTitle: string | null;
  viewCount: number;
  uniqueSessions: number;
}

export interface DailyVisits {
  date: string;
  views: number;
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

export const useSystemStats = () => {
  const { isSuperAdmin } = useSuperAdmin();

  // System overview stats
  const overviewQuery = useQuery({
    queryKey: ['admin-system-overview'],
    queryFn: async (): Promise<SystemOverview> => {
      const [usersRes, workspacesRes, projectsRes, subscriptionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('workspaces').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('workspaces').select('subscription_status, subscription_plan'),
      ]);

      const subscriptions = subscriptionsRes.data || [];
      const activeCount = subscriptions.filter(s => s.subscription_status === 'active').length;
      const trialCount = subscriptions.filter(s => s.subscription_status === 'trialing').length;
      const paidCount = subscriptions.filter(s => 
        s.subscription_status === 'active' && s.subscription_plan !== 'essencial'
      ).length;

      return {
        totalUsers: usersRes.count || 0,
        totalWorkspaces: workspacesRes.count || 0,
        totalProjects: projectsRes.count || 0,
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        paidUsers: paidCount,
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Accounts report with details
  const accountsQuery = useQuery({
    queryKey: ['admin-accounts-report'],
    queryFn: async (): Promise<AccountReport[]> => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, last_login_at, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Get workspace memberships
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('user_id, workspace_id, workspaces(id, name, subscription_plan, subscription_status)')
        .eq('role', 'admin');

      // Get project counts per workspace
      const { data: projects } = await supabase
        .from('projects')
        .select('workspace_id');

      // Count projects per workspace
      const projectCountByWorkspace: Record<string, number> = {};
      projects?.forEach(p => {
        projectCountByWorkspace[p.workspace_id] = (projectCountByWorkspace[p.workspace_id] || 0) + 1;
      });

      // Map user to their primary workspace (where they're admin)
      const userWorkspaceMap: Record<string, { workspace: any; projectCount: number }> = {};
      memberships?.forEach(m => {
        if (!userWorkspaceMap[m.user_id] && m.workspaces) {
          const ws = m.workspaces as any;
          userWorkspaceMap[m.user_id] = {
            workspace: ws,
            projectCount: projectCountByWorkspace[m.workspace_id] || 0,
          };
        }
      });

      return profiles.map(profile => {
        const wsData = userWorkspaceMap[profile.id];
        return {
          userId: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          lastLoginAt: profile.last_login_at,
          createdAt: profile.created_at,
          workspaceName: wsData?.workspace?.name || null,
          workspaceId: wsData?.workspace?.id || null,
          projectCount: wsData?.projectCount || 0,
          subscriptionPlan: wsData?.workspace?.subscription_plan || null,
          subscriptionStatus: wsData?.workspace?.subscription_status || null,
        };
      });
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Page analytics - uses RPC for server-side aggregation (avoids 1000 row limit)
  const pageAnalyticsQuery = useQuery({
    queryKey: ['admin-page-analytics'],
    queryFn: async (): Promise<PageAnalytics[]> => {
      const { data, error } = await supabase.rpc('get_page_analytics', { days_back: 30 });

      if (error) throw error;

      return (data || []).map((row: { page_path: string; page_title: string | null; view_count: number; unique_sessions: number }) => ({
        pagePath: row.page_path,
        pageTitle: row.page_title,
        viewCount: Number(row.view_count),
        uniqueSessions: Number(row.unique_sessions),
      }));
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Daily visits for chart - uses RPC for server-side aggregation (avoids 1000 row limit)
  const dailyVisitsQuery = useQuery({
    queryKey: ['admin-daily-visits'],
    queryFn: async (): Promise<DailyVisits[]> => {
      const { data, error } = await supabase.rpc('get_daily_page_views', { days_back: 30 });

      if (error) throw error;

      // Initialize all 30 days with zeros
      const dayMap: Record<string, DailyVisits> = {};
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dayMap[date] = { date, views: 0, uniqueSessions: 0 };
      }

      // Fill in actual data from RPC
      (data || []).forEach((row: { view_date: string; view_count: number; unique_sessions: number }) => {
        const dateStr = format(new Date(row.view_date), 'yyyy-MM-dd');
        if (dayMap[dateStr]) {
          dayMap[dateStr].views = Number(row.view_count);
          dayMap[dateStr].uniqueSessions = Number(row.unique_sessions);
        }
      });

      return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Blog view analytics - uses RPC for server-side aggregation
  const blogAnalyticsQuery = useQuery({
    queryKey: ['admin-blog-analytics'],
    queryFn: async (): Promise<BlogViewAnalytics[]> => {
      // Get aggregated blog views via RPC
      const { data: viewsData, error: viewsError } = await supabase.rpc('get_blog_analytics', { days_back: 30 });

      if (viewsError) throw viewsError;

      // Get all blog posts metadata
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, published_at');

      if (postsError) throw postsError;

      // Create lookup map from RPC results
      const postViewMap: Record<string, { views: number; sessions: number }> = {};
      (viewsData || []).forEach((row: { post_id: string; view_count: number; unique_sessions: number }) => {
        postViewMap[row.post_id] = {
          views: Number(row.view_count),
          sessions: Number(row.unique_sessions),
        };
      });

      const analytics: BlogViewAnalytics[] = (posts || []).map(post => ({
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        viewCount: postViewMap[post.id]?.views || 0,
        uniqueSessions: postViewMap[post.id]?.sessions || 0,
        publishedAt: post.published_at,
      })).sort((a, b) => b.viewCount - a.viewCount);

      return analytics;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Total stats for quick overview - uses RPC for exact counts
  const totalsQuery = useQuery({
    queryKey: ['admin-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_page_view_counts');

      if (error) throw error;

      const row = data?.[0] || { today_views: 0, week_views: 0, month_views: 0 };
      return {
        todayViews: Number(row.today_views) || 0,
        weekViews: Number(row.week_views) || 0,
        monthViews: Number(row.month_views) || 0,
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  return {
    overview: overviewQuery.data,
    accounts: accountsQuery.data || [],
    pageAnalytics: pageAnalyticsQuery.data || [],
    dailyVisits: dailyVisitsQuery.data || [],
    blogAnalytics: blogAnalyticsQuery.data || [],
    totals: totalsQuery.data,
    isLoading: overviewQuery.isLoading || accountsQuery.isLoading || pageAnalyticsQuery.isLoading,
    refetch: () => {
      overviewQuery.refetch();
      accountsQuery.refetch();
      pageAnalyticsQuery.refetch();
      dailyVisitsQuery.refetch();
      blogAnalyticsQuery.refetch();
      totalsQuery.refetch();
    },
  };
};
