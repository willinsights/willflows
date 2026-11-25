import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetch-all';
import { observedPhaseDurations } from '@/lib/kanban/phaseDurations';

import { logger } from '@/lib/logger';
export interface KanbanMetrics {
  phase_time_source?: 'history' | 'transitions';
  throughput: {
    total_completed: number;
    avg_per_week: number;
  };
  avg_time_by_phase: Array<{
    phase: 'captacao' | 'edicao';
    avg_hours: number;
    min_hours: number;
    max_hours: number;
    count: number;
  }> | null;
  bottleneck: {
    phase: 'captacao' | 'edicao';
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

      const start = startDate ?? new Date(Date.now() - 30 * 86400000);
      const end = endDate ?? new Date();
      const { data, error } = await supabase.rpc('get_kanban_metrics', {
        p_workspace_id: workspaceId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
      });

      if (error) {
        logger.error('Error fetching kanban metrics:', error);
        throw error;
      }

      const metrics = data as unknown as KanbanMetrics;
      if (!metrics.avg_time_by_phase?.length) {
        const [transitions, columns] = await Promise.all([
          fetchAllRows(() => supabase.from('kanban_column_transitions')
            .select('project_id, to_column_id, from_column_id, moved_at').eq('workspace_id', workspaceId)
            .gte('moved_at', start.toISOString()).lte('moved_at', end.toISOString()).order('moved_at').order('id')),
          fetchAllRows(() => supabase.from('kanban_columns').select('id, phase, is_final').eq('workspace_id', workspaceId).order('id')),
        ]);
        metrics.avg_time_by_phase = observedPhaseDurations(transitions, columns, start, end);
        metrics.phase_time_source = 'transitions';
      }
      return metrics;
    },
    enabled: enabled && !!workspaceId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
    default: return phase;
  }
}

// Helper to get phase color
export function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'captacao': return 'hsl(var(--info))';
    case 'edicao': return 'hsl(var(--primary))';
    default: return 'hsl(var(--muted))';
  }
}
