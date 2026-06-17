import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface FinancialSummary {
  invoices_paid_count: number;
  invoices_pending_count: number;
  invoices_overdue_count: number;
  revenue_total: number;
  pending_total: number;
  overdue_total: number;
  revenue_this_month: number;
  revenue_last_month: number;
}

const EMPTY: FinancialSummary = {
  invoices_paid_count: 0,
  invoices_pending_count: 0,
  invoices_overdue_count: 0,
  revenue_total: 0,
  pending_total: 0,
  overdue_total: 0,
  revenue_this_month: 0,
  revenue_last_month: 0,
};

/**
 * Server-side aggregated invoice totals for the current workspace.
 * All math runs in Postgres — no client-side reduce over invoice arrays.
 */
export function useFinancialSummary() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ['financial-summary', workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<FinancialSummary> => {
      const { data, error } = await supabase.rpc('get_workspace_financial_summary', {
        p_workspace_id: workspaceId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return EMPTY;
      return {
        invoices_paid_count: Number(row.invoices_paid_count) || 0,
        invoices_pending_count: Number(row.invoices_pending_count) || 0,
        invoices_overdue_count: Number(row.invoices_overdue_count) || 0,
        revenue_total: Number(row.revenue_total) || 0,
        pending_total: Number(row.pending_total) || 0,
        overdue_total: Number(row.overdue_total) || 0,
        revenue_this_month: Number(row.revenue_this_month) || 0,
        revenue_last_month: Number(row.revenue_last_month) || 0,
      };
    },
  });

  return {
    summary: query.data ?? EMPTY,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

export interface ProjectsSummary {
  total_projects: number;
  projects_by_status: Record<string, number>;
  projects_with_overdue_invoices: number;
}

const EMPTY_PROJECTS: ProjectsSummary = {
  total_projects: 0,
  projects_by_status: {},
  projects_with_overdue_invoices: 0,
};

export function useProjectsSummary() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ['projects-summary', workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectsSummary> => {
      const { data, error } = await supabase.rpc('get_workspace_projects_summary', {
        p_workspace_id: workspaceId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return EMPTY_PROJECTS;
      return {
        total_projects: Number(row.total_projects) || 0,
        projects_by_status: (row.projects_by_status as Record<string, number>) || {},
        projects_with_overdue_invoices: Number(row.projects_with_overdue_invoices) || 0,
      };
    },
  });

  return {
    summary: query.data ?? EMPTY_PROJECTS,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
