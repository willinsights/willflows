import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export interface ClientNote {
  id: string;
  client_id: string;
  workspace_id: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

export interface ClientNoteInsert {
  client_id: string;
  content: string;
}

export function useClientNotes(clientId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!currentWorkspace?.id || !clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      logger.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, clientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (note: ClientNoteInsert) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('client_notes')
        .insert({
          ...note,
          workspace_id: currentWorkspace.id,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Nota adicionada com sucesso' });
      setNotes(prev => [data, ...prev]);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao adicionar nota',
        description: handleDatabaseError('createNote', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({ title: 'Nota removida com sucesso' });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao remover nota',
        description: handleDatabaseError('deleteNote', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    notes,
    loading,
    createNote,
    deleteNote,
    refresh: fetchNotes,
  };
}
