import { useKanbanData } from './kanban/useKanbanData';
import { useKanbanColumns } from './kanban/useKanbanColumns';
import { useKanbanProjectMoves } from './kanban/useKanbanProjectMoves';

export type {
  KanbanPhase,
  KanbanColumn,
  Project,
  Task,
  TeamMember,
  ProjectWithClient,
  KanbanColumnWithProjects,
  PendingAlertState,
  PendingDeliveryState,
} from './kanban/types';

/**
 * Public Kanban hook — composes 3 focused hooks:
 *  - useKanbanData: fetch + state + realtime + echo suppression
 *  - useKanbanColumns: column CRUD + reorder
 *  - useKanbanProjectMoves: drag/drop + delivery flow
 */
export function useKanban(phase: import('./kanban/types').KanbanPhase) {
  const {
    columns,
    setColumns,
    loading,
    fetchColumns,
    silentRefresh,
    markLocalUpdate,
  } = useKanbanData(phase);

  const { reorderColumns, updateColumn, addColumn, deleteColumn } = useKanbanColumns({
    phase,
    columns,
    setColumns,
    fetchColumns,
  });

  const {
    moveProject,
    confirmDelivery,
    pendingAlert,
    clearPendingAlert,
    pendingDelivery,
    clearPendingDelivery,
  } = useKanbanProjectMoves({
    phase,
    columns,
    setColumns,
    fetchColumns,
    markLocalUpdate,
  });

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
