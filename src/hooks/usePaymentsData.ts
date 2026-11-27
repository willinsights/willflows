import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetch-all';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { ProjectCustoExtra } from '@/components/payments/ExtraCostsPaymentsControl';
import type { ProjectRevenue } from '@/components/payments/ProjectRevenueControl';

const STALE = 30_000;

const COSTS_COLS =
  'id, name, project_code, custos_extras, custos_extras_payment_status, client_id, created_at, delivery_date, delivered_at, clients(name)';
const REVENUE_COLS =
  'id, name, project_code, agreed_value, client_payment_status, client_payment_due_date, client_id, created_at, delivery_date, delivered_at, clients(name)';

export function usePaymentsData() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const costsKey = ['finance', 'project-costs', workspaceId] as const;
  const revenueKey = ['finance', 'project-revenue', workspaceId] as const;

  const costsQuery = useQuery({
    queryKey: costsKey,
    enabled: !!workspaceId,
    staleTime: STALE,
    queryFn: async (): Promise<ProjectCustoExtra[]> => {
      if (!workspaceId) return [];
      const data = await fetchAllRows(() =>
        supabase
          .from('projects_full')
          .select(COSTS_COLS)
          .eq('workspace_id', workspaceId)
          .eq('is_delivered', true)
          .order('id', { ascending: true })
      );
      return data as ProjectCustoExtra[];
    },
  });

  const revenueQuery = useQuery({
    queryKey: revenueKey,
    enabled: !!workspaceId,
    staleTime: STALE,
    queryFn: async (): Promise<ProjectRevenue[]> => {
      if (!workspaceId) return [];
      const data = await fetchAllRows(() =>
        supabase
          .from('projects_full')
          .select(REVENUE_COLS)
          .eq('workspace_id', workspaceId)
          .eq('is_delivered', true)
          .order('id', { ascending: true })
      );
      return data as ProjectRevenue[];
    },
  });

  const allProjectCosts = costsQuery.data ?? [];
  const projectCosts = useMemo(
    () =>
      allProjectCosts.filter(
        (c) =>
          c.custos_extras_payment_status === 'pendente' ||
          c.custos_extras_payment_status === 'vencido' ||
          c.custos_extras_payment_status === null,
      ),
    [allProjectCosts],
  );

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['finance'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['team-payments'] });
  };

  // Optimistic mutations
  const freelancerMutation = useMutation({
    mutationFn: async ({ teamId, newStatus }: { teamId: string; newStatus: string }) => {
      const updates: TablesUpdate<'project_team'> = {
        payment_status: newStatus as TablesUpdate<'project_team'>['payment_status'],
      };
      updates.paid_at = newStatus === 'pago' ? new Date().toISOString() : null;
      const { error } = await supabase.from('project_team').update(updates).eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-payments'] });
    },
  });

  const costMutation = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const updates: TablesUpdate<'projects'> = { custos_extras_payment_status: newStatus };
      updates.custos_extras_paid_at = newStatus === 'pago' ? new Date().toISOString() : null;
      const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
      if (error) throw error;
    },
    onMutate: async ({ projectId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: costsKey });
      const prev = queryClient.getQueryData<ProjectCustoExtra[]>(costsKey);
      queryClient.setQueryData<ProjectCustoExtra[]>(costsKey, (old) =>
        (old || []).map((c) =>
          c.id === projectId
            ? {
                ...c,
                custos_extras_payment_status: newStatus as ProjectCustoExtra['custos_extras_payment_status'],
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(costsKey, ctx.prev);
    },
    onSettled: invalidateFinance,
  });

  const revenueMutation = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const updates: TablesUpdate<'projects'> = { client_payment_status: newStatus };
      updates.client_paid_at = newStatus === 'pago' ? new Date().toISOString() : null;
      const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
      if (error) throw error;
    },
    onMutate: async ({ projectId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: revenueKey });
      const prev = queryClient.getQueryData<ProjectRevenue[]>(revenueKey);
      queryClient.setQueryData<ProjectRevenue[]>(revenueKey, (old) =>
        (old || []).map((r) =>
          r.id === projectId
            ? { ...r, client_payment_status: newStatus as ProjectRevenue['client_payment_status'] }
            : r,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(revenueKey, ctx.prev);
    },
    onSettled: invalidateFinance,
  });

  return {
    projectCosts,
    allProjectCosts,
    projectRevenue: revenueQuery.data ?? [],
    loading: costsQuery.isLoading || revenueQuery.isLoading,
    handleFreelancerStatusChange: (teamId: string, newStatus: string) =>
      freelancerMutation.mutateAsync({ teamId, newStatus }),
    handleCostStatusChange: (projectId: string, newStatus: string) =>
      costMutation.mutateAsync({ projectId, newStatus }),
    handleProjectRevenueStatusChange: (projectId: string, newStatus: string) =>
      revenueMutation.mutateAsync({ projectId, newStatus }),
  };
}
