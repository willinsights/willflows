import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPlanLimits, type PlanLimits } from '@/lib/plans';

export type SubscriptionPlan = 'essencial' | 'pro' | 'studio';

export interface WorkspaceSubscription {
  plan: SubscriptionPlan;
  status: string;
  trialEndsAt: string | null;
}

export interface WorkspaceSubscriptionState {
  // Subscription info from the current workspace
  subscription: WorkspaceSubscription | null;
  plan: SubscriptionPlan;
  status: string;
  
  // Limits based on the workspace's plan
  limits: PlanLimits;
  
  // Trial info
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrial: boolean;
  trialExpired: boolean;
  
  // Workspace expiration - blocks ALL users (not just owners)
  isWorkspaceExpired: boolean;
  
  // User's role and permissions in this workspace
  isOwner: boolean; // true if role === 'admin'
  isAdmin: boolean; // same as isOwner (alias)
  canEdit: boolean;
  
  // Visibility flags - determines what UI to show
  shouldShowTrialUI: boolean; // Only show trial UI if user is owner
  canManageSubscription: boolean; // Only admins can manage billing
  
  // Loading state
  loading: boolean;
  
  // Workspace info
  workspaceId: string | null;
  workspaceName: string | null;
}

/**
 * Hook to get subscription data for the CURRENT WORKSPACE.
 * 
 * Key concept: The subscription/plan is tied to the workspace, not the user.
 * - When user is in their own workspace → uses their workspace's plan
 * - When user is in someone else's workspace → uses that workspace's plan
 * - Trial UI and upgrade buttons only shown if user is admin/owner of the workspace
 */
export function useWorkspaceSubscription(): WorkspaceSubscriptionState {
  const { 
    workspace, 
    membership, 
    loading, 
    isAdmin,
    canEdit,
  } = useWorkspace();

  return useMemo(() => {
    // No workspace yet
    if (!workspace) {
      return {
        subscription: null,
        plan: 'essencial',
        status: 'trialing',
        limits: getPlanLimits('starter'),
        trialEndsAt: null,
        trialDaysRemaining: null,
        isTrial: false,
        trialExpired: false,
        isWorkspaceExpired: false,
        isOwner: false,
        isAdmin: false,
        canEdit: false,
        shouldShowTrialUI: false,
        canManageSubscription: false,
        loading,
        workspaceId: null,
        workspaceName: null,
      };
    }

    const plan = (workspace.subscription_plan || 'essencial') as SubscriptionPlan;
    const status = workspace.subscription_status || 'trialing';
    const trialEndsAt = workspace.trial_ends_at || null;
    
    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null;
    let trialExpired = false;
    
    if (trialEndsAt) {
      try {
        const endDate = parseISO(trialEndsAt);
        trialDaysRemaining = differenceInDays(endDate, new Date());
        trialExpired = trialDaysRemaining < 0;
      } catch {
        trialDaysRemaining = null;
      }
    }
    
    const isTrial = status === 'trialing';
    const isUserOwner = isAdmin; // In our system, 'admin' role = owner
    
    // Get plan limits based on the workspace's plan
    const planId = plan === 'essencial' ? 'starter' : plan;
    const limits = getPlanLimits(planId);

    const subscription: WorkspaceSubscription = {
      plan,
      status,
      trialEndsAt,
    };

    // Workspace is expired if:
    // 1. status is 'expired' OR 'canceled' OR 'past_due' OR 'unpaid'
    // 2. OR status is 'trialing' AND trial has expired
    const isTrialExpired = isTrial && trialExpired;
    const isWorkspaceExpired = 
      status === 'expired' || 
      status === 'canceled' || 
      status === 'past_due' || 
      status === 'unpaid' ||
      isTrialExpired;

    return {
      subscription,
      plan,
      status,
      limits,
      trialEndsAt,
      trialDaysRemaining,
      isTrial,
      trialExpired: isTrialExpired,
      isWorkspaceExpired,
      isOwner: isUserOwner,
      isAdmin: isUserOwner,
      canEdit,
      // Only show trial UI to workspace owners
      shouldShowTrialUI: isUserOwner && isTrial,
      // Only admins can manage billing
      canManageSubscription: isUserOwner,
      loading,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }, [workspace, membership, loading, isAdmin, canEdit]);
}

/**
 * Helper to check if the current workspace's trial is expired
 */
export function useIsTrialExpired(): boolean {
  const { trialExpired, isOwner } = useWorkspaceSubscription();
  // Only consider trial expired if user is the owner
  return isOwner && trialExpired;
}
