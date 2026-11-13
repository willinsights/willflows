import { describe, it, expect } from 'vitest';
import { getCostCategoryTotals } from '../costLineReconciliation';
import { withFinancialCostLines, getMonthlyMetrics, getProjectCost } from '../financialEngine';
import type { FinancialProject, CostLinePayment } from '../types';
const june = { start: new Date(2025, 5, 1), end: new Date(2025, 5, 30) };
const july = { start: new Date(2025, 6, 1), end: new Date(2025, 6, 31) };
const base: FinancialProject = { id: 'p1', agreed_value: 1000, custo_captacao: 100, custo_edicao: 200, custos_extras: 50, custos_extras_payment_status: null, custos_extras_paid_at: null, is_delivered: true, delivered_at: '2025-06-20', delivery_date: null, shoot_date: null, created_at: '2025-06-01', client_payment_status: null, client_paid_at: null, competence_month: '2025-06' };
const projects = [base, { ...base, id: 'p2', agreed_value: 600, competence_month: '2025-07' }, { ...base, id: 'not-delivered', is_delivered: false }];
const paid: CostLinePayment = { id: 'l1', project_id: 'p1', actual_amount: 80, estimated_amount: 70, category: 'equipamento', payment_status: 'pago', paid_at: '2025-07-08' };
const pending = { ...paid, id: 'l2', category: 'software', actual_amount: 20, estimated_amount: 30, payment_status: 'pendente', paid_at: null };
const lines = [paid, pending, { ...pending, id: 'l3', project_id: 'p2', actual_amount: 40 }, { ...paid, id: 'cancelled', actual_amount: 999, payment_status: 'cancelado' }, { ...paid, id: 'unknown-project', project_id: 'missing', actual_amount: 999 }, { ...paid, id: 'not-delivered-line', project_id: 'not-delivered', actual_amount: 999 }];
describe('month/category reconciliation', () => {
 it('groups exactly the two June categories in competence even when payment is in July', () => {
  expect(getCostCategoryTotals(projects, lines, june)).toEqual([
   { category: 'equipamento', estimated: 70, actual: 80, paid: 0, count: 1, variance: 10 },
   { category: 'software', estimated: 30, actual: 20, paid: 0, count: 1, variance: -10 },
  ]);
 });
 it('groups only p2 lines in July competence', () => {
  expect(getCostCategoryTotals(projects, lines, july)).toEqual([{ category: 'software', estimated: 30, actual: 40, paid: 0, count: 1, variance: 10 }]);
 });
 it('reconciles category sums as the detailed-line part of total monthly cost, without repeating base costs', () => {
  const merged = withFinancialCostLines(projects, lines);
  for (const [range, expectedTotal, expectedLines] of [[june, 450, 100], [july, 390, 40]] as const) {
   const categories = getCostCategoryTotals(projects, lines, range);
   expect(categories.reduce((sum, row) => sum + row.actual, 0)).toBe(expectedLines);
   expect(getMonthlyMetrics(merged, 'REALIZADO', range.start).cost).toBe(expectedTotal);
   expect(expectedTotal - expectedLines).toBe(350);
  }
 });
 it('cash categories use paid_at and ignore pending lines, separately from competence', () => {
  expect(getCostCategoryTotals([base], [paid, pending], june, 'CAIXA')).toEqual([]);
  expect(getCostCategoryTotals([base], [paid, pending], july, 'CAIXA')).toEqual([{ category: 'equipamento', estimated: 70, actual: 80, paid: 80, count: 1, variance: 10 }]);
  expect(getMonthlyMetrics([base], 'CAIXA', july.start, [], [paid, pending]).cost).toBe(80);
 });
 it('deduplicates rows by id consistently in competence, cash and category totals', () => {
  const repeated = [paid, paid, pending, pending];
  expect(getProjectCost(withFinancialCostLines([base], repeated)[0])).toBe(450);
  expect(getCostCategoryTotals([base], repeated, june).reduce((sum, row) => sum + row.actual, 0)).toBe(100);
  expect(getMonthlyMetrics([base], 'CAIXA', july.start, [], repeated).cost).toBe(80);
 });
 it('clears stale cost aggregates when the last line is removed', () => {
  expect(getProjectCost(withFinancialCostLines([{ ...base, cost_lines_total: 100 }], [])[0])).toBe(350);
 });
 it('supports delivery fallback and categorizes missing labels as outro', () => {
  expect(getCostCategoryTotals([{ ...base, competence_month: null }], [{ ...paid, category: null }], june)[0]).toMatchObject({ category: 'outro', actual: 80 });
 });
 it('normalizes custom mid-month ranges to the same month buckets as the financial engine', () => {
  expect(getCostCategoryTotals([base], [paid], { start: new Date(2025, 5, 20), end: new Date(2025, 5, 21) })[0].actual).toBe(80);
 });
});
