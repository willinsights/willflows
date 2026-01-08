import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;

export function useClients() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (client: Omit<ClientInsert, 'workspace_id'>) => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...client,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Cliente criado com sucesso' });
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao criar cliente',
        description: handleDatabaseError('createClient', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (error) throw error;

      toast({ title: 'Cliente removido com sucesso' });
      setClients(prev => prev.filter(c => c.id !== clientId));
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao remover cliente',
        description: handleDatabaseError('deleteClient', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    clients,
    loading,
    createClient,
    deleteClient,
    refresh: fetchClients,
  };
}
