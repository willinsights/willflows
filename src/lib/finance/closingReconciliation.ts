export interface ReconciledProject {
  project_id: string;
  code: string;
  name: string;
  client: string;
  delivered_at: string | null;
  revenue: number;
  editing: number;
  capture: number;
  extras: number;
  detailed: number;
  personal_pending: number;
}

export interface PersonalReceipt {
  project_id: string;
  name: string;
  capture: number;
  management: number;
}

export interface ClosingReconciliation {
  version: 1;
  period: string;
  projects: ReconciledProject[];
  personal_receipts: PersonalReceipt[];
  receipt_source: string;
  receipt_date: string | null;
}

export function getReconciliationTotals(data: ClosingReconciliation) {
  const totals = data.projects.reduce((sum, p) => ({
    revenue: sum.revenue + p.revenue,
    editing: sum.editing + p.editing,
    capture: sum.capture + p.capture,
    extras: sum.extras + p.extras + p.detailed,
    pending: sum.pending + p.personal_pending,
  }), { revenue: 0, editing: 0, capture: 0, extras: 0, pending: 0 });
  return {
    ...totals,
    costs: totals.editing + totals.capture + totals.extras,
    profit: totals.revenue - totals.editing - totals.capture - totals.extras,
    received: data.personal_receipts.reduce((sum, p) => sum + p.capture + p.management, 0),
  };
}