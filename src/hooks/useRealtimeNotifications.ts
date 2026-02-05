import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

interface ProjectPayload {
  id: string;
  name: string;
  current_phase: string;
  is_delivered: boolean;
  workspace_id: string;
  created_by: string | null;
}

interface TaskPayload {
  id: string;
  title: string;
  project_id: string | null;
  workspace_id: string;
  created_by: string | null;
  is_completed: boolean;
}

interface TaskAssigneePayload {
  id: string;
  task_id: string;
  user_id: string;
}

interface CalendarEventPayload {
  id: string;
  title: string;
  workspace_id: string;
  created_by: string | null;
  start_at: string;
  event_type: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { permission, preferences, sendLocalNotification } = usePushNotifications();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use refs to always have fresh values in callbacks
  const preferencesRef = useRef(preferences);
  const permissionRef = useRef(permission);
  
  // Keep refs updated
  useEffect(() => {
    preferencesRef.current = preferences;
    permissionRef.current = permission;
  }, [preferences, permission]);

  // Initialize audio lazily
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3?v=2');
      audioRef.current.volume = 0.5;
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback(() => {
    if (preferencesRef.current?.sound_enabled !== false) {
      try {
        const audio = getAudio();
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      } catch (e) {
        console.warn('Could not play notification sound:', e);
      }
    }
  }, [getAudio]);

  const showNotification = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' = 'info',
    entityType?: string,
    entityId?: string
  ) => {
    // Play sound
    playSound();
    
    // Show toast
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,
      duration: 8000,
    });
    
    // Send push notification if enabled
    const currentPrefs = preferencesRef.current;
    const currentPerm = permissionRef.current;
    if (currentPrefs?.push_enabled && currentPerm === 'granted') {
      sendLocalNotification(title, {
        body: message,
        tag: `${entityType}-${entityId}`,
        data: { entityType, entityId },
      });
    }
  }, [playSound, sendLocalNotification]);

  useEffect(() => {
    if (!user?.id || !currentWorkspace?.id) return;
    
    const workspaceId = currentWorkspace.id;
    
    // Subscribe to project changes
    const projectChannel = supabase
      .channel('realtime-projects')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newProject = payload.new as ProjectPayload;
          const oldProject = payload.old as Partial<ProjectPayload>;
          
          // Skip if user made this change
          if (newProject.created_by === user.id) return;
          
          // Project delivered
          if (newProject.is_delivered && !oldProject.is_delivered) {
            showNotification(
              '✅ Projeto Entregue',
              `O projeto \"${newProject.name}\" foi marcado como entregue.`,
              'success',
              'project',
              newProject.id
            );
          }
          // Phase changed
          else if (oldProject.current_phase && newProject.current_phase !== oldProject.current_phase) {
            const phaseLabels: Record<string, string> = {
              captacao: 'Captação',
              edicao: 'Edição',
            };
            showNotification(
              '📋 Fase do Projeto Alterada',
              `O projeto \"${newProject.name}\" passou para ${phaseLabels[newProject.current_phase] || newProject.current_phase}.`,
              'info',
              'project',
              newProject.id
            );
          }
        }
      )
      .subscribe();

    // Subscribe to new task assignments
    const taskAssigneeChannel = supabase
      .channel('realtime-task-assignees')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_assignees',
        },
        async (payload) => {
          const assignee = payload.new as TaskAssigneePayload;
          
          // Only notify if I was assigned
          if (assignee.user_id !== user.id) return;
          
          // Fetch task details
          const { data: task } = await supabase
            .from('tasks')
            .select('id, title, project_id, projects(name)')
            .eq('id', assignee.task_id)
            .single();
          
          if (task) {
            const projectName = (task.projects as any)?.name;
            showNotification(
              '📌 Nova Tarefa Atribuída',
              `A tarefa \"${task.title}\"${projectName ? ` no projeto \"${projectName}\"` : ''} foi-te atribuída.`,
              'info',
              'task',
              task.id
            );
          }
        }
      )
      .subscribe();

    // Subscribe to new calendar events
    const calendarChannel = supabase
      .channel('realtime-calendar')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_events',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const event = payload.new as CalendarEventPayload;
          
          // Skip if user created this event
          if (event.created_by === user.id) return;
          
          // Check if events notifications are enabled
          if (preferencesRef.current?.events_enabled === false) return;
          
          const eventTypeLabels: Record<string, string> = {
            shoot: '📷 Nova Captação',
            meeting: '📅 Nova Reunião',
            deadline: '⏰ Novo Prazo',
            delivery: '📦 Nova Entrega',
            event: '📆 Novo Evento',
          };
          
          const title = eventTypeLabels[event.event_type] || '📆 Novo Evento';
          
          showNotification(
            title,
            `\"${event.title}\" foi adicionado ao calendário.`,
            'info',
            'calendar_event',
            event.id
          );
        }
      )
      .subscribe();

    // Subscribe to task completion (for task creators)
    const taskCompletionChannel = supabase
      .channel('realtime-task-completion')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          const newTask = payload.new as TaskPayload;
          const oldTask = payload.old as Partial<TaskPayload>;
          
          // Only notify when task is completed
          if (!newTask.is_completed || oldTask.is_completed) return;
          
          // Only notify the task creator (and not if they completed it themselves)
          if (newTask.created_by !== user.id) return;
          
          // Fetch who completed it
          const { data: assignees } = await supabase
            .from('task_assignees')
            .select('user_id, profiles:user_id(full_name, email)')
            .eq('task_id', newTask.id);
          
          const completerName = assignees?.[0]?.profiles 
            ? ((assignees[0].profiles as any).full_name || (assignees[0].profiles as any).email?.split('@')[0])
            : 'Alguém';
          
          showNotification(
            '✓ Tarefa Concluída',
            `${completerName} concluiu a tarefa \"${newTask.title}\".`,
            'success',
            'task',
            newTask.id
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(taskAssigneeChannel);
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(taskCompletionChannel);
    };
  }, [user?.id, currentWorkspace?.id, showNotification]);

  return { showNotification };
}
