import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { kanbanColumnSchema, kanbanColumnUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
import type { KanbanColumn, KanbanColumnWithProjects, KanbanPhase } from './types';

interface Params {
  phase: KanbanPhase;
  columns: KanbanColumnWithProjects[];
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumnWithProjects[]>>;
  fetchColumns: () => Promise<void>;
}

/** CRUD/reorder for Kanban columns. */
export function useKanbanColumns({ phase, columns, setColumns, fetchColumns }: Params) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const reorderColumns = async (sourceIndex: number, destinationIndex: number) => {
    if (!currentWorkspace) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(sourceIndex, 1);

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
    const updatedColumns = newColumns.map((col, idx) => ({ ...col, position: idx }));
    setColumns(updatedColumns);

    try {
      for (const update of updatedColumns) {
        const { error } = await supabase
          .from('kanban_columns')
          .update({ position: update.position, updated_at: new Date().toISOString() })
          .eq('id', update.id);
        if (error) throw error;
      }
    } catch (error) {
      handleDatabaseError('reorderColumns', error);
      fetchColumns();
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<KanbanColumn>) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.is_final && updates.is_final === false) {
      toast({
        title: 'Ação não permitida',
        description: 'A coluna "Entregue" não pode ser modificada.',
        variant: 'destructive',
      });
      return;
    }

    const fieldsToValidate: Record<string, unknown> = {};
    if (updates.name !== undefined) fieldsToValidate.name = updates.name;
    if (updates.color !== undefined) fieldsToValidate.color = updates.color;

    if (Object.keys(fieldsToValidate).length > 0) {
      const validation = validateWithSchema(kanbanColumnUpdateSchema, fieldsToValidate);
      if (!validation.success) {
        toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', columnId);
      if (error) throw error;

      setColumns(prev => prev.map(col => col.id === columnId ? { ...col, ...updates } : col));
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

    const validation = validateWithSchema(kanbanColumnSchema, { name, color });
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }

    try {
      const finalColumnIndex = columns.findIndex(c => c.is_final);
      const newPosition = finalColumnIndex >= 0 ? finalColumnIndex : columns.length;

      if (finalColumnIndex >= 0) {
        await supabase
          .from('kanban_columns')
          .update({ position: newPosition + 1 })
          .eq('id', columns[finalColumnIndex].id);
      }

      const { error } = await supabase
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
      const { error } = await supabase.from('kanban_columns').delete().eq('id', columnId);
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

  return { reorderColumns, updateColumn, addColumn, deleteColumn };
}
