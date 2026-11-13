import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { toast } from '@/hooks/use-toast';
import { manageWorkspaceBilling } from '@/lib/adminWorkspaceBilling';

export interface TrialWorkspace {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  trial_ends_at: string | null;
  created_at: string;
  days_remaining: number;
  is_expired: boolean;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export interface TrialStats {
  totalTrialing: number;
  expiringIn7Days: number;
  expiringToday: number;
  expired: number;
}

const calculateDaysRemaining = (trialEndsAt: string | null): number => {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export function useAdminTrials() {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  const { data: trialWorkspaces = [], isLoading } = useQuery({
    queryKey: ['admin-trial-workspaces'],
    queryFn: async () => {
      // Fetch workspaces with trialing status
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          slug,
          subscription_plan,
          trial_ends_at,
          created_at
        `)
        .eq('subscription_status', 'trialing')
        .order('trial_ends_at', { ascending: true });

      if (error) throw error;

      // For each workspace, get the admin (owner)
      const workspacesWithOwners: TrialWorkspace[] = await Promise.all(
        (workspaces || []).map(async (ws) => {
          const { data: adminMember } = await supabase
            .from('workspace_members')
            .select(`
              user_id,
              profiles:profiles!workspace_members_user_id_fkey(id, email, full_name)
            `)
            .eq('workspace_id', ws.id)
            .eq('role', 'admin')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          const daysRemaining = calculateDaysRemaining(ws.trial_ends_at);

          return {
            ...ws,
            days_remaining: daysRemaining,
            is_expired: daysRemaining < 0,
            owner: adminMember?.profiles ? {
              id: (adminMember.profiles as any).id,
              email: (adminMember.profiles as any).email,
              full_name: (adminMember.profiles as any).full_name,
            } : null,
          };
        })
      );

      return workspacesWithOwners;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Calculate stats
  const stats: TrialStats = {
    totalTrialing: trialWorkspaces.length,
    expiringIn7Days: trialWorkspaces.filter(w => w.days_remaining > 0 && w.days_remaining <= 7).length,
    expiringToday: trialWorkspaces.filter(w => w.days_remaining === 0).length,
    expired: trialWorkspaces.filter(w => w.days_remaining < 0).length,
  };

  // Extend trial mutation
  const extendTrialMutation = useMutation({
    mutationFn: async ({
      workspaceId,
      days,
      reason,
    }: {
      workspaceId: string;
      days: number;
      reason: string;
    }) => {
      const saved = await manageWorkspaceBilling(workspaceId, 'extend_trial', { days, reason });
      if (!saved.trial_ends_at) throw new Error('O servidor não confirmou a data do trial.');
      const newEndDate = new Date(saved.trial_ends_at);
      return { workspaceId, newEndDate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trial-workspaces'] });
      toast({
        title: 'Trial extendido',
        description: 'O período de trial foi extendido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao extender trial',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Convert to active mutation
  const convertToActiveMutation = useMutation({
    mutationFn: async ({
      workspaceId,
      reason,
    }: {
      workspaceId: string;
      reason: string;
    }) => {
      await manageWorkspaceBilling(workspaceId, 'convert_trial', { reason });
      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trial-workspaces'] });
      toast({
        title: 'Trial convertido',
        description: 'O workspace foi convertido para activo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao converter trial',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    trialWorkspaces,
    stats,
    isLoading,
    extendTrial: extendTrialMutation.mutateAsync,
    isExtending: extendTrialMutation.isPending,
    convertToActive: convertToActiveMutation.mutateAsync,
    isConverting: convertToActiveMutation.isPending,
  };
}
