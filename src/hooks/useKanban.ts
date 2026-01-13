import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { kanbanColumnSchema, kanbanColumnUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
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

const initialPendingAlert: PendingAlertState = {
  open: false,
  items: [],
  tasks: 0,
  checklists: 0,
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
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumnWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAlert, setPendingAlert] = useState<PendingAlertState>(initialPendingAlert);
  
  // Refs to prevent duplicate fetches and track local updates
  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string | null>(null);
  const lastLocalUpdateRef = useRef<string | null>(null);

  const clearPendingAlert = useCallback(() => {
    setPendingAlert(initialPendingAlert);
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

  const fetchColumns = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;
    
    const fetchKey = `${currentWorkspace.id}-${phase}`;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Fetch columns for this phase
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', phase)
        .order('position', { ascending: true });

      if (columnsError) throw columnsError;

      // Fetch projects for this phase
      const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('current_phase', phase);

      if (projectsError) throw projectsError;

      // Fetch task counts for projects (filtered by current phase)
      const projectIds = projectsData?.map(p => p.id) || [];
      let taskCounts: Record<string, { total: number; completed: number }> = {};
      let checklistCounts: Record<string, { total: number; completed: number }> = {};
      let teamByProject: Record<string, TeamMember[]> = {};
      
      if (projectIds.length > 0) {
        // Fetch tasks FILTERED BY PHASE
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, project_id, is_completed, phase')
          .in('project_id', projectIds)
          .eq('phase', phase);

        if (tasksData) {
          tasksData.forEach(task => {
            if (!taskCounts[task.project_id]) {
              taskCounts[task.project_id] = { total: 0, completed: 0 };
            }
            taskCounts[task.project_id].total++;
            if (task.is_completed) {
              taskCounts[task.project_id].completed++;
            }
          });

          // Fetch checklists for tasks in this phase
          const taskIds = tasksData.map(t => t.id);
          if (taskIds.length > 0) {
            const { data: checklistsData } = await supabase
              .from('task_checklists')
              .select('id, task_id, is_completed')
              .in('task_id', taskIds);

            if (checklistsData) {
              // Map task_id to project_id
              const taskToProject = new Map(tasksData.map(t => [t.id, t.project_id]));
              
              checklistsData.forEach(checklist => {
                const projectId = taskToProject.get(checklist.task_id);
                if (projectId) {
                  if (!checklistCounts[projectId]) {
                    checklistCounts[projectId] = { total: 0, completed: 0 };
                  }
                  checklistCounts[projectId].total++;
                  if (checklist.is_completed) {
                    checklistCounts[projectId].completed++;
                  }
                }
              });
            }
          }
        }

        // Fetch team members with profiles
        const { data: teamData } = await supabase
          .from('project_team')
          .select('project_id, user_id, phase')
          .in('project_id', projectIds);

        if (teamData && teamData.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(teamData.map(t => t.user_id))];
          
          // Fetch profiles for all team members
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', userIds);

          const profilesMap = new Map(
            profilesData?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url, email: p.email }]) || []
          );

          // Group by project
          teamData.forEach(member => {
            if (!teamByProject[member.project_id]) {
              teamByProject[member.project_id] = [];
            }
            teamByProject[member.project_id].push({
              user_id: member.user_id,
              phase: member.phase,
              profile: profilesMap.get(member.user_id) || null,
            });
          });
        }
      }

      // Map projects to columns with task counts and team members
      // Sort urgent projects by delivery date (closest first)
      const columnsWithProjects: KanbanColumnWithProjects[] = (columnsData || []).map(column => ({
        ...column,
        projects: (projectsData || [])
          .filter(project => project[columnField] === column.id)
          .map(project => ({
            ...project,
            task_count: taskCounts[project.id]?.total || 0,
            task_completed: taskCounts[project.id]?.completed || 0,
            checklist_count: checklistCounts[project.id]?.total || 0,
            checklist_completed: checklistCounts[project.id]?.completed || 0,
            team_members: teamByProject[project.id] || [],
          }))
          .sort((a, b) => {
            const isUrgentA = a.priority === 'alta' || a.priority === 'urgente';
            const isUrgentB = b.priority === 'alta' || b.priority === 'urgente';
            
            // Urgent projects come first
            if (isUrgentA && !isUrgentB) return -1;
            if (!isUrgentA && isUrgentB) return 1;
            
            // Among urgent projects, sort by delivery date (closest first)
            if (isUrgentA && isUrgentB) {
              const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : Infinity;
              const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : Infinity;
              return dateA - dateB;
            }
            
            // Non-urgent: maintain original order (by created_at)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }),
      }));

      setColumns(columnsWithProjects);
      lastFetchedKeyRef.current = fetchKey;
    } catch (error) {
      toast({
        title: 'Erro ao carregar Kanban',
        description: handleDatabaseError('fetchKanban', error),
        variant: 'destructive',
      });
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, phase, fetchError, toast]);

  // Debounced fetch for realtime updates
  const debouncedFetchColumns = useMemo(
    () => debounce(() => {
      if (!isFetchingRef.current) {
        fetchColumns();
      }
    }, 300),
    [fetchColumns]
  );

  useEffect(() => {
    const fetchKey = `${currentWorkspace?.id}-${phase}`;
    // Only fetch if key changed
    if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
      fetchColumns();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, phase, fetchError]);

  // Realtime subscription for Kanban updates
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channelName = `kanban-realtime-${currentWorkspace.id}-${phase}`;
    
    const handleProjectChange = (payload: RealtimePostgresChangesPayload<Project>) => {
      const newData = payload.new as Project | undefined;
      const oldData = payload.old as Partial<Project> | undefined;
      
      // Ignore local updates
      if (newData?.id && lastLocalUpdateRef.current === newData.id) return;
      if (oldData?.id && lastLocalUpdateRef.current === oldData.id) return;
      
      // Only refresh if the project is in this phase
      const relevantPhase = newData?.current_phase || oldData?.current_phase;
      if (relevantPhase === phase || oldData?.current_phase === phase) {
        console.log('[Kanban Realtime] Project change detected:', payload.eventType);
        debouncedFetchColumns();
      }
    };

    const handleColumnChange = (payload: RealtimePostgresChangesPayload<KanbanColumn>) => {
      const newData = payload.new as KanbanColumn | undefined;
      const oldData = payload.old as Partial<KanbanColumn> | undefined;
      
      // Only refresh if the column is in this phase
      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) {
        console.log('[Kanban Realtime] Column change detected:', payload.eventType);
        debouncedFetchColumns();
      }
    };

    const handleTaskChange = (payload: RealtimePostgresChangesPayload<Task>) => {
      const newData = payload.new as Task | undefined;
      const oldData = payload.old as Partial<Task> | undefined;
      
      // Only refresh if the task is in this phase
      const relevantPhase = newData?.phase || oldData?.phase;
      if (relevantPhase === phase) {
        console.log('[Kanban Realtime] Task change detected:', payload.eventType);
        debouncedFetchColumns();
      }
    };

    const handleChecklistChange = () => {
      // Checklists affect counters, so we refresh
      console.log('[Kanban Realtime] Checklist change detected');
      debouncedFetchColumns();
    };

    const handleTeamChange = () => {
      // Team changes affect project cards
      console.log('[Kanban Realtime] Team change detected');
      debouncedFetchColumns();
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
          table: 'task_checklists'
        },
        handleChecklistChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_team'
        },
        handleTeamChange
      )
      .subscribe((status) => {
        console.log('[Kanban Realtime] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, phase, debouncedFetchColumns]);

  const moveProject = async (projectId: string, targetColumnId: string) => {
    if (!currentWorkspace) return;

    const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
    const targetColumn = columns.find(c => c.id === targetColumnId);
    const project = columns.flatMap(c => c.projects).find(p => p.id === projectId);
    
    // DEBUG LOG
    console.warn('[moveProject]', {
      projectId,
      targetColumnId,
      phase,
      item_type: (project as any)?.item_type,
      is_final: targetColumn?.is_final
    });
    
    // Check if moving to final column - use backend RPC for validation
    if (targetColumn?.is_final && project) {
      const itemType = (project as any).item_type || 'projeto_completo';
      
      // projeto_completo in captacao: move to edicao (don't deliver)
      if (phase === 'captacao' && itemType === 'projeto_completo') {
        // Move to first column of edicao phase
        const { data: edicaoColumns } = await supabase
          .from('kanban_columns')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('phase', 'edicao')
          .order('position', { ascending: true })
          .limit(1);

        if (edicaoColumns && edicaoColumns.length > 0) {
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
      
      // Call RPC deliver_project for backend validation
      const { data, error } = await supabase.rpc('deliver_project', {
        p_project_id: projectId,
        p_phase: phase,
        p_target_column_id: targetColumnId
      });
      
      console.warn('[deliver_project RPC result]', { data, error });
      
      if (error) {
        // Capture trigger error - fetch pending items for rich alert
        if (error.message.includes('CHECKLIST_INCOMPLETE')) {
          const pendingItems = await fetchPendingChecklistItems(projectId, phase);
          setPendingAlert({
            open: true,
            items: pendingItems,
            tasks: 0,
            checklists: pendingItems.length,
            message: error.message.replace('CHECKLIST_INCOMPLETE: ', ''),
          });
        } else {
          toast({
            title: 'Não é possível entregar',
            description: handleDatabaseError('moveProject', error),
            variant: 'destructive',
          });
        }
        return;
      }
      
      const result = data as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;
      if (result && !result.can_deliver) {
        // Fetch pending items for rich alert
        const pendingItems = await fetchPendingChecklistItems(projectId, phase);
        setPendingAlert({
          open: true,
          items: pendingItems,
          tasks: result.pending_tasks,
          checklists: result.pending_checklists,
          message: result.reason || undefined,
        });
        return;
      }
      
      // Success - update UI
      toast({ title: 'Projeto entregue com sucesso!' });
      fetchColumns();
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
      lastLocalUpdateRef.current = projectId;
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          [columnField]: targetColumnId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', projectId);

      if (error) throw error;
      
      // Clear local update marker after a delay
      setTimeout(() => {
        if (lastLocalUpdateRef.current === projectId) {
          lastLocalUpdateRef.current = null;
        }
      }, 2000);
    } catch (error) {
      lastLocalUpdateRef.current = null;
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

  return {
    columns,
    loading,
    moveProject,
    reorderColumns,
    updateColumn,
    addColumn,
    deleteColumn,
    refresh: fetchColumns,
    pendingAlert,
    clearPendingAlert,
  };
}
