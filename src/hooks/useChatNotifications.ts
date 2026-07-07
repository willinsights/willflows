import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export function useChatNotifications() {
  const { user } = useAuth();
  const { permission, preferences, sendLocalNotification } = usePushNotifications();
  const lastNotifiedRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use refs to always have fresh values in callbacks (avoid stale closures)
  const preferencesRef = useRef(preferences);
  const permissionRef = useRef(permission);
  
  // Keep refs updated
  useEffect(() => {
    preferencesRef.current = preferences;
    permissionRef.current = permission;
  }, [preferences, permission]);

  // Initialize audio lazily with cache-busting
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      // Add version param to bust browser cache
      audioRef.current = new Audio('/sounds/notification.mp3?v=2');
      audioRef.current.volume = 0.5;
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback(() => {
    // Always check the current ref value
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

  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe to new messages via Realtime
    const channel = supabase
      .channel(`chat-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Ignore own messages
          if (newMessage.user_id === user.id) return;
          
          // Ignore system messages
          if (newMessage.type === 'system') return;
          
          // Check if I'm a member of this conversation
          const { data: isMember } = await supabase
            .from('conversation_members')
            .select('id')
            .eq('conversation_id', newMessage.conversation_id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!isMember) return;
          
          // Avoid duplicate notifications
          if (lastNotifiedRef.current === newMessage.id) return;
          lastNotifiedRef.current = newMessage.id;
          
          // Fetch sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newMessage.user_id)
            .single();
          
          const senderName = sender?.full_name || sender?.email?.split('@')[0] || 'Alguém';
          
          // Play sound if enabled - use ref for fresh value
          if (preferencesRef.current?.sound_enabled !== false) {
            playSound();
          }
          
          // Show visual toast notification (always show for better UX)
          toast(`💬 ${senderName}`, {
            description: newMessage.body?.slice(0, 80) || 'Nova mensagem',
            action: {
              label: 'Ver',
              onClick: () => {
                window.location.href = `/app/chat?c=${newMessage.conversation_id}`;
              },
            },
            duration: 10000,
            closeButton: true,
          });
          
          // Send push notification if permission granted and enabled - use refs for fresh values
          const currentPrefs = preferencesRef.current;
          const currentPerm = permissionRef.current;
          if (currentPrefs?.push_enabled && currentPrefs?.messages_enabled !== false && currentPerm === 'granted') {
            sendLocalNotification(`Nova mensagem de ${senderName}`, {
              body: newMessage.body?.slice(0, 100) || 'Nova mensagem',
              tag: 'chat-message',
              data: { conversationId: newMessage.conversation_id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, playSound, sendLocalNotification]);

  return { playSound };
}
