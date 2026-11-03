import { describe, expect, it } from 'vitest';
import { getReconciliationTotals, type ClosingReconciliation } from '../closingReconciliation';

const data: ClosingReconciliation = {
  version: 1, period: '2026-09', receipt_source: 'Marrocos', receipt_date: null,
  projects: [{ project_id: 'p', code: 'p', name: 'p', client: 'c', delivered_at: null,
    revenue: 4812, editing: 1445, capture: 2500, extras: 0, detailed: 0, personal_pending: 312 }],
  personal_receipts: [{ project_id: 'p', name: '17 hotéis', capture: 4250, management: 1472 }],
};

describe('closing personal reconciliation', () => {
  it('keeps studio profit separate from unpaid personal share', () => {
    const totals = getReconciliationTotals(data);
    expect(totals.profit).toBe(867);
    expect(totals.pending).toBe(312);
  });
  it('records 4250 capture plus 1472 management received, without changing profit', () => {
    expect(getReconciliationTotals(data).received).toBe(5722);
    expect(getReconciliationTotals({ ...data, personal_receipts: [] }).profit).toBe(867);
  });
  it('subtracts extras and detailed costs, without subtracting them from receipts', () => {
    const totals = getReconciliationTotals({ ...data, projects: [{ ...data.projects[0], extras: 10, detailed: 15 }] });
    expect(totals.profit).toBe(842);
    expect(totals.received).toBe(5722);
  });
});