import { useMemo } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useProjects } from '@/hooks/useProjects';
import { useTeamPayments } from '@/hooks/usePayments';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import type { ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

export type SettlementType = 'editor' | 'extra';

export interface ClosingSettlement {
  key: string;
  type: SettlementType;
  projectId: string;
  projectCode: string;
  projectName: string;
  editorId: string | null;
  editorName: string;
  phase: 'captacao' | 'edicao' | 'extra';
  amount: number;
  status: string; // pendente|pago|vencido|cancelado
  teamId?: string; // present for editor rows
  deliveredAt: string | null;
}

export interface EditorSummary {
  userId: string;
  name: string;
  cards: number;
  payable: number;
  paid: number;
}

export interface MonthlyClosing {
  monthLabel: string;
  revenue: number;
  editorPayable: number;
  ownerProfit: number;
  alreadyPaid: number;
  extrasPayable: number;
  extrasPaid: number;
  captacaoCosts: number;
  edicaoCosts: number;
  deliveredProjectCount: number;
  byEditor: EditorSummary[];
  settlements: ClosingSettlement[];
}

/**
 * Aggregates the "monthly closing" for a given month, based STRICTLY on
 * `projects.delivered_at`. Reuses the same data sources as the existing
 * financial pages — does not mutate anything.
 */
export function useMonthlyClosing(month: Date): MonthlyClosing {
  const { projects } = useProjects();
  const { teamPayments } = useTeamPayments();
  const { allProjectCosts } = usePaymentsData();
  const { members } = useWorkspaceMembers();

  return useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    const deliveredThisMonth = projects.filter(
      (p) =>
        p.is_delivered &&
        p.delivered_at &&
        isWithinInterval(new Date(p.delivered_at), { start, end }),
    );
    const deliveredIds = new Set(deliveredThisMonth.map((p) => p.id));

    const nameOf = (userId: string | null) => {
      if (!userId) return 'Sem editor';
      const m = members.find((mm) => mm.user_id === userId);
      return m?.full_name || m?.email || 'Editor';
    };

    // Editor settlements (project_team) for delivered projects in the month
    const typedTeam = teamPayments as ProjectTeamPayment[];
    const editorRows: ClosingSettlement[] = typedTeam
      .filter((tp) => deliveredIds.has(tp.project_id))
      .map((tp) => {
        const proj = deliveredThisMonth.find((p) => p.id === tp.project_id)!;
        return {
          key: `team:${tp.id}`,
          type: 'editor' as const,
          projectId: proj.id,
          projectCode: proj.project_code || proj.id.slice(0, 8).toUpperCase(),
          projectName: proj.name,
          editorId: tp.user_id,
          editorName: nameOf(tp.user_id),
          phase: tp.phase,
          amount: tp.payment_amount || 0,
          status: tp.payment_status || 'pendente',
          teamId: tp.id,
          deliveredAt: proj.delivered_at ?? null,
        };
      });

    // Extra cost rows for delivered projects in the month
    const extraRows: ClosingSettlement[] = allProjectCosts
      .filter((c) => deliveredIds.has(c.id) && (c.custos_extras || 0) > 0)
      .map((c) => ({
        key: `extra:${c.id}`,
        type: 'extra' as const,
        projectId: c.id,
        projectCode: c.project_code || c.id.slice(0, 8).toUpperCase(),
        projectName: c.name,
        editorId: null,
        editorName: '—',
        phase: 'extra' as const,
        amount: c.custos_extras || 0,
        status: c.custos_extras_payment_status || 'pendente',
        deliveredAt: c.delivered_at ?? null,
      }));

    const settlements = [...editorRows, ...extraRows];

    const revenue = deliveredThisMonth.reduce((s, p) => s + (p.agreed_value || 0), 0);

    const editorPayable = editorRows
      .filter((r) => r.status !== 'pago' && r.status !== 'cancelado')
      .reduce((s, r) => s + r.amount, 0);
    const editorPaid = editorRows
      .filter((r) => r.status === 'pago')
      .reduce((s, r) => s + r.amount, 0);

    const extrasPayable = extraRows
      .filter((r) => r.status !== 'pago' && r.status !== 'cancelado')
      .reduce((s, r) => s + r.amount, 0);
    const extrasPaid = extraRows
      .filter((r) => r.status === 'pago')
      .reduce((s, r) => s + r.amount, 0);

    const captacaoCosts = deliveredThisMonth.reduce((s, p) => s + (p.custo_captacao || 0), 0);
    const edicaoCosts = deliveredThisMonth.reduce((s, p) => s + (p.custo_edicao || 0), 0);

    const totalCosts = editorRows.reduce((s, r) => s + r.amount, 0)
      + extraRows.reduce((s, r) => s + r.amount, 0)
      + captacaoCosts
      + edicaoCosts;
    const ownerProfit = revenue - totalCosts;
    const alreadyPaid = editorPaid + extrasPaid;

    // By editor summary
    const map = new Map<string, EditorSummary>();
    for (const r of editorRows) {
      const key = r.editorId || 'unknown';
      const cur = map.get(key) || { userId: key, name: r.editorName, cards: 0, payable: 0, paid: 0 };
      cur.cards += 1;
      if (r.status === 'pago') cur.paid += r.amount;
      else if (r.status !== 'cancelado') cur.payable += r.amount;
      map.set(key, cur);
    }
    const byEditor = Array.from(map.values()).sort((a, b) => b.payable - a.payable);

    return {
      monthLabel: '',
      revenue,
      editorPayable: editorPayable + extrasPayable, // includes extras in "a pagar"
      ownerProfit,
      alreadyPaid,
      extrasPayable,
      extrasPaid,
      captacaoCosts,
      edicaoCosts,
      deliveredProjectCount: deliveredThisMonth.length,
      byEditor,
      settlements,
    };
  }, [projects, teamPayments, allProjectCosts, members, month]);
}
