import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { handleDatabaseError } from '@/lib/error-handler';
import { kanbanColumnSchema, kanbanColumnUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import type { Tables } from '@/integrations/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type KanbanPhase = 'captacao' | 'edicao';
export type KanbanColumn = Tables<'kanban_columns'>;
export type Project = Tables<'projects'>;
export type Task = Tables<'tasks'>;

export interface TeamMember {
  user_id: string;
  phase: 'captacao' | 'edicao';
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

export interface ProjectWithClient extends Project {
  clients?: { name: string } | null;
  task_count?: number;
  task_completed?: number;
  checklist_count?: number;
  checklist_completed?: number;
  team_members?: TeamMember[];
  has_approved_video?: boolean;
}

export interface KanbanColumnWithProjects extends KanbanColumn {
  projects: ProjectWithClient[];
}

export interface PendingAlertState {
  open: boolean;
  items: Array<{ id: string; title: string }>;
  tasks: number;
  checklists: number;
  message?: string;
}

export interface PendingDeliveryState {
  open: boolean;
  projectId: string | null;
  projectName: string;
  targetColumnId: string | null;
}

const initialPendingAlert: PendingAlertState = {
  open: false,
  items: [],
  tasks: 0,
  checklists: 0,
};

const initialPendingDelivery: PendingDeliveryState = {
  open: false,
  projectId: null,
  projectName: '',
  targetColumnId: null,
};

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useKanban(phase: KanbanPhase) {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canViewAllProjects, isLoading: permissionsLoading } = useFinancialPermissions();
  const [columns, setColumns] = useState<KanbanColumnWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAlert, setPendingAlert] = useState<PendingAlertState>(initialPendingAlert);
  const [pendingDelivery, setPendingDelivery] = useState<PendingDeliveryState>(initialPendingDelivery);
  
  // Check if user should see only their projects (based on dynamic permissions)
  const isCollaborator = !canViewAllProjects;
  const userId = user?.id;
  
  // Refs to prevent duplicate fetches and track local updates
  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string | null>(null);
  // Per-record echo suppression (C-3): só ignora o eco da PRÓPRIA mutação
  // que acabou de acontecer neste cliente, e apenas para o registo afetado.
  // Substitui a janela global de 2-3s que descartava updates de outros utilizadores
  // (e perdia mensagens quando outro user mexia logo após este voltar à tab).
  const pendingLocalUpdatesRef = useRef<Map<string, number>>(new Map());
  const LOCAL_ECHO_TTL_MS = 1500;

  const markLocalUpdate = useCallback((recordId: string) => {
    pendingLocalUpdatesRef.current.set(recordId, Date.now());
  }, []);

  const isLocalEcho = useCallback((recordId: string | undefined) => {
    if (!recordId) return false;
    const stamp = pendingLocalUpdatesRef.current.get(recordId);
    if (!stamp) return false;
    if (Date.now() - stamp > LOCAL_ECHO_TTL_MS) {
      pendingLocalUpdatesRef.current.delete(recordId);
      return false;
    }
    return true;
  }, []);

  const clearPendingAlert = useCallback(() => {
    setPendingAlert(initialPendingAlert);
  }, []);

  const clearPendingDelivery = useCallback(() => {
    setPendingDelivery(initialPendingDelivery);
  }, []);

  // Helper to fetch pending checklist items for a project
  const fetchPendingChecklistItems = async (projectId: string, projectPhase: KanbanPhase): Promise<Array<{ id: string; title: string }>> => {
    try {
      // First get all tasks for this project in the current phase
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase', projectPhase);
      
      if (tasksError || !tasks?.length) return [];
      
      const taskIds = tasks.map(t => t.id);
      
      // Then get incomplete checklist items for those tasks
      const { data: checklists, error: checklistsError } = await supabase
        .from('task_checklists')
        .select('id, title')
        .in('task_id', taskIds)
        .eq('is_completed', false)
        .order('position', { ascending: true });
      
      if (checklistsError) return [];
      
      return checklists?.map(c => ({ id: c.id, title: c.title })) || [];
    } catch {
      return [];
    }
  };

  // Core data fetching logic - shared between fetchColumns and silentRefresh
  // C-1: Uses single RPC get_kanban_board instead of 6+ sequential queries
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
      const columnsWithProjects: KanbanColumnWithProjects[] = (result?.columns || []).map((col) => ({
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

      return columnsWithProjects;
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

  // Full fetch with loading state - for initial load
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

  // Silent refresh - for updates without loading flash
  const silentRefresh = useCallback(async () => {
    const data = await fetchColumnsData();
    if (data) {
      setColumns(data);
    }
  }, [fetchColumnsData]);

  // Debounced silent refresh for realtime updates
  const debouncedSilentRefresh = useMemo(
    () => debounce(() => {
      if (!isFetchingRef.current) {
        silentRefresh();
      }
    }, 300),
    [silentRefresh]
  );

  useEffect(() => {
    // Wait for permissions to load before fetching
    if (permissionsLoading) return;
    
    const fetchKey = `${currentWorkspace?.id}-${phase}-${isCollaborator}`;
    // Only fetch if key changed (includes permission state)
    if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
      fetchColumns();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, phase, fetchError, fetchColumns, permissionsLoading, isCollaborator]);

  // Realtime subscription for Kanban updates
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channelName = `kanban-realtime-${currentWorkspace.id}-${phase}`;

    const handleProjectChange = (payload: RealtimePostgresChangesPayload<Project>) => {
      const newData = payload.new as Project | undefined;
      const oldData = payload.old as Partial<Project> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (isLocalEcho(recordId)) return;

      // Only refresh if the project is in this phase
      const relevantPhase = newData?.current_phase || oldData?.current_phase;
      if (relevantPhase === phase || oldData?.current_phase === phase) {
        logger.debug('[Kanban Realtime] Project change detected:', payload.eventType);
        debouncedSilentRefresh();
      }
    };

    const handleColumnChange = (payload: RealtimePostgresChangesPayload<KanbanColumn>) => {
      const newData = payload.new as KanbanColumn | undefined;
      const oldData = payload.old as Partial<KanbanColumn> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (isLocalEcho(recordId)) return;

      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) {
        logger.debug('[Kanban Realtime] Column change detected:', payload.eventType);
        debouncedSilentRefresh();
      }
    };

    const handleTaskChange = (payload: RealtimePostgresChangesPayload<Task>) => {
      const newData = payload.new as Task | undefined;
      const oldData = payload.old as Partial<Task> | undefined;
      const recordId = newData?.id || (oldData?.id as string | undefined);
      if (isLocalEcho(recordId)) return;

      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) {
        logger.debug('[Kanban Realtime] Task change detected:', payload.eventType);
        debouncedSilentRefresh();
      }
    };

    const handleChecklistChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const recordId = (payload.new as { id?: string } | undefined)?.id
        || (payload.old as { id?: string } | undefined)?.id;
      if (isLocalEcho(recordId)) return;
      logger.debug('[Kanban Realtime] Checklist change detected');
      debouncedSilentRefresh();
    };

    const handleTeamChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const recordId = (payload.new as { id?: string } | undefined)?.id
        || (payload.old as { id?: string } | undefined)?.id;
      if (isLocalEcho(recordId)) return;
      logger.debug('[Kanban Realtime] Team change detected');
      debouncedSilentRefresh();
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        handleProjectChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        handleColumnChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        handleTaskChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_checklists',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        handleChecklistChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_team',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        handleTeamChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, phase, debouncedSilentRefresh]);

  const moveProject = async (projectId: string, targetColumnId: string) => {
    if (!currentWorkspace) return;

    const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
    const targetColumn = columns.find(c => c.id === targetColumnId);
    const sourceColumn = columns.find(c => c.projects.some(p => p.id === projectId));
    const project = columns.flatMap(c => c.projects).find(p => p.id === projectId);
    
    logger.debug('[moveProject]', {
      projectId,
      targetColumnId,
      phase,
      item_type: (project as any)?.item_type,
      source_is_final: sourceColumn?.is_final,
      target_is_final: targetColumn?.is_final,
      is_delivered: project?.is_delivered
    });
    
    // P0.3: Reabrir projeto automaticamente ao arrastar de coluna final para ativa
    if (project?.is_delivered && sourceColumn?.is_final && targetColumn && !targetColumn.is_final) {
      logger.debug('[moveProject] Reopening delivered project...');
      
      // Call reopen_project RPC
      const { data: reopenResult, error: reopenError } = await supabase.rpc('reopen_project', {
        p_project_id: projectId
      });
      
      if (reopenError) {
        toast({
          title: 'Erro ao reabrir projeto',
          description: handleDatabaseError('reopenProject', reopenError),
          variant: 'destructive',
        });
        return;
      }
      
      const result = reopenResult as { success: boolean; reason?: string; new_column_id?: string } | null;
      if (!result?.success) {
        toast({
          title: 'Não foi possível reabrir',
          description: result?.reason || 'Erro desconhecido',
          variant: 'destructive',
        });
        return;
      }
      
      // After reopen, move to target column
      localUpdateTimestampRef.current = Date.now();
      
      const { error: moveError } = await supabase
        .from('projects')
        .update({ 
          [columnField]: targetColumnId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', projectId);
      
      if (moveError) {
        toast({
          title: 'Erro ao mover projeto',
          description: handleDatabaseError('moveProject', moveError),
          variant: 'destructive',
        });
        fetchColumns();
        return;
      }
      
      toast({ title: 'Projeto reaberto com sucesso!' });
      fetchColumns();
      return;
    }
    
    // Check if moving to final column - use backend RPC for validation
    if (targetColumn?.is_final && project) {
      const itemType = (project as any).item_type || 'projeto_completo';
      
      // projeto_completo in captacao: validate first, then move to edicao (don't deliver)
      if (phase === 'captacao' && itemType === 'projeto_completo') {
        // VALIDATE: Check if captação phase can be completed
        const { data: validationResult, error: validationError } = await supabase.rpc('can_deliver_project', {
          p_project_id: projectId,
          p_phase: 'captacao'
        });
        
        logger.debug('[can_deliver_project validation for captacao->edicao]', { validationResult, validationError });
        
        if (validationError) {
          toast({
            title: 'Erro ao validar',
            description: handleDatabaseError('validateTransfer', validationError),
            variant: 'destructive',
          });
          return;
        }
        
        const validation = validationResult as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;
        
        // If cannot deliver, show alert with pending items
        if (validation && !validation.can_deliver) {
          const pendingItems = await fetchPendingChecklistItems(projectId, 'captacao');
          setPendingAlert({
            open: true,
            items: pendingItems,
            tasks: validation.pending_tasks,
            checklists: validation.pending_checklists,
            message: validation.reason || 'Ainda existem itens por concluir na Captação.',
          });
          return;
        }
        
        // Validation passed - Move to first column of edicao phase
        const { data: edicaoColumns } = await supabase
          .from('kanban_columns')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('phase', 'edicao')
          .order('position', { ascending: true })
          .limit(1);

        if (edicaoColumns && edicaoColumns.length > 0) {
          // Mark as local update to avoid realtime echo
          localUpdateTimestampRef.current = Date.now();
          
          await supabase
            .from('projects')
            .update({
              current_phase: 'edicao',
              edicao_column_id: edicaoColumns[0].id,
              captacao_column_id: targetColumnId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

          toast({
            title: 'Projeto transferido para Edição',
            description: 'O projeto foi movido automaticamente para o Kanban de Edição.',
          });
          
          fetchColumns();
          return;
        }
      }
      
      // First validate if can deliver using can_deliver_project RPC
      const { data: validationResult, error: validationError } = await supabase.rpc('can_deliver_project', {
        p_project_id: projectId,
        p_phase: phase
      });
      
      if (validationError) {
        toast({
          title: 'Erro ao validar',
          description: handleDatabaseError('validateDelivery', validationError),
          variant: 'destructive',
        });
        return;
      }
      
      const validation = validationResult as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;
      if (validation && !validation.can_deliver) {
        // Fetch pending items for rich alert
        const pendingItems = await fetchPendingChecklistItems(projectId, phase);
        setPendingAlert({
          open: true,
          items: pendingItems,
          tasks: validation.pending_tasks,
          checklists: validation.pending_checklists,
          message: validation.reason || undefined,
        });
        return;
      }
      
      // Validation passed - open confirmation dialog to select delivery date
      setPendingDelivery({
        open: true,
        projectId,
        projectName: project.name,
        targetColumnId,
      });
      return;
    }
    
    // Optimistic update for normal moves (non-final columns)
    setColumns(prev => {
      const newColumns = prev.map(col => ({
        ...col,
        projects: col.projects.filter(p => p.id !== projectId),
      }));
      
      const project = prev.flatMap(c => c.projects).find(p => p.id === projectId);
      if (project) {
        const targetCol = newColumns.find(c => c.id === targetColumnId);
        if (targetCol) {
          targetCol.projects.push({ ...project, [columnField]: targetColumnId } as ProjectWithClient);
        }
      }
      
      return newColumns;
    });

    try {
      // Mark as local update to avoid realtime echo
      localUpdateTimestampRef.current = Date.now();
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          [columnField]: targetColumnId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', projectId);

      if (error) throw error;

      // Record column transition for time tracking
      if (currentWorkspace?.id && userId) {
        supabase.from('kanban_column_transitions').insert({
          project_id: projectId,
          workspace_id: currentWorkspace.id,
          from_column_id: sourceColumn?.id || null,
          to_column_id: targetColumnId,
          moved_by: userId,
          moved_at: new Date().toISOString(),
          movement_type: 'manual',
        }).then(() => {
          logger.debug('[moveProject] Column transition recorded');
        });

        // Execute workflow automations asynchronously
        supabase.functions.invoke('execute-automations', {
          body: {
            event_type: 'card_enters_column',
            project_id: projectId,
            workspace_id: currentWorkspace.id,
            to_column_id: targetColumnId,
            from_column_id: sourceColumn?.id || null,
            triggered_by: userId,
          },
        }).then(({ error: autoError }) => {
          if (autoError) logger.warn('[moveProject] Automation execution error:', autoError);
          else logger.debug('[moveProject] Automations executed');
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao mover projeto',
        description: handleDatabaseError('moveProject', error),
        variant: 'destructive',
      });
      fetchColumns(); // Revert on error
    }
  };

  const reorderColumns = async (sourceIndex: number, destinationIndex: number) => {
    if (!currentWorkspace) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    
    // Check if trying to move the final column or past it
    const finalColumnIndex = newColumns.findIndex(c => c.is_final);
    if (removed.is_final || (finalColumnIndex >= 0 && destinationIndex >= finalColumnIndex)) {
      toast({
        title: 'Ação não permitida',
        description: 'A coluna "Entregue" deve ser sempre a última.',
        variant: 'destructive',
      });
      return;
    }
    
    newColumns.splice(destinationIndex, 0, removed);

    // Update positions
    const updatedColumns = newColumns.map((col, idx) => ({
      ...col,
      position: idx,
    }));

    setColumns(updatedColumns);

    try {
      const updates = updatedColumns.map(col => ({
        id: col.id,
        position: col.position,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('kanban_columns')
          .update({ position: update.position, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      handleDatabaseError('reorderColumns', error);
      fetchColumns(); // Revert on error
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<KanbanColumn>) => {
    // Prevent updating final column's critical properties
    const column = columns.find(c => c.id === columnId);
    if (column?.is_final && updates.is_final === false) {
      toast({
        title: 'Ação não permitida',
        description: 'A coluna "Entregue" não pode ser modificada.',
        variant: 'destructive',
      });
      return;
    }

    // Validate update data (only name and color fields)
    const fieldsToValidate: Record<string, unknown> = {};
    if (updates.name !== undefined) fieldsToValidate.name = updates.name;
    if (updates.color !== undefined) fieldsToValidate.color = updates.color;
    
    if (Object.keys(fieldsToValidate).length > 0) {
      const validation = validateWithSchema(kanbanColumnUpdateSchema, fieldsToValidate);
      if (!validation.success) {
        toast({
          title: 'Dados inválidos',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', columnId);

      if (error) throw error;
      
      setColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, ...updates } : col
      ));

      toast({ title: 'Coluna atualizada' });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar coluna',
        description: handleDatabaseError('updateColumn', error),
        variant: 'destructive',
      });
    }
  };

  const addColumn = async (name: string, color: string = '#6b7280') => {
    if (!currentWorkspace) return;

    // Validate column data
    const validation = validateWithSchema(kanbanColumnSchema, { name, color });
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get position before final column
      const finalColumnIndex = columns.findIndex(c => c.is_final);
      const newPosition = finalColumnIndex >= 0 ? finalColumnIndex : columns.length;

      // Update final column position first
      if (finalColumnIndex >= 0) {
        await supabase
          .from('kanban_columns')
          .update({ position: newPosition + 1 })
          .eq('id', columns[finalColumnIndex].id);
      }

      const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
          workspace_id: currentWorkspace.id,
          name: validation.data.name,
          color: validation.data.color || color,
          phase,
          position: newPosition,
          is_final: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Coluna criada' });
      fetchColumns();
    } catch (error) {
      toast({
        title: 'Erro ao criar coluna',
        description: handleDatabaseError('addColumn', error),
        variant: 'destructive',
      });
    }
  };

  const deleteColumn = async (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    
    if (column?.is_final) {
      toast({
        title: 'Ação não permitida',
        description: 'A coluna "Entregue" não pode ser apagada.',
        variant: 'destructive',
      });
      return;
    }

    if (column && column.projects.length > 0) {
      toast({
        title: 'Coluna não vazia',
        description: 'Mova os projetos antes de apagar a coluna.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({ title: 'Coluna apagada' });
      fetchColumns();
    } catch (error) {
      toast({
        title: 'Erro ao apagar coluna',
        description: handleDatabaseError('deleteColumn', error),
        variant: 'destructive',
      });
    }
  };

  // Confirm delivery with selected date
  const confirmDelivery = async (deliveredAt: Date) => {
    if (!pendingDelivery.projectId || !pendingDelivery.targetColumnId) {
      clearPendingDelivery();
      return;
    }

    const { data, error } = await supabase.rpc('deliver_project', {
      p_project_id: pendingDelivery.projectId,
      p_phase: phase,
      p_target_column_id: pendingDelivery.targetColumnId,
      p_delivered_at: deliveredAt.toISOString(),
    });

    if (error) {
      toast({
        title: 'Erro ao entregar',
        description: handleDatabaseError('confirmDelivery', error),
        variant: 'destructive',
      });
      clearPendingDelivery();
      return;
    }

    const result = data as { can_deliver: boolean; reason: string | null } | null;
    if (result && !result.can_deliver) {
      toast({
        title: 'Não foi possível entregar',
        description: result.reason || 'Erro desconhecido',
        variant: 'destructive',
      });
      clearPendingDelivery();
      return;
    }

    toast({ title: 'Projeto entregue com sucesso!' });
    clearPendingDelivery();
    fetchColumns();
  };

  return {
    columns,
    loading,
    moveProject,
    reorderColumns,
    updateColumn,
    addColumn,
    deleteColumn,
    refresh: fetchColumns,
    silentRefresh,
    pendingAlert,
    clearPendingAlert,
    pendingDelivery,
    clearPendingDelivery,
    confirmDelivery,
  };
}
