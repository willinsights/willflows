import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { calendarEventSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
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
      logger.error('Error fetching calendar events:', error);
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

    // Validate event data
    const validation = validateWithSchema(calendarEventSchema.partial().extend({
      title: calendarEventSchema.shape.title,
      start_at: calendarEventSchema.shape.start_at,
    }), event);
    
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    try {
      const insertData: CalendarEventInsert = {
        title: validation.data.title,
        start_at: validation.data.start_at,
        workspace_id: currentWorkspace.id,
        description: validation.data.description ?? null,
        end_at: validation.data.end_at ?? null,
        all_day: validation.data.all_day ?? false,
        location: validation.data.location ?? null,
        event_type: validation.data.event_type ?? 'meeting',
        video_call_url: validation.data.video_call_url ?? null,
        project_id: validation.data.project_id ?? null,
        task_id: validation.data.task_id ?? null,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(insertData)
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
    // Validate update data
    const validation = validateWithSchema(calendarEventSchema.partial(), updates);
    
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ ...validation.data, updated_at: new Date().toISOString() })
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
