import { useMemo } from 'react';
import { getTrialDaysRemaining } from '@/lib/subscription-utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPlanLimits, type PlanLimits } from '@/lib/plans';
import { useSuperAdmin } from './useSuperAdmin';
import { getWorkspaceAccessState, type WorkspaceAccessState } from '@/lib/billing/workspaceAccess';

export type SubscriptionPlan = 'starter' | 'pro' | 'studio';

export interface WorkspaceSubscription {
  plan: SubscriptionPlan;
  status: string;
  trialEndsAt: string | null;
  pastDueSince: string | null;
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

  /** Estado de acesso pela regra única partilhada com o servidor. */
  access: WorkspaceAccessState;
  /** Pagamento em atraso, ainda dentro dos dias de tolerância (não bloqueia). */
  isPastDueGrace: boolean;
  /** Dias de tolerância que faltam quando `isPastDueGrace`; null nos outros casos. */
  pastDueDaysLeft: number | null;
  
  // User's role and permissions in this workspace
  isOwner: boolean; // true if the user is the workspace owner (workspaces.owner_id)
  isAdmin: boolean; // true if role === 'admin' (administers, may not be the owner)
  canEdit: boolean;
  
  // Visibility flags - determines what UI to show
  shouldShowTrialUI: boolean; // Only show trial UI if user is owner
  canManageSubscription: boolean; // Only the owner can buy/manage the plan
  
  // Super Admin flag - has full access to everything
  isSuperAdmin: boolean;
  
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
    isWorkspaceOwner,
    canEdit,
  } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();

  return useMemo(() => {
    // No workspace yet
    if (!workspace) {
      return {
        subscription: null,
        plan: 'starter',
        status: 'trialing',
        limits: getPlanLimits('starter'),
        trialEndsAt: null,
        trialDaysRemaining: null,
        isTrial: false,
        trialExpired: false,
        isWorkspaceExpired: false,
        access: { active: false, reason: 'other' },
        isPastDueGrace: false,
        pastDueDaysLeft: null,
        isOwner: false,
        isAdmin: false,
        canEdit: false,
        shouldShowTrialUI: false,
        canManageSubscription: false,
        isSuperAdmin,
        loading,
        workspaceId: null,
        workspaceName: null,
      };
    }

    const plan = (workspace.subscription_plan || 'starter') as SubscriptionPlan;
    const status = workspace.subscription_status || 'trialing';
    const trialEndsAt = workspace.trial_ends_at || null;
    const pastDueSince = workspace.past_due_since ?? null;
    
    const isTrial = status === 'trialing';

    // Regra única, igual à do servidor (workspace_is_active)
    const now = Date.now();
    const access = getWorkspaceAccessState({ status, trialEndsAt, pastDueSince, now });
    
    // Teste sem data de fim não é válido (o servidor também o trata como inativo)
    const trialDaysRemaining: number | null =
      isTrial && access.reason !== 'trial_no_end' ? getTrialDaysRemaining({ trialEndsAt }, now) : null;
    const isPastDueGrace = access.reason === 'past_due_grace';
    // Owner = first administrator (workspaces.owner_id). Other admins
    // administer the workspace but do not buy or manage its plan.
    const isUserOwner = isWorkspaceOwner === true;
    
    // Get plan limits based on the workspace's plan
    const limits = getPlanLimits(plan);

    const subscription: WorkspaceSubscription = {
      plan,
      status,
      trialEndsAt,
      pastDueSince,
    };

    // Inativo pela regra do servidor (pagamento em atraso só depois da tolerância).
    // NUNCA expirado para Super Admins.
    const isTrialExpired = isTrial && !access.active;
    const isWorkspaceExpired = isSuperAdmin ? false : !access.active;

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
      access,
      isPastDueGrace,
      pastDueDaysLeft: isPastDueGrace ? access.daysLeft ?? null : null,
      isOwner: isUserOwner,
      isAdmin,
      canEdit,
      // Only show trial UI to workspace owners, NEVER for Super Admins
      shouldShowTrialUI: isUserOwner && isTrial && !isSuperAdmin,
      // Only the owner can manage billing
      canManageSubscription: isUserOwner,
      isSuperAdmin,
      loading,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }, [workspace, membership, loading, isAdmin, isWorkspaceOwner, canEdit, isSuperAdmin]);
}

/**
 * Helper to check if the current workspace's trial is expired
 */
export function useIsTrialExpired(): boolean {
  const { trialExpired, isOwner } = useWorkspaceSubscription();
  // Only consider trial expired if user is the owner
  return isOwner && trialExpired;
}
