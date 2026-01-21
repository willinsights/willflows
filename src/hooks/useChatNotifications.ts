import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';

export function useChatNotifications() {
  const { user } = useAuth();
  const { permission, preferences, sendLocalNotification } = usePushNotifications();
  const lastNotifiedRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio lazily
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback(() => {
    if (preferences?.sound_enabled !== false) {
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
  }, [preferences?.sound_enabled, getAudio]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Check what features are enabled
    const shouldPlaySound = preferences?.sound_enabled !== false;
    const shouldNotify = preferences?.push_enabled && preferences?.messages_enabled !== false && permission === 'granted';
    
    // Don't subscribe if nothing is enabled
    if (!shouldPlaySound && !shouldNotify) return;

    // Subscribe to new messages via Realtime
    const channel = supabase
      .channel('chat-notifications')
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
          
          // Play sound if enabled (independent of push notification permission)
          if (shouldPlaySound) {
            playSound();
          }
          
          // Send push notification if permission granted and enabled
          if (shouldNotify) {
            // Fetch sender name
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newMessage.user_id)
              .single();
            
            const senderName = sender?.full_name || sender?.email?.split('@')[0] || 'Alguém';
            
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
  }, [user?.id, permission, preferences, sendLocalNotification, playSound]);

  return { playSound };
}
