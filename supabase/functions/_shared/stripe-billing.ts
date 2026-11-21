// Pure billing rules shared by the Stripe webhook. No Deno or npm imports, so
// the same file runs in the edge runtime and under vitest.
//
// Rule: the plan belongs to the ACCOUNT (user_subscriptions). The webhook
// copies plan/status to the workspaces the account owns. Storage add-ons are
// separate subscriptions and never change the plan or the account status.

export type PlanId = 'starter' | 'pro' | 'studio';
export type StorageTier = '25gb' | '50gb' | '100gb' | '250gb';

const GB = 1024 * 1024 * 1024;

// Fallback base quota (10GB) used when a storage row has no base value.
export const DEFAULT_BASE_STORAGE_BYTES = 10 * GB;

// Product ID to Plan mapping.
export const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  'prod_TpNVDQjhG0wlZ4': 'starter',
  'prod_TpNVjl9D0tQ8wQ': 'pro',
  'prod_TpNVM1mlDtAvKA': 'studio',
};

export const STORAGE_TIER_BYTES: Record<StorageTier, number> = {
  '25gb': 25 * GB,
  '50gb': 50 * GB,
  '100gb': 100 * GB,
  '250gb': 250 * GB,
};

// Storage add-on Product IDs to tier mapping. The webhook sees the PRODUCT of
// the subscription item (price.product), so products are the key here.
export const STORAGE_ADDON_PRODUCTS: Record<string, StorageTier> = {
  'prod_TtVyg9RmLKqwRS': '25gb',
  'prod_TsfrcvSlClixZM': '50gb',
  'prod_TsfrGDXzlIOhaM': '100gb',
  'prod_TsfrRubX5bCWEh': '250gb',
};

export type ProductClassification =
  | { kind: 'plan'; plan: PlanId }
  | { kind: 'storage_addon'; tier: StorageTier; bytes: number }
  | { kind: 'unknown' };

type MetadataLike = Record<string, unknown> | null | undefined;

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

// Classifies what a subscription sells. The product is authoritative; the
// add-on metadata written by the add-on checkout is only a second signal for
// products missing from the maps. An unknown product is NEVER treated as a
// plan: the caller must ignore the event.
export function classifyProduct(
  productId: unknown,
  metadata?: MetadataLike,
): ProductClassification {
  if (typeof productId === 'string' && productId) {
    if (hasOwn(PRODUCT_TO_PLAN, productId)) {
      return { kind: 'plan', plan: PRODUCT_TO_PLAN[productId] };
    }
    if (hasOwn(STORAGE_ADDON_PRODUCTS, productId)) {
      const tier = STORAGE_ADDON_PRODUCTS[productId];
      return { kind: 'storage_addon', tier, bytes: STORAGE_TIER_BYTES[tier] };
    }
  }

  if (metadata && typeof metadata === 'object' && metadata.addon_type === 'storage') {
    const tier = metadata.storage_tier;
    if (typeof tier === 'string' && hasOwn(STORAGE_TIER_BYTES, tier)) {
      return {
        kind: 'storage_addon',
        tier: tier as StorageTier,
        bytes: STORAGE_TIER_BYTES[tier as StorageTier],
      };
    }
  }

  return { kind: 'unknown' };
}

// Map a Stripe subscription status to the status stored on the account.
// unpaid is a SUSPENDED subscription, not an ended one: it is stored as
// past_due so that a later customer.subscription.updated / invoice.paid of the
// same subscription reactivates the account, and so that the plan checkout
// stays refused while it is suspended. Only canceled ends the subscription.
export function mapStripeSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return status;
  }
}

// ---- Plan checkout (create-checkout) ----

// Marks the session and the subscription created by the plan checkout.
export const PLAN_CHECKOUT_KIND = 'plan';

// Error code returned (HTTP 409) when the account already has a plan.
export const ALREADY_SUBSCRIBED_CODE = 'ALREADY_SUBSCRIBED';

// Minimal row for an account that has none yet: the same pair a new account
// gets on signup. Never a paid plan; trial dates are left to the database.
export const NEW_ACCOUNT_PLAN = 'essencial';
export const NEW_ACCOUNT_STATUS = 'trialing';

export interface CheckoutDecisionInput {
  // subscription_status stored on the account; null/undefined without a row.
  accountStatus: string | null | undefined;
  // True when the account has a stripe_subscription_id.
  hasStripeSubscription: boolean;
}

export type CheckoutDecisionReason =
  | 'no_plan'
  | 'app_trial'
  | 'already_subscribed'
  | 'stripe_trial';

export interface CheckoutDecision {
  allow: boolean;
  reason: CheckoutDecisionReason;
}

// One plan subscription per account. Decides whether the account may open a
// new plan checkout.
// - active or past_due: refused, with or without a Stripe subscription (an
//   active account without one is a manual grant and does not buy here).
// - trialing WITH a Stripe subscription (Stripe trial): refused.
// - any other status that is not canceled (paused, unpaid, incomplete, ...)
//   WITH a Stripe subscription stored: refused. That subscription still
//   exists in Stripe and is managed in the billing portal, not replaced.
// - trialing without one (free trial of the app), canceled, no row or no
//   status, or another status without a Stripe subscription: allowed.
export function decideCheckout(input: CheckoutDecisionInput): CheckoutDecision {
  const { accountStatus, hasStripeSubscription } = input;

  if (accountStatus === 'active' || accountStatus === 'past_due') {
    return { allow: false, reason: 'already_subscribed' };
  }
  if (accountStatus === 'trialing') {
    return hasStripeSubscription
      ? { allow: false, reason: 'stripe_trial' }
      : { allow: true, reason: 'app_trial' };
  }
  if (hasStripeSubscription && accountStatus && accountStatus !== 'canceled') {
    return { allow: false, reason: 'already_subscribed' };
  }
  return { allow: true, reason: 'no_plan' };
}

// ---- Stripe customer of the account (create-checkout, customer-portal) ----

// True when a Stripe call failed because the object no longer exists (for
// example a stored customer id that was deleted). Any other error is a real
// failure and must not be treated as "no customer".
export function isStripeResourceMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; raw?: { code?: unknown } | null };
  return e.code === 'resource_missing' || e.raw?.code === 'resource_missing';
}

// A retrieved customer can be used only when it exists and is not a deleted
// stub ({ id, deleted: true }).
export function isUsableStripeCustomer(customer: unknown): boolean {
  if (!customer || typeof customer !== 'object') return false;
  const c = customer as { id?: unknown; deleted?: unknown };
  return typeof c.id === 'string' && !!c.id && c.deleted !== true;
}

export interface StripeCustomerLike {
  id: string;
  deleted?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

// A customer found by EMAIL is accepted only when it carries no user_id or
// the user_id of this account: the email alone does not prove ownership.
export function isEmailCustomerAcceptableForUser(
  customer: StripeCustomerLike | null | undefined,
  userId: string,
): boolean {
  if (!userId || !isUsableStripeCustomer(customer)) return false;
  const owner = customer!.metadata?.user_id;
  if (owner === undefined || owner === null || owner === '') return true;
  return owner === userId;
}

// Picks the customer to reuse among those found by email: one already marked
// with this user first, then one without an owner. Customers of another user
// are never returned; null means a new customer must be created.
export function pickEmailCustomerForUser(
  customers: ReadonlyArray<StripeCustomerLike> | null | undefined,
  userId: string,
): string | null {
  const acceptable = (customers ?? []).filter((c) => isEmailCustomerAcceptableForUser(c, userId));
  const own = acceptable.find((c) => c.metadata?.user_id === userId);
  return (own ?? acceptable[0])?.id ?? null;
}

export const PLAN_CHECKOUT_EVENT = 'checkout.session.completed';
const SUBSCRIPTION_CREATED_EVENT = 'customer.subscription.created';
const SUBSCRIPTION_UPDATED_EVENT = 'customer.subscription.updated';

export interface PlanEventDecisionInput {
  // stripe_subscription_id currently stored on the account, if any.
  storedSubscriptionId: string | null | undefined;
  // subscription_status currently stored on the account, if any.
  storedStatus: string | null | undefined;
  eventSubscriptionId: string;
  // Raw Stripe status of the subscription in the event.
  eventStatus: string;
  // Stripe event type (customer.subscription.* or checkout.session.completed).
  eventType: string;
}

export type PlanEventReason =
  | 'missing_subscription_id'
  | 'incomplete_status'
  | 'stored_subscription'
  | 'stored_already_canceled'
  | 'first_or_after_canceled'
  | 'not_stored_and_not_startable'
  | 'replaces_stored'
  | 'other_subscription_ignored';

export interface PlanEventDecision {
  apply: boolean;
  reason: PlanEventReason;
  // True when a different, not canceled subscription is stored and this event
  // takes its place: the customer may now hold two plan subscriptions.
  replacesStored: boolean;
}

const isLiveStatus = (status: string): boolean =>
  status === 'active' || status === 'trialing';

// Decides whether a PLAN subscription event may change the account.
// a. An incomplete / incomplete_expired event never applies: an unfinished
//    payment attempt must not end a trial nor change the plan shown.
// b. An event of the stored subscription applies (except a.), unless the
//    account is already canceled: a subscription deleted in Stripe does not
//    come back, so a late update or a reprocessed checkout of that same
//    subscription must not reactivate the account.
// c. Nothing stored, or the stored one is canceled: only created / updated /
//    plan checkout with an active or trialing status applies. A deletion, or
//    any other status, of a subscription that is not the stored one is ignored.
// d. Another subscription is stored and not canceled: only a creation (or the
//    plan checkout) with an active or trialing status may replace it. Updates
//    and deletions of another subscription are always ignored, even if active.
export function decidePlanEvent(input: PlanEventDecisionInput): PlanEventDecision {
  const { storedSubscriptionId, storedStatus, eventSubscriptionId, eventStatus, eventType } = input;
  const no = (reason: PlanEventReason): PlanEventDecision =>
    ({ apply: false, reason, replacesStored: false });

  if (!eventSubscriptionId) return no('missing_subscription_id');

  if (eventStatus === 'incomplete' || eventStatus === 'incomplete_expired') {
    return no('incomplete_status');
  }

  if (storedSubscriptionId && storedSubscriptionId === eventSubscriptionId) {
    if (storedStatus === 'canceled') return no('stored_already_canceled');
    return { apply: true, reason: 'stored_subscription', replacesStored: false };
  }

  const live = isLiveStatus(eventStatus);
  const isCreation =
    eventType === SUBSCRIPTION_CREATED_EVENT || eventType === PLAN_CHECKOUT_EVENT;

  if (!storedSubscriptionId || storedStatus === 'canceled') {
    if (live && (isCreation || eventType === SUBSCRIPTION_UPDATED_EVENT)) {
      return { apply: true, reason: 'first_or_after_canceled', replacesStored: false };
    }
    return no('not_stored_and_not_startable');
  }

  if (live && isCreation) {
    return { apply: true, reason: 'replaces_stored', replacesStored: true };
  }
  return no('other_subscription_ignored');
}

export function shouldApplyPlanEvent(input: PlanEventDecisionInput): boolean {
  return decidePlanEvent(input).apply;
}

const idOf = (value: unknown): string | null => {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  return null;
};

// Reads the subscription an invoice belongs to. Older API versions expose
// invoice.subscription; newer ones moved it to
// invoice.parent.subscription_details.subscription. Either may be an id or an
// expanded object.
export function getInvoiceSubscriptionId(invoice: unknown): string | null {
  if (!invoice || typeof invoice !== 'object') return null;
  const inv = invoice as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } | null } | null;
  };
  return idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription);
}

// An invoice may change the account status only when it belongs to the PLAN
// subscription stored on the account. Add-on or unknown invoices never do.
export function isInvoiceForStoredPlan(
  invoiceSubscriptionId: string | null | undefined,
  storedSubscriptionId: string | null | undefined,
): boolean {
  return !!invoiceSubscriptionId && !!storedSubscriptionId &&
    invoiceSubscriptionId === storedSubscriptionId;
}

export interface InvoiceDecisionInput {
  invoiceSubscriptionId: string | null | undefined;
  // stripe_subscription_id and subscription_status stored on the account.
  storedSubscriptionId: string | null | undefined;
  storedStatus: string | null | undefined;
}

// invoice.paid sets the account back to active only for the stored plan
// subscription and only while the account is not canceled: a redelivered
// invoice.paid after the cancellation must not reactivate it.
export function shouldInvoicePaidActivate(input: InvoiceDecisionInput): boolean {
  return isInvoiceForStoredPlan(input.invoiceSubscriptionId, input.storedSubscriptionId) &&
    input.storedStatus !== 'canceled';
}

// invoice.payment_failed marks past_due only for the stored plan subscription
// and only from a status that is still running.
export function shouldInvoiceFailureMarkPastDue(input: InvoiceDecisionInput): boolean {
  return isInvoiceForStoredPlan(input.invoiceSubscriptionId, input.storedSubscriptionId) &&
    (input.storedStatus === 'active' || input.storedStatus === 'trialing' ||
      input.storedStatus === 'past_due');
}

export interface WorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  role: string;
  is_active: boolean | null;
}

// Current billing columns of a candidate workspace.
export interface WorkspaceBillingRow {
  id: string;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
}

export interface PropagationSelection {
  // Workspaces whose only active admin is this user.
  propagate: string[];
  // Workspaces where the user is an active admin among several: left alone.
  skipped: string[];
  // Manual grants (active without a Stripe subscription): never touched.
  manual: string[];
  // Workspaces whose current billing columns were not supplied: left alone.
  unreadable: string[];
}

// A plan granted by hand: active with no Stripe subscription behind it.
export function isManualGrant(
  workspace: Pick<WorkspaceBillingRow, 'subscription_status' | 'stripe_subscription_id'>,
): boolean {
  return workspace.subscription_status === 'active' && !workspace.stripe_subscription_id;
}

// There is no owner column: "owner" = active admin. The plan is only copied
// to a workspace when it has EXACTLY ONE active admin and it is this user.
// `members` should hold the member rows of the candidate workspaces; rows
// that are not active admins are ignored here. `workspaces` holds the current
// billing columns of the candidates: a manual grant is never selected, and a
// workspace without a row here is not selected either (fail closed).
export function selectWorkspacesForPropagation(
  userId: string,
  members: WorkspaceMemberRow[],
  workspaces: WorkspaceBillingRow[],
): PropagationSelection {
  const adminsByWorkspace = new Map<string, Set<string>>();

  for (const m of members ?? []) {
    if (!m || !m.workspace_id || !m.user_id) continue;
    if (m.role !== 'admin' || m.is_active !== true) continue;
    let admins = adminsByWorkspace.get(m.workspace_id);
    if (!admins) {
      admins = new Set<string>();
      adminsByWorkspace.set(m.workspace_id, admins);
    }
    admins.add(m.user_id);
  }

  const billingByWorkspace = new Map<string, WorkspaceBillingRow>();
  for (const w of workspaces ?? []) {
    if (w && w.id) billingByWorkspace.set(w.id, w);
  }

  const selection: PropagationSelection = {
    propagate: [],
    skipped: [],
    manual: [],
    unreadable: [],
  };

  if (!userId) return selection;

  adminsByWorkspace.forEach((admins, workspaceId) => {
    if (!admins.has(userId)) return;
    if (admins.size !== 1) {
      selection.skipped.push(workspaceId);
      return;
    }
    const billing = billingByWorkspace.get(workspaceId);
    if (!billing) selection.unreadable.push(workspaceId);
    else if (isManualGrant(billing)) selection.manual.push(workspaceId);
    else selection.propagate.push(workspaceId);
  });

  return selection;
}

export interface AccountPlanRow {
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface WorkspacePlanPatch {
  patch: Partial<AccountPlanRow>;
  // True when status and trial end were left out of the patch.
  statusWithheld: boolean;
}

// Columns copied from the account to a workspace. An account that is trialing
// with no end date would read as "active with no deadline" on the workspace,
// so in that case the workspace status and trial end are left as they are.
export function buildWorkspacePlanPatch(account: AccountPlanRow): WorkspacePlanPatch {
  const patch: Partial<AccountPlanRow> = {
    subscription_plan: account.subscription_plan,
    stripe_customer_id: account.stripe_customer_id,
    stripe_subscription_id: account.stripe_subscription_id,
  };

  if (account.subscription_status === 'trialing' && !account.trial_ends_at) {
    return { patch, statusWithheld: true };
  }

  patch.subscription_status = account.subscription_status;
  patch.trial_ends_at = account.trial_ends_at;
  return { patch, statusWithheld: false };
}
