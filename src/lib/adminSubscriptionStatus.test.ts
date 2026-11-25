import { describe, expect, it } from 'vitest';
import { isExpiredTrial, isLiveTrial, isPayingSubscription } from './adminSubscriptionStatus';
const now = new Date('2026-11-25T00:00:00Z');
describe('admin subscription status', () => {
  it('active without Stripe subscription is not revenue', () => {
    expect(isPayingSubscription({ subscription_status: 'active', stripe_subscription_id: null })).toBe(false);
    expect(isPayingSubscription({ subscription_status: 'active', stripe_subscription_id: 'sub_1' })).toBe(true);
  });
  it('trial past its end date is expired, not in trial', () => {
    const s = { subscription_status: 'trialing', trial_ends_at: '2026-11-20T00:00:00Z' };
    expect(isLiveTrial(s, now)).toBe(false);
    expect(isExpiredTrial(s, now)).toBe(true);
    expect(isLiveTrial({ subscription_status: 'trialing', trial_ends_at: '2026-11-30T00:00:00Z' }, now)).toBe(true);
  });
});
