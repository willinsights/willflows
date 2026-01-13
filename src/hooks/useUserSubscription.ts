import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { getPlanLimits } from '@/lib/plans';
import { logger } from '@/lib/logger';

// Database subscription plan type
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

// Props for when user/session are passed directly (used by AuthContext)
interface UseUserSubscriptionProps {
  user?: User | null;
  session?: Session | null;
}

// Use centralized plan limits
const DEFAULT_LIMITS = getPlanLimits('starter');

export function useUserSubscription(props?: UseUserSubscriptionProps) {
  // Get user/session from props (for AuthContext) or we'll fetch directly
  const [authState, setAuthState] = useState<{ user: User | null; session: Session | null }>({
    user: props?.user ?? null,
    session: props?.session ?? null,
  });
  
  const [state, setState] = useState<UserSubscriptionState>({
    subscription: null,
    limits: DEFAULT_LIMITS,
    usage: { workspaces: 0, users: 0, projects: 0 },
    loading: true,
    error: null,
  });
  
  // Prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const FETCH_COOLDOWN_MS = 5000;

  // If props are provided, use them directly, otherwise fetch auth state
  useEffect(() => {
    if (props?.user !== undefined) {
      setAuthState({ user: props.user, session: props.session ?? null });
      return;
    }

    // No props provided, fetch auth state directly from supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ user: session?.user ?? null, session });
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({ user: session?.user ?? null, session });
      }
    );

    return () => authSubscription.unsubscribe();
  }, [props?.user, props?.session]);

  const { user, session } = authState;

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

      const limits = getPlanLimits(subscription.plan);

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
        logger.warn('Error fetching usage counts:', rpcError);
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
      logger.error('Error fetching user subscription:', error);
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
