import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, subMonths } from 'date-fns';

export interface CollaboratorForecastData {
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

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function useCollaboratorForecast(selectedMonth: Date): CollaboratorForecastData {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [data, setData] = useState<CollaboratorForecastData>({
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
      
      const monthKey = format(selectedMonth, 'yyyy-MM');
      const previousMonth = subMonths(selectedMonth, 1);
      const previousMonthKey = format(previousMonth, 'yyyy-MM');

      // Fetch team payments for the current user
      const { data: teamPayments } = await supabase
        .from('project_team')
        .select(`
          id, project_id, payment_amount, payment_status, phase,
          projects!inner(delivery_date, shoot_date, is_delivered, workspace_id, created_at)
        `)
        .eq('user_id', user.id)
        .eq('projects.workspace_id', currentWorkspace.id);

      // Calculate totals for selected month
      let pendingAmount = 0;
      let paidAmount = 0;
      let projectCount = 0;
      const projectIds = new Set<string>();

      // Calculate totals for previous month
      let prevPending = 0;
      let prevPaid = 0;

      teamPayments?.forEach((payment: any) => {
        const project = payment.projects;
        // Determine anchor date (delivery_date → shoot_date → created_at)
        const anchorDate = project.delivery_date || project.shoot_date || project.created_at;
        if (!anchorDate) return;

        // Normalize to date only (created_at includes timestamp)
        const dateString = typeof anchorDate === 'string' && anchorDate.includes('T') 
          ? anchorDate.split('T')[0] 
          : anchorDate;
        const projectMonth = format(parseISO(dateString), 'yyyy-MM');
        const paymentAmount = payment.payment_amount || 0;
        const isPaid = payment.payment_status === 'pago';

        // Include in selected month if: month matches OR rollover (delayed + not delivered)
        const isInMonth = projectMonth === monthKey;
        const isRollover = !project.is_delivered && projectMonth < monthKey;

        if (isInMonth || isRollover) {
          if (isPaid) {
            paidAmount += paymentAmount;
          } else {
            pendingAmount += paymentAmount;
          }
          // Count unique projects
          if (!projectIds.has(payment.project_id)) {
            projectIds.add(payment.project_id);
            projectCount++;
          }
        }

        // Include in previous month if: month matches OR rollover
        const isInPrevMonth = projectMonth === previousMonthKey;
        const isPrevRollover = !project.is_delivered && projectMonth < previousMonthKey;

        if (isInPrevMonth || isPrevRollover) {
          if (isPaid) {
            prevPaid += paymentAmount;
          } else {
            prevPending += paymentAmount;
          }
        }
      });

      const totalAmount = pendingAmount + paidAmount;
      const prevTotal = prevPending + prevPaid;

      setData({
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
