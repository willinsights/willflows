import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { useProjects } from '@/hooks/useProjects';
import { useClosings } from '@/hooks/useClosings';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useUnbilledPool } from '@/hooks/useUnbilledPool';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useTeamPayments } from '@/hooks/usePayments';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

import { StatCard } from '@/components/finance/StatCard';
import { AlertsWidget, type FinanceAlert } from '@/components/finance/AlertsWidget';
import { CashflowChart } from '@/components/finance/CashflowChart';
import { FunnelWidget } from '@/components/finance/FunnelWidget';
import { TopClientsWidget } from '@/components/finance/TopClientsWidget';
import {
  FreelancerPaymentsControl,
  type ProjectTeamPayment,
} from '@/components/payments/FreelancerPaymentsControl';

/**
 * Executive Finance dashboard. Answers "How healthy is the month?" in <5s.
 * Uses the shared financial engine (REALIZADO mode) as single source of truth.
 */
export default function FinanceVisao() {
  const [currentMonth] = useState(new Date());
  const navigate = useNavigate();
  const { formatCurrency } = useFormatCurrency();

  const {
    canViewAllFinancials,
    userId,
  } = useFinancialPermissions();

  const {
    metrics,
    timeSeries,
    revenueChange,
    costChange,
    profitChange,
    summary,
  } = useFinancialEngine('REALIZADO', currentMonth);

  const { projects } = useProjects();
  const { closings, items } = useClosings();
  const { projectRevenue, handleFreelancerStatusChange } = usePaymentsData();
  const { rows: unbilled } = useUnbilledPool();
  const { teamPayments } = useTeamPayments();
  const { members } = useWorkspaceMembers();

  // ---- Freelancer-only view (single-member workspace or restricted permissions)
  if (!canViewAllFinancials) {
    return (
      <FreelancerPaymentsControl
        teamPayments={teamPayments as ProjectTeamPayment[]}
        onStatusChange={handleFreelancerStatusChange}
        formatCurrency={formatCurrency}
        members={members.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          project_code: p.project_code,
          client_id: p.client_id,
          delivery_date: p.delivery_date,
          delivered_at: p.delivered_at,
          is_delivered: p.is_delivered,
        }))}
        filterByUserId={userId}
      />
    );
  }

  const margin =
    metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0;

  // Sparklines (last 6 months from engine time series)
  const revSpark = useMemo(() => timeSeries.map((t) => t.revenue), [timeSeries]);
  const costSpark = useMemo(() => timeSeries.map((t) => t.cost), [timeSeries]);
  const profitSpark = useMemo(() => timeSeries.map((t) => t.profit), [timeSeries]);

  // Top clients (all-time delivered revenue, sorted)
  const topClients = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; revenue: number; projects: number }
    >();
    projects
      .filter((p) => p.is_delivered)
      .forEach((p) => {
        if (!p.client_id) return;
        const cur =
          map.get(p.client_id) ||
          { id: p.client_id, name: p.clients?.name || '—', revenue: 0, projects: 0 };
        cur.revenue += p.agreed_value || 0;
        cur.projects += 1;
        map.set(p.client_id, cur);
      });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [projects]);

  // Funnel — projects delivered this month, how many are in a closing, how many closings received
  const funnel = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const inMonth = (p: typeof projects[number]) =>
      !!p.delivered_at && isWithinInterval(new Date(p.delivered_at), { start, end });

    const delivered = projects.filter((p) => p.is_delivered && inMonth(p)).length;

    const projectsInAnyClosing = new Set(
      items.filter((i) => i.kind === 'revenue').map((i) => i.project_id),
    );
    const closed = projects.filter(
      (p) => p.is_delivered && inMonth(p) && projectsInAnyClosing.has(p.id),
    ).length;

    const receivedClosingIds = new Set(
      closings.filter((c) => c.status === 'received').map((c) => c.id),
    );
    const projectsInReceivedClosings = new Set(
      items
        .filter((i) => i.kind === 'revenue' && receivedClosingIds.has(i.closing_id))
        .map((i) => i.project_id),
    );
    const received = projects.filter(
      (p) => p.is_delivered && inMonth(p) && projectsInReceivedClosings.has(p.id),
    ).length;

    return { delivered, closed, received };
  }, [projects, items, closings, currentMonth]);

  // Alerts
  const goFechos = () => navigate('/app/financeiro?tab=fechos');
  const alerts: FinanceAlert[] = useMemo(() => {
    const overdue = projectRevenue.filter((p) => p.client_payment_status === 'vencido').length;
    const openClosings = closings.filter((c) => c.status !== 'received').length;
    const toInvoice = unbilled.length;
    const out: FinanceAlert[] = [];
    if (overdue > 0)
      out.push({ id: 'overdue', icon: 'overdue', label: 'Pagamentos em atraso', count: overdue, onClick: goFechos });
    if (openClosings > 0)
      out.push({ id: 'open',    icon: 'closing', label: 'Fechos em aberto',      count: openClosings, onClick: goFechos });
    if (toInvoice > 0)
      out.push({ id: 'pool',    icon: 'due',     label: 'Projetos por faturar',  count: toInvoice, onClick: goFechos });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRevenue, closings, unbilled]);

  const unbilledTotal = unbilled.reduce((s, r) => s + r.agreedValue, 0);
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="space-y-4">
      {/* Row 1: Hero (Lucro) + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StatCard
            variant="hero"
            label={`Lucro · ${monthLabel}`}
            value={formatCurrency(metrics.profit)}
            tone="profit"
            change={profitChange}
            hint={`Margem ${margin}% · ${metrics.projectCount} projeto${metrics.projectCount !== 1 ? 's' : ''} entregue${metrics.projectCount !== 1 ? 's' : ''}`}
            sparkline={profitSpark}
            hideValueBlur
          />
        </div>
        <AlertsWidget alerts={alerts} />
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Receita"
          value={formatCurrency(metrics.revenue)}
          tone="income"
          change={revenueChange}
          sparkline={revSpark}
          hideValueBlur
          delay={0.04}
        />
        <StatCard
          label="Custos"
          value={formatCurrency(metrics.cost)}
          tone="expense"
          change={costChange}
          changePositiveGood={false}
          sparkline={costSpark}
          hideValueBlur
          delay={0.08}
        />
        <StatCard
          label="Por faturar"
          value={String(unbilled.length)}
          tone="warning"
          hint={`${formatCurrency(unbilledTotal)} em pipeline`}
          onClick={goFechos}
          delay={0.12}
        />
        <StatCard
          label="Entregues"
          value={String(summary.delivered)}
          tone="neutral"
          hint={`${summary.planned} planeados · ${summary.postponed} adiados`}
          delay={0.16}
        />
      </div>

      {/* Row 3: Cashflow + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CashflowChart data={timeSeries} />
        </div>
        <FunnelWidget {...funnel} />
      </div>

      {/* Row 4: Top clients + next steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopClientsWidget clients={topClients} />
        <div className="glass-card rounded-xl border p-5 text-sm">
          <p className="font-semibold text-foreground mb-1">Próximos passos</p>
          <p className="text-xs text-muted-foreground mb-3">
            {unbilled.length > 0
              ? `Tens ${unbilled.length} projeto${unbilled.length !== 1 ? 's' : ''} entregue${unbilled.length !== 1 ? 's' : ''} à espera de fecho.`
              : 'Tudo faturado. Cria um novo fecho quando entregares novos projetos.'}
          </p>
          <button
            type="button"
            onClick={goFechos}
            className="text-xs font-medium text-primary hover:underline"
          >
            Abrir separador Fechos →
          </button>
        </div>
      </div>
    </div>
  );
}
