import { useMemo } from 'react';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useTeamPayments } from '@/hooks/usePayments';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

export type FinanceTxKind = 'revenue' | 'team' | 'extra';
export type FinanceTxStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado' | null;

export interface FinanceTx {
  id: string;
  key: string;
  kind: FinanceTxKind;
  amount: number;
  status: FinanceTxStatus;
  /** Anchor date: delivered_at → delivery_date → created_at. */
  date: string | null;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  clientName: string | null;
  /** Extra descriptor: client (revenue), collaborator name+phase (team), or "Custos extras". */
  detail: string;
  /** Mutator for inline status change. */
  updateStatus: (newStatus: string) => Promise<void>;
}

interface Params {
  /** Restrict to a specific collaborator (used by non-admin views). */
  filterByUserId?: string | null;
}

/**
 * Unified transaction feed across the Finance module.
 * Merges revenue, team payments, and extra-costs into a single sortable/filterable stream.
 * All mutations are delegated to existing hooks (usePaymentsData / usePayments) — no new writes.
 */
export function useTransactionFeed({ filterByUserId }: Params = {}): {
  transactions: FinanceTx[];
  loading: boolean;
} {
  const {
    projectRevenue,
    allProjectCosts,
    loading: paymentsLoading,
    handleFreelancerStatusChange,
    handleCostStatusChange,
    handleProjectRevenueStatusChange,
  } = usePaymentsData();

  const { teamPayments, loading: teamLoading } = useTeamPayments();
  const { projects } = useProjects();
  const { members } = useWorkspaceMembers();

  const projectsById = useMemo(() => {
    const map = new Map<string, (typeof projects)[number]>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const membersById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.full_name || m.email));
    return map;
  }, [members]);

  const transactions = useMemo<FinanceTx[]>(() => {
    const list: FinanceTx[] = [];

    // ---- Revenue
    projectRevenue.forEach((p) => {
      list.push({
        id: p.id,
        key: `rev-${p.id}`,
        kind: 'revenue',
        amount: p.agreed_value || 0,
        status: (p.client_payment_status as FinanceTxStatus) ?? 'pendente',
        date: p.delivered_at || p.delivery_date || p.created_at || null,
        dueDate: p.client_payment_due_date || null,
        projectId: p.id,
        projectName: p.name,
        projectCode: p.project_code ?? null,
        clientName: p.clients?.name ?? null,
        detail: p.clients?.name || 'Cliente',
        updateStatus: (s) => handleProjectRevenueStatusChange(p.id, s),
      });
    });

    // ---- Extra costs
    allProjectCosts.forEach((c) => {
      if (!c.custos_extras || c.custos_extras <= 0) return;
      list.push({
        id: c.id,
        key: `ext-${c.id}`,
        kind: 'extra',
        amount: c.custos_extras,
        status: (c.custos_extras_payment_status as FinanceTxStatus) ?? 'pendente',
        date: c.delivered_at || c.delivery_date || null,
        dueDate: null,
        projectId: c.id,
        projectName: c.name,
        projectCode: c.project_code ?? null,
        clientName: c.clients?.name ?? null,
        detail: 'Custos extras',
        updateStatus: (s) => handleCostStatusChange(c.id, s),
      });
    });

    // ---- Team payments
    teamPayments.forEach((t) => {
      if (filterByUserId && t.user_id !== filterByUserId) return;
      const project = projectsById.get(t.project_id);
      if (!project?.is_delivered) return; // financial single rule
      const collab = t.user_id ? membersById.get(t.user_id) || 'Colaborador' : 'Colaborador';
      const phase = t.phase === 'captacao' ? 'Captação' : 'Edição';
      list.push({
        id: t.id,
        key: `team-${t.id}`,
        kind: 'team',
        amount: t.payment_amount || 0,
        status: (t.payment_status as FinanceTxStatus) ?? 'pendente',
        date: project.delivered_at || project.delivery_date || null,
        dueDate: null,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.project_code ?? null,
        clientName: project.clients?.name ?? null,
        detail: `${collab} · ${phase}`,
        updateStatus: (s) => handleFreelancerStatusChange(t.id, s),
      });
    });

    // Sort by date desc (nulls last)
    list.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return list;
  }, [
    projectRevenue,
    allProjectCosts,
    teamPayments,
    projectsById,
    membersById,
    filterByUserId,
    handleProjectRevenueStatusChange,
    handleCostStatusChange,
    handleFreelancerStatusChange,
  ]);

  return {
    transactions,
    loading: paymentsLoading || teamLoading,
  };
}
