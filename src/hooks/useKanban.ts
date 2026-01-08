import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type KanbanPhase = 'captacao' | 'edicao';
export type KanbanColumn = Tables<'kanban_columns'>;
export type Project = Tables<'projects'>;
export type Task = Tables<'tasks'>;

export interface ProjectWithClient extends Project {
  clients?: { name: string } | null;
}

export interface KanbanColumnWithProjects extends KanbanColumn {
  projects: ProjectWithClient[];
}

export function useKanban(phase: KanbanPhase) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumnWithProjects[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColumns = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
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

      // Map projects to columns
      const columnsWithProjects: KanbanColumnWithProjects[] = (columnsData || []).map(column => ({
        ...column,
        projects: (projectsData || []).filter(project => 
          project[columnField] === column.id
        ),
      }));

      setColumns(columnsWithProjects);
    } catch (error) {
      console.error('Error fetching kanban:', error);
      toast({
        title: 'Erro ao carregar Kanban',
        description: 'Não foi possível carregar as colunas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, phase, toast]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const moveProject = async (projectId: string, targetColumnId: string) => {
    if (!currentWorkspace) return;

    const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
    
    // Optimistic update
    setColumns(prev => {
      const newColumns = prev.map(col => ({
        ...col,
        projects: col.projects.filter(p => p.id !== projectId),
      }));
      
      const project = prev.flatMap(c => c.projects).find(p => p.id === projectId);
      if (project) {
        const targetCol = newColumns.find(c => c.id === targetColumnId);
        if (targetCol) {
          targetCol.projects.push({ ...project, [columnField]: targetColumnId } as Project);
        }
      }
      
      return newColumns;
    });

    try {
      const { error } = await supabase
        .from('projects')
        .update({ [columnField]: targetColumnId, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error moving project:', error);
      toast({
        title: 'Erro ao mover projeto',
        description: 'Não foi possível mover o projeto.',
        variant: 'destructive',
      });
      fetchColumns(); // Revert on error
    }
  };

  const reorderColumns = async (sourceIndex: number, destinationIndex: number) => {
    if (!currentWorkspace) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    
    // Check if trying to move past the final column
    const finalColumnIndex = newColumns.findIndex(c => c.is_final);
    if (removed.is_final || destinationIndex > finalColumnIndex) {
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
      console.error('Error reordering columns:', error);
      fetchColumns(); // Revert on error
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<KanbanColumn>) => {
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
      console.error('Error updating column:', error);
      toast({
        title: 'Erro ao atualizar coluna',
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
      console.error('Error adding column:', error);
      toast({
        title: 'Erro ao criar coluna',
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
    refresh: fetchColumns,
  };
}
