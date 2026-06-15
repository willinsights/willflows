import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useAdminAudit } from './useAdminAudit';
import { useToast } from './use-toast';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  source: string | null;
  is_blocked: boolean;
  is_internal_test: boolean;
  created_at: string;
  last_login_at: string | null;
  subscription?: {
    subscription_plan: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };
  workspaces: {
    id: string;
    name: string;
    role: string;
  }[];
  stats: {
    projects: number;
    tasks: number;
  };
}

export interface UserFilters {
  search: string;
  status: 'all' | 'active' | 'blocked' | 'trialing';
  plan: 'all' | 'starter' | 'pro' | 'studio';
  source: 'all' | 'public' | 'invite' | 'waitlist';
  dateFrom?: Date;
  dateTo?: Date;
}

export function useAdminUsers(filters: UserFilters) {
  const { isSuperAdmin } = useSuperAdmin();
  const { logAction } = useAdminAudit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async (): Promise<AdminUser[]> => {
      // Fetch profiles with filters
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`);
      }

      // Apply status filter
      if (filters.status === 'blocked') {
        query = query.eq('is_blocked', true);
      } else if (filters.status === 'active') {
        query = query.eq('is_blocked', false);
      }

      // Apply source filter
      if (filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const { data: profiles, error } = await query.limit(200);

      if (error) throw error;
      if (!profiles) return [];

      const userIds = profiles.map(p => p.id);

      // Execute subscriptions and memberships queries in PARALLEL
      const [subscriptionsResult, membershipsResult] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('*')
          .in('user_id', userIds),
        supabase
          .from('workspace_members')
          .select(`
            user_id,
            role,
            workspace:workspaces(id, name)
          `)
          .in('user_id', userIds)
          .eq('is_active', true),
      ]);

      const subscriptions = subscriptionsResult.data;
      const memberships = membershipsResult.data;

      // Build user -> workspaces map
      const userWorkspaceMap = new Map<string, string[]>();
      (memberships || []).forEach(m => {
        if (m.workspace) {
          const existing = userWorkspaceMap.get(m.user_id) || [];
          existing.push((m.workspace as any).id);
          userWorkspaceMap.set(m.user_id, existing);
        }
      });

      // Get all unique workspace IDs
      const allWorkspaceIds = [...new Set(
        Array.from(userWorkspaceMap.values()).flat()
      )];

      // Fetch projects and tasks by workspace in PARALLEL
      const [projectsResult, tasksResult] = await Promise.all([
        allWorkspaceIds.length > 0
          ? supabase
              .from('projects')
              .select('workspace_id')
              .in('workspace_id', allWorkspaceIds)
          : Promise.resolve({ data: [] }),
        allWorkspaceIds.length > 0
          ? supabase
              .from('tasks')
              .select('workspace_id')
              .in('workspace_id', allWorkspaceIds)
          : Promise.resolve({ data: [] }),
      ]);

      const projectsByWorkspace = projectsResult.data || [];
      const tasksByWorkspace = tasksResult.data || [];

      // Count projects per workspace
      const workspaceProjectCount = new Map<string, number>();
      projectsByWorkspace.forEach(p => {
        workspaceProjectCount.set(
          p.workspace_id,
          (workspaceProjectCount.get(p.workspace_id) || 0) + 1
        );
      });

      // Calculate total projects per user (sum of all their workspaces)
      const projectCountMap = new Map<string, number>();
      userWorkspaceMap.forEach((workspaces, userId) => {
        const total = workspaces.reduce((sum, wsId) =>
          sum + (workspaceProjectCount.get(wsId) || 0), 0
        );
        projectCountMap.set(userId, total);
      });

      // Count tasks per workspace
      const workspaceTaskCount = new Map<string, number>();
      tasksByWorkspace.forEach(t => {
        workspaceTaskCount.set(
          t.workspace_id,
          (workspaceTaskCount.get(t.workspace_id) || 0) + 1
        );
      });

      // Calculate total tasks per user
      const taskCountMap = new Map<string, number>();
      userWorkspaceMap.forEach((workspaces, userId) => {
        const total = workspaces.reduce((sum, wsId) =>
          sum + (workspaceTaskCount.get(wsId) || 0), 0
        );
        taskCountMap.set(userId, total);
      });

      // Map data
      const subsMap = new Map((subscriptions || []).map(s => [s.user_id, s]));
      const membershipMap = new Map<string, { id: string; name: string; role: string }[]>();
      (memberships || []).forEach(m => {
        const existing = membershipMap.get(m.user_id) || [];
        if (m.workspace) {
          existing.push({
            id: (m.workspace as any).id,
            name: (m.workspace as any).name,
            role: m.role,
          });
        }
        membershipMap.set(m.user_id, existing);
      });

      let result: AdminUser[] = profiles.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        phone: p.phone,
        source: p.source || 'public',
        is_blocked: p.is_blocked || false,
        is_internal_test: p.is_internal_test,
        created_at: p.created_at,
        last_login_at: p.last_login_at,
        subscription: subsMap.get(p.id) ? {
          subscription_plan: subsMap.get(p.id)!.subscription_plan,
          subscription_status: subsMap.get(p.id)!.subscription_status,
          stripe_customer_id: subsMap.get(p.id)!.stripe_customer_id,
          stripe_subscription_id: subsMap.get(p.id)!.stripe_subscription_id,
        } : undefined,
        workspaces: membershipMap.get(p.id) || [],
        stats: {
          projects: projectCountMap.get(p.id) || 0,
          tasks: taskCountMap.get(p.id) || 0,
        },
      }));

      // Apply plan filter (post-fetch since it requires subscription data)
      if (filters.plan !== 'all') {
        result = result.filter(u => u.subscription?.subscription_plan === filters.plan);
      }

      // Apply trialing filter
      if (filters.status === 'trialing') {
        result = result.filter(u => u.subscription?.subscription_status === 'trialing');
      }

      return result;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  const blockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: blocked })
        .eq('id', userId);

      if (error) throw error;

      await logAction({
        action: blocked ? 'block_user' : 'unblock_user',
        targetType: 'user',
        targetId: userId,
      });
    },
    onSuccess: (_, { blocked }) => {
      toast({
        title: blocked ? 'Utilizador bloqueado' : 'Utilizador desbloqueado',
        description: 'A alteração foi guardada.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o estado do utilizador.',
        variant: 'destructive',
      });
    },
  });

  const sendResetLink = useMutation({
    mutationFn: async (userId: string) => {
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');

      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          template: 'password_reset',
          to: user.email,
          data: { name: user.full_name || undefined },
        },
      });

      if (error) throw error;

      await logAction({
        action: 'send_reset_link',
        targetType: 'user',
        targetId: userId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Link enviado',
        description: 'O link de reset foi enviado por email.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o link.',
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    blockUser: blockUser.mutate,
    sendResetLink: sendResetLink.mutate,
    isBlocking: blockUser.isPending,
    isSendingReset: sendResetLink.isPending,
  };
}
