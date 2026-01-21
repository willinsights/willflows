import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PushPreferences {
  push_enabled: boolean;
  events_enabled: boolean;
  deadlines_enabled: boolean;
  advance_hours: number;
  messages_enabled: boolean;
  sound_enabled: boolean;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  preferences: PushPreferences | null;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<PushPreferences>) => Promise<void>;
  sendLocalNotification: (title: string, options?: NotificationOptions) => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Check current permission status
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, [isSupported]);

  // Fetch user preferences from database
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_push_preferences')
          .select('push_enabled, events_enabled, deadlines_enabled, advance_hours, messages_enabled, sound_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            push_enabled: data.push_enabled ?? false,
            events_enabled: data.events_enabled ?? true,
            deadlines_enabled: data.deadlines_enabled ?? true,
            advance_hours: data.advance_hours ?? 24,
            messages_enabled: data.messages_enabled ?? true,
            sound_enabled: data.sound_enabled ?? true,
          });
        } else {
          // Default preferences
          setPreferences({
            push_enabled: false,
            events_enabled: true,
            deadlines_enabled: true,
            advance_hours: 24,
            messages_enabled: true,
            sound_enabled: true,
          });
        }
      } catch (error) {
        console.error('Error fetching push preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('O seu browser não suporta notificações push');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações push ativadas!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão para notificações foi negada');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao pedir permissão para notificações');
      return false;
    }
  }, [isSupported]);

  // Update preferences in database
  const updatePreferences = useCallback(async (prefs: Partial<PushPreferences>) => {
    if (!user?.id) return;

    const newPrefs = { ...preferences, ...prefs };
    
    try {
        const { error } = await supabase
          .from('user_push_preferences')
          .upsert({
            user_id: user.id,
            push_enabled: newPrefs.push_enabled,
            events_enabled: newPrefs.events_enabled,
            deadlines_enabled: newPrefs.deadlines_enabled,
            advance_hours: newPrefs.advance_hours,
            messages_enabled: newPrefs.messages_enabled,
            sound_enabled: newPrefs.sound_enabled,
            updated_at: new Date().toISOString(),
          }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(newPrefs as PushPreferences);
      toast.success('Preferências atualizadas');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Erro ao guardar preferências');
    }
  }, [user?.id, preferences]);

  // Send a local notification
  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/pwa-icon.png',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    preferences,
    loading,
    requestPermission,
    updatePreferences,
    sendLocalNotification,
  };
}
