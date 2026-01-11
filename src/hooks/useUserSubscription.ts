import { useState, useEffect, useCallback } from 'react';
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

  const fetchSubscription = useCallback(async () => {
    if (!user?.id || !session) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

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

      // Fetch usage counts using RPC functions
      const [workspacesResult, usersResult, projectsResult] = await Promise.all([
        supabase.rpc('count_admin_workspaces', { p_user_id: user.id }),
        supabase.rpc('count_total_invited_users', { p_user_id: user.id }),
        supabase.rpc('count_total_projects', { p_user_id: user.id }),
      ]);

      const usage: SubscriptionUsage = {
        workspaces: workspacesResult.data ?? 0,
        users: usersResult.data ?? 0,
        projects: projectsResult.data ?? 0,
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
