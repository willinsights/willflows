import { describe, expect, it } from 'vitest';
import { getReconciliationTotals, type ClosingReconciliation } from '../closingReconciliation';

const data: ClosingReconciliation = {
  version: 1, period: '2026-09', receipt_source: 'Fixture de recebimentos', receipt_date: null,
  projects: [{ project_id: 'p', code: 'p', name: 'p', client: 'c', delivered_at: null,
    revenue: 1000, editing: 150, capture: 200, extras: 0, detailed: 0, personal_pending: 75 }],
  personal_receipts: [{ project_id: 'p', name: 'Projeto de teste', capture: 220, management: 110 }],
};

describe('closing personal reconciliation', () => {
  it('keeps studio profit separate from unpaid personal share', () => {
    const totals = getReconciliationTotals(data);
    expect(totals.profit).toBe(650);
    expect(totals.pending).toBe(75);
  });
  it('records 220 capture plus 110 management received, without changing profit', () => {
    expect(getReconciliationTotals(data).received).toBe(330);
    expect(getReconciliationTotals({ ...data, personal_receipts: [] }).profit).toBe(650);
  });
  it('subtracts extras and detailed costs, without subtracting them from receipts', () => {
    const totals = getReconciliationTotals({ ...data, projects: [{ ...data.projects[0], extras: 10, detailed: 15 }] });
    expect(totals.profit).toBe(625);
    expect(totals.received).toBe(330);
  });
});