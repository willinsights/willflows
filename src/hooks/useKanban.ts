import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import type { Tables } from '@/integrations/supabase/types';

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
  team_members?: TeamMember[];
}

export interface KanbanColumnWithProjects extends KanbanColumn {
  projects: ProjectWithClient[];
}

export function useKanban(phase: KanbanPhase) {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumnWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string | null>(null);

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

      // Fetch task counts for projects
      const projectIds = projectsData?.map(p => p.id) || [];
      let taskCounts: Record<string, { total: number; completed: number }> = {};
      let teamByProject: Record<string, TeamMember[]> = {};
      
      if (projectIds.length > 0) {
        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('project_id, is_completed')
          .in('project_id', projectIds);

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
      const columnsWithProjects: KanbanColumnWithProjects[] = (columnsData || []).map(column => ({
        ...column,
        projects: (projectsData || [])
          .filter(project => project[columnField] === column.id)
          .map(project => ({
            ...project,
            task_count: taskCounts[project.id]?.total || 0,
            task_completed: taskCounts[project.id]?.completed || 0,
            team_members: teamByProject[project.id] || [],
          })),
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

  useEffect(() => {
    const fetchKey = `${currentWorkspace?.id}-${phase}`;
    // Only fetch if key changed
    if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
      fetchColumns();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, phase, fetchError]);

  const moveProject = async (projectId: string, targetColumnId: string) => {
    if (!currentWorkspace) return;

    const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
    const targetColumn = columns.find(c => c.id === targetColumnId);
    
    // Check if moving to "Entregue" column (is_final)
    if (targetColumn?.is_final) {
      // Find the project
      const project = columns.flatMap(c => c.projects).find(p => p.id === projectId);
      
      // Check if project is captacao+edicao type and we're in captacao phase
      if (project && phase === 'captacao') {
        const itemType = (project as any).item_type;
        if (itemType === 'projeto_completo') {
          // Move to first column of edicao phase
          const { data: edicaoColumns } = await supabase
            .from('kanban_columns')
            .select('id')
            .eq('workspace_id', currentWorkspace.id)
            .eq('phase', 'edicao')
            .order('position', { ascending: true })
            .limit(1);

          if (edicaoColumns && edicaoColumns.length > 0) {
            // Update project to edicao phase
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
      }
    }
    
    // Optimistic update for normal moves
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
      const updateData: any = { 
        [columnField]: targetColumnId, 
        updated_at: new Date().toISOString() 
      };

      // If moving to final column, mark as delivered
      if (targetColumn?.is_final && phase === 'edicao') {
        updateData.is_delivered = true;
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;
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
          name,
          color,
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
  };
}
