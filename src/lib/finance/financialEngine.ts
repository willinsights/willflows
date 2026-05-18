import {
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isBefore,
  isWithinInterval,
  parseISO,
  format,
  subMonths,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import type {
  FinancialProject,
  FinancialViewMode,
  TeamPayment,
  MonthlyMetrics,
  MonthlySummary,
  TimeSeriesPoint,
} from './types';

// === Helpers ===

/**
 * Anchor date used for forecast / planning (PREVISAO + summary).
 *
 * Priority: delivery_date → shoot_date → created_at.
 *
 * `created_at` is included as the last fallback so projects without
 * scheduled dates still appear in the forecast for the month they were
 * created in. This keeps `useFinancialEngine` (global financial widgets)
 * aligned with `useCollaboratorForecast` (personal earnings widget),
 * avoiding the discrepancy where a project would show in "Meus Ganhos"
 * but not in the global "Lucro Previsto".
 */
function getAnchorDate(project: FinancialProject): Date | null {
  const raw = project.delivery_date || project.shoot_date || project.created_at;
  return raw ? parseISO(raw) : null;
}

/** Returns the effective month for competence-based grouping.
 *  Priority: competence_month > delivered_at (start of month) */
function getEffectiveMonth(project: FinancialProject): Date | null {
  if (project.competence_month) {
    return parseISO(project.competence_month + '-01');
  }
  if (project.delivered_at) {
    return startOfMonth(parseISO(project.delivered_at));
  }
  return null;
}

function getProjectCost(p: FinancialProject): number {
  return (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
}

function getProjectRevenue(p: FinancialProject): number {
  return p.agreed_value || 0;
}

function isInMonth(date: Date | string | null, month: Date): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isSameMonth(d, month);
}

function monthInterval(month: Date) {
  return { start: startOfMonth(month), end: endOfMonth(month) };
}

// === REALIZADO ===
function getRealizadoMetrics(projects: FinancialProject[], month: Date): MonthlyMetrics {
  const filtered = projects.filter(p => {
    if (!p.is_delivered) return false;
    const effectiveMonth = getEffectiveMonth(p);
    return effectiveMonth && isSameMonth(effectiveMonth, month);
  });
  const revenue = filtered.reduce((s, p) => s + getProjectRevenue(p), 0);
  const cost = filtered.reduce((s, p) => s + getProjectCost(p), 0);
  return {
    revenue,
    cost,
    profit: revenue - cost,
    projectCount: filtered.length,
  };
}

// === PREVISAO ===
function getPrevisaoMetrics(projects: FinancialProject[], month: Date): MonthlyMetrics {
  const monthStart = startOfMonth(month);

  const planned: FinancialProject[] = [];
  const rollover: FinancialProject[] = [];

  projects.forEach(p => {
    const anchor = getAnchorDate(p);
    if (!anchor) return;

    if (isInMonth(anchor, month)) {
      // Project planned for this month (delivered or not)
      planned.push(p);
    } else if (!p.is_delivered && isBefore(anchor, monthStart)) {
      // Rollover: anchor is before this month and NOT delivered
      rollover.push(p);
    }
  });

  const plannedRevenue = planned.reduce((s, p) => s + getProjectRevenue(p), 0);
  const rolloverRevenue = rollover.reduce((s, p) => s + getProjectRevenue(p), 0);
  const plannedCost = planned.reduce((s, p) => s + getProjectCost(p), 0);
  const rolloverCost = rollover.reduce((s, p) => s + getProjectCost(p), 0);

  const revenue = plannedRevenue + rolloverRevenue;
  const cost = plannedCost + rolloverCost;

  return {
    revenue,
    cost,
    profit: revenue - cost,
    projectCount: planned.length + rollover.length,
    breakdown: {
      plannedRevenue,
      rolloverRevenue,
      plannedCost,
      rolloverCost,
      rolloverCount: rollover.length,
    },
  };
}

// === CAIXA ===
function getCaixaMetrics(
  projects: FinancialProject[],
  teamPayments: TeamPayment[],
  month: Date,
): MonthlyMetrics {
  // Client income: projects where client_paid_at is in month
  const clientIncome = projects
    .filter(p => p.client_paid_at && isInMonth(p.client_paid_at, month))
    .reduce((s, p) => s + getProjectRevenue(p), 0);

  // Team expenses: paid_at in month
  const teamExpenses = teamPayments
    .filter(tp => tp.paid_at && isInMonth(tp.paid_at, month))
    .reduce((s, tp) => s + (tp.payment_amount || 0), 0);

  // Extras expenses: custos_extras_paid_at in month
  const extrasExpenses = projects
    .filter(p => p.custos_extras_paid_at && isInMonth(p.custos_extras_paid_at, month))
    .reduce((s, p) => s + (p.custos_extras || 0), 0);

  const totalExpenses = teamExpenses + extrasExpenses;

  return {
    revenue: clientIncome,
    cost: totalExpenses,
    profit: clientIncome - totalExpenses,
    projectCount: projects.filter(p => p.client_paid_at && isInMonth(p.client_paid_at, month)).length,
    cashflow: {
      clientIncome,
      teamExpenses,
      extrasExpenses,
    },
  };
}

// === Public API ===

export function getMonthlyMetrics(
  projects: FinancialProject[],
  viewMode: FinancialViewMode,
  month: Date,
  teamPayments: TeamPayment[] = [],
): MonthlyMetrics {
  switch (viewMode) {
    case 'REALIZADO':
      return getRealizadoMetrics(projects, month);
    case 'PREVISAO':
      return getPrevisaoMetrics(projects, month);
    case 'CAIXA':
      return getCaixaMetrics(projects, teamPayments, month);
  }
}

export function getTimeSeries(
  projects: FinancialProject[],
  viewMode: FinancialViewMode,
  fromMonth: Date,
  toMonth: Date,
  teamPayments: TeamPayment[] = [],
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  let current = startOfMonth(fromMonth);
  const end = startOfMonth(toMonth);

  while (current <= end) {
    const metrics = getMonthlyMetrics(projects, viewMode, current, teamPayments);
    points.push({
      month: format(current, 'MMM', { locale: pt }),
      monthDate: new Date(current),
      revenue: metrics.revenue,
      cost: metrics.cost,
      profit: metrics.profit,
    });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return points;
}

export function getMonthlySummary(
  projects: FinancialProject[],
  month: Date,
): MonthlySummary {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const interval = { start: monthStart, end: monthEnd };

  // Created in month
  const created = projects.filter(p =>
    isWithinInterval(parseISO(p.created_at), interval)
  ).length;

  // Planned for month (anchor date in month)
  const planned = projects.filter(p => {
    const anchor = getAnchorDate(p);
    return anchor && isInMonth(anchor, month);
  }).length;

  // Delivered in month (by competence)
  const delivered = projects.filter(p => {
    if (!p.is_delivered) return false;
    const effectiveMonth = getEffectiveMonth(p);
    return effectiveMonth && isSameMonth(effectiveMonth, month);
  }).length;

  // Postponed: anchor in month but NOT delivered by end of month
  const postponed = projects.filter(p => {
    const anchor = getAnchorDate(p);
    if (!anchor || !isInMonth(anchor, month)) return false;
    if (!p.is_delivered) return true;
    // Delivered but after the month = postponed
    if (p.delivered_at) {
      const deliveredAt = parseISO(p.delivered_at);
      return !isWithinInterval(deliveredAt, interval) && deliveredAt > monthEnd;
    }
    return false;
  }).length;

  // Rescued: anchor BEFORE month but delivered IN month (by competence)
  const rescued = projects.filter(p => {
    if (!p.is_delivered) return false;
    const effectiveMonth = getEffectiveMonth(p);
    if (!effectiveMonth || !isSameMonth(effectiveMonth, month)) return false;
    const anchor = getAnchorDate(p);
    return anchor && isBefore(anchor, monthStart);
  }).length;

  return { created, planned, delivered, postponed, rescued };
}

// Helper to calculate % change
export function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
