import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionPlan = 'essencial' | 'pro' | 'studio' | null;

interface SubscriptionState {
  subscribed: boolean;
  plan: SubscriptionPlan;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionState;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache duration: 5 minutes
const SUBSCRIPTION_CACHE_DURATION = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    subscriptionEnd: null,
    loading: false,
  });
  
  // Refs to prevent duplicate calls and cache
  const isCheckingSubscription = useRef(false);
  const lastSubscriptionCheck = useRef<number>(0);
  const hasCheckedInitially = useRef(false);

  const checkSubscription = useCallback(async (force = false) => {
    // Prevent duplicate simultaneous calls
    if (isCheckingSubscription.current) {
      return;
    }
    
    // Use cached result if not forcing and within cache duration
    const now = Date.now();
    if (!force && lastSubscriptionCheck.current && (now - lastSubscriptionCheck.current) < SUBSCRIPTION_CACHE_DURATION) {
      return;
    }

    if (!session) {
      setSubscription({
        subscribed: false,
        plan: null,
        subscriptionEnd: null,
        loading: false,
      });
      return;
    }

    isCheckingSubscription.current = true;
    setSubscription(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      lastSubscriptionCheck.current = Date.now();
      setSubscription({
        subscribed: data?.subscribed ?? false,
        plan: data?.plan ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(prev => ({ ...prev, loading: false }));
    } finally {
      isCheckingSubscription.current = false;
    }
  }, [session]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Only check subscription on sign in, not on every state change
        if (event === 'SIGNED_IN' && newSession && !hasCheckedInitially.current) {
          hasCheckedInitially.current = true;
          // Delay to avoid race conditions
          setTimeout(() => {
            checkSubscription(true);
          }, 500);
        } else if (event === 'SIGNED_OUT') {
          hasCheckedInitially.current = false;
          lastSubscriptionCheck.current = 0;
          setSubscription({
            subscribed: false,
            plan: null,
            subscriptionEnd: null,
            loading: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      
      // Only check once on initial load
      if (existingSession && !hasCheckedInitially.current) {
        hasCheckedInitially.current = true;
        setTimeout(() => {
          checkSubscription(true);
        }, 500);
      }
    });

    return () => authSubscription.unsubscribe();
  }, [checkSubscription]);

  // Periodic subscription check every 5 minutes (instead of every minute)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, SUBSCRIPTION_CACHE_DURATION);

    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, signIn, signUp, signOut, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
