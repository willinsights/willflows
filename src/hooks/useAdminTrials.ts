import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useAdminAudit } from './useAdminAudit';
import { toast } from '@/hooks/use-toast';

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
  const { logAction } = useAdminAudit();
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
      // Get current trial_ends_at
      const { data: workspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('trial_ends_at')
        .eq('id', workspaceId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new end date
      const currentEndDate = workspace.trial_ends_at 
        ? new Date(workspace.trial_ends_at) 
        : new Date();
      
      // If expired, start from now
      const baseDate = currentEndDate < new Date() ? new Date() : currentEndDate;
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + days);

      // Update workspace
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ 
          trial_ends_at: newEndDate.toISOString(),
          subscription_status: 'trialing', // Ensure status is trialing
        })
        .eq('id', workspaceId);

      if (updateError) throw updateError;

      // Log audit action
      await logAction({
        action: 'extend_trial',
        targetType: 'workspace',
        targetId: workspaceId,
        details: { days_added: days, reason, new_end_date: newEndDate.toISOString() },
      });

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
      const { error } = await supabase
        .from('workspaces')
        .update({ 
          subscription_status: 'active',
          trial_ends_at: null, // Clear trial end date
        })
        .eq('id', workspaceId);

      if (error) throw error;

      // Log audit action
      await logAction({
        action: 'convert_trial',
        targetType: 'workspace',
        targetId: workspaceId,
        details: { reason, converted_at: new Date().toISOString() },
      });

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
