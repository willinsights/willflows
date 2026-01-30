import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KanbanMetrics {
  throughput: {
    total_completed: number;
    avg_per_week: number;
  };
  avg_time_by_phase: Array<{
    phase: 'captacao' | 'edicao' | 'entregue';
    avg_hours: number;
    min_hours: number;
    max_hours: number;
    count: number;
  }> | null;
  bottleneck: {
    phase: 'captacao' | 'edicao' | 'entregue';
    current_count: number;
    avg_wait_hours: number;
  } | null;
  current_wip: {
    captacao: number;
    edicao: number;
    total: number;
  };
  cycle_time: {
    avg_days: number;
    median_days: number;
  } | null;
}

interface UseKanbanMetricsOptions {
  workspaceId: string | null;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

export function useKanbanMetrics({
  workspaceId,
  startDate,
  endDate,
  enabled = true,
}: UseKanbanMetricsOptions) {
  return useQuery({
    queryKey: ['kanban-metrics', workspaceId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<KanbanMetrics | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_kanban_metrics', {
        p_workspace_id: workspaceId,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString(),
      });

      if (error) {
        console.error('Error fetching kanban metrics:', error);
        throw error;
      }

      return data as unknown as KanbanMetrics;
    },
    enabled: enabled && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// Helper function to format hours nicely
export function formatDuration(hours: number | null | undefined): string {
  if (hours == null) return '-';
  
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}

// Helper to get phase display name
export function getPhaseName(phase: string): string {
  switch (phase) {
    case 'captacao': return 'Captação';
    case 'edicao': return 'Edição';
    case 'entregue': return 'Entregue';
    default: return phase;
  }
}

// Helper to get phase color
export function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'captacao': return 'hsl(var(--chart-1))';
    case 'edicao': return 'hsl(var(--chart-2))';
    case 'entregue': return 'hsl(var(--chart-3))';
    default: return 'hsl(var(--muted))';
  }
}
