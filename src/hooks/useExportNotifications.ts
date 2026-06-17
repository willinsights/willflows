import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

import { logger } from '@/lib/logger';
/**
 * Hook to listen for export job completions and trigger native push notifications.
 * Integrates with the notifications table via realtime subscription.
 */
export function useExportNotifications() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3?v=2');
      audioRef.current.volume = 0.5;
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback(() => {
    try {
      const audio = getAudio();
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Audio play can fail if user hasn't interacted with page
      });
    } catch {
      // Ignore audio errors
    }
  }, [getAudio]);

  const showPushNotification = useCallback((
    title: string,
    message: string,
    onClick?: () => void
  ) => {
    // Play sound
    playSound();

    // Check if notifications are supported and permitted
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/pwa-icon.png',
        badge: '/favicon.ico',
        tag: 'export-notification',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        onClick?.();
      };

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);
    } catch (error) {
      logger.error('Error showing notification:', error);
    }
  }, [playSound]);

  // Realtime removed — export completion is signaled via toast in the mutation that triggers the export.

  return { showPushNotification };
}
