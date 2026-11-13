import type { CostLinePayment } from './types';
export function uniqueFinancialCostLines(lines: CostLinePayment[]): CostLinePayment[] {
  return [...new Map(lines.filter(line => line.payment_status !== 'cancelado').map(line => [line.id, line])).values()];
}
