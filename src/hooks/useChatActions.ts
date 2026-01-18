import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';
import type { Message } from './useMessages';

export function useChatActions() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useAppToast();
  const queryClient = useQueryClient();

  const createTaskFromMessage = useMutation({
    mutationFn: async ({
      message, title, phase, projectId, assigneeId, dueDate,
    }: {
      message: Message; title: string; phase: 'captacao' | 'edicao'; projectId: string; assigneeId?: string; dueDate?: string;
    }) => {
      if (!workspace?.id || !user?.id) throw new Error('Workspace não encontrado');

      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('phase', phase)
        .order('position', { ascending: true })
        .limit(1);

      const columnId = columns?.[0]?.id;

      const taskData = {
        workspace_id: workspace.id,
        project_id: projectId,
        title,
        phase,
        column_id: columnId,
        created_by: user.id,
        created_from_message_id: message.id,
        conversation_id: message.conversation_id,
        due_date: dueDate || null,
        priority: 'media' as const,
        position: 0,
      };

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (taskError) throw taskError;

      await supabase.from('message_task_links').insert({ message_id: message.id, task_id: task.id, created_by: user.id });

      if (assigneeId) {
        await supabase.from('task_assignees').insert({ task_id: task.id, user_id: assigneeId });
      }

      await supabase.from('messages').insert({
        conversation_id: message.conversation_id,
        user_id: user.id,
        body: `🔗 Tarefa criada: "${title}"`,
        type: 'system' as const,
        metadata: { task_id: task.id, action: 'task_created' },
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada a partir da mensagem');
    },
    onError: (error: Error) => toast.error('Erro ao criar tarefa', { description: error.message }),
  });

  const createQuickTask = useMutation({
    mutationFn: async ({
      title, description, phase, projectId, conversationId, assigneeId, dueDate,
    }: {
      title: string; description?: string; phase: 'captacao' | 'edicao'; projectId: string; conversationId: string; assigneeId?: string; dueDate?: string;
    }) => {
      if (!workspace?.id || !user?.id) throw new Error('Workspace não encontrado');

      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('phase', phase)
        .order('position', { ascending: true })
        .limit(1);

      const columnId = columns?.[0]?.id;

      const taskData = {
        workspace_id: workspace.id,
        project_id: projectId,
        title,
        description: description || null,
        phase,
        column_id: columnId,
        created_by: user.id,
        conversation_id: conversationId,
        due_date: dueDate || null,
        priority: 'media' as const,
        position: 0,
      };

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (taskError) throw taskError;

      if (assigneeId) {
        await supabase.from('task_assignees').insert({ task_id: task.id, user_id: assigneeId });
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        body: `🔗 Tarefa criada: "${title}"`,
        type: 'system' as const,
        metadata: { task_id: task.id, action: 'task_created' },
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada');
    },
    onError: (error: Error) => toast.error('Erro ao criar tarefa', { description: error.message }),
  });

  const searchMessages = async (query: string, conversationId?: string) => {
    if (!workspace?.id) return [];

    let queryBuilder = supabase
      .from('messages')
      .select('*, conversation:conversations(id, name, type)')
      .textSearch('body_tsv', query)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (conversationId) queryBuilder = queryBuilder.eq('conversation_id', conversationId);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  };

  return { createTaskFromMessage, createQuickTask, searchMessages };
}
