import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';

export type BusinessType = 'freelancer' | 'studio' | 'agency';

export interface ChecklistItem {
  key: 'workspace' | 'invite' | 'client' | 'project' | 'kanban';
  label: string;
  done: boolean;
  path: string;
  cta: string;
}

const DISMISS_GRACE_DAYS = 3;

export function useOnboardingStatus() {
  const { user } = useAuth();
  const { workspaceId, isAdmin } = useCurrentWorkspace();
  const qc = useQueryClient();

  const enabled = !!user?.id && !!workspaceId;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-status', workspaceId, user?.id],
    enabled,
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;

      const [wsRes, prefsRes, membersRes, clientsRes, projectsRes, firstColRes] = await Promise.all([
        supabase
          .from('workspaces')
          .select('id, onboarding_completed, onboarding_business_type, onboarding_completed_at, created_at')
          .eq('id', workspaceId)
          .maybeSingle(),
        supabase
          .from('user_preferences')
          .select('onboarding_state')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('workspace_members')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId),
        supabase
          .from('kanban_columns')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('phase', 'captacao')
          .eq('position', 0)
          .maybeSingle(),
      ]);

      const ws = (wsRes.data ?? {}) as any;
      const prefs = (prefsRes.data ?? {}) as any;
      const memberCount = membersRes.count ?? 0;
      const clientCount = clientsRes.count ?? 0;
      const projectCount = projectsRes.count ?? 0;
      const firstColId = (firstColRes.data as any)?.id ?? null;

      // "Moved in kanban" => any project not in the first captacao column
      let movedCount = 0;
      if (projectCount > 0 && firstColId) {
        const movedRes = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .neq('captacao_column_id', firstColId);
        movedCount = movedRes.count ?? 0;
      } else if (projectCount > 0 && !firstColId) {
        // no reference column → consider any project as "moved"
        movedCount = projectCount;
      }

      const dismissedMap = (prefs.onboarding_state?.dismissed ?? {}) as Record<string, string>;
      const dismissedAt = dismissedMap[workspaceId] ? new Date(dismissedMap[workspaceId]) : null;

      return {
        completed: !!ws.onboarding_completed,
        businessType: (ws.onboarding_business_type ?? null) as BusinessType | null,
        completedAt: ws.onboarding_completed_at ? new Date(ws.onboarding_completed_at) : null,
        dismissedAt,
        memberCount,
        clientCount,
        projectCount,
        movedCount,
      };
    },
    staleTime: 30_000,
  });

  const items: ChecklistItem[] = useMemo(() => {
    const d = data;
    return [
      {
        key: 'workspace',
        label: 'Workspace criado',
        done: true,
        path: '/app',
        cta: 'Concluído',
      },
      {
        key: 'invite',
        label: 'Convidar um membro da equipa',
        done: (d?.memberCount ?? 0) > 1,
        path: '/app/equipa',
        cta: 'Convidar',
      },
      {
        key: 'client',
        label: 'Criar o primeiro cliente',
        done: (d?.clientCount ?? 0) > 0,
        path: '/app/clientes',
        cta: 'Criar cliente',
      },
      {
        key: 'project',
        label: 'Criar o primeiro projecto',
        done: (d?.projectCount ?? 0) > 0,
        path: '/app/captacao',
        cta: 'Criar projecto',
      },
      {
        key: 'kanban',
        label: 'Mover um projecto no Kanban',
        done: (d?.movedCount ?? 0) > 0,
        path: '/app/captacao',
        cta: 'Abrir Kanban',
      },
    ];
  }, [data]);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = { done, total, items };

  const completeOnboarding = useCallback(
    async (businessType: BusinessType) => {
      if (!workspaceId) return;
      const { error } = await supabase.rpc('complete_workspace_onboarding' as any, {
        p_workspace_id: workspaceId,
        p_business_type: businessType,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['onboarding-status', workspaceId, user?.id] });
    },
    [workspaceId, user?.id, qc],
  );

  const dismiss = useCallback(async () => {
    if (!workspaceId || !user?.id) return;
    const currentMap = (data?.dismissedAt
      ? { [workspaceId]: data.dismissedAt.toISOString() }
      : {}) as Record<string, string>;
    currentMap[workspaceId] = new Date().toISOString();

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          onboarding_state: { dismissed: currentMap },
        } as any,
        { onConflict: 'user_id' },
      );
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['onboarding-status', workspaceId, user.id] });
  }, [workspaceId, user?.id, data?.dismissedAt, qc]);

  const completed = data?.completed ?? false;
  const dismissedAt = data?.dismissedAt ?? null;
  const completedAt = data?.completedAt ?? null;

  const withinGrace =
    completedAt &&
    Date.now() - completedAt.getTime() < DISMISS_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const recentlyDismissed =
    dismissedAt && Date.now() - dismissedAt.getTime() < DISMISS_GRACE_DAYS * 24 * 60 * 60 * 1000;

  const shouldShowModal = !!user && isAdmin && !isLoading && !completed && !!workspaceId;
  const allDone = done === total;
  const shouldShowChecklist =
    !!user && isAdmin && !isLoading && completed && !recentlyDismissed && !allDone;
  const shouldShowCongrats =
    !!user && isAdmin && !isLoading && completed && allDone && !recentlyDismissed && !!withinGrace;

  return {
    isLoading,
    shouldShowModal,
    shouldShowChecklist,
    shouldShowCongrats,
    progress,
    businessType: data?.businessType ?? null,
    completeOnboarding,
    dismiss,
    refetch,
  };
}
