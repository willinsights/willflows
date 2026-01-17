import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { startOfDay, subDays, format } from 'date-fns';

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

  // Page analytics
  const pageAnalyticsQuery = useQuery({
    queryKey: ['admin-page-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get page views grouped by path
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

      const analytics: PageAnalytics[] = Object.entries(pageMap)
        .map(([path, data]) => ({
          pagePath: path,
          pageTitle: data.title,
          viewCount: data.views,
          uniqueSessions: data.sessions.size,
        }))
        .sort((a, b) => b.viewCount - a.viewCount);

      return analytics;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Daily visits for chart
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

  // Blog view analytics
  const blogAnalyticsQuery = useQuery({
    queryKey: ['admin-blog-analytics'],
    queryFn: async (): Promise<BlogViewAnalytics[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get blog views with post info
      const { data: blogViews, error: viewsError } = await supabase
        .from('blog_views')
        .select('post_id, session_id')
        .gte('created_at', thirtyDaysAgo);

      if (viewsError) throw viewsError;

      // Get all blog posts
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, published_at');

      if (postsError) throw postsError;

      // Aggregate views by post
      const postViewMap: Record<string, { views: number; sessions: Set<string> }> = {};
      
      blogViews?.forEach(bv => {
        if (!postViewMap[bv.post_id]) {
          postViewMap[bv.post_id] = { views: 0, sessions: new Set() };
        }
        postViewMap[bv.post_id].views++;
        postViewMap[bv.post_id].sessions.add(bv.session_id);
      });

      const analytics: BlogViewAnalytics[] = (posts || []).map(post => ({
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        viewCount: postViewMap[post.id]?.views || 0,
        uniqueSessions: postViewMap[post.id]?.sessions?.size || 0,
        publishedAt: post.published_at,
      })).sort((a, b) => b.viewCount - a.viewCount);

      return analytics;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Total stats for quick overview
  const totalsQuery = useQuery({
    queryKey: ['admin-totals'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      ]);

      return {
        todayViews: todayRes.count || 0,
        weekViews: weekRes.count || 0,
        monthViews: monthRes.count || 0,
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
