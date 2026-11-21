import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE_STORAGE_BYTES,
  PRODUCT_TO_PLAN,
  STORAGE_ADDON_PRODUCTS,
  STORAGE_TIER_BYTES,
  classifyProduct,
  getInvoiceSubscriptionId,
  isInvoiceForStoredPlan,
  mapStripeSubscriptionStatus,
  selectWorkspacesForPropagation,
  shouldApplyPlanEvent,
  type WorkspaceMemberRow,
} from '../../supabase/functions/_shared/stripe-billing.ts';

const GB = 1024 * 1024 * 1024;

const productFor = (map: Record<string, string>, value: string): string => {
  const found = Object.keys(map).find((id) => map[id] === value);
  if (!found) throw new Error(`no product mapped to ${value}`);
  return found;
};

describe('classifyProduct', () => {
  it.each(['starter', 'pro', 'studio'])('recognises the %s plan product', (plan) => {
    expect(classifyProduct(productFor(PRODUCT_TO_PLAN, plan))).toEqual({ kind: 'plan', plan });
  });

  it.each([
    ['25gb', 25 * GB],
    ['50gb', 50 * GB],
    ['100gb', 100 * GB],
    ['250gb', 250 * GB],
  ])('recognises the %s storage add-on product', (tier, bytes) => {
    expect(classifyProduct(productFor(STORAGE_ADDON_PRODUCTS, tier))).toEqual({
      kind: 'storage_addon',
      tier,
      bytes,
    });
  });

  it('maps every add-on tier, including 25 GB, to a product', () => {
    expect(Object.values(STORAGE_ADDON_PRODUCTS).sort()).toEqual(
      Object.keys(STORAGE_TIER_BYTES).sort(),
    );
  });

  it('never treats an unknown product as a plan', () => {
    expect(classifyProduct('prod_doesNotExist')).toEqual({ kind: 'unknown' });
    expect(classifyProduct(undefined)).toEqual({ kind: 'unknown' });
    expect(classifyProduct(null)).toEqual({ kind: 'unknown' });
    expect(classifyProduct('')).toEqual({ kind: 'unknown' });
    expect(classifyProduct({ id: 'prod_expanded' })).toEqual({ kind: 'unknown' });
  });

  it('does not resolve inherited object keys as products', () => {
    expect(classifyProduct('toString')).toEqual({ kind: 'unknown' });
    expect(classifyProduct('constructor')).toEqual({ kind: 'unknown' });
    expect(
      classifyProduct('prod_other', { addon_type: 'storage', storage_tier: 'toString' }),
    ).toEqual({ kind: 'unknown' });
  });

  it('accepts add-on metadata as a signal for an unmapped product', () => {
    expect(
      classifyProduct('prod_other', { addon_type: 'storage', storage_tier: '25gb' }),
    ).toEqual({ kind: 'storage_addon', tier: '25gb', bytes: 25 * GB });
    expect(
      classifyProduct(undefined, { addon_type: 'storage', storage_tier: '100gb' }),
    ).toEqual({ kind: 'storage_addon', tier: '100gb', bytes: 100 * GB });
  });

  it('ignores incomplete or invalid add-on metadata', () => {
    expect(classifyProduct('prod_other', { addon_type: 'storage' })).toEqual({ kind: 'unknown' });
    expect(
      classifyProduct('prod_other', { addon_type: 'storage', storage_tier: '999gb' }),
    ).toEqual({ kind: 'unknown' });
    expect(classifyProduct('prod_other', { storage_tier: '50gb' })).toEqual({ kind: 'unknown' });
    expect(classifyProduct('prod_other', null)).toEqual({ kind: 'unknown' });
  });

  it('keeps the product authoritative over metadata', () => {
    expect(
      classifyProduct(productFor(PRODUCT_TO_PLAN, 'pro'), {
        addon_type: 'storage',
        storage_tier: '50gb',
      }),
    ).toEqual({ kind: 'plan', plan: 'pro' });
    expect(
      classifyProduct(productFor(STORAGE_ADDON_PRODUCTS, '50gb'), {
        addon_type: 'storage',
        storage_tier: '250gb',
      }),
    ).toEqual({ kind: 'storage_addon', tier: '50gb', bytes: 50 * GB });
  });

  it('keeps the base storage fallback at 10 GB', () => {
    expect(DEFAULT_BASE_STORAGE_BYTES).toBe(10737418240);
  });
});

describe('mapStripeSubscriptionStatus', () => {
  it('maps Stripe statuses to account statuses', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('incomplete');
  });
});

describe('shouldApplyPlanEvent', () => {
  const base = {
    storedSubscriptionId: 'sub_stored',
    storedStatus: 'active',
    eventSubscriptionId: 'sub_stored',
    eventStatus: 'active',
    eventType: 'customer.subscription.updated',
  };

  it('accepts events of the stored subscription, whatever the status', () => {
    expect(shouldApplyPlanEvent(base)).toBe(true);
    expect(shouldApplyPlanEvent({ ...base, eventStatus: 'past_due' })).toBe(true);
    expect(shouldApplyPlanEvent({ ...base, eventStatus: 'canceled' })).toBe(true);
    expect(
      shouldApplyPlanEvent({
        ...base,
        eventStatus: 'canceled',
        eventType: 'customer.subscription.deleted',
      }),
    ).toBe(true);
  });

  it('lets another active or trialing subscription replace the stored one', () => {
    expect(
      shouldApplyPlanEvent({
        ...base,
        eventSubscriptionId: 'sub_new',
        eventStatus: 'active',
        eventType: 'customer.subscription.created',
      }),
    ).toBe(true);
    expect(
      shouldApplyPlanEvent({ ...base, eventSubscriptionId: 'sub_new', eventStatus: 'trialing' }),
    ).toBe(true);
  });

  it('ignores updates of an old subscription that is not active', () => {
    for (const eventStatus of ['canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired']) {
      expect(
        shouldApplyPlanEvent({ ...base, eventSubscriptionId: 'sub_old', eventStatus }),
      ).toBe(false);
    }
  });

  it('ignores the deletion of a subscription that is not the stored one', () => {
    expect(
      shouldApplyPlanEvent({
        ...base,
        eventSubscriptionId: 'sub_old',
        eventStatus: 'canceled',
        eventType: 'customer.subscription.deleted',
      }),
    ).toBe(false);
    // Even when the stored one is already canceled and the event looks active.
    expect(
      shouldApplyPlanEvent({
        ...base,
        storedStatus: 'canceled',
        eventSubscriptionId: 'sub_old',
        eventStatus: 'active',
        eventType: 'customer.subscription.deleted',
      }),
    ).toBe(false);
  });

  it('accepts any event when no subscription is stored', () => {
    for (const storedSubscriptionId of [null, undefined, '']) {
      expect(
        shouldApplyPlanEvent({
          ...base,
          storedSubscriptionId,
          storedStatus: 'trialing',
          eventSubscriptionId: 'sub_first',
          eventStatus: 'incomplete',
          eventType: 'customer.subscription.created',
        }),
      ).toBe(true);
      expect(
        shouldApplyPlanEvent({
          ...base,
          storedSubscriptionId,
          eventSubscriptionId: 'sub_first',
          eventStatus: 'canceled',
          eventType: 'customer.subscription.deleted',
        }),
      ).toBe(true);
    }
  });

  it('accepts another subscription once the stored one is canceled', () => {
    expect(
      shouldApplyPlanEvent({
        ...base,
        storedStatus: 'canceled',
        eventSubscriptionId: 'sub_new',
        eventStatus: 'incomplete',
        eventType: 'customer.subscription.created',
      }),
    ).toBe(true);
  });

  it('refuses an event without a subscription id', () => {
    expect(shouldApplyPlanEvent({ ...base, eventSubscriptionId: '' })).toBe(false);
  });
});

describe('selectWorkspacesForPropagation', () => {
  const member = (
    workspace_id: string,
    user_id: string,
    role = 'admin',
    is_active: boolean | null = true,
  ): WorkspaceMemberRow => ({ workspace_id, user_id, role, is_active });

  it('selects a workspace whose only active admin is the user', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1'), member('w-1', 'u-2', 'editor')]),
    ).toEqual({ propagate: ['w-1'], skipped: [] });
  });

  it('skips a workspace with two active admins', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1'), member('w-1', 'u-2')]),
    ).toEqual({ propagate: [], skipped: ['w-1'] });
  });

  it('does not count an inactive admin', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [
        member('w-1', 'u-1'),
        member('w-1', 'u-2', 'admin', false),
        member('w-1', 'u-3', 'admin', null),
      ]),
    ).toEqual({ propagate: ['w-1'], skipped: [] });
  });

  it('selects nothing when the user is an inactive admin', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1', 'admin', false)]),
    ).toEqual({ propagate: [], skipped: [] });
  });

  it('selects nothing when the user is only a member', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [
        member('w-1', 'u-1', 'editor'),
        member('w-1', 'u-2'),
        member('w-2', 'u-1', 'viewer'),
      ]),
    ).toEqual({ propagate: [], skipped: [] });
  });

  it('never selects a workspace administered only by someone else', () => {
    expect(selectWorkspacesForPropagation('u-1', [member('w-9', 'u-2')])).toEqual({
      propagate: [],
      skipped: [],
    });
  });

  it('decides each workspace independently and ignores duplicate rows', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [
        member('w-1', 'u-1'),
        member('w-1', 'u-1'),
        member('w-2', 'u-1'),
        member('w-2', 'u-2'),
        member('w-3', 'u-1'),
        member('w-4', 'u-2'),
      ]),
    ).toEqual({ propagate: ['w-1', 'w-3'], skipped: ['w-2'] });
  });

  it('selects nothing without a user or without rows', () => {
    expect(selectWorkspacesForPropagation('', [member('w-1', '')])).toEqual({
      propagate: [],
      skipped: [],
    });
    expect(selectWorkspacesForPropagation('u-1', [])).toEqual({ propagate: [], skipped: [] });
  });
});

describe('getInvoiceSubscriptionId', () => {
  it('reads the legacy invoice.subscription id', () => {
    expect(getInvoiceSubscriptionId({ subscription: 'sub_1' })).toBe('sub_1');
  });

  it('reads an expanded invoice.subscription object', () => {
    expect(getInvoiceSubscriptionId({ subscription: { id: 'sub_2' } })).toBe('sub_2');
  });

  it('falls back to parent.subscription_details.subscription', () => {
    expect(
      getInvoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_3' } } }),
    ).toBe('sub_3');
    expect(
      getInvoiceSubscriptionId({
        subscription: null,
        parent: { subscription_details: { subscription: { id: 'sub_4' } } },
      }),
    ).toBe('sub_4');
  });

  it('prefers invoice.subscription when both are present', () => {
    expect(
      getInvoiceSubscriptionId({
        subscription: 'sub_a',
        parent: { subscription_details: { subscription: 'sub_b' } },
      }),
    ).toBe('sub_a');
  });

  it('returns null when the invoice has no subscription', () => {
    expect(getInvoiceSubscriptionId({})).toBeNull();
    expect(getInvoiceSubscriptionId({ parent: null })).toBeNull();
    expect(getInvoiceSubscriptionId({ parent: { subscription_details: null } })).toBeNull();
    expect(getInvoiceSubscriptionId(null)).toBeNull();
    expect(getInvoiceSubscriptionId(undefined)).toBeNull();
  });
});

describe('isInvoiceForStoredPlan', () => {
  it('matches only the exact stored plan subscription', () => {
    expect(isInvoiceForStoredPlan('sub_plan', 'sub_plan')).toBe(true);
    expect(isInvoiceForStoredPlan('sub_addon', 'sub_plan')).toBe(false);
  });

  it('never matches when either side is missing', () => {
    expect(isInvoiceForStoredPlan(null, 'sub_plan')).toBe(false);
    expect(isInvoiceForStoredPlan('sub_plan', null)).toBe(false);
    expect(isInvoiceForStoredPlan(null, null)).toBe(false);
    expect(isInvoiceForStoredPlan('', '')).toBe(false);
  });
});
