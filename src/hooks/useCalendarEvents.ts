import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { calendarEventSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type CalendarEvent = Tables<'calendar_events'>;
export type CalendarEventInsert = TablesInsert<'calendar_events'>;

export interface CalendarEventWithProject extends CalendarEvent {
  projects: { name: string; client_id: string | null } | null;
}

export type CalendarSourceFilter = 'all' | 'willflow' | 'google';

export function useCalendarEvents() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEventWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<CalendarSourceFilter>('all');
  
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
      
      // Filter events based on privacy (defense in depth):
      // - Public events (is_private = false): visible to all
      // - Private events (is_private = true): only visible to creator
      const filteredData = (data || []).filter(event => {
        if (!event.is_private) return true;
        return event.created_by === user?.id;
      });
      
      setEvents(filteredData);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching calendar events:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, user?.id]);

  // Initial fetch when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchEvents();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channel = supabase
      .channel('calendar-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          logger.info('Calendar realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the full event with project relation
            supabase
              .from('calendar_events')
              .select('*, projects(name, client_id)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  // Check privacy before adding to state
                  const canView = !data.is_private || data.created_by === user?.id;
                  if (canView) {
                    setEvents(prev => [...prev, data].sort((a, b) => 
                      new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                    ));
                  }
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            supabase
              .from('calendar_events')
              .select('*, projects(name, client_id)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  // Check privacy before updating state
                  const canView = !data.is_private || data.created_by === user?.id;
                  if (canView) {
                    setEvents(prev => 
                      prev.map(e => e.id === data.id ? data : e)
                        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                    );
                  } else {
                    // Event became private, remove from view
                    setEvents(prev => prev.filter(e => e.id !== data.id));
                  }
                }
              });
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, user?.id]);

  // Filter events based on source
  const filteredEvents = events.filter(event => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'google') return !!event.google_event_id;
    if (sourceFilter === 'willflow') return !event.google_event_id;
    return true;
  });

  const createEvent = async (
    event: Omit<CalendarEventInsert, 'workspace_id'>,
    options?: { autoCreateMeet?: boolean }
  ) => {
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

    let meetUrl = event.video_call_url ?? null;
    let googleEventId: string | null = null;

    // Create Google Meet if requested
    if (options?.autoCreateMeet) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Ensure end_at > start_at for Google Meet creation
          const startAtDate = new Date(validation.data.start_at);
          const endAtForMeet = validation.data.end_at && new Date(validation.data.end_at) > startAtDate
            ? validation.data.end_at
            : new Date(startAtDate.getTime() + 3600000).toISOString();

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-google-meet`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                workspaceId: currentWorkspace.id,
                title: validation.data.title,
                startAt: validation.data.start_at,
                endAt: endAtForMeet,
                description: validation.data.description,
              }),
            }
          );

          const result = await response.json();
          
          if (result.success && result.meetUrl) {
            meetUrl = result.meetUrl;
            googleEventId = result.googleEventId;
            logger.info('Created Google Meet:', meetUrl);
          } else if (result.error) {
            logger.error('Failed to create Google Meet:', result.error);
            toast({
              title: 'Aviso',
              description: 'Não foi possível criar o Google Meet. O evento será criado sem link.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        logger.error('Error creating Google Meet:', error);
        // Continue with event creation even if Meet fails
      }
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
        video_call_url: meetUrl,
        project_id: validation.data.project_id ?? null,
        task_id: validation.data.task_id ?? null,
        google_event_id: googleEventId,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(insertData)
        .select('*, projects(name, client_id)')
        .single();

      if (error) throw error;

      const successMessage = meetUrl 
        ? 'Evento criado com Google Meet' 
        : 'Evento criado com sucesso';
      toast({ title: successMessage });
      // Don't update state here - realtime will handle it
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

      // Don't update state here - realtime will handle it
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

      // Don't update state here - realtime will handle it
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
    events: filteredEvents,
    allEvents: events,
    loading,
    sourceFilter,
    setSourceFilter,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents,
  };
}
