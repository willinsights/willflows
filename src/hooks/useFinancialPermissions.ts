import { useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

export interface FinancialPermissions {
  /** Admin only - sees all financial values (revenue, costs, profit, all payments) */
  canViewAllFinancials: boolean;
  /** Admin/Editor/Captação/Freelancer - sees own payments only */
  canViewOwnFinancials: boolean;
  /** Can manage/create payments */
  canManagePayments: boolean;
  /** Can view reports page */
  canViewReports: boolean;
  /** Admin only - can see client emails and phones */
  canViewClientContacts: boolean;
  /** Admin only - can see team member emails and phones */
  canViewTeamContacts: boolean;
  /** Can view Leads page */
  canViewLeads: boolean;
  /** Can view Clients page */
  canViewClients: boolean;
  /** Can view Contracts page */
  canViewContracts: boolean;
  /** Can view Team page */
  canViewTeam: boolean;
  /** Is the user a collaborator (freelancer) */
  isCollaborator: boolean;
  /** Current user's role */
  userRole: string | null;
  /** Current user's ID for filtering */
  userId: string | null;
  /** Whether permissions are still loading */
  isLoading: boolean;
}

/**
 * Hook centralizado para permissões financeiras e de contacto
 * 
 * Regras de permissão:
 * - Admin: Vê TUDO (todos os valores financeiros e contactos)
 * - Editor/Captação: Vêem leads, clientes, projectos completos
 * - Freelancer: Vê apenas projectos onde participa e os seus pagamentos
 * - Visualizador: Não vê valores financeiros nem contactos
 */
export function useFinancialPermissions(): FinancialPermissions {
  const { membership, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();

  return useMemo(() => {
    const role = membership?.role || null;
    const userId = user?.id || null;
    const isLoading = workspaceLoading;

    // Identificar se é colaborador (freelancer)
    const isCollaborator = role === 'freelancer';

    // Admin vê tudo
    const canViewAllFinancials = role === 'admin';

    // Admin, Editor, Captação, Freelancer vêem os seus próprios pagamentos
    const canViewOwnFinancials = ['admin', 'editor', 'captacao', 'freelancer'].includes(role || '');

    // Apenas Admin pode gerir pagamentos
    const canManagePayments = role === 'admin';

    // Apenas Admin pode ver relatórios financeiros
    const canViewReports = role === 'admin';

    // Apenas Admin pode ver contactos de clientes (email, telefone)
    const canViewClientContacts = role === 'admin';

    // Apenas Admin pode ver contactos da equipa (email, telefone)
    const canViewTeamContacts = role === 'admin';

    // Leads: Admin, Editor, Captação (não freelancer/visualizador)
    const canViewLeads = ['admin', 'editor', 'captacao'].includes(role || '');

    // Clientes: Admin, Editor, Captação (não freelancer/visualizador)
    const canViewClients = ['admin', 'editor', 'captacao'].includes(role || '');

    // Contratos: Admin, Editor (não captação/freelancer/visualizador)
    const canViewContracts = ['admin', 'editor'].includes(role || '');

    // Equipa: Admin, Editor (não captação/freelancer/visualizador)
    const canViewTeam = ['admin', 'editor'].includes(role || '');

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
      isCollaborator,
      userRole: role,
      userId,
      isLoading,
    };
  }, [membership?.role, user?.id, workspaceLoading]);
}
