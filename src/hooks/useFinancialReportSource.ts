import { useFinancialProjects } from './useFinancialProjects';
import { useFinancialCostLines } from './useFinancialCostLines';
import { useWorkLogs } from './useWorkLogs';

export function useFinancialReportSource(workspaceId: string | undefined) {
  const projects = useFinancialProjects(workspaceId);
  const lines = useFinancialCostLines(workspaceId);
  const logs = useWorkLogs();
  return {
    projects: projects.data ?? [], costLines: lines.data ?? [],
    loading: projects.isFetching || lines.isFetching || !!logs.isFetching || !projects.isSuccess || !lines.isSuccess,
    error: projects.error || lines.error || logs.error,
    refresh: () => { void projects.refetch(); void lines.refetch(); void logs.refetch?.(); },
  };
}
