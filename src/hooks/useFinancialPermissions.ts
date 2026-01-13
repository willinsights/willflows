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
  /** Current user's role */
  userRole: string | null;
  /** Current user's ID for filtering */
  userId: string | null;
  /** Whether permissions are still loading */
  isLoading: boolean;
}

/**
 * Hook centralizado para permissões financeiras
 * 
 * Regras de permissão:
 * - Admin: Vê TUDO (todos os valores financeiros)
 * - Editor/Captação/Freelancer: Vêem apenas os seus próprios pagamentos
 * - Visualizador: Não vê valores financeiros
 */
export function useFinancialPermissions(): FinancialPermissions {
  const { membership, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();

  return useMemo(() => {
    const role = membership?.role || null;
    const userId = user?.id || null;
    const isLoading = workspaceLoading;

    // Admin vê tudo
    const canViewAllFinancials = role === 'admin';

    // Admin, Editor, Captação, Freelancer vêem os seus próprios pagamentos
    const canViewOwnFinancials = ['admin', 'editor', 'captacao', 'freelancer'].includes(role || '');

    // Apenas Admin pode gerir pagamentos
    const canManagePayments = role === 'admin';

    // Apenas Admin pode ver relatórios financeiros
    const canViewReports = role === 'admin';

    return {
      canViewAllFinancials,
      canViewOwnFinancials,
      canManagePayments,
      canViewReports,
      userRole: role,
      userId,
      isLoading,
    };
  }, [membership?.role, user?.id, workspaceLoading]);
}
