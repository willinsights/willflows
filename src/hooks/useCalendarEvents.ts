import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type CalendarEvent = Tables<'calendar_events'>;
export type CalendarEventInsert = TablesInsert<'calendar_events'>;

export interface CalendarEventWithProject extends CalendarEvent {
  projects: { name: string; client_id: string | null } | null;
}

export function useCalendarEvents() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEventWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, projects(name, client_id)')
        .eq('workspace_id', currentWorkspace.id)
        .order('start_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    // Only fetch if workspace ID changed
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchEvents();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  const createEvent = async (event: Omit<CalendarEventInsert, 'workspace_id'>) => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...event,
          workspace_id: currentWorkspace.id,
        })
        .select('*, projects(name, client_id)')
        .single();

      if (error) throw error;

      toast({ title: 'Evento criado com sucesso' });
      setEvents(prev => [...prev, data]);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao criar evento',
        description: handleDatabaseError('createEvent', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev =>
        prev.map(e => (e.id === eventId ? { ...e, ...updates } : e))
      );

      toast({ title: 'Evento atualizado' });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar evento',
        description: handleDatabaseError('updateEvent', error),
        variant: 'destructive',
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: 'Evento removido' });
    } catch (error) {
      toast({
        title: 'Erro ao remover evento',
        description: handleDatabaseError('deleteEvent', error),
        variant: 'destructive',
      });
    }
  };

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents,
  };
}
