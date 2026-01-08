import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface DashboardMetrics {
  captacao: number;
  edicao: number;
  entregues: number;
  receita: number;
  custos: number;
  lucro: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
}

export interface UrgentProject {
  id: string;
  name: string;
  client: string;
  date: string;
  type: string;
  priority: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  target: string;
  time: string;
  user: string;
}

export function useDashboardMetrics() {
  const { currentWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    captacao: 0,
    edicao: 0,
    entregues: 0,
    receita: 0,
    custos: 0,
    lucro: 0,
    pendingPayments: 0,
    pendingPaymentsCount: 0,
  });
  const [urgentProjects, setUrgentProjects] = useState<UrgentProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchMetrics();
    }
  }, [currentWorkspace]);

  const fetchMetrics = async () => {
    if (!currentWorkspace) return;

    try {
      // Fetch projects count by phase
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, current_phase, is_delivered, agreed_value, custo_captacao, custo_edicao')
        .eq('workspace_id', currentWorkspace.id);

      const captacao = projectsData?.filter(p => p.current_phase === 'captacao' && !p.is_delivered).length || 0;
      const edicao = projectsData?.filter(p => p.current_phase === 'edicao' && !p.is_delivered).length || 0;
      const entregues = projectsData?.filter(p => p.is_delivered).length || 0;

      // Calculate financial metrics
      const receita = projectsData?.reduce((sum, p) => sum + (p.agreed_value || 0), 0) || 0;
      const custos = projectsData?.reduce((sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0), 0) || 0;
      const lucro = receita - custos;

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_receivable', true)
        .eq('status', 'pendente');

      const pendingPayments = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentsCount = paymentsData?.length || 0;

      setMetrics({
        captacao,
        edicao,
        entregues,
        receita,
        custos,
        lucro,
        pendingPayments,
        pendingPaymentsCount,
      });

      // Fetch urgent projects (high priority or near deadline)
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: urgentData } = await supabase
        .from('projects')
        .select('id, name, type, priority, delivery_date, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', false)
        .or(`priority.in.(alta,urgente),delivery_date.lte.${nextWeek}`)
        .order('priority', { ascending: false })
        .order('delivery_date', { ascending: true })
        .limit(5);

      setUrgentProjects(
        urgentData?.map(p => ({
          id: p.id,
          name: p.name,
          client: (p.clients as any)?.name || 'Sem cliente',
          date: p.delivery_date || '',
          type: p.type,
          priority: p.priority,
        })) || []
      );

      // Fetch recent activity (based on updated_at)
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('id, name, updated_at, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];
      recentProjects?.forEach(p => {
        const isNew = new Date(p.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        const updatedAt = new Date(p.updated_at);
        const diff = Date.now() - updatedAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        let timeStr = 'Agora';
        if (hours >= 24) {
          timeStr = `Há ${Math.floor(hours / 24)} dias`;
        } else if (hours > 0) {
          timeStr = `Há ${hours} horas`;
        }

        activities.push({
          id: p.id,
          action: isNew ? 'Projeto criado' : 'Projeto atualizado',
          target: p.name,
          time: timeStr,
          user: 'Sistema',
        });
      });

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, urgentProjects, recentActivity, loading, refresh: fetchMetrics };
}
