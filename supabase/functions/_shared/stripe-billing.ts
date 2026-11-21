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
export function mapStripeSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    default:
      return status;
  }
}

export interface PlanEventDecisionInput {
  // stripe_subscription_id currently stored on the account, if any.
  storedSubscriptionId: string | null | undefined;
  // subscription_status currently stored on the account, if any.
  storedStatus: string | null | undefined;
  eventSubscriptionId: string;
  // Raw Stripe status of the subscription in the event.
  eventStatus: string;
  eventType: string;
}

// Decides whether a PLAN subscription event may change the account.
// - No stored subscription, or the same subscription: accept.
// - A deletion of any other subscription: ignore (never cancels the account).
// - Another subscription while the stored one is not canceled: accept only
//   when the event subscription is active/trialing (a new one replacing it).
// - Another subscription while the stored one is canceled: accept.
export function shouldApplyPlanEvent(input: PlanEventDecisionInput): boolean {
  const { storedSubscriptionId, storedStatus, eventSubscriptionId, eventStatus, eventType } = input;

  if (!eventSubscriptionId) return false;
  if (!storedSubscriptionId) return true;
  if (storedSubscriptionId === eventSubscriptionId) return true;

  if (eventType === 'customer.subscription.deleted') return false;

  if (storedStatus === 'canceled') return true;
  return eventStatus === 'active' || eventStatus === 'trialing';
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

export interface WorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  role: string;
  is_active: boolean | null;
}

export interface PropagationSelection {
  // Workspaces whose only active admin is this user.
  propagate: string[];
  // Workspaces where the user is an active admin among several: left alone.
  skipped: string[];
}

// There is no owner column: "owner" = active admin. The plan is only copied
// to a workspace when it has EXACTLY ONE active admin and it is this user.
// `members` should hold the member rows of the candidate workspaces; rows
// that are not active admins are ignored here.
export function selectWorkspacesForPropagation(
  userId: string,
  members: WorkspaceMemberRow[],
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

  const propagate: string[] = [];
  const skipped: string[] = [];

  if (!userId) return { propagate, skipped };

  adminsByWorkspace.forEach((admins, workspaceId) => {
    if (!admins.has(userId)) return;
    if (admins.size === 1) propagate.push(workspaceId);
    else skipped.push(workspaceId);
  });

  return { propagate, skipped };
}
