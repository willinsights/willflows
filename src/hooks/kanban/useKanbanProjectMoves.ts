import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import {
  initialPendingAlert,
  initialPendingDelivery,
  type KanbanColumnWithProjects,
  type KanbanPhase,
  type PendingAlertState,
  type PendingDeliveryState,
  type ProjectWithClient,
} from './types';

interface Params {
  phase: KanbanPhase;
  columns: KanbanColumnWithProjects[];
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumnWithProjects[]>>;
  fetchColumns: () => Promise<void>;
  markLocalUpdate: (recordId: string) => void;
}

async function fetchPendingChecklistItems(projectId: string, projectPhase: KanbanPhase) {
  try {
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks').select('id').eq('project_id', projectId).eq('phase', projectPhase);
    if (tasksError || !tasks?.length) return [];

    const taskIds = tasks.map(t => t.id);
    const { data: checklists, error: checklistsError } = await supabase
      .from('task_checklists').select('id, title')
      .in('task_id', taskIds).eq('is_completed', false)
      .order('position', { ascending: true });

    if (checklistsError) return [];
    return checklists?.map(c => ({ id: c.id, title: c.title })) || [];
  } catch {
    return [];
  }
}

/** Move/delivery flow for project cards across columns. */
export function useKanbanProjectMoves({ phase, columns, setColumns, fetchColumns, markLocalUpdate }: Params) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;

  const [pendingAlert, setPendingAlert] = useState<PendingAlertState>(initialPendingAlert);
  const [pendingDelivery, setPendingDelivery] = useState<PendingDeliveryState>(initialPendingDelivery);

  const clearPendingAlert = useCallback(() => setPendingAlert(initialPendingAlert), []);
  const clearPendingDelivery = useCallback(() => setPendingDelivery(initialPendingDelivery), []);

  const moveProject = async (projectId: string, targetColumnId: string) => {
    if (!currentWorkspace) return;

    const columnField = phase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';
    const targetColumn = columns.find(c => c.id === targetColumnId);
    const sourceColumn = columns.find(c => c.projects.some(p => p.id === projectId));
    const project = columns.flatMap(c => c.projects).find(p => p.id === projectId);

    logger.debug('[moveProject]', {
      projectId, targetColumnId, phase,
      item_type: (project as any)?.item_type,
      source_is_final: sourceColumn?.is_final,
      target_is_final: targetColumn?.is_final,
      is_delivered: project?.is_delivered,
    });

    // Reopen delivered project when dragged out of final column
    if (project?.is_delivered && sourceColumn?.is_final && targetColumn && !targetColumn.is_final) {
      const { data: reopenResult, error: reopenError } = await supabase.rpc('reopen_project', {
        p_project_id: projectId,
      });

      if (reopenError) {
        toast({
          title: 'Erro ao reabrir projeto',
          description: handleDatabaseError('reopenProject', reopenError),
          variant: 'destructive',
        });
        return;
      }

      const result = reopenResult as { success: boolean; reason?: string } | null;
      if (!result?.success) {
        toast({
          title: 'Não foi possível reabrir',
          description: result?.reason || 'Erro desconhecido',
          variant: 'destructive',
        });
        return;
      }

      markLocalUpdate(projectId);

      const { error: moveError } = await supabase
        .from('projects')
        .update({ [columnField]: targetColumnId, updated_at: new Date().toISOString() })
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

    // Final column transitions (validation + delivery dialog)
    if (targetColumn?.is_final && project) {
      const itemType = (project as any).item_type || 'projeto_completo';

      if (phase === 'captacao' && itemType === 'projeto_completo') {
        const { data: validationResult, error: validationError } = await supabase.rpc('can_deliver_project', {
          p_project_id: projectId,
          p_phase: 'captacao',
        });

        if (validationError) {
          toast({
            title: 'Erro ao validar',
            description: handleDatabaseError('validateTransfer', validationError),
            variant: 'destructive',
          });
          return;
        }

        const validation = validationResult as { can_deliver: boolean; reason: string | null; pending_tasks: number; pending_checklists: number } | null;

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

        const { data: edicaoColumns } = await supabase
          .from('kanban_columns').select('id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('phase', 'edicao')
          .order('position', { ascending: true })
          .limit(1);

        if (edicaoColumns && edicaoColumns.length > 0) {
          markLocalUpdate(projectId);
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

      const { data: validationResult, error: validationError } = await supabase.rpc('can_deliver_project', {
        p_project_id: projectId, p_phase: phase,
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

      setPendingDelivery({ open: true, projectId, projectName: project.name, targetColumnId });
      return;
    }

    // Optimistic move (non-final)
    setColumns(prev => {
      const newColumns = prev.map(col => ({
        ...col,
        projects: col.projects.filter(p => p.id !== projectId),
      }));
      const p = prev.flatMap(c => c.projects).find(p => p.id === projectId);
      if (p) {
        const targetCol = newColumns.find(c => c.id === targetColumnId);
        if (targetCol) {
          targetCol.projects.push({ ...p, [columnField]: targetColumnId } as ProjectWithClient);
        }
      }
      return newColumns;
    });

    try {
      markLocalUpdate(projectId);
      const { error } = await supabase
        .from('projects')
        .update({ [columnField]: targetColumnId, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;

      if (currentWorkspace?.id && userId) {
        supabase.from('kanban_column_transitions').insert({
          project_id: projectId,
          workspace_id: currentWorkspace.id,
          from_column_id: sourceColumn?.id || null,
          to_column_id: targetColumnId,
          moved_by: userId,
          moved_at: new Date().toISOString(),
          movement_type: 'manual',
        }).then(() => logger.debug('[moveProject] Column transition recorded'));

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
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao mover projeto',
        description: handleDatabaseError('moveProject', error),
        variant: 'destructive',
      });
      fetchColumns();
    }
  };

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
    moveProject,
    confirmDelivery,
    pendingAlert,
    clearPendingAlert,
    pendingDelivery,
    clearPendingDelivery,
  };
}
