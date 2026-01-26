import { useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from './useRolePermissions';

/**
 * Hook para verificar permissões dinâmicas do workspace
 * 
 * Este hook consulta a tabela workspace_role_permissions para determinar
 * o que cada role pode ou não fazer/ver.
 */
export function useWorkspacePermissions() {
  const { membership, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const { permissions, loading: permissionsLoading } = useRolePermissions();
  
  return useMemo(() => {
    const role = membership?.role || null;
    const userId = user?.id || null;
    const isLoading = workspaceLoading || permissionsLoading;

    // Função auxiliar para verificar permissão dinâmica
    const hasPermission = (permissionKey: string): boolean => {
      if (!role) return false;
      // Admin tem sempre todas as permissões
      if (role === 'admin') return true;
      
      const perm = permissions.find(
        p => p.role === role && p.permission_key === permissionKey
      );
      return perm?.enabled ?? false;
    };

    // Permissões de Visibilidade
    const canViewLeads = hasPermission('visibility.leads') || hasPermission('clients.view');
    const canViewClients = hasPermission('clients.view');
    const canViewContracts = hasPermission('visibility.contracts');
    const canViewTeam = hasPermission('team.view');
    const canViewReports = hasPermission('reports.view');
    const canViewAllProjects = hasPermission('visibility.all_projects');

    // Permissões de Dashboard
    const canViewGlobalFinancials = hasPermission('dashboard.view_global_financials');
    const canViewOwnEarnings = hasPermission('dashboard.view_own_earnings');
    const canViewPerformance = hasPermission('dashboard.view_performance');

    // Identificar se é colaborador (não tem visão global de projetos)
    const isCollaborator = !canViewAllProjects && role !== null;

    return {
      // Estado
      isLoading,
      userRole: role,
      userId,
      isCollaborator,
      
      // Visibilidade de páginas
      canViewLeads,
      canViewClients,
      canViewContracts,
      canViewTeam,
      canViewReports,
      canViewAllProjects,
      
      // Dashboard
      canViewGlobalFinancials,
      canViewOwnEarnings,
      canViewPerformance,
      
      // Helper genérico
      hasPermission,
    };
  }, [membership?.role, user?.id, workspaceLoading, permissionsLoading, permissions]);
}
