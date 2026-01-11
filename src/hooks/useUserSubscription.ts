import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionPlan = 'essencial' | 'pro' | 'studio';

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface SubscriptionLimits {
  workspaces: number;
  users: number;
  projects: number;
}

export interface SubscriptionUsage {
  workspaces: number;
  users: number;
  projects: number;
}

export interface UserSubscriptionState {
  subscription: UserSubscription | null;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
  loading: boolean;
  error: string | null;
}

// Default limits by plan
const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  essencial: { workspaces: 1, users: 2, projects: 15 },
  pro: { workspaces: 3, users: 10, projects: 999 },
  studio: { workspaces: 10, users: 999, projects: 999 },
};

export function useUserSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<UserSubscriptionState>({
    subscription: null,
    limits: PLAN_LIMITS.essencial,
    usage: { workspaces: 0, users: 0, projects: 0 },
    loading: true,
    error: null,
  });
  
  // Prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const FETCH_COOLDOWN_MS = 5000;

  const fetchSubscription = useCallback(async () => {
    if (!user?.id || !session) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }
    
    // Enforce cooldown to prevent excessive calls
    const now = Date.now();
    if (now - lastFetchRef.current < FETCH_COOLDOWN_MS) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch user subscription from the new table
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      // If no subscription record exists, user is on trial/essencial
      const subscription: UserSubscription = subData ? {
        plan: subData.subscription_plan as SubscriptionPlan,
        status: subData.subscription_status,
        trialEndsAt: subData.trial_ends_at,
        currentPeriodEnd: subData.current_period_end,
        stripeCustomerId: subData.stripe_customer_id,
        stripeSubscriptionId: subData.stripe_subscription_id,
      } : {
        plan: 'essencial',
        status: 'trialing',
        trialEndsAt: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };

      const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.essencial;

      // Fetch usage counts using RPC functions - with individual error handling
      let workspacesCount = 0;
      let usersCount = 0;
      let projectsCount = 0;

      try {
        const [workspacesResult, usersResult, projectsResult] = await Promise.all([
          supabase.rpc('count_admin_workspaces', { p_user_id: user.id }),
          supabase.rpc('count_total_invited_users', { p_user_id: user.id }),
          supabase.rpc('count_total_projects', { p_user_id: user.id }),
        ]);
        
        workspacesCount = workspacesResult.data ?? 0;
        usersCount = usersResult.data ?? 0;
        projectsCount = projectsResult.data ?? 0;
      } catch (rpcError) {
        console.warn('Error fetching usage counts:', rpcError);
        // Continue with zeros if RPC fails
      }

      const usage: SubscriptionUsage = {
        workspaces: workspacesCount,
        users: usersCount,
        projects: projectsCount,
      };

      setState({
        subscription,
        limits,
        usage,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching user subscription:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao carregar subscrição',
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id, session]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const refresh = useCallback(() => {
    return fetchSubscription();
  }, [fetchSubscription]);

  return {
    ...state,
    refresh,
  };
}
