import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { clientSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;

export function useClients() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching clients:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    // Only fetch if workspace ID changed
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchClients();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  const createClient = async (client: Omit<ClientInsert, 'workspace_id'>) => {
    if (!currentWorkspace) return null;

    // Validate input before database operation
    const validation = validateWithSchema(clientSchema, client);
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    const validatedData = validation.data;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...validatedData,
          workspace_id: currentWorkspace.id,
        } as any)
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
