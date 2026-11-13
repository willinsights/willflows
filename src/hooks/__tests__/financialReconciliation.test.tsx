import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withFinancialCostLines, getMonthlyMetrics, getProjectCost, getProjectProfit } from '@/lib/finance/financialEngine';
import type { FinancialProject, CostLinePayment } from '@/lib/finance/types';

const fixture = vi.hoisted(() => ({ projects: [] as any[], lines: [] as any[], calls: [] as any[], workLogs: [] as any[], failure: false, gate: null as Promise<void> | null }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'fictitious-workspace' } }) }));
vi.mock('@/hooks/useFormatCurrency', () => ({ useFormatCurrency: () => ({ formatCurrency: (value: number) => String(value) }) }));
vi.mock('@/components/ui/PrivacyBlur', () => ({ PrivacyBlur: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useWorkLogs', () => ({ useWorkLogs: () => ({ workLogs: fixture.workLogs }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
 const filters: any[] = [];
 const builder = {
  select: () => builder,
  eq: (col: string, value: unknown) => { filters.push(['eq', col, value]); return builder; },
  neq: (col: string, value: unknown) => { filters.push(['neq', col, value]); return builder; },
  range: async (from: number, to: number) => {
   fixture.calls.push({ table, filters: [...filters], from, to });
   if (fixture.gate) await fixture.gate;
   if (fixture.failure && table === 'project_cost_lines') return { data: null, error: new Error('Simulated unavailable cost source') };
   let data = table === 'projects' ? fixture.projects : table === 'project_cost_lines' ? fixture.lines : [];
   for (const [op, col, value] of filters) data = data.filter(row => op === 'eq' ? row[col] === value : row[col] !== value);
   return { data: data.slice(from, to + 1), error: null };
  },
 };
 return builder;
} } }));
import { useFinancialEngine } from '../useFinancialEngine';
import { useMonthlyData, useSummaryMetrics } from '../useReportData';
import { useFinancialCostLines } from '../useFinancialCostLines';
import { useFinancialReportSource } from '../useFinancialReportSource';
import { FinancialDataState } from '@/components/reports/FinancialDataState';
import { PeriodComparisonCard } from '@/components/reports/PeriodComparisonCard';

const june = new Date(2025, 5, 1);
const july = new Date(2025, 6, 1);
const dateRange = { start: june, end: new Date(2025, 6, 31) };
function project(id: string, extra: Partial<FinancialProject> = {}): FinancialProject {
 return { id, agreed_value: 1000, custo_captacao: 100, custo_edicao: 200, custos_extras: 50,
 custos_extras_payment_status: null, custos_extras_paid_at: null, is_delivered: true,
 delivered_at: '2025-06-20', delivery_date: null, shoot_date: null, created_at: '2025-06-01',
 client_payment_status: null, client_paid_at: null, competence_month: '2025-06', ...extra };
}
const lines: CostLinePayment[] = [
 { id: 'l1', project_id: 'p1', actual_amount: 80, payment_status: 'pago', paid_at: '2025-07-08' },
 { id: 'l2', project_id: 'p1', actual_amount: 20, payment_status: 'pendente', paid_at: null },
 { id: 'l3', project_id: 'p2', actual_amount: 40, payment_status: 'pendente', paid_at: null },
];
function setup(projects = [project('p1'), project('p2', { agreed_value: 600, competence_month: '2025-07' })]) {
 fixture.projects = projects.map(p => ({ ...p, workspace_id: 'fictitious-workspace' }));
 fixture.lines = lines.map(l => ({ ...l, workspace_id: 'fictitious-workspace' }));
 fixture.calls = []; fixture.workLogs = []; fixture.failure = false; fixture.gate = null;
 const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
 const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
 return { client, wrapper };
}
afterEach(() => cleanup());

describe('isolated cost reconciliation with real hooks and simulated data only', () => {
 it('uses identical per-project totals without adding an existing aggregate twice', () => {
  const base = [project('p1', { cost_lines_total: 100 }), project('p2')];
  const merged = withFinancialCostLines(base, lines);
  expect(merged.map(getProjectCost)).toEqual([450, 390]);
  expect(merged.map(getProjectProfit)).toEqual([550, 610]);
  expect(withFinancialCostLines(merged, lines).map(getProjectCost)).toEqual([450, 390]);
  expect(base[1].cost_lines_total).toBeUndefined();
 });
 it.each([[june, 1000, 450, 550], [july, 600, 390, 210]])('Dashboard and monthly Reports agree for %s', async (month, revenue, cost, profit) => {
  const { wrapper } = setup();
  const { result } = renderHook(() => {
   const dashboard = useFinancialEngine('REALIZADO', month as Date);
   const query = useFinancialCostLines('fictitious-workspace');
   const reports = useMonthlyData(fixture.projects, dateRange, query.data);
   const summary = useSummaryMetrics(fixture.projects, [], reports);
   return { dashboard, reports, summary };
  }, { wrapper });
  await waitFor(() => expect(result.current.dashboard.loading).toBe(false));
  const row = result.current.reports[(month as Date).getMonth() - 5];
  expect(result.current.dashboard.metrics).toMatchObject({ revenue, cost, profit, projectCount: 1 });
  expect(row).toMatchObject({ receita: revenue, custos: cost, lucro: profit, projetos: 1 });
  expect(result.current.summary).toMatchObject({ totalRevenue: 1600, totalCosts: 840, profit: 760 });
  expect(fixture.calls.filter(c => c.table === 'project_cost_lines')).toHaveLength(1);
 });
 it('keeps paid cost lines in cash payment month, not competence month, without duplicate aggregates', () => {
  const p = withFinancialCostLines([project('p1', { client_paid_at: '2025-07-10', custos_extras_paid_at: '2025-07-08' })], lines);
  expect(getMonthlyMetrics(p, 'REALIZADO', june)).toMatchObject({ revenue: 1000, cost: 450, profit: 550 });
  expect(getMonthlyMetrics(p, 'CAIXA', june, [], lines).cost).toBe(0);
  expect(getMonthlyMetrics(p, 'CAIXA', july, [], lines)).toMatchObject({ revenue: 1000, cost: 130, profit: 870, cashflow: { costLinesExpenses: 80, extrasExpenses: 50 } });
 });
 it('excludes undelivered projects and falls back to actual delivery month', async () => {
  const { wrapper } = setup([project('p1', { competence_month: null }), project('p2', { is_delivered: false })]);
  const { result } = renderHook(() => {
   const dashboard = useFinancialEngine('REALIZADO', june);
   const query = useFinancialCostLines('fictitious-workspace');
   return { dashboard, reports: useMonthlyData(fixture.projects, dateRange, query.data) };
  }, { wrapper });
  await waitFor(() => expect(result.current.dashboard.loading).toBe(false));
  expect(result.current.dashboard.metrics).toMatchObject({ cost: 450, projectCount: 1 });
  expect(result.current.reports[0]).toMatchObject({ custos: 450, projetos: 1 });
 });
 it('preserves identical independent work-log costs in both views', async () => {
  const { wrapper } = setup(); fixture.workLogs = [{ amount: 25, completed_at: '2025-06-22', requested_at: '2025-06-10' }];
  const { result } = renderHook(() => {
   const dashboard = useFinancialEngine('REALIZADO', june);
   const query = useFinancialCostLines('fictitious-workspace');
   return { dashboard, reports: useMonthlyData(fixture.projects, dateRange, query.data) };
  }, { wrapper });
  await waitFor(() => expect(result.current.dashboard.loading).toBe(false));
  expect(result.current.dashboard.metrics.cost).toBe(475);
  expect(result.current.reports[0].custos).toBe(475);
 });
 it('paginates shared cost rows and excludes cancelled rows and other workspaces', async () => {
  const { wrapper } = setup();
  fixture.lines = Array.from({ length: 1001 }, (_, i) => ({ ...fixture.lines[0], id: `line-${i}`, actual_amount: 1 }));
  fixture.lines.push({ ...fixture.lines[0], id: 'cancelled', payment_status: 'cancelado', actual_amount: 999 });
  fixture.lines.push({ ...fixture.lines[0], id: 'other', workspace_id: 'different-fictitious-workspace', actual_amount: 999 });
  const { result } = renderHook(() => useFinancialCostLines('fictitious-workspace'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(1001);
  expect(withFinancialCostLines([project('p1')], result.current.data ?? []).map(getProjectCost)).toEqual([1351]);
  expect(fixture.calls.map(c => c.from)).toEqual([0, 1000]);
 });
 it('does not request cost lines without an enabled workspace', () => {
  const { wrapper } = setup();
  renderHook(() => useFinancialCostLines(undefined), { wrapper });
  expect(fixture.calls).toHaveLength(0);
 });
 it('preserves base totals when there are no cost rows', () => {
  expect(withFinancialCostLines([project('p1')], []).map(getProjectCost)).toEqual([350]);
  expect(getMonthlyMetrics([], 'REALIZADO', june).cost).toBe(0);
 });
});

describe('complete source and positive UI states', () => {
 it('holds financial content during loading then reveals confirmed totals', async () => {
  const { wrapper } = setup();
  let release: (() => void) | undefined;
  fixture.gate = new Promise<void>(resolve => { release = resolve; });
  const mounted = vi.fn();
  function Values() { mounted(); return null; }
  const { result } = renderHook(() => useFinancialReportSource('fictitious-workspace'), { wrapper });
  expect(result.current.loading).toBe(true);
  const ui = render(<FinancialDataState loading={result.current.loading} error={result.current.error} onRetry={result.current.refresh}><Values /></FinancialDataState>);
  expect(mounted).not.toHaveBeenCalled();
  release?.();
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.costLines.reduce((sum, line) => sum + line.actual_amount, 0)).toBe(140);
  ui.rerender(<FinancialDataState loading={result.current.loading} error={result.current.error} onRetry={result.current.refresh}><Values /></FinancialDataState>);
  expect(mounted).toHaveBeenCalledTimes(1);
 });
 it('reports a simulated failure, hides financial values and recovers on retry', async () => {
  const { wrapper } = setup(); fixture.failure = true;
  const { result } = renderHook(() => useFinancialReportSource('fictitious-workspace'), { wrapper });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  const mounted = vi.fn(); function Values() { mounted(); return null; }
  const ui = render(<FinancialDataState loading={result.current.loading} error={result.current.error} onRetry={result.current.refresh}><Values /></FinancialDataState>);
  expect(mounted).not.toHaveBeenCalled();
  fixture.failure = false; result.current.refresh();
  await waitFor(() => expect(result.current.error).toBeFalsy());
  await waitFor(() => expect(result.current.loading).toBe(false));
  ui.rerender(<FinancialDataState loading={result.current.loading} error={result.current.error} onRetry={result.current.refresh}><Values /></FinancialDataState>);
  expect(mounted).toHaveBeenCalledTimes(1);
 });
 it('Dashboard reports the same cost-source error instead of silently claiming a valid total', async () => {
  const { wrapper } = setup(); fixture.failure = true;
  const { result } = renderHook(() => useFinancialEngine('REALIZADO', june), { wrapper });
  await waitFor(() => expect(result.current.error).toBeTruthy());
 });
 it('the real period comparison renders June and July reconciled costs for the selected month', () => {
  setup();
  const ui = render(<PeriodComparisonCard projects={fixture.projects} costLines={lines} selectedMonth={july} />);
  const cells = ui.getAllByRole('cell').map(cell => cell.textContent);
  expect(cells).toContain('450'); expect(cells).toContain('390');
  expect(cells).toContain('550'); expect(cells).toContain('210');
 });
 it('mid-month custom intervals enumerate June and July once each', () => {
  setup();
  const { result } = renderHook(() => useMonthlyData(fixture.projects, { start: new Date(2025, 5, 30), end: new Date(2025, 6, 1) }, lines));
  expect(result.current.map(row => row.custos)).toEqual([450, 390]);
 });
});
