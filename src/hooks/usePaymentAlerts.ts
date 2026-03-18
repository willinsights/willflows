import { useMemo } from 'react';
import { usePayments, type PaymentWithDetails } from '@/hooks/usePayments';
import { differenceInDays, parseISO } from 'date-fns';

export interface PaymentAlert {
  payment: PaymentWithDetails;
  severity: 'critical' | 'warning' | 'info';
  label: string;
  daysOverdue: number;
}

export function usePaymentAlerts() {
  const { payments, loading } = usePayments();

  const alerts = useMemo<PaymentAlert[]>(() => {
    if (!payments.length) return [];
    
    const now = new Date();
    const result: PaymentAlert[] = [];

    for (const p of payments) {
      if (p.status === 'pago' || p.status === 'cancelado' || !p.due_date) continue;

      const dueDate = parseISO(p.due_date);
      const diff = differenceInDays(dueDate, now);

      if (diff < -30) {
        result.push({ payment: p, severity: 'critical', label: `Vencido há ${Math.abs(diff)} dias`, daysOverdue: Math.abs(diff) });
      } else if (diff < -7) {
        result.push({ payment: p, severity: 'critical', label: `Vencido há ${Math.abs(diff)} dias`, daysOverdue: Math.abs(diff) });
      } else if (diff < 0) {
        result.push({ payment: p, severity: 'warning', label: `Vencido há ${Math.abs(diff)} dia(s)`, daysOverdue: Math.abs(diff) });
      } else if (diff <= 3) {
        result.push({ payment: p, severity: 'warning', label: `Vence em ${diff} dia(s)`, daysOverdue: -diff });
      } else if (diff <= 7) {
        result.push({ payment: p, severity: 'info', label: `Vence em ${diff} dias`, daysOverdue: -diff });
      }
    }

    // Sort: most critical first
    return result.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [payments]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return { alerts, loading, criticalCount, warningCount };
}
