import type { UserSubscription } from '@/hooks/useUserSubscription';

/**
 * Check if a trial has expired
 */
export function isTrialExpired(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  // If status is 'active' with a stripe subscription, user is paying - not expired
  if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
    return false;
  }
  
  // If has trial end date, check if it passed
  if (subscription.trialEndsAt) {
    return new Date(subscription.trialEndsAt) < new Date();
  }
  
  // If status is 'trialing' but no trial_ends_at, assume trial is still valid
  // This handles edge cases where trial_ends_at wasn't set
  if (subscription.status === 'trialing') {
    return false;
  }
  
  // No trial date and not active = consider expired
  return !subscription.stripeSubscriptionId;
}

/**
 * Check if user can access the app
 */
export function canAccessApp(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  // Active with Stripe subscription = can access
  if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
    return true;
  }
  
  // Trialing and not expired = can access
  if (subscription.status === 'trialing' && !isTrialExpired(subscription)) {
    return true;
  }
  
  // Active but no Stripe subscription (legacy data) - check trial
  if (subscription.status === 'active' && !subscription.stripeSubscriptionId) {
    return !isTrialExpired(subscription);
  }
  
  return false;
}

/**
 * Check if user has a valid paid subscription (not trial)
 */
export function hasPaidSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  return (
    subscription.status === 'active' && 
    !!subscription.stripeSubscriptionId
  );
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: UserSubscription | null): number {
  if (!subscription?.trialEndsAt) return 0;
  
  const now = new Date();
  const trialEnd = new Date(subscription.trialEndsAt);
  const diffMs = trialEnd.getTime() - now.getTime();
  
  if (diffMs <= 0) return 0;
  
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
