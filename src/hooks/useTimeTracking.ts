import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface TimeSession {
  id: string;
  project_id: string;
  user_id: string;
  workspace_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  column_id: string | null;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnTransition {
  id: string;
  project_id: string;
  workspace_id: string;
  from_column_id: string | null;
  to_column_id: string;
  moved_by: string | null;
  moved_at: string;
  movement_type: string;
}

export interface ProjectTimeSummary {
  total_active_seconds: number;
  total_cycle_seconds: number;
  rework_count: number;
  first_started_at: string | null;
  delivered_at: string | null;
  column_breakdown: Array<{
    column_id: string;
    column_name: string;
    total_seconds: number;
    entry_count: number;
  }>;
}

export interface WorkspaceTimeSettings {
  id: string;
  workspace_id: string;
  auto_start_columns: string[];
  auto_pause_columns: string[];
  allow_multiple_timers: boolean;
  require_adjustment_reason: boolean;
  production_columns: string[];
  waiting_columns: string[];
  sla_alert_hours: number | null;
  inactivity_alert_hours: number | null;
}

export function useTimeTracking(projectId?: string) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;

  // Get active timer for current user (across all projects)
  const { data: activeTimer, isLoading: activeTimerLoading } = useQuery({
    queryKey: ['active-timer', userId, workspaceId],
    queryFn: async () => {
      if (!userId || !workspaceId) return null;
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TimeSession | null;
    },
    enabled: !!userId && !!workspaceId,
    refetchInterval: 30000, // sync every 30s
  });

  // Get sessions for a specific project
  const { data: projectSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['time-sessions', projectId, workspaceId],
    queryFn: async () => {
      if (!projectId || !workspaceId) return [];
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('workspace_id', workspaceId)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as TimeSession[];
    },
    enabled: !!projectId && !!workspaceId,
  });

  // Get project time summary via RPC
  const { data: projectSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['project-time-summary', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.rpc('get_project_time_summary', {
        p_project_id: projectId,
      });
      if (error) throw error;
      return data as unknown as ProjectTimeSummary;
    },
    enabled: !!projectId,
  });

  // Get column transitions for a project
  const { data: transitions = [] } = useQuery({
    queryKey: ['column-transitions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('kanban_column_transitions')
        .select('*')
        .eq('project_id', projectId)
        .order('moved_at', { ascending: false });
      if (error) throw error;
      return data as ColumnTransition[];
    },
    enabled: !!projectId,
  });

  // Get workspace time settings
  const { data: timeSettings } = useQuery({
    queryKey: ['workspace-time-settings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from('workspace_time_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as WorkspaceTimeSettings | null;
    },
    enabled: !!workspaceId,
  });

  // Live elapsed counter
  useEffect(() => {
    if (activeTimer && !activeTimer.ended_at) {
      const startTime = new Date(activeTimer.started_at).getTime();
      const updateElapsed = () => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      };
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeTimer?.id, activeTimer?.started_at, activeTimer?.ended_at]);

  // Realtime subscription for timer sync
  useEffect(() => {
    if (!userId || !workspaceId) return;
    const channel = supabase
      .channel(`time-sessions-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'time_sessions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['active-timer', userId, workspaceId] });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['time-sessions', projectId] });
          queryClient.invalidateQueries({ queryKey: ['project-time-summary', projectId] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, workspaceId, projectId, queryClient]);

  // beforeunload protection
  useEffect(() => {
    if (activeTimer && !activeTimer.ended_at) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [activeTimer?.id, activeTimer?.ended_at]);

  // Start timer
  const startTimerMutation = useMutation({
    mutationFn: async ({ targetProjectId, columnId }: { targetProjectId: string; columnId?: string }) => {
      if (!userId || !workspaceId) throw new Error('Not authenticated');

      // Check for existing active timer
      if (activeTimer && !activeTimer.ended_at) {
        // Pause existing timer first
        const { error: pauseError } = await supabase
          .from('time_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', activeTimer.id);
        if (pauseError) throw pauseError;
      }

      const { data, error } = await supabase
        .from('time_sessions')
        .insert({
          project_id: targetProjectId,
          user_id: userId,
          workspace_id: workspaceId,
          column_id: columnId || null,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['time-sessions', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-time-summary', projectId] });
      }
      toast({ title: 'Timer iniciado' });
    },
    onError: (error) => {
      logger.error('Failed to start timer', error);
      toast({ title: 'Erro ao iniciar timer', variant: 'destructive' });
    },
  });

  // Pause timer
  const pauseTimerMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      const targetId = sessionId || activeTimer?.id;
      if (!targetId) throw new Error('No active timer');
      const { error } = await supabase
        .from('time_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['time-sessions', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-time-summary', projectId] });
      }
      toast({ title: 'Timer pausado' });
    },
    onError: (error) => {
      logger.error('Failed to pause timer', error);
      toast({ title: 'Erro ao pausar timer', variant: 'destructive' });
    },
  });

  // Record column transition
  const recordTransition = useCallback(async (
    transitionProjectId: string,
    fromColumnId: string | null,
    toColumnId: string,
    type: 'manual' | 'automatic' = 'manual'
  ) => {
    if (!workspaceId || !userId) return;
    try {
      await supabase.from('kanban_column_transitions').insert({
        project_id: transitionProjectId,
        workspace_id: workspaceId,
        from_column_id: fromColumnId,
        to_column_id: toColumnId,
        moved_by: userId,
        moved_at: new Date().toISOString(),
        movement_type: type,
      });

      // Check auto-start/pause settings
      if (timeSettings) {
        const shouldAutoStart = timeSettings.auto_start_columns.includes(toColumnId);
        const shouldAutoPause = timeSettings.auto_pause_columns.includes(toColumnId);

        if (shouldAutoPause && activeTimer && !activeTimer.ended_at && activeTimer.project_id === transitionProjectId) {
          await pauseTimerMutation.mutateAsync(activeTimer.id);
        } else if (shouldAutoStart && (!activeTimer || activeTimer.ended_at || activeTimer.project_id !== transitionProjectId)) {
          await startTimerMutation.mutateAsync({ targetProjectId: transitionProjectId, columnId: toColumnId });
        }
      }

      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['column-transitions', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-time-summary', projectId] });
      }
    } catch (error) {
      logger.error('Failed to record transition', error);
    }
  }, [workspaceId, userId, timeSettings, activeTimer, projectId, queryClient, pauseTimerMutation, startTimerMutation]);

  const startTimer = useCallback((targetProjectId?: string, columnId?: string) => {
    const pid = targetProjectId || projectId;
    if (!pid) return;
    startTimerMutation.mutate({ targetProjectId: pid, columnId });
  }, [projectId, startTimerMutation]);

  const pauseTimer = useCallback((sessionId?: string) => {
    pauseTimerMutation.mutate(sessionId);
  }, [pauseTimerMutation]);

  const isTimerActiveForProject = activeTimer && !activeTimer.ended_at && activeTimer.project_id === projectId;

  return {
    // State
    activeTimer,
    activeTimerLoading,
    projectSessions,
    sessionsLoading,
    projectSummary,
    summaryLoading,
    transitions,
    timeSettings,
    elapsedSeconds,
    isTimerActiveForProject: !!isTimerActiveForProject,

    // Actions
    startTimer,
    pauseTimer,
    recordTransition,

    // Mutation states
    isStarting: startTimerMutation.isPending,
    isPausing: pauseTimerMutation.isPending,
  };
}

// Format seconds to human readable
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatDurationLong(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
}
