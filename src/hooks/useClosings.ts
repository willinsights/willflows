import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Closing {
  id: string;
  workspace_id: string;
  created_by: string;
  client_id: string | null;
  label: string;
  status: 'open' | 'received';
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClosingItem {
  id: string;
  closing_id: string;
  kind: 'revenue' | 'team' | 'extra';
  project_id: string;
  team_payment_id: string | null;
  amount_snapshot: number;
  created_at: string;
}

export interface CreateClosingInput {
  label: string;
  clientId: string | null;
  notes?: string;
  items: Array<Omit<ClosingItem, 'id' | 'closing_id' | 'created_at'>>;
}

export function useClosings() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const listKey = ['closings', workspaceId] as const;
  const itemsKey = ['closing-items', workspaceId] as const;

  const closingsQuery = useQuery({
    queryKey: listKey,
    enabled: !!workspaceId,
    queryFn: async (): Promise<Closing[]> => {
      const { data, error } = await supabase
        .from('closings' as never)
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Closing[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: itemsKey,
    enabled: !!workspaceId && (closingsQuery.data?.length ?? 0) > 0,
    queryFn: async (): Promise<ClosingItem[]> => {
      const ids = (closingsQuery.data || []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('closing_items' as never)
        .select('*')
        .in('closing_id', ids);
      if (error) throw error;
      return (data || []) as unknown as ClosingItem[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['closings'] });
    qc.invalidateQueries({ queryKey: ['closing-items'] });
  };

  const createClosing = useMutation({
    mutationFn: async (input: CreateClosingInput) => {
      if (!workspaceId || !user) throw new Error('No workspace');
      const { data: closing, error } = await supabase
        .from('closings' as never)
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          client_id: input.clientId,
          label: input.label,
          notes: input.notes ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      const c = closing as unknown as Closing;
      if (input.items.length > 0) {
        const rows = input.items.map((it) => ({ ...it, closing_id: c.id }));
        const { error: e2 } = await supabase.from('closing_items' as never).insert(rows as never);
        if (e2) throw e2;
      }
      return c;
    },
    onSuccess: invalidate,
  });

  const markReceived = useMutation({
    mutationFn: async ({ closingId, projectIds }: { closingId: string; projectIds: string[] }) => {
      const { error } = await supabase
        .from('closings' as never)
        .update({ status: 'received', received_at: new Date().toISOString() } as never)
        .eq('id', closingId);
      if (error) throw error;
      // Propagate client_payment_status='pago' on the invoiced projects
      if (projectIds.length > 0) {
        const { error: e2 } = await supabase
          .from('projects')
          .update({ client_payment_status: 'pago', client_paid_at: new Date().toISOString() })
          .in('id', projectIds);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteClosing = useMutation({
    mutationFn: async (closingId: string) => {
      const { error } = await supabase.from('closings' as never).delete().eq('id', closingId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    closings: closingsQuery.data ?? [],
    items: itemsQuery.data ?? [],
    loading: closingsQuery.isLoading,
    createClosing,
    markReceived,
    deleteClosing,
  };
}
