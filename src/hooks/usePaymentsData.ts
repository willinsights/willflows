import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQueryClient } from '@tanstack/react-query';
import type { ProjectCustoExtra } from '@/components/payments/ExtraCostsPaymentsControl';
import type { ProjectRevenue } from '@/components/payments/ProjectRevenueControl';

export function usePaymentsData() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [projectCosts, setProjectCosts] = useState<ProjectCustoExtra[]>([]);
  const [allProjectCosts, setAllProjectCosts] = useState<ProjectCustoExtra[]>([]);
  const [projectRevenue, setProjectRevenue] = useState<ProjectRevenue[]>([]);

  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!currentWorkspace?.id) return;

      const { data: costsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0)
        .in('custos_extras_payment_status', ['pendente', 'vencido', null]);

      if (costsData) setProjectCosts(costsData as ProjectCustoExtra[]);

      const { data: allCostsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0);

      if (allCostsData) setAllProjectCosts(allCostsData as ProjectCustoExtra[]);

      const { data: revenueData } = await supabase
        .from('projects')
        .select('id, name, project_code, agreed_value, client_payment_status, client_payment_due_date, client_id, created_at, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', true);

      if (revenueData) setProjectRevenue(revenueData as ProjectRevenue[]);
    };

    fetchAdditionalData();
  }, [currentWorkspace?.id]);

  const handleFreelancerStatusChange = async (teamId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { payment_status: newStatus };
    if (newStatus === 'pago') {
      updates.paid_at = new Date().toISOString();
    } else {
      updates.paid_at = null;
    }

    await supabase
      .from('project_team')
      .update(updates)
      .eq('id', teamId);

    queryClient.invalidateQueries({ queryKey: ['team-payments'] });
  };

  const handleCostStatusChange = async (projectId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { custos_extras_payment_status: newStatus };
    if (newStatus === 'pago') {
      updates.custos_extras_paid_at = new Date().toISOString();
    } else {
      updates.custos_extras_paid_at = null;
    }

    await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    const { data: costsData } = await supabase
      .from('projects')
      .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, delivered_at, clients(name)')
      .eq('workspace_id', currentWorkspace?.id)
      .gt('custos_extras', 0);

    if (costsData) {
      setAllProjectCosts(costsData as ProjectCustoExtra[]);
      setProjectCosts(costsData.filter(c =>
        c.custos_extras_payment_status === 'pendente' ||
        c.custos_extras_payment_status === 'vencido' ||
        c.custos_extras_payment_status === null
      ) as ProjectCustoExtra[]);
    }

    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const handleProjectRevenueStatusChange = async (projectId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { client_payment_status: newStatus };
    if (newStatus === 'pago') {
      updates.client_paid_at = new Date().toISOString();
    } else {
      updates.client_paid_at = null;
    }

    await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    const { data: revenueData } = await supabase
      .from('projects')
      .select('id, name, project_code, agreed_value, client_payment_status, client_payment_due_date, client_id, created_at, delivery_date, delivered_at, clients(name)')
      .eq('workspace_id', currentWorkspace?.id)
      .eq('is_delivered', true);

    if (revenueData) setProjectRevenue(revenueData as ProjectRevenue[]);

    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  return {
    projectCosts,
    allProjectCosts,
    projectRevenue,
    handleFreelancerStatusChange,
    handleCostStatusChange,
    handleProjectRevenueStatusChange,
  };
}
