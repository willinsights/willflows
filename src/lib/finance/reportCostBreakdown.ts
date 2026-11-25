import { endOfMonth, startOfMonth, isWithinInterval } from 'date-fns';
import { getEffectiveMonth } from './financialEngine';
import { getCostCategoryTotals } from './costLineReconciliation';
import type { FinancialProject, CostLinePayment } from './types';

/** Base people/extra costs plus detailed lines, each counted once. */
export function getReportCostBreakdown(projects: FinancialProject[], lines: CostLinePayment[], range: { start: Date; end: Date }) {
  const interval = { start: startOfMonth(range.start), end: endOfMonth(range.end) };
  const rows = new Map<string, { category: string; label: string; actual: number; estimated: number | null; count: number }>();
  for (const p of projects) {
    const month = getEffectiveMonth(p);
    if (!p.is_delivered || !month || !isWithinInterval(month, interval)) continue;
    for (const [category, label, value] of [['captacao', 'Captação', p.custo_captacao], ['edicao', 'Edição', p.custo_edicao], ['extras', 'Custos extras', p.custos_extras]] as const) {
      if (!value) continue;
      const row = rows.get(category) ?? { category, label, actual: 0, estimated: null, count: 0 };
      row.actual += Number(value); row.count++; rows.set(category, row);
    }
  }
  return [...rows.values(), ...getCostCategoryTotals(projects, lines, range).map(r => ({ ...r, label: r.category }))].sort((a,b) => b.actual - a.actual);
}