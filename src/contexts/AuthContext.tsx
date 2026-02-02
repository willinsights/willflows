import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { isTrialExpired, hasPaidSubscription } from '@/lib/subscription-utils';
import { queryClient } from '@/lib/query-client';

// Simplified subscription state - detailed subscription info comes from useUserSubscription hook
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  /**
   * @deprecated Use the `useUserSubscription` hook instead for subscription data.
   * This state is maintained for backwards compatibility only.
   */
  subscription: {
    subscribed: boolean;
    plan: string | null;
    subscriptionEnd: string | null;
    trialExpired: boolean;
    trialEndsAt: string | null;
    loading: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Internal provider that uses the subscription hook
function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get subscription data from the dedicated hook - pass user/session directly to avoid circular dependency
  const { subscription: userSubscription, loading: subscriptionLoading } = useUserSubscription({ user, session });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Update last_login_at on successful login
    if (!error && data.user) {
      try {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch (e) {
        console.debug('Failed to update last_login_at:', e);
      }
    }
    
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Send welcome email if signup was successful
    if (!error && data.user) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name: fullName },
        });
      } catch (e) {
        console.error('Failed to send welcome email:', e);
        // Don't fail the signup if email fails
      }
    }
    
    return { error: error as Error | null, data: data ? { user: data.user } : undefined };
  }, []);

  const signOut = useCallback(async () => {
    // Clear React Query cache to prevent stale data
    queryClient.clear();
    
    // Clear all workspace-related localStorage items
    localStorage.removeItem('willflow_workspace_cache');
    localStorage.removeItem('willflow_last_workspace_id');
    
    // Sign out globally (invalidates all sessions across tabs)
    await supabase.auth.signOut({ scope: 'global' });
    
    // Force local state to null immediately
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error as Error | null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    return { error: error as Error | null };
  }, []);

  // Compute subscription state from userSubscription
  const subscription = useMemo(() => {
    if (!userSubscription) {
      return {
        subscribed: false,
        plan: null,
        subscriptionEnd: null,
        trialExpired: false,
        trialEndsAt: null,
        loading: subscriptionLoading,
      };
    }

    const trialExpiredStatus = isTrialExpired(userSubscription);
    const isPaid = hasPaidSubscription(userSubscription);

    return {
      subscribed: isPaid || (userSubscription.status === 'trialing' && !trialExpiredStatus),
      plan: userSubscription.plan,
      subscriptionEnd: userSubscription.currentPeriodEnd,
      trialExpired: trialExpiredStatus && !isPaid,
      trialEndsAt: userSubscription.trialEndsAt,
      loading: subscriptionLoading,
    };
  }, [userSubscription, subscriptionLoading]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      subscription,
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      updatePassword, 
      signInWithGoogle 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Wrapper provider that can be used at the app root
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
