import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE_STORAGE_BYTES,
  PRODUCT_TO_PLAN,
  STORAGE_ADDON_PRODUCTS,
  STORAGE_TIER_BYTES,
  buildWorkspacePlanPatch,
  classifyProduct,
  decideCheckout,
  decidePlanEvent,
  getInvoiceSubscriptionId,
  isEmailCustomerAcceptableForUser,
  isInvoiceForStoredPlan,
  isManualGrant,
  isStripeResourceMissing,
  isUsableStripeCustomer,
  mapStripeSubscriptionStatus,
  pickEmailCustomerForUser,
  selectWorkspacesForPropagation,
  shouldApplyPlanEvent,
  shouldInvoiceFailureMarkPastDue,
  shouldInvoicePaidActivate,
  type WorkspaceBillingRow,
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
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('incomplete');
  });
});

describe('shouldApplyPlanEvent', () => {
  const CREATED = 'customer.subscription.created';
  const UPDATED = 'customer.subscription.updated';
  const DELETED = 'customer.subscription.deleted';
  const CHECKOUT = 'checkout.session.completed';

  const base = {
    storedSubscriptionId: 'sub_stored' as string | null | undefined,
    storedStatus: 'active' as string | null | undefined,
    eventSubscriptionId: 'sub_stored',
    eventStatus: 'active',
    eventType: UPDATED,
  };
  const other = { ...base, eventSubscriptionId: 'sub_other' };

  it('accepts events of the stored subscription', () => {
    expect(shouldApplyPlanEvent(base)).toBe(true);
    expect(shouldApplyPlanEvent({ ...base, eventStatus: 'past_due' })).toBe(true);
    expect(shouldApplyPlanEvent({ ...base, eventStatus: 'canceled' })).toBe(true);
    expect(
      shouldApplyPlanEvent({ ...base, eventStatus: 'canceled', eventType: DELETED }),
    ).toBe(true);
  });

  it('ignores every event of the stored subscription once the account is canceled', () => {
    const canceled = { ...base, storedStatus: 'canceled' };
    for (const eventType of [CREATED, UPDATED, DELETED, CHECKOUT]) {
      for (const eventStatus of ['active', 'trialing', 'past_due', 'canceled', 'unpaid']) {
        expect(decidePlanEvent({ ...canceled, eventStatus, eventType })).toEqual({
          apply: false,
          reason: 'stored_already_canceled',
          replacesStored: false,
        });
      }
    }
  });

  it('keeps applying events of the stored subscription while it is not canceled', () => {
    for (const storedStatus of ['active', 'trialing', 'past_due']) {
      expect(decidePlanEvent({ ...base, storedStatus, eventStatus: 'active' })).toEqual({
        apply: true,
        reason: 'stored_subscription',
        replacesStored: false,
      });
      expect(
        shouldApplyPlanEvent({ ...base, storedStatus, eventStatus: 'canceled', eventType: DELETED }),
      ).toBe(true);
    }
  });

  it('still reports an incomplete event of a canceled stored subscription as incomplete', () => {
    expect(
      decidePlanEvent({ ...base, storedStatus: 'canceled', eventStatus: 'incomplete' }).reason,
    ).toBe('incomplete_status');
  });

  it('after a cancellation, a different live subscription still starts a new plan', () => {
    expect(
      decidePlanEvent({
        ...other,
        storedStatus: 'canceled',
        eventStatus: 'active',
        eventType: CHECKOUT,
      }),
    ).toEqual({ apply: true, reason: 'first_or_after_canceled', replacesStored: false });
  });

  it('never applies an incomplete event, even of the stored subscription', () => {
    for (const eventStatus of ['incomplete', 'incomplete_expired']) {
      for (const eventType of [CREATED, UPDATED, DELETED, CHECKOUT]) {
        expect(shouldApplyPlanEvent({ ...base, eventStatus, eventType })).toBe(false);
        expect(shouldApplyPlanEvent({ ...base, storedStatus: 'trialing', eventStatus, eventType }))
          .toBe(false);
      }
    }
    expect(decidePlanEvent({ ...base, eventStatus: 'incomplete' }).reason).toBe('incomplete_status');
  });

  it('ignores an update of another subscription even when it is active', () => {
    for (const eventStatus of ['active', 'trialing', 'canceled', 'past_due', 'unpaid']) {
      expect(shouldApplyPlanEvent({ ...other, eventStatus, eventType: UPDATED })).toBe(false);
    }
    expect(decidePlanEvent({ ...other, eventType: UPDATED }).reason).toBe(
      'other_subscription_ignored',
    );
  });

  it('ignores the deletion of another subscription, whatever its status', () => {
    for (const storedStatus of ['active', 'trialing', 'past_due', 'canceled']) {
      for (const eventStatus of ['canceled', 'active']) {
        expect(
          shouldApplyPlanEvent({ ...other, storedStatus, eventStatus, eventType: DELETED }),
        ).toBe(false);
      }
    }
  });

  it('lets a created active or trialing subscription replace another stored one', () => {
    for (const eventStatus of ['active', 'trialing']) {
      for (const eventType of [CREATED, CHECKOUT]) {
        expect(decidePlanEvent({ ...other, eventStatus, eventType })).toEqual({
          apply: true,
          reason: 'replaces_stored',
          replacesStored: true,
        });
      }
    }
  });

  it('does not let a created subscription that is not live replace the stored one', () => {
    for (const eventStatus of ['past_due', 'unpaid', 'canceled', 'paused', 'incomplete']) {
      expect(shouldApplyPlanEvent({ ...other, eventStatus, eventType: CREATED })).toBe(false);
    }
  });

  it('with nothing stored, applies only a live created, updated or checkout event', () => {
    for (const storedSubscriptionId of [null, undefined, '']) {
      for (const storedStatus of [null, 'trialing']) {
        const first = { ...other, storedSubscriptionId, storedStatus };
        for (const eventType of [CREATED, UPDATED, CHECKOUT]) {
          expect(decidePlanEvent({ ...first, eventStatus: 'active', eventType })).toEqual({
            apply: true,
            reason: 'first_or_after_canceled',
            replacesStored: false,
          });
          expect(shouldApplyPlanEvent({ ...first, eventStatus: 'trialing', eventType })).toBe(true);
          for (const eventStatus of ['incomplete', 'incomplete_expired', 'canceled', 'past_due', 'unpaid', 'paused']) {
            expect(shouldApplyPlanEvent({ ...first, eventStatus, eventType })).toBe(false);
          }
        }
        // A deletion never applies to an account with nothing stored.
        for (const eventStatus of ['canceled', 'active']) {
          expect(shouldApplyPlanEvent({ ...first, eventStatus, eventType: DELETED })).toBe(false);
        }
      }
    }
  });

  it('once the stored one is canceled, another subscription applies only when live', () => {
    const afterCancel = { ...other, storedStatus: 'canceled' };
    expect(
      decidePlanEvent({ ...afterCancel, eventStatus: 'active', eventType: CREATED }),
    ).toEqual({ apply: true, reason: 'first_or_after_canceled', replacesStored: false });
    expect(shouldApplyPlanEvent({ ...afterCancel, eventStatus: 'active', eventType: UPDATED }))
      .toBe(true);
    expect(shouldApplyPlanEvent({ ...afterCancel, eventStatus: 'trialing', eventType: CHECKOUT }))
      .toBe(true);
    for (const eventStatus of ['incomplete', 'incomplete_expired', 'canceled', 'past_due', 'unpaid']) {
      expect(shouldApplyPlanEvent({ ...afterCancel, eventStatus, eventType: CREATED })).toBe(false);
    }
  });

  it('refuses an event without a subscription id', () => {
    expect(shouldApplyPlanEvent({ ...base, eventSubscriptionId: '' })).toBe(false);
    expect(
      shouldApplyPlanEvent({ ...base, storedSubscriptionId: '', eventSubscriptionId: '' }),
    ).toBe(false);
  });
});

describe('decideCheckout', () => {
  it.each([true, false])(
    'refuses an active or past_due account (Stripe subscription: %s)',
    (hasStripeSubscription) => {
      for (const accountStatus of ['active', 'past_due']) {
        expect(decideCheckout({ accountStatus, hasStripeSubscription })).toEqual({
          allow: false,
          reason: 'already_subscribed',
        });
      }
    },
  );

  it('refuses a Stripe trial: trialing with a Stripe subscription', () => {
    expect(decideCheckout({ accountStatus: 'trialing', hasStripeSubscription: true })).toEqual({
      allow: false,
      reason: 'stripe_trial',
    });
  });

  it('allows the free trial of the app: trialing without a Stripe subscription', () => {
    expect(decideCheckout({ accountStatus: 'trialing', hasStripeSubscription: false })).toEqual({
      allow: true,
      reason: 'app_trial',
    });
  });

  it.each([true, false])(
    'allows a canceled account (old Stripe subscription id kept: %s)',
    (hasStripeSubscription) => {
      expect(decideCheckout({ accountStatus: 'canceled', hasStripeSubscription })).toEqual({
        allow: true,
        reason: 'no_plan',
      });
    },
  );

  it('allows an account without a row', () => {
    for (const accountStatus of [null, undefined]) {
      expect(decideCheckout({ accountStatus, hasStripeSubscription: false }).allow).toBe(true);
    }
  });

  it('refuses any other not canceled status when a Stripe subscription is stored', () => {
    for (const accountStatus of ['paused', 'unpaid', 'incomplete', 'incomplete_expired', 'expired']) {
      expect(decideCheckout({ accountStatus, hasStripeSubscription: true })).toEqual({
        allow: false,
        reason: 'already_subscribed',
      });
    }
  });

  it('allows any other status without a Stripe subscription', () => {
    for (const accountStatus of ['', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'expired']) {
      expect(decideCheckout({ accountStatus, hasStripeSubscription: false })).toEqual({
        allow: true,
        reason: 'no_plan',
      });
    }
  });

  it('allows a missing or empty status even with a Stripe subscription id', () => {
    for (const accountStatus of [null, undefined, '']) {
      expect(decideCheckout({ accountStatus, hasStripeSubscription: true })).toEqual({
        allow: true,
        reason: 'no_plan',
      });
    }
  });

  it('refuses while a suspended (unpaid) subscription is stored as past_due', () => {
    expect(
      decideCheckout({
        accountStatus: mapStripeSubscriptionStatus('unpaid'),
        hasStripeSubscription: true,
      }).allow,
    ).toBe(false);
  });
});

describe('suspended subscription (unpaid stored as past_due)', () => {
  const stored = { storedSubscriptionId: 'sub_plan', storedStatus: mapStripeSubscriptionStatus('unpaid') };

  it('stores unpaid as past_due, never as canceled', () => {
    expect(stored.storedStatus).toBe('past_due');
  });

  it('applies updated(active) of the same subscription when past_due is stored', () => {
    expect(
      decidePlanEvent({
        storedSubscriptionId: 'sub_plan',
        storedStatus: 'past_due',
        eventSubscriptionId: 'sub_plan',
        eventStatus: 'active',
        eventType: 'customer.subscription.updated',
      }),
    ).toEqual({ apply: true, reason: 'stored_subscription', replacesStored: false });
  });

  it('applies updated(unpaid) of the stored subscription and keeps it reactivable', () => {
    expect(
      shouldApplyPlanEvent({
        ...stored,
        storedStatus: 'active',
        eventSubscriptionId: 'sub_plan',
        eventStatus: 'unpaid',
        eventType: 'customer.subscription.updated',
      }),
    ).toBe(true);
  });

  it('lets invoice.paid reactivate it and a new failure keep it past_due', () => {
    expect(shouldInvoicePaidActivate({ ...stored, invoiceSubscriptionId: 'sub_plan' })).toBe(true);
    expect(shouldInvoiceFailureMarkPastDue({ ...stored, invoiceSubscriptionId: 'sub_plan' })).toBe(true);
  });

  it('still ignores an update of another subscription', () => {
    expect(
      shouldApplyPlanEvent({
        ...stored,
        eventSubscriptionId: 'sub_other',
        eventStatus: 'active',
        eventType: 'customer.subscription.updated',
      }),
    ).toBe(false);
  });
});

describe('isStripeResourceMissing', () => {
  it('recognises a missing object, directly or in the raw error', () => {
    expect(isStripeResourceMissing({ code: 'resource_missing' })).toBe(true);
    expect(isStripeResourceMissing({ raw: { code: 'resource_missing' } })).toBe(true);
    const err = Object.assign(new Error('No such customer'), { code: 'resource_missing' });
    expect(isStripeResourceMissing(err)).toBe(true);
  });

  it('does not treat any other failure as missing', () => {
    for (const error of [
      null,
      undefined,
      'resource_missing',
      new Error('network'),
      { code: 'rate_limit' },
      { code: 'api_key_expired' },
      { raw: null },
      { type: 'StripeAuthenticationError' },
    ]) {
      expect(isStripeResourceMissing(error)).toBe(false);
    }
  });
});

describe('isUsableStripeCustomer', () => {
  it('accepts an existing customer and rejects a deleted stub or nothing', () => {
    expect(isUsableStripeCustomer({ id: 'cus_1' })).toBe(true);
    expect(isUsableStripeCustomer({ id: 'cus_1', deleted: false })).toBe(true);
    expect(isUsableStripeCustomer({ id: 'cus_1', deleted: true })).toBe(false);
    expect(isUsableStripeCustomer({ id: '' })).toBe(false);
    expect(isUsableStripeCustomer(null)).toBe(false);
    expect(isUsableStripeCustomer('cus_1')).toBe(false);
  });
});

describe('customers found by email', () => {
  it('accepts a customer without owner or owned by this user', () => {
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1' }, 'u-1')).toBe(true);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', metadata: null }, 'u-1')).toBe(true);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', metadata: {} }, 'u-1')).toBe(true);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', metadata: { user_id: '' } }, 'u-1')).toBe(true);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', metadata: { user_id: 'u-1' } }, 'u-1')).toBe(true);
  });

  it('rejects a customer of another user, a deleted one, or an empty user', () => {
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', metadata: { user_id: 'u-2' } }, 'u-1')).toBe(false);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1', deleted: true }, 'u-1')).toBe(false);
    expect(isEmailCustomerAcceptableForUser(null, 'u-1')).toBe(false);
    expect(isEmailCustomerAcceptableForUser({ id: 'cus_1' }, '')).toBe(false);
  });

  it('picks the customer of this user first, then one without owner', () => {
    expect(
      pickEmailCustomerForUser(
        [
          { id: 'cus_other', metadata: { user_id: 'u-2' } },
          { id: 'cus_free', metadata: {} },
          { id: 'cus_mine', metadata: { user_id: 'u-1' } },
        ],
        'u-1',
      ),
    ).toBe('cus_mine');
    expect(
      pickEmailCustomerForUser(
        [{ id: 'cus_other', metadata: { user_id: 'u-2' } }, { id: 'cus_free' }],
        'u-1',
      ),
    ).toBe('cus_free');
  });

  it('returns null when every customer belongs to another user, or there is none', () => {
    expect(pickEmailCustomerForUser([{ id: 'cus_other', metadata: { user_id: 'u-2' } }], 'u-1')).toBeNull();
    expect(pickEmailCustomerForUser([], 'u-1')).toBeNull();
    expect(pickEmailCustomerForUser(null, 'u-1')).toBeNull();
  });
});

describe('selectWorkspacesForPropagation', () => {
  const member = (
    workspace_id: string,
    user_id: string,
    role = 'admin',
    is_active: boolean | null = true,
  ): WorkspaceMemberRow => ({ workspace_id, user_id, role, is_active });

  const ws = (
    id: string,
    subscription_status: string | null = 'trialing',
    stripe_subscription_id: string | null = null,
  ): WorkspaceBillingRow => ({ id, subscription_status, stripe_subscription_id });

  const all = [ws('w-1'), ws('w-2'), ws('w-3'), ws('w-4'), ws('w-9')];
  const none = { propagate: [], skipped: [], manual: [], unreadable: [] };

  it('selects a workspace whose only active admin is the user', () => {
    expect(
      selectWorkspacesForPropagation(
        'u-1',
        [member('w-1', 'u-1'), member('w-1', 'u-2', 'editor')],
        all,
      ),
    ).toEqual({ ...none, propagate: ['w-1'] });
  });

  it('skips a workspace with two active admins', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1'), member('w-1', 'u-2')], all),
    ).toEqual({ ...none, skipped: ['w-1'] });
  });

  it('does not count an inactive admin', () => {
    expect(
      selectWorkspacesForPropagation(
        'u-1',
        [
          member('w-1', 'u-1'),
          member('w-1', 'u-2', 'admin', false),
          member('w-1', 'u-3', 'admin', null),
        ],
        all,
      ),
    ).toEqual({ ...none, propagate: ['w-1'] });
  });

  it('selects nothing when the user is an inactive admin', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1', 'admin', false)], all),
    ).toEqual(none);
  });

  it('selects nothing when the user is only a member', () => {
    expect(
      selectWorkspacesForPropagation(
        'u-1',
        [member('w-1', 'u-1', 'editor'), member('w-1', 'u-2'), member('w-2', 'u-1', 'viewer')],
        all,
      ),
    ).toEqual(none);
  });

  it('never selects a workspace administered only by someone else', () => {
    expect(selectWorkspacesForPropagation('u-1', [member('w-9', 'u-2')], all)).toEqual(none);
  });

  it('decides each workspace independently and ignores duplicate rows', () => {
    expect(
      selectWorkspacesForPropagation(
        'u-1',
        [
          member('w-1', 'u-1'),
          member('w-1', 'u-1'),
          member('w-2', 'u-1'),
          member('w-2', 'u-2'),
          member('w-3', 'u-1'),
          member('w-4', 'u-2'),
        ],
        all,
      ),
    ).toEqual({ ...none, propagate: ['w-1', 'w-3'], skipped: ['w-2'] });
  });

  it('selects nothing without a user or without rows', () => {
    expect(selectWorkspacesForPropagation('', [member('w-1', '')], all)).toEqual(none);
    expect(selectWorkspacesForPropagation('u-1', [], all)).toEqual(none);
  });

  it('leaves a manual grant alone: active without a Stripe subscription', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1')], [ws('w-1', 'active', null)]),
    ).toEqual({ ...none, manual: ['w-1'] });
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1')], [ws('w-1', 'active', '')]),
    ).toEqual({ ...none, manual: ['w-1'] });
  });

  it('propagates to an active workspace that has a Stripe subscription', () => {
    expect(
      selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1')], [ws('w-1', 'active', 'sub_1')]),
    ).toEqual({ ...none, propagate: ['w-1'] });
  });

  it('propagates to trialing, canceled and past_due workspaces with or without an id', () => {
    for (const status of ['trialing', 'canceled', 'past_due', null]) {
      for (const subscriptionId of [null, 'sub_1']) {
        expect(
          selectWorkspacesForPropagation(
            'u-1',
            [member('w-1', 'u-1')],
            [ws('w-1', status, subscriptionId)],
          ),
        ).toEqual({ ...none, propagate: ['w-1'] });
      }
    }
  });

  it('reports several admins before the manual grant and mixes outcomes', () => {
    expect(
      selectWorkspacesForPropagation(
        'u-1',
        [member('w-1', 'u-1'), member('w-2', 'u-1'), member('w-2', 'u-2'), member('w-3', 'u-1')],
        [ws('w-1', 'active', null), ws('w-2', 'active', null), ws('w-3', 'trialing', null)],
      ),
    ).toEqual({ ...none, propagate: ['w-3'], skipped: ['w-2'], manual: ['w-1'] });
  });

  it('does not propagate to a workspace whose billing state is unknown', () => {
    expect(selectWorkspacesForPropagation('u-1', [member('w-1', 'u-1')], [])).toEqual({
      ...none,
      unreadable: ['w-1'],
    });
  });

  it('recognises a manual grant', () => {
    expect(isManualGrant({ subscription_status: 'active', stripe_subscription_id: null })).toBe(true);
    expect(isManualGrant({ subscription_status: 'active', stripe_subscription_id: 'sub_1' })).toBe(false);
    expect(isManualGrant({ subscription_status: 'trialing', stripe_subscription_id: null })).toBe(false);
  });
});

describe('buildWorkspacePlanPatch', () => {
  const account = {
    subscription_plan: 'pro',
    subscription_status: 'active',
    trial_ends_at: null,
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
  };

  it('copies plan, status, trial end and Stripe ids', () => {
    expect(buildWorkspacePlanPatch(account)).toEqual({ patch: account, statusWithheld: false });
    const trialing = { ...account, subscription_status: 'trialing', trial_ends_at: '2030-01-01T00:00:00.000Z' };
    expect(buildWorkspacePlanPatch(trialing)).toEqual({ patch: trialing, statusWithheld: false });
  });

  it('withholds status and trial end when trialing without an end date', () => {
    const result = buildWorkspacePlanPatch({ ...account, subscription_status: 'trialing' });
    expect(result.statusWithheld).toBe(true);
    expect(result.patch).toEqual({
      subscription_plan: 'pro',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
    });
    expect('subscription_status' in result.patch).toBe(false);
    expect('trial_ends_at' in result.patch).toBe(false);
  });

  it('clears the trial end when the account is canceled', () => {
    const canceled = { ...account, subscription_status: 'canceled' };
    expect(buildWorkspacePlanPatch(canceled).patch).toMatchObject({
      subscription_status: 'canceled',
      trial_ends_at: null,
    });
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

describe('shouldInvoicePaidActivate', () => {
  const stored = { invoiceSubscriptionId: 'sub_plan', storedSubscriptionId: 'sub_plan' };

  it('activates for the stored plan subscription while not canceled', () => {
    for (const storedStatus of ['active', 'trialing', 'past_due']) {
      expect(shouldInvoicePaidActivate({ ...stored, storedStatus })).toBe(true);
    }
  });

  it('does not reactivate a canceled account', () => {
    expect(shouldInvoicePaidActivate({ ...stored, storedStatus: 'canceled' })).toBe(false);
  });

  it('ignores invoices of another or of no subscription', () => {
    expect(
      shouldInvoicePaidActivate({ ...stored, invoiceSubscriptionId: 'sub_addon', storedStatus: 'past_due' }),
    ).toBe(false);
    expect(
      shouldInvoicePaidActivate({ ...stored, invoiceSubscriptionId: null, storedStatus: 'past_due' }),
    ).toBe(false);
    expect(
      shouldInvoicePaidActivate({ ...stored, storedSubscriptionId: null, storedStatus: 'trialing' }),
    ).toBe(false);
  });
});

describe('shouldInvoiceFailureMarkPastDue', () => {
  const stored = { invoiceSubscriptionId: 'sub_plan', storedSubscriptionId: 'sub_plan' };

  it('marks past_due only from active, trialing or past_due', () => {
    for (const storedStatus of ['active', 'trialing', 'past_due']) {
      expect(shouldInvoiceFailureMarkPastDue({ ...stored, storedStatus })).toBe(true);
    }
    for (const storedStatus of ['canceled', 'incomplete', null, undefined]) {
      expect(shouldInvoiceFailureMarkPastDue({ ...stored, storedStatus })).toBe(false);
    }
  });

  it('ignores invoices of another or of no subscription', () => {
    expect(
      shouldInvoiceFailureMarkPastDue({ ...stored, invoiceSubscriptionId: 'sub_addon', storedStatus: 'active' }),
    ).toBe(false);
    expect(
      shouldInvoiceFailureMarkPastDue({ ...stored, storedSubscriptionId: null, storedStatus: 'active' }),
    ).toBe(false);
  });
});
