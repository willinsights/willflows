import { useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from './useRolePermissions';

export interface FinancialPermissions {
  /** Admin only (or with dashboard.view_global_financials) - sees all financial values */
  canViewAllFinancials: boolean;
  /** Can see own earnings (Meus Ganhos) */
  canViewOwnFinancials: boolean;
  /** Can manage/create payments */
  canManagePayments: boolean;
  /** Can view reports page */
  canViewReports: boolean;
  /** Can see client emails and phones */
  canViewClientContacts: boolean;
  /** Can see team member emails and phones */
  canViewTeamContacts: boolean;
  /** Can view Leads page */
  canViewLeads: boolean;
  /** Can view Clients page */
  canViewClients: boolean;
  /** Can view Contracts page */
  canViewContracts: boolean;
  /** Can view Team page */
  canViewTeam: boolean;
  /** Can view all projects (not filtered) */
  canViewAllProjects: boolean;
  /** Can view performance metrics */
  canViewPerformance: boolean;
  /** Is the user a collaborator (restricted view) */
  isCollaborator: boolean;
  /** Current user's role */
  userRole: string | null;
  /** Current user's ID for filtering */
  userId: string | null;
  /** Whether permissions are still loading */
  isLoading: boolean;
}

/**
 * Hook centralizado para permissões financeiras e de visibilidade
 * 
 * Agora usa permissões dinâmicas da tabela workspace_role_permissions,
 * permitindo que o admin do workspace configure o acesso de cada role.
 */
export function useFinancialPermissions(): FinancialPermissions {
  const { membership, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const { permissions, loading: permissionsLoading } = useRolePermissions();

  return useMemo(() => {
    const role = membership?.role || null;
    const userId = user?.id || null;
    const isLoading = workspaceLoading || permissionsLoading;

    // Função auxiliar para verificar permissão dinâmica
    const hasPermission = (key: string): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      const perm = permissions.find(
        p => p.role === role && p.permission_key === key
      );
      return perm?.enabled ?? false;
    };

    // Permissões baseadas na tabela
    const canViewAllFinancials = hasPermission('dashboard.view_global_financials');
    const canViewOwnFinancials = hasPermission('dashboard.view_own_earnings') || role !== null;
    const canManagePayments = hasPermission('payments.manage');
    const canViewReports = hasPermission('reports.view');
    const canViewPerformance = hasPermission('dashboard.view_performance');
    
    // Visibilidade de páginas - agora totalmente dinâmico
    const canViewLeads = hasPermission('visibility.leads');
    const canViewClients = hasPermission('clients.view');
    const canViewContracts = hasPermission('visibility.contracts');
    const canViewTeam = hasPermission('team.view');
    const canViewAllProjects = hasPermission('visibility.all_projects');

    // Contactos - verificação dinâmica (admin tem sempre acesso via hasPermission)
    const canViewClientContacts = hasPermission('clients.view');
    const canViewTeamContacts = hasPermission('team.view');

    // Identificar se é colaborador (não tem visão global)
    const isCollaborator = !canViewAllProjects && role !== null;

    return {
      canViewAllFinancials,
      canViewOwnFinancials,
      canManagePayments,
      canViewReports,
      canViewClientContacts,
      canViewTeamContacts,
      canViewLeads,
      canViewClients,
      canViewContracts,
      canViewTeam,
      canViewAllProjects,
      canViewPerformance,
      isCollaborator,
      userRole: role,
      userId,
      isLoading,
    };
  }, [membership?.role, user?.id, workspaceLoading, permissionsLoading, permissions]);
}
