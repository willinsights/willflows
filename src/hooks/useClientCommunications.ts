import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';

export interface ClientCommunication {
  id: string;
  client_id: string;
  workspace_id: string;
  type: string;
  subject: string;
  description: string | null;
  contact_date: string;
  created_at: string;
  created_by: string | null;
}

export interface ClientCommunicationInsert {
  client_id: string;
  type: string;
  subject: string;
  description?: string;
  contact_date?: string;
}

export function useClientCommunications(clientId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<ClientCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunications = useCallback(async () => {
    if (!currentWorkspace?.id || !clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_communications')
        .select('*')
        .eq('client_id', clientId)
        .eq('workspace_id', currentWorkspace.id)
        .order('contact_date', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, clientId]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const createCommunication = async (communication: ClientCommunicationInsert) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('client_communications')
        .insert({
          ...communication,
          workspace_id: currentWorkspace.id,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Comunicação registrada com sucesso' });
      setCommunications(prev => [data, ...prev]);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao registrar comunicação',
        description: handleDatabaseError('createCommunication', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteCommunication = async (communicationId: string) => {
    try {
      const { error } = await supabase
        .from('client_communications')
        .delete()
        .eq('id', communicationId);

      if (error) throw error;

      toast({ title: 'Comunicação removida com sucesso' });
      setCommunications(prev => prev.filter(c => c.id !== communicationId));
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao remover comunicação',
        description: handleDatabaseError('deleteCommunication', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    communications,
    loading,
    createCommunication,
    deleteCommunication,
    refresh: fetchCommunications,
  };
}
