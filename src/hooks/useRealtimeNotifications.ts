import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
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
        logger.warn('Could not play notification sound:', e);
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

  // Realtime subscriptions removed — push notifications are now driven by server-side workflow automations / push queue, not client subscriptions.

  return { showNotification };
}
