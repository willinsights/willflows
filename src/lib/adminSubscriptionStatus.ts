// Super admin metrics: only Stripe-backed active subscriptions are revenue;
// a "trialing" row whose trial date passed is an expired trial, not a trial.
type Sub = { subscription_status?: string | null; stripe_subscription_id?: string | null; trial_ends_at?: string | null };

export const isPayingSubscription = (s: Sub) =>
  s.subscription_status === 'active' && !!s.stripe_subscription_id;

export const isLiveTrial = (s: Sub, now: Date = new Date()) =>
  s.subscription_status === 'trialing' && !!s.trial_ends_at && new Date(s.trial_ends_at) > now;

export const isExpiredTrial = (s: Sub, now: Date = new Date()) =>
  s.subscription_status === 'trialing' && !isLiveTrial(s, now);
