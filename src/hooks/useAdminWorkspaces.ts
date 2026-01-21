import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useAdminAudit } from './useAdminAudit';
import { useToast } from './use-toast';
import { PLAN_LIMITS, PLAN_DB_MAPPING, type PlanId } from '@/lib/plans';

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  members_count: number;
  projects_count: number;
  tasks_count: number;
  last_activity_at: string | null;
  limits: {
    members: { current: number; max: number };
    projects: { current: number; max: number };
  };
}

export interface WorkspaceFilters {
  search: string;
  status: 'all' | 'active' | 'trialing' | 'past_due' | 'canceled';
  plan: 'all' | 'starter' | 'pro' | 'studio';
}

export function useAdminWorkspaces(filters: WorkspaceFilters) {
  const { isSuperAdmin } = useSuperAdmin();
  const { logAction } = useAdminAudit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['admin-workspaces', filters],
    queryFn: async (): Promise<AdminWorkspace[]> => {
      let query = supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
      }

      if (filters.status !== 'all') {
        query = query.eq('subscription_status', filters.status);
      }

      if (filters.plan !== 'all') {
        query = query.eq('subscription_plan', filters.plan);
      }

      const { data: workspacesData, error } = await query.limit(200);

      if (error) throw error;
      if (!workspacesData) return [];

      const workspaceIds = workspacesData.map(w => w.id);

      // Fetch owners (admins)
      const { data: members } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          user_id,
          profile:profiles(id, email, full_name)
        `)
        .in('workspace_id', workspaceIds)
        .eq('is_active', true);

      // Fetch project counts
      const { data: projects } = await supabase
        .from('projects')
        .select('workspace_id')
        .in('workspace_id', workspaceIds);

      // Fetch task counts
      const { data: tasks } = await supabase
        .from('tasks')
        .select('workspace_id')
        .in('workspace_id', workspaceIds);

      // Fetch last activity
      const { data: activities } = await supabase
        .from('activity_log')
        .select('workspace_id, created_at')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false });

      // Build maps
      const ownerMap = new Map<string, { id: string; email: string; full_name: string | null }>();
      const memberCountMap = new Map<string, number>();
      
      (members || []).forEach(m => {
        const count = memberCountMap.get(m.workspace_id) || 0;
        memberCountMap.set(m.workspace_id, count + 1);
        
        if (m.role === 'admin' && m.profile && !ownerMap.has(m.workspace_id)) {
          ownerMap.set(m.workspace_id, {
            id: (m.profile as any).id,
            email: (m.profile as any).email,
            full_name: (m.profile as any).full_name,
          });
        }
      });

      const projectCountMap = new Map<string, number>();
      (projects || []).forEach(p => {
        projectCountMap.set(p.workspace_id, (projectCountMap.get(p.workspace_id) || 0) + 1);
      });

      const taskCountMap = new Map<string, number>();
      (tasks || []).forEach(t => {
        taskCountMap.set(t.workspace_id, (taskCountMap.get(t.workspace_id) || 0) + 1);
      });

      const lastActivityMap = new Map<string, string>();
      (activities || []).forEach(a => {
        if (!lastActivityMap.has(a.workspace_id)) {
          lastActivityMap.set(a.workspace_id, a.created_at);
        }
      });

      return workspacesData.map(w => {
        // Use centralized plan limits from plans.ts
        const planId: PlanId = PLAN_DB_MAPPING[w.subscription_plan || 'starter'] || 'starter';
        const limits = PLAN_LIMITS[planId];
        const membersCount = memberCountMap.get(w.id) || 0;
        const projectsCount = projectCountMap.get(w.id) || 0;

        return {
          id: w.id,
          name: w.name,
          slug: w.slug,
          country: w.country,
          currency: w.currency,
          subscription_plan: w.subscription_plan,
          subscription_status: w.subscription_status,
          trial_ends_at: w.trial_ends_at,
          created_at: w.created_at,
          owner: ownerMap.get(w.id) || null,
          members_count: membersCount,
          projects_count: projectsCount,
          tasks_count: taskCountMap.get(w.id) || 0,
          last_activity_at: lastActivityMap.get(w.id) || null,
          limits: {
            members: { current: membersCount, max: limits.users },
            projects: { current: projectsCount, max: limits.projects },
          },
        };
      });
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  const blockWorkspace = useMutation({
    mutationFn: async ({ workspaceId, blocked }: { workspaceId: string; blocked: boolean }) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ subscription_status: blocked ? 'canceled' : 'active' })
        .eq('id', workspaceId);

      if (error) throw error;

      await logAction({
        action: blocked ? 'block_workspace' : 'unblock_workspace',
        targetType: 'workspace',
        targetId: workspaceId,
      });
    },
    onSuccess: (_, { blocked }) => {
      toast({
        title: blocked ? 'Workspace bloqueado' : 'Workspace desbloqueado',
        description: 'A alteração foi guardada.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o estado do workspace.',
        variant: 'destructive',
      });
    },
  });

  return {
    workspaces,
    isLoading,
    blockWorkspace: blockWorkspace.mutate,
    isBlocking: blockWorkspace.isPending,
  };
}
