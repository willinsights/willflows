import { isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { getEffectiveMonth } from './financialEngine';
import type { FinancialProject, CostLinePayment } from './types';

export { uniqueFinancialCostLines } from './costLineRows';
import { uniqueFinancialCostLines } from './costLineRows';

export interface CategoryCostTotal {
  category: string;
  estimated: number;
  actual: number;
  paid: number;
  count: number;
  variance: number;
}

/** Category totals cover detailed cost lines only, never project/team aggregates. */
export function getCostCategoryTotals(
  projects: FinancialProject[], lines: CostLinePayment[], range: { start: Date; end: Date },
  mode: 'REALIZADO' | 'CAIXA' = 'REALIZADO',
): CategoryCostTotal[] {
  const byProject = new Map(projects.map(project => [project.id, project]));
  const interval = { start: startOfMonth(range.start), end: endOfMonth(range.end) };
  const grouped = new Map<string, CategoryCostTotal>();
  for (const line of uniqueFinancialCostLines(lines)) {
    const project = byProject.get(line.project_id);
    if (!project) continue;
    const paidInPeriod = line.payment_status === 'pago' && !!line.paid_at && isWithinInterval(parseISO(line.paid_at), interval);
    if (mode === 'CAIXA') {
      if (!paidInPeriod) continue;
    } else {
      const competence = getEffectiveMonth(project);
      if (!project.is_delivered || !competence || !isWithinInterval(competence, interval)) continue;
    }
    const category = line.category || 'outro';
    const row = grouped.get(category) ?? { category, estimated: 0, actual: 0, paid: 0, count: 0, variance: 0 };
    row.estimated += Number(line.estimated_amount ?? 0);
    row.actual += Number(line.actual_amount ?? 0);
    row.paid += paidInPeriod ? Number(line.actual_amount ?? 0) : 0;
    row.count += 1;
    row.variance = row.actual - row.estimated;
    grouped.set(category, row);
  }
  return [...grouped.values()].sort((a, b) => b.actual - a.actual);
}
