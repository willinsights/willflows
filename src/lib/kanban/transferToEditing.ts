import { supabase } from '@/integrations/supabase/client';

export type TransferToEditingResult =
  | { ok: true; editingColumnId: string }
  | { ok: false; reason: 'columns_error' | 'no_column' | 'write_error' | 'not_confirmed'; error?: unknown };

/** Projeto completo em Captação conclui a fase transferindo para Edição (sem entrega final). */
export function shouldTransferToEditing(itemType: string | null | undefined, phase: string | null | undefined) {
  return (itemType || 'projeto_completo') === 'projeto_completo' && phase === 'captacao';
}

/** Mesma lógica do Kanban: primeira coluna não final de Edição; sucesso só com a linha confirmada. */
export async function transferToEditing(params: {
  projectId: string;
  workspaceId: string;
  captureColumnId: string;
  beforeWrite?: () => void;
}): Promise<TransferToEditingResult> {
  const { projectId, workspaceId, captureColumnId, beforeWrite } = params;
  const { data: cols, error: columnsError } = await supabase
    .from('kanban_columns').select('id')
    .eq('workspace_id', workspaceId)
    .eq('phase', 'edicao')
    .eq('is_final', false)
    .order('position', { ascending: true })
    .limit(1);
  if (columnsError) return { ok: false, reason: 'columns_error', error: columnsError };
  const destination = cols?.[0];
  if (!destination) return { ok: false, reason: 'no_column' };

  beforeWrite?.();
  const { data: moved, error } = await supabase
    .from('projects')
    .update({
      current_phase: 'edicao',
      edicao_column_id: destination.id,
      captacao_column_id: captureColumnId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .select('id, current_phase, edicao_column_id, captacao_column_id')
    .maybeSingle();
  if (error) return { ok: false, reason: 'write_error', error };
  if (!moved || moved.id !== projectId || moved.current_phase !== 'edicao'
    || moved.edicao_column_id !== destination.id || moved.captacao_column_id !== captureColumnId) {
    return { ok: false, reason: 'not_confirmed' };
  }
  return { ok: true, editingColumnId: destination.id };
}
