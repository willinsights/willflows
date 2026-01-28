import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID Public Key - must match the one in backend
const VAPID_PUBLIC_KEY = 'BA4VtBEgZsjDJwmspoLg-p64rPZ-Y40z646qqAC3ZhPRHWJxYooRMLGRK73hPvPGViZX9VbjgdAmmFLVDXAV_FU';

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
  isSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<PushPreferences>) => Promise<void>;
  sendLocalNotification: (title: string, options?: NotificationOptions) => void;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<void>;
}

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;

  // Register push service worker
  useEffect(() => {
    if (!isSupported) return;

    const registerPushSW = async () => {
      try {
        // Register the push-specific service worker
        const registration = await navigator.serviceWorker.register('/sw-push.js', {
          scope: '/'
        });
        swRegistrationRef.current = registration;
        console.log('[Push] Service Worker registered:', registration.scope);

        // Check if already subscribed
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('[Push] SW registration failed:', error);
      }
    };

    registerPushSW();
  }, [isSupported]);

  // Check current permission status
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, [isSupported]);

  // Listen for subscription change messages from SW
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        console.log('[Push] Subscription changed, re-subscribing...');
        subscribeToPush();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
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
          .select('push_enabled, events_enabled, deadlines_enabled, advance_hours, messages_enabled, sound_enabled, push_subscription')
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
          setIsSubscribed(!!data.push_subscription);
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

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      return false;
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      swRegistrationRef.current = registration;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push - use ArrayBuffer directly
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
        console.log('[Push] New subscription created');
      }

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
      
      // First try to update existing record
      const { data: existing } = await supabase
        .from('user_push_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_push_preferences')
          .update({
            push_subscription: JSON.parse(JSON.stringify(subscriptionJSON)),
            push_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_push_preferences')
          .insert([{
            user_id: user.id,
            push_subscription: JSON.parse(JSON.stringify(subscriptionJSON)),
            push_enabled: true,
          }]);
        if (error) throw error;
      }

      setIsSubscribed(true);
      console.log('[Push] Subscription saved to database');
      return true;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      toast.error('Erro ao ativar notificações push');
      return false;
    }
  }, [isSupported, user?.id]);

  // Unsubscribe from push
  const unsubscribeFromPush = useCallback(async () => {
    if (!user?.id) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from database
      await supabase
        .from('user_push_preferences')
        .update({
          push_subscription: null,
          push_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setIsSubscribed(false);
      console.log('[Push] Unsubscribed successfully');
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
    }
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
        // Auto-subscribe when permission granted
        const subscribed = await subscribeToPush();
        if (subscribed) {
          toast.success('Notificações push ativadas!');
        }
        return subscribed;
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
  }, [isSupported, subscribeToPush]);

  // Update preferences in database
  const updatePreferences = useCallback(async (prefs: Partial<PushPreferences>) => {
    if (!user?.id) return;

    const newPrefs = { ...preferences, ...prefs };
    
    // If enabling push, ensure subscription exists
    if (prefs.push_enabled === true && !isSubscribed) {
      const subscribed = await subscribeToPush();
      if (!subscribed) {
        toast.error('Não foi possível ativar notificações push');
        return;
      }
    }
    
    // If disabling push, remove subscription
    if (prefs.push_enabled === false && isSubscribed) {
      await unsubscribeFromPush();
    }
    
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('user_push_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_push_preferences')
          .update({
            push_enabled: newPrefs.push_enabled,
            events_enabled: newPrefs.events_enabled,
            deadlines_enabled: newPrefs.deadlines_enabled,
            advance_hours: newPrefs.advance_hours,
            messages_enabled: newPrefs.messages_enabled,
            sound_enabled: newPrefs.sound_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_push_preferences')
          .insert([{
            user_id: user.id,
            push_enabled: newPrefs.push_enabled,
            events_enabled: newPrefs.events_enabled,
            deadlines_enabled: newPrefs.deadlines_enabled,
            advance_hours: newPrefs.advance_hours,
            messages_enabled: newPrefs.messages_enabled,
            sound_enabled: newPrefs.sound_enabled,
          }]);
        if (error) throw error;
      }

      setPreferences(newPrefs as PushPreferences);
      toast.success('Preferências atualizadas');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Erro ao guardar preferências');
    }
  }, [user?.id, preferences, isSubscribed, subscribeToPush, unsubscribeFromPush]);

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
    isSubscribed,
    requestPermission,
    updatePreferences,
    sendLocalNotification,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
