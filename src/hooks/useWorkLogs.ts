import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useAuth } from '@/contexts/AuthContext';

export type WorkLogType = 'edicao_video' | 'edicao_foto' | 'fotografia' | 'captacao' | 'outro';
export type WorkLogStatus = 'pendente' | 'em_curso' | 'concluido';

export const WORK_LOG_TYPE_LABELS: Record<WorkLogType, string> = {
  edicao_video: 'Edição de vídeo',
  edicao_foto: 'Edição de foto',
  fotografia: 'Fotografia',
  captacao: 'Captação',
  outro: 'Outro',
};

export const WORK_LOG_STATUS_LABELS: Record<WorkLogStatus, string> = {
  pendente: 'Pendente',
  em_curso: 'Em curso',
  concluido: 'Concluído',
};

export interface WorkLog {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  work_type: WorkLogType;
  assignee_id: string | null;
  client_id: string | null;
  project_id: string | null;
  requested_at: string;
  completed_at: string | null;
  status: WorkLogStatus;
  is_urgent: boolean;
  amount: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkLogInput {
  title: string;
  description?: string | null;
  work_type: WorkLogType;
  assignee_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  requested_at: string;
  completed_at?: string | null;
  status: WorkLogStatus;
  is_urgent: boolean;
  amount?: number | null;
}

export function useWorkLogs() {
  const { workspaceId } = useCurrentWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['work-logs', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkLog[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['work-logs', workspaceId] });

  const createWorkLog = useMutation({
    mutationFn: async (input: WorkLogInput) => {
      if (!workspaceId) throw new Error('Sem workspace ativo');
      if (!user?.id) throw new Error('Sessão inválida');
      const { data, error } = await supabase
        .from('work_logs')
        .insert({ ...input, workspace_id: workspaceId, created_by: user.id } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as WorkLog;
    },
    onSuccess: invalidate,
  });

  const updateWorkLog = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<WorkLogInput> }) => {
      const { error } = await supabase
        .from('work_logs')
        .update(input as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteWorkLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('work_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    workLogs: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createWorkLog,
    updateWorkLog,
    deleteWorkLog,
  };
}

export interface CollaboratorWorkSummary {
  assigneeId: string | null;
  total: number;
  byType: Record<string, number>;
  totalAmount: number;
}

/** Aggregates work logs per collaborator (used by the activity report). */
export function summarizeByCollaborator(logs: WorkLog[]): CollaboratorWorkSummary[] {
  const map = new Map<string, CollaboratorWorkSummary>();
  logs.forEach((log) => {
    const key = log.assignee_id ?? '__none__';
    const entry = map.get(key) ?? {
      assigneeId: log.assignee_id,
      total: 0,
      byType: {},
      totalAmount: 0,
    };
    entry.total += 1;
    entry.byType[log.work_type] = (entry.byType[log.work_type] ?? 0) + 1;
    entry.totalAmount += Number(log.amount ?? 0);
    map.set(key, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
