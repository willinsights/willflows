import { useFinancialProjects } from './useFinancialProjects';
import { useFinancialCostLines } from './useFinancialCostLines';
import { useWorkLogs } from './useWorkLogs';

export function useFinancialReportSource(workspaceId: string | undefined) {
  const projects = useFinancialProjects(workspaceId);
  const lines = useFinancialCostLines(workspaceId);
  const logs = useWorkLogs();
  return {
    projects: projects.data ?? [], costLines: lines.data ?? [],
    loading: projects.isLoading || lines.isLoading || !!logs.isLoading,
    isFetching: projects.isFetching || lines.isFetching || !!logs.isFetching,
    error: projects.error || lines.error || logs.error,
    refresh: () => { void projects.refetch(); void lines.refetch(); void logs.refetch?.(); },
  };
}
