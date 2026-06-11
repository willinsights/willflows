import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  debounce,
  type KanbanColumn,
  type KanbanColumnWithProjects,
  type KanbanPhase,
  type Project,
  type Task,
} from './types';
import { isOwnEcho } from './echoSuppression';

/**
 * Loads the Kanban board (RPC get_kanban_board), keeps it fresh via realtime,
 * and exposes echo-suppression helpers used by mutation hooks to avoid
 * reverting their own optimistic updates.
 */
export function useKanbanData(phase: KanbanPhase) {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canViewAllProjects, isLoading: permissionsLoading } = useFinancialPermissions();

  const [columns, setColumns] = useState<KanbanColumnWithProjects[]>([]);
  const [loading, setLoading] = useState(true);

  const isCollaborator = !canViewAllProjects;
  const userId = user?.id;

  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string | null>(null);
  const pendingLocalUpdatesRef = useRef<Map<string, number>>(new Map());

  const markLocalUpdate = useCallback((recordId: string) => {
    pendingLocalUpdatesRef.current.set(recordId, Date.now());
  }, []);

  const shouldSuppress = useCallback(
    (
      newData: { updated_by?: string | null } | undefined,
      oldData: { updated_by?: string | null } | undefined,
      recordId: string | undefined,
    ) =>
      isOwnEcho({
        newData,
        oldData,
        recordId,
        userId,
        pending: pendingLocalUpdatesRef.current,
      }),
    [userId],
  );

  const fetchColumnsData = useCallback(async (): Promise<KanbanColumnWithProjects[] | null> => {
    if (!currentWorkspace?.id || fetchError) return null;
    if (!userId) return null;
    if (isFetchingRef.current) return null;

    try {
      isFetchingRef.current = true;

      const { data, error } = await supabase.rpc('get_kanban_board', {
        p_workspace_id: currentWorkspace.id,
        p_phase: phase,
        p_user_id: userId,
        p_is_collaborator: isCollaborator,
      });

      if (error) throw error;

      const result = data as { columns?: KanbanColumnWithProjects[] } | null;
      return (result?.columns || []).map((col) => ({
        ...col,
        projects: (col.projects || []).slice().sort((a, b) => {
          const isUrgentA = a.priority === 'alta' || a.priority === 'urgente';
          const isUrgentB = b.priority === 'alta' || b.priority === 'urgente';
          if (isUrgentA && !isUrgentB) return -1;
          if (!isUrgentA && isUrgentB) return 1;
          const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : Infinity;
          const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : Infinity;
          return dateA - dateB;
        }),
      }));
    } catch (error) {
      toast({
        title: 'Erro ao carregar Kanban',
        description: handleDatabaseError('fetchKanban', error),
        variant: 'destructive',
      });
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentWorkspace?.id, phase, fetchError, toast, isCollaborator, userId]);

  const fetchColumns = useCallback(async () => {
    const fetchKey = `${currentWorkspace?.id}-${phase}`;
    setLoading(true);
    const data = await fetchColumnsData();
    if (data) {
      setColumns(data);
      lastFetchedKeyRef.current = fetchKey;
    }
    setLoading(false);
  }, [fetchColumnsData, currentWorkspace?.id, phase]);

  const silentRefresh = useCallback(async () => {
    const data = await fetchColumnsData();
    if (data) setColumns(data);
  }, [fetchColumnsData]);

  const debouncedSilentRefresh = useMemo(
    () =>
      debounce(() => {
        if (!isFetchingRef.current) silentRefresh();
      }, 300),
    [silentRefresh]
  );

  useEffect(() => {
    if (permissionsLoading) return;
    const fetchKey = `${currentWorkspace?.id}-${phase}-${isCollaborator}`;
    if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
      fetchColumns();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, phase, fetchError, fetchColumns, permissionsLoading, isCollaborator]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channelName = `kanban-realtime-${currentWorkspace.id}-${phase}`;

    const handleProjectChange = (payload: RealtimePostgresChangesPayload<Project>) => {
      const newData = payload.new as Project | undefined;
      const oldData = payload.old as Partial<Project> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (shouldSuppress(newData, oldData, recordId)) return;
      const relevantPhase = newData?.current_phase || oldData?.current_phase;
      if (relevantPhase === phase || oldData?.current_phase === phase) {
        logger.debug('[Kanban Realtime] Project change:', payload.eventType);
        debouncedSilentRefresh();
      }
    };

    const handleColumnChange = (payload: RealtimePostgresChangesPayload<KanbanColumn>) => {
      const newData = payload.new as KanbanColumn | undefined;
      const oldData = payload.old as Partial<KanbanColumn> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (shouldSuppress(newData, oldData, recordId)) return;
      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) debouncedSilentRefresh();
    };

    const handleTaskChange = (payload: RealtimePostgresChangesPayload<Task>) => {
      const newData = payload.new as Task | undefined;
      const oldData = payload.old as Partial<Task> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (shouldSuppress(newData, oldData, recordId)) return;
      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) debouncedSilentRefresh();
    };

    const handleGenericChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const recordId = (payload.new as { id?: string } | undefined)?.id
        || (payload.old as { id?: string } | undefined)?.id;
      if (shouldSuppress(undefined, undefined, recordId)) return;
      debouncedSilentRefresh();
    };

    let wasDisconnected = false;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${currentWorkspace.id}` }, handleProjectChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns', filter: `workspace_id=eq.${currentWorkspace.id}` }, handleColumnChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${currentWorkspace.id}` }, handleTaskChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklists', filter: `workspace_id=eq.${currentWorkspace.id}` }, handleGenericChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_team', filter: `workspace_id=eq.${currentWorkspace.id}` }, handleGenericChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (wasDisconnected) {
            logger.debug('[Kanban Realtime] Reconnected — resyncing');
            wasDisconnected = false;
            silentRefresh();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasDisconnected = true;
        }
      });

    // Resync triggers: focus, visibility, network, periodic poll
    const triggerRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      debouncedSilentRefresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') debouncedSilentRefresh();
    };
    window.addEventListener('focus', triggerRefresh);
    window.addEventListener('online', triggerRefresh);
    document.addEventListener('visibilitychange', onVisibility);
    const pollId = setInterval(triggerRefresh, 60_000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', triggerRefresh);
      window.removeEventListener('online', triggerRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(pollId);
    };
  }, [currentWorkspace?.id, phase, debouncedSilentRefresh, silentRefresh, shouldSuppress]);


  return {
    columns,
    setColumns,
    loading,
    fetchColumns,
    silentRefresh,
    markLocalUpdate,
  };
}
