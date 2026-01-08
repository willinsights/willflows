import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type CalendarEvent = Tables<'calendar_events'>;
export type CalendarEventInsert = TablesInsert<'calendar_events'>;

export interface CalendarEventWithProject extends CalendarEvent {
  projects: { name: string; client_id: string | null } | null;
}

export function useCalendarEvents() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEventWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, projects(name, client_id)')
        .eq('workspace_id', currentWorkspace.id)
        .order('start_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
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
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast({
        title: 'Erro ao atualizar evento',
        description: error.message,
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
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Erro ao remover evento',
        description: error.message,
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
