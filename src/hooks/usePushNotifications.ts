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
  const subscribeToPushRef = useRef<(() => Promise<boolean>) | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;

  // Use the main service worker for push - this allows background push to work
  const getOrRegisterPushSW = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) return null;

    try {
      // First check for existing sw-push.js registration
      const registrations = await navigator.serviceWorker.getRegistrations();
      let existing = registrations.find((r) => r.active?.scriptURL?.endsWith('/sw-push.js'));
      
      if (existing) {
        if (import.meta.env.DEV) console.log('[Push] Found existing sw-push.js registration:', existing.scope);
        return existing;
      }

      // Also check for sw.js (Vite PWA) - we can use it for push too
      const pwaRegistration = registrations.find((r) => 
        r.active?.scriptURL?.endsWith('/sw.js') || 
        r.active?.scriptURL?.includes('workbox')
      );
      
      if (pwaRegistration) {
        if (import.meta.env.DEV) console.log('[Push] Using PWA service worker for push:', pwaRegistration.scope);
        return pwaRegistration;
      }

      // Register sw-push.js with root scope for background push to work
      if (import.meta.env.DEV) console.log('[Push] Registering sw-push.js...');
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      if (import.meta.env.DEV) console.log('[Push] Service worker registered and ready:', registration.scope);
      
      return registration;
    } catch (error) {
      console.error('[Push] SW registration failed:', error);
      return null;
    }
  }, [isSupported]);

  // Register push service worker
  useEffect(() => {
    if (!isSupported) return;

    const registerPushSW = async () => {
      const registration = await getOrRegisterPushSW();
      if (!registration) return;

      swRegistrationRef.current = registration;
      if (import.meta.env.DEV) console.log('[Push] Service Worker registered:', registration.scope);

      // Check if already subscribed
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    };

    registerPushSW();
  }, [isSupported, getOrRegisterPushSW]);

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
        if (import.meta.env.DEV) console.log('[Push] Subscription changed, re-subscribing...');
        subscribeToPushRef.current?.();
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
      if (import.meta.env.DEV) console.log('[Push] Not supported or no user');
      return false;
    }

    try {
      const registration = (await getOrRegisterPushSW()) ?? swRegistrationRef.current;
      if (!registration) {
        console.error('[Push] No service worker registration available');
        toast.error('Não foi possível preparar o Service Worker');
        return false;
      }
      swRegistrationRef.current = registration;

      // Check existing subscription
      let subscription = await (registration as any).pushManager.getSubscription();
      if (import.meta.env.DEV) console.log('[Push] Existing subscription:', subscription ? 'found' : 'none');
      
      if (!subscription) {
        // Subscribe to push with VAPID key
        if (import.meta.env.DEV) console.log('[Push] Creating new subscription with VAPID key...');
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
        if (import.meta.env.DEV) console.log('[Push] New subscription created');
      }

      // Save subscription to database - ensure proper JSON format
      const subscriptionData = subscription.toJSON();
      
      // Validate subscription has required fields
      if (!subscriptionData.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
        console.error('[Push] Invalid subscription format:', subscriptionData);
        toast.error('Erro na subscrição push - formato inválido');
        return false;
      }
      
      
      // Prepare the subscription object to save
      const subscriptionToSave = {
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        },
      };
      
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
            push_subscription: subscriptionToSave,
            push_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) {
          console.error('[Push] Failed to update subscription:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('user_push_preferences')
          .insert([{
            user_id: user.id,
            push_subscription: subscriptionToSave,
            push_enabled: true,
          }]);
        if (error) {
          console.error('[Push] Failed to insert subscription:', error);
          throw error;
        }
      }

      // Verify the subscription was saved
      const { data: saved } = await supabase
        .from('user_push_preferences')
        .select('push_subscription')
        .eq('user_id', user.id)
        .single();

      if (!saved?.push_subscription) {
        console.error('[Push] Subscription NOT saved to database!');
        toast.error('Erro ao guardar subscrição');
        return false;
      }

      setIsSubscribed(true);
      if (import.meta.env.DEV) console.log('[Push] Subscription verified and saved');
      return true;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      toast.error('Erro ao ativar notificações push');
      return false;
    }
  }, [isSupported, user?.id, getOrRegisterPushSW]);

  // Keep latest subscribe fn available for SW message handler without re-binding listeners
  useEffect(() => {
    subscribeToPushRef.current = subscribeToPush;
  }, [subscribeToPush]);

  // Unsubscribe from push
  const unsubscribeFromPush = useCallback(async () => {
    if (!user?.id) return;

    try {
      const registration = (await getOrRegisterPushSW()) ?? swRegistrationRef.current;
      if (!registration) return;
      const subscription = await (registration as any).pushManager.getSubscription();
      
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
      if (import.meta.env.DEV) console.log('[Push] Unsubscribed successfully');
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
    }
  }, [user?.id, getOrRegisterPushSW]);

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
      if (import.meta.env.DEV) console.log('Notifications not available or not permitted');
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
