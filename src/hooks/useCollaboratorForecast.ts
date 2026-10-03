import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { isBefore, startOfMonth, subMonths } from 'date-fns';
import {
  getAnchorDate,
  isInMonth,
  calculateChange,
} from '@/lib/finance/financialEngine';
import type { FinancialProject } from '@/lib/finance/types';

export interface CollaboratorForecastItem {
  id: string;
  projectName: string;
  projectCode: string;
  amount: number;
  status: 'pago' | 'a_receber' | 'em_curso';
  date: string | null;
}

export interface CollaboratorForecastData {
  items: CollaboratorForecastItem[];
  /** Entregue em meses anteriores e ainda não pago */
  olderPendingAmount: number;
  pendingAmount: number;
  paidAmount: number;
  totalAmount: number;
  projectCount: number;
  // Change indicators (previous month comparison)
  pendingChange: number | null;
  paidChange: number | null;
  totalChange: number | null;
  loading: boolean;
}

export function useCollaboratorForecast(selectedMonth: Date): CollaboratorForecastData {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [data, setData] = useState<CollaboratorForecastData>({
    items: [],
    olderPendingAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalAmount: 0,
    projectCount: 0,
    pendingChange: null,
    paidChange: null,
    totalChange: null,
    loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) return;

    const fetchForecast = async () => {
      setData(prev => ({ ...prev, loading: true }));

      const previousMonth = subMonths(selectedMonth, 1);
      const selectedMonthStart = startOfMonth(selectedMonth);
      const previousMonthStart = startOfMonth(previousMonth);

      // Fetch team payments for the current user
      const { data: teamPayments } = await supabase
        .from('project_team')
        .select(`
          id, project_id, payment_amount, payment_status, phase,
          projects!inner(id, name, project_code, delivery_date, delivered_at, shoot_date, is_delivered, workspace_id, created_at)
        `)
        .eq('user_id', user.id)
        .eq('projects.workspace_id', currentWorkspace.id);

      // Totals
      let pendingAmount = 0;
      let paidAmount = 0;
      let projectCount = 0;
      const projectIds = new Set<string>();

      let prevPending = 0;
      let prevPaid = 0;
      let olderPendingAmount = 0;
      const items: CollaboratorForecastItem[] = [];

      teamPayments?.forEach((payment: any) => {
        const project = payment.projects as Partial<FinancialProject> | null;
        if (!project) return;

        // Entregue: conta no mês da entrega. Não entregue: data prevista (delivery_date → shoot_date → created_at)
        const p = project as any;
        const anchorDate = p.is_delivered && p.delivered_at
          ? new Date(p.delivered_at)
          : getAnchorDate(project as FinancialProject);
        if (!anchorDate) return;

        const paymentAmount = payment.payment_amount || 0;
        const isPaid = payment.payment_status === 'pago';
        const anchorMonthStart = startOfMonth(anchorDate);

        // Selected month bucket: matches month OR rollover (delayed + not delivered)
        const inSelected = isInMonth(anchorDate, selectedMonth);
        const rolloverSelected =
          !project.is_delivered && isBefore(anchorMonthStart, selectedMonthStart);

        if (inSelected || rolloverSelected) {
          if (isPaid) paidAmount += paymentAmount;
          else pendingAmount += paymentAmount;
          items.push({
            id: payment.id,
            projectName: p.name || 'Projeto',
            projectCode: p.project_code || String(payment.project_id).slice(0, 8).toUpperCase(),
            amount: paymentAmount,
            status: isPaid ? 'pago' : p.is_delivered ? 'a_receber' : 'em_curso',
            date: p.delivered_at || p.delivery_date || null,
          });

          if (!projectIds.has(payment.project_id)) {
            projectIds.add(payment.project_id);
            projectCount++;
          }
        }

        if (p.is_delivered && !isPaid && isBefore(anchorMonthStart, selectedMonthStart)) {
          olderPendingAmount += paymentAmount;
        }

        // Previous month bucket: same logic vs. previous month
        const inPrev = isInMonth(anchorDate, previousMonth);
        const rolloverPrev =
          !project.is_delivered && isBefore(anchorMonthStart, previousMonthStart);

        if (inPrev || rolloverPrev) {
          if (isPaid) prevPaid += paymentAmount;
          else prevPending += paymentAmount;
        }
      });

      const totalAmount = pendingAmount + paidAmount;
      const prevTotal = prevPending + prevPaid;

      items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setData({
        items,
        olderPendingAmount,
        pendingAmount,
        paidAmount,
        totalAmount,
        projectCount,
        pendingChange: calculateChange(pendingAmount, prevPending),
        paidChange: calculateChange(paidAmount, prevPaid),
        totalChange: calculateChange(totalAmount, prevTotal),
        loading: false,
      });
    };

    fetchForecast();
  }, [currentWorkspace?.id, user?.id, selectedMonth]);

  return data;
}
