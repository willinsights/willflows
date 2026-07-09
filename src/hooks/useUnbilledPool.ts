import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTeamPayments } from '@/hooks/usePayments';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useClosings } from '@/hooks/useClosings';
import type { ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

export interface PoolRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientId: string | null;
  clientName: string;
  deliveredAt: string | null;
  agreedValue: number;
  extras: number;
  extrasStatus: string;
  teamPayments: Array<{
    id: string;
    userId: string;
    editorName: string;
    phase: 'captacao' | 'edicao';
    amount: number;
    status: string;
  }>;
}

/**
 * Pool "Por faturar": delivered projects that are NOT yet included as a
 * revenue item in any closing. Aggregates related team payments and extras
 * so the UI can render a single row per project.
 */
export function useUnbilledPool() {
  const { projects, loading: projectsLoading } = useProjects();
  const { teamPayments } = useTeamPayments();
  const { allProjectCosts } = usePaymentsData();
  const { members } = useWorkspaceMembers();
  const { items } = useClosings();

  return useMemo(() => {
    const invoicedProjectIds = new Set(
      items.filter((i) => i.kind === 'revenue').map((i) => i.project_id),
    );

    const nameOf = (userId: string | null) => {
      if (!userId) return 'Sem editor';
      const m = members.find((mm) => mm.user_id === userId);
      return m?.full_name || m?.email || 'Editor';
    };

    const typedTeam = teamPayments as ProjectTeamPayment[];
    const teamByProject = new Map<string, typeof typedTeam>();
    for (const tp of typedTeam) {
      const arr = teamByProject.get(tp.project_id) || [];
      arr.push(tp);
      teamByProject.set(tp.project_id, arr);
    }

    const extraByProject = new Map<string, { amount: number; status: string }>();
    for (const c of allProjectCosts) {
      extraByProject.set(c.id, {
        amount: c.custos_extras || 0,
        status: c.custos_extras_payment_status || 'pendente',
      });
    }

    const rows: PoolRow[] = projects
      .filter((p) => p.is_delivered && !invoicedProjectIds.has(p.id))
      .map((p) => {
        const tp = teamByProject.get(p.id) || [];
        const extra = extraByProject.get(p.id);
        return {
          projectId: p.id,
          projectCode: p.project_code || p.id.slice(0, 8).toUpperCase(),
          projectName: p.name,
          clientId: p.client_id ?? null,
          clientName: p.clients?.name || '—',
          deliveredAt: p.delivered_at ?? null,
          agreedValue: p.agreed_value || 0,
          extras: extra?.amount || 0,
          extrasStatus: extra?.status || 'pendente',
          teamPayments: tp.map((t) => ({
            id: t.id,
            userId: t.user_id,
            editorName: nameOf(t.user_id),
            phase: t.phase,
            amount: t.payment_amount || 0,
            status: t.payment_status,
          })),
        };
      })
      .sort((a, b) => (b.deliveredAt || '').localeCompare(a.deliveredAt || ''));

    return { rows, loading: projectsLoading };
  }, [projects, teamPayments, allProjectCosts, members, items, projectsLoading]);
}
