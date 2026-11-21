import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
// Product maps and the billing rules (classification, plan-event guard,
// workspace selection, invoice subscription id) live in the shared pure module
// so they can be unit tested.
import {
  DEFAULT_BASE_STORAGE_BYTES,
  PLAN_CHECKOUT_EVENT,
  buildWorkspacePlanPatch,
  classifyProduct,
  decidePlanEvent,
  getInvoiceSubscriptionId,
  mapStripeSubscriptionStatus,
  selectWorkspacesForPropagation,
  shouldInvoiceFailureMarkPastDue,
  shouldInvoicePaidActivate,
  type WorkspaceBillingRow,
  type WorkspaceMemberRow,
} from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-internal-retry-secret, x-inbox-id",
};

// Helper logging function for debugging - only logs when DEBUG=true
// Security: Sanitizes PII and sensitive data before logging
const DEBUG = Deno.env.get("DEBUG") === "true";

// Sanitize sensitive fields from log output to prevent PII leakage
const sanitizeForLogging = (details: any): any => {
  if (!details || typeof details !== 'object') return details;
  
  const sanitized = { ...details };
  
  // Fully redact sensitive fields
  const sensitiveFields = ['email', 'vatId', 'customer_tax_id', 'customerEmail'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Truncate IDs for correlation while hiding full value
  const idFields = ['customerId', 'subscriptionId', 'storedSubscriptionId', 'invoiceId', 'sessionId', 'userId'];
  idFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].substring(0, 12) + '...';
    }
  });
  
  // Redact metadata which may contain user data
  if (sanitized.metadata) {
    sanitized.metadata = '[REDACTED]';
  }
  
  return sanitized;
};

const logStep = (step: string, details?: any) => {
  if (!DEBUG) return;
  const sanitized = sanitizeForLogging(details);
  const detailsStr = sanitized ? ` - ${JSON.stringify(sanitized)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Always-on log for billing decisions that skip or refuse a write. Same
// sanitisation as logStep; callers pass ids only, never emails.
const logDecision = (step: string, details?: any) => {
  const sanitized = sanitizeForLogging(details);
  const detailsStr = sanitized ? ` - ${JSON.stringify(sanitized)}` : '';
  console.warn(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// The plan belongs to the ACCOUNT (user_subscriptions). Copy plan/status from
// the account to the workspaces this user owns. There is no owner column:
// a workspace is only updated when it has exactly one active admin and it is
// this user. Workspaces with several active admins are left alone and logged.
// A workspace that is active without a Stripe subscription is a manual grant
// and is never touched.
// Errors are logged and never interrupt the webhook.
const propagateAccountPlan = async (supabaseAdmin: any, userId: string): Promise<void> => {
  try {
    if (!userId) return;

    const { data: account, error: accountError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('subscription_plan, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (accountError || !account) {
      logDecision("Propagation skipped: account subscription not readable", {
        userId,
        error: accountError?.message,
      });
      return;
    }

    const { data: ownMemberships, error: ownError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (ownError) {
      logDecision("Propagation skipped: could not read memberships", { userId, error: ownError.message });
      return;
    }

    const candidateIds: string[] = Array.from(
      new Set<string>((ownMemberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)),
    );
    if (candidateIds.length === 0) {
      logStep("Propagation: user is not an active admin of any workspace", { userId });
      return;
    }

    // Count active admins per workspace. One small query per workspace so a
    // row cap can never hide a second admin; a failed read skips the workspace.
    const adminRows: WorkspaceMemberRow[] = [];
    for (const workspaceId of candidateIds) {
      const { data: admins, error: adminsError } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id, user_id, role, is_active')
        .eq('workspace_id', workspaceId)
        .eq('role', 'admin')
        .eq('is_active', true);

      if (adminsError || !admins) {
        logDecision("Propagation skipped for workspace: could not count admins", {
          workspaceId,
          error: adminsError?.message,
        });
        continue;
      }
      adminRows.push(...(admins as WorkspaceMemberRow[]));
    }

    // Current billing columns of the candidates, to recognise manual grants.
    // A failed read propagates nothing (fail closed).
    const { data: billingRows, error: billingError } = await supabaseAdmin
      .from('workspaces')
      .select('id, subscription_status, stripe_subscription_id')
      .in('id', candidateIds);

    if (billingError || !billingRows) {
      logDecision("Propagation skipped: could not read workspaces", {
        userId,
        error: billingError?.message,
      });
      return;
    }

    const { propagate, skipped, manual, unreadable } = selectWorkspacesForPropagation(
      userId,
      adminRows,
      billingRows as WorkspaceBillingRow[],
    );

    if (skipped.length > 0) {
      logDecision("Propagation skipped: workspaces with several active admins", {
        userId,
        workspaceIds: skipped,
      });
    }
    if (manual.length > 0) {
      logDecision("Propagation skipped: manually granted workspaces", {
        userId,
        workspaceIds: manual,
      });
    }
    if (unreadable.length > 0) {
      logDecision("Propagation skipped: workspace billing state not readable", {
        userId,
        workspaceIds: unreadable,
      });
    }

    const { patch, statusWithheld } = buildWorkspacePlanPatch(account);
    if (statusWithheld && propagate.length > 0) {
      logDecision("Propagation: account trialing without end date, workspace status and trial end untouched", {
        userId,
        workspaceIds: propagate,
      });
    }

    for (const workspaceId of propagate) {
      const { error: updateError } = await supabaseAdmin
        .from('workspaces')
        .update(patch)
        .eq('id', workspaceId);

      if (updateError) {
        logDecision("Propagation failed for workspace", { workspaceId, error: updateError.message });
      }
    }

    logStep("Account plan propagated", {
      userId,
      workspaces: propagate.length,
      skipped: skipped.length,
      manual: manual.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logDecision("Propagation error", { userId, error: message });
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Detect internal retry mode (called by webhook-retry-worker)
  const internalSecret = req.headers.get("x-internal-retry-secret");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const isInternalRetry = !!internalSecret && internalSecret === serviceRoleKey;
  let inboxId = req.headers.get("x-inbox-id");

  // Initialize Supabase client with service role key for admin access
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received", { internalRetry: isInternalRetry });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    let event: Stripe.Event;

    if (isInternalRetry) {
      // Trusted internal retry: body is the raw event JSON
      event = JSON.parse(body) as Stripe.Event;
      logStep("Internal retry event loaded", { eventType: event.type, eventId: event.id, inboxId });
    } else {
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET is not set");
      }
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        logStep("ERROR: No stripe-signature header");
        return new Response(JSON.stringify({ error: "No signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Signature verified", { eventType: event.type, eventId: event.id });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("ERROR: Signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Upsert into webhook_inbox (idempotency)
      const { data: inboxRow, error: inboxErr } = await supabaseClient
        .from("webhook_inbox")
        .upsert(
          {
            provider: "stripe",
            event_id: event.id,
            event_type: event.type,
            payload: event as unknown as Record<string, unknown>,
            status: "processing",
            attempts: 1,
            locked_at: new Date().toISOString(),
          },
          { onConflict: "provider,event_id", ignoreDuplicates: false }
        )
        .select("id, status, processed_at")
        .single();

      if (inboxErr) {
        logStep("WARN: inbox upsert failed, continuing", { error: inboxErr.message });
      } else if (inboxRow) {
        inboxId = inboxRow.id;
        // If already processed previously, ack and skip
        if (inboxRow.processed_at) {
          logStep("Event already processed, skipping", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, deduplicated: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }


    // Helper function to find user by email
    const findUserByEmail = async (email: string) => {
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error) {
        logStep("Error finding user by email", { email, error: error.message });
        return null;
      }
      return profile?.id;
    };

    // Helper function to update user subscription
    const updateUserSubscription = async (
      userId: string,
      updates: {
        subscription_plan?: string;
        subscription_status?: string;
        stripe_customer_id?: string;
        stripe_subscription_id?: string;
        trial_ends_at?: string | null;
        current_period_end?: string | null;
      }
    ) => {
      // Try to update existing record
      const { data: existing, error: selectError } = await supabaseClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        
        if (error) {
          logStep("ERROR updating user subscription", { userId, error: error.message });
          return false;
        }
      } else {
        // Insert new record
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            subscription_plan: updates.subscription_plan || 'starter',
            subscription_status: updates.subscription_status || 'trialing',
            ...updates,
          });
        
        if (error) {
          logStep("ERROR inserting user subscription", { userId, error: error.message });
          return false;
        }
      }
      
      return true;
    };

    // Helper: find the account a PLAN subscription belongs to. Uses the
    // subscription metadata first, then the stored Stripe customer. Returns
    // null (after logging) when the account is missing or ambiguous, so the
    // caller writes nothing.
    const findAccountForSubscription = async (
      subscription: Stripe.Subscription
    ): Promise<{
      userId: string;
      hasRow: boolean;
      storedSubscriptionId: string | null;
      storedStatus: string | null;
    } | null> => {
      const metadataUserId = subscription.metadata?.user_id;
      const customerId = subscription.customer as string;

      if (metadataUserId) {
        const { data: row, error } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id, stripe_subscription_id, subscription_status')
          .eq('user_id', metadataUserId)
          .maybeSingle();

        if (error) {
          logDecision("Plan event ignored: account lookup failed", {
            subscriptionId: subscription.id,
            error: error.message,
          });
          return null;
        }
        return {
          userId: metadataUserId,
          hasRow: !!row,
          storedSubscriptionId: row?.stripe_subscription_id ?? null,
          storedStatus: row?.subscription_status ?? null,
        };
      }

      if (!customerId) {
        logDecision("Plan event ignored: no user or customer on subscription", {
          subscriptionId: subscription.id,
        });
        return null;
      }

      const { data: row, error } = await supabaseClient
        .from('user_subscriptions')
        .select('user_id, stripe_subscription_id, subscription_status')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (error || !row?.user_id) {
        logDecision("Plan event ignored: account not found or ambiguous for customer", {
          subscriptionId: subscription.id,
          customerId,
          error: error?.message,
        });
        return null;
      }
      return {
        userId: row.user_id,
        hasRow: true,
        storedSubscriptionId: row.stripe_subscription_id ?? null,
        storedStatus: row.subscription_status ?? null,
      };
    };

    // Process the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription,
          metadata: session.metadata
        });

        if (session.mode === "subscription" && session.subscription) {
          const userId = session.metadata?.user_id;
          const customerEmail = session.customer_email;
          
          // Try to find user ID from metadata first, then by email
          let targetUserId = userId;
          if (!targetUserId && customerEmail) {
            targetUserId = await findUserByEmail(customerEmail);
          }

          if (!targetUserId) {
            logStep("WARNING: Could not find user for checkout session");
            break;
          }

          // Get subscription details to determine the plan
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price.product as string;
          
          const classification = classifyProduct(productId, {
            ...(subscription.metadata ?? {}),
            ...(session.metadata ?? {}),
          });

          if (classification.kind === 'unknown') {
            logDecision("Checkout ignored: unknown product", {
              sessionId: session.id,
              subscriptionId: subscription.id,
              productId,
            });
            break;
          }

          // Storage addon purchase: credits storage only, never the plan
          if (classification.kind === 'storage_addon') {
            const workspaceId = session.metadata?.workspace_id;
            if (!workspaceId) {
              logStep("WARNING: Storage addon purchase without workspace_id");
              break;
            }
            
            const addonInfo = { tier: classification.tier, bytes: classification.bytes };
            logStep("Processing storage addon purchase", { 
              workspaceId, 
              tier: addonInfo.tier, 
              bytes: addonInfo.bytes 
            });
            
            // Update workspace_storage with the addon
            const { data: existingStorage, error: storageError } = await supabaseClient
              .from('workspace_storage')
              .select('*')
              .eq('workspace_id', workspaceId)
              .maybeSingle();

            // A failed read or write throws: the event is then marked failed
            // in the inbox and retried instead of being marked processed.
            if (storageError) {
              throw new Error(`Storage addon credit: could not read workspace storage (${storageError.message})`);
            }

            let addonWriteError: { message: string } | null = null;
            if (existingStorage) {
              // Update existing record
              ({ error: addonWriteError } = await supabaseClient
                .from('workspace_storage')
                .update({
                  extra_storage_bytes: addonInfo.bytes,
                  storage_limit_bytes: (existingStorage.base_storage_bytes || 10737418240) + addonInfo.bytes,
                  addon_tier: addonInfo.tier,
                  stripe_addon_subscription_id: session.subscription as string,
                  last_calculated_at: new Date().toISOString(),
                })
                .eq('workspace_id', workspaceId));
            } else {
              // Insert new record
              ({ error: addonWriteError } = await supabaseClient
                .from('workspace_storage')
                .insert({
                  workspace_id: workspaceId,
                  storage_used_bytes: 0,
                  base_storage_bytes: 10737418240, // 10GB
                  extra_storage_bytes: addonInfo.bytes,
                  storage_limit_bytes: 10737418240 + addonInfo.bytes,
                  addon_tier: addonInfo.tier,
                  stripe_addon_subscription_id: session.subscription as string,
                }));
            }

            if (addonWriteError) {
              throw new Error(`Storage addon credit: write failed (${addonWriteError.message})`);
            }
            
            logStep("Storage addon activated", { workspaceId, tier: addonInfo.tier });
            break;
          }
          
          // Regular subscription plan purchase
          const plan = classification.plan;

          // Same guard as the subscription events. A failed read throws so
          // the paid checkout is retried from the inbox, never dropped.
          const { data: accountRow, error: accountRowError } = await supabaseClient
            .from('user_subscriptions')
            .select('stripe_subscription_id, subscription_status')
            .eq('user_id', targetUserId)
            .maybeSingle();

          if (accountRowError) {
            throw new Error(`Plan checkout: could not read account (${accountRowError.message})`);
          }

          const checkoutDecision = decidePlanEvent({
            storedSubscriptionId: accountRow?.stripe_subscription_id ?? null,
            storedStatus: accountRow?.subscription_status ?? null,
            eventSubscriptionId: subscription.id,
            eventStatus: subscription.status,
            eventType: PLAN_CHECKOUT_EVENT,
          });

          if (!checkoutDecision.apply) {
            logDecision("Plan checkout ignored", {
              userId: targetUserId,
              subscriptionId: subscription.id,
              status: subscription.status,
              reason: checkoutDecision.reason,
            });
            break;
          }

          if (checkoutDecision.replacesStored) {
            logDecision("Plan checkout replaces another stored subscription: possible double subscription", {
              userId: targetUserId,
              subscriptionId: subscription.id,
              storedSubscriptionId: accountRow?.stripe_subscription_id,
            });
          }
          
          const currentPeriodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          // Calculate trial_ends_at for trialing subscriptions
          let trialEndsAt: string | null = null;
          if (subscription.status === 'trialing' && subscription.trial_end) {
            trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
          } else if (subscription.status === 'trialing') {
            // Fallback for a new Stripe trial without an explicit end date
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 7);
            trialEndsAt = trialEnd.toISOString();
          }

          logStep("Updating user subscription after checkout", { 
            userId: targetUserId, 
            customerId: session.customer, 
            subscriptionId: session.subscription,
            plan,
            status: subscription.status,
            trialEndsAt
          });

          await updateUserSubscription(targetUserId, {
            subscription_plan: plan,
            subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            trial_ends_at: trialEndsAt,
            current_period_end: currentPeriodEnd,
          });

          // The plan belongs to the account: copy it to the owned workspaces
          await propagateAccountPlan(supabaseClient, targetUserId);
          
          logStep("User subscription updated successfully", { userId: targetUserId, plan, trialEndsAt });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep(`Processing ${event.type}`, { 
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        });

        const customerId = subscription.customer as string;
        const productId = subscription.items.data[0]?.price.product as string;
        const classification = classifyProduct(productId, subscription.metadata);

        // Storage addon: never changes the account plan/status or workspaces
        if (classification.kind === 'storage_addon') {
          logStep("Storage addon subscription event: plan untouched", { subscriptionId: subscription.id });
          break;
        }

        if (classification.kind === 'unknown') {
          logDecision("Subscription event ignored: unknown product", {
            subscriptionId: subscription.id,
            productId,
          });
          break;
        }

        const plan = classification.plan;

        const account = await findAccountForSubscription(subscription);
        if (!account) {
          break;
        }

        // Guard: an old or secondary subscription must not overwrite the
        // plan subscription stored on the account
        const decision = decidePlanEvent({
          storedSubscriptionId: account.storedSubscriptionId,
          storedStatus: account.storedStatus,
          eventSubscriptionId: subscription.id,
          eventStatus: subscription.status,
          eventType: event.type,
        });

        if (!decision.apply) {
          logDecision("Plan event ignored", {
            userId: account.userId,
            subscriptionId: subscription.id,
            status: subscription.status,
            reason: decision.reason,
          });
          break;
        }

        if (decision.replacesStored) {
          logDecision("Plan event replaces another stored subscription: possible double subscription", {
            userId: account.userId,
            subscriptionId: subscription.id,
            storedSubscriptionId: account.storedSubscriptionId,
          });
        }
        
        const currentPeriodEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Calculate trial_ends_at for trialing subscriptions
        let trialEndsAt: string | null = null;
        if (subscription.status === 'trialing' && subscription.trial_end) {
          trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
        }

        // Map Stripe status to our status
        const subscriptionStatus = mapStripeSubscriptionStatus(subscription.status);

        const updated = await updateUserSubscription(account.userId, {
          subscription_plan: plan,
          subscription_status: subscriptionStatus,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_end: currentPeriodEnd,
          trial_ends_at: trialEndsAt,
        });
        logStep("User subscription updated", { userId: account.userId, plan, status: subscriptionStatus, trialEndsAt });

        // The plan belongs to the account: copy it to the owned workspaces
        if (updated) {
          await propagateAccountPlan(supabaseClient, account.userId);
        }
        
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { 
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });

        const customerId = subscription.customer as string;
        const productId = subscription.items.data[0]?.price.product as string;

        const classification = classifyProduct(productId, subscription.metadata);

        // Storage addon cancellation: restores base storage, never the plan
        if (classification.kind === 'storage_addon') {
          logStep("Processing storage addon cancellation");
          
          // Find and update the workspace storage
          const { data: storageRecords, error: storageReadError } = await supabaseClient
            .from('workspace_storage')
            .select('workspace_id, base_storage_bytes')
            .eq('stripe_addon_subscription_id', subscription.id);

          // A failed read or write throws: the event is then marked failed
          // in the inbox and retried instead of being marked processed.
          if (storageReadError) {
            throw new Error(`Storage addon removal: could not read workspace storage (${storageReadError.message})`);
          }
          
          if (storageRecords && storageRecords.length > 0) {
            for (const record of storageRecords) {
              const { error: resetError } = await supabaseClient
                .from('workspace_storage')
                .update({
                  extra_storage_bytes: 0,
                  // Reset to the workspace base quota (fallback: 10GB)
                  storage_limit_bytes: record.base_storage_bytes || DEFAULT_BASE_STORAGE_BYTES,
                  addon_tier: null,
                  stripe_addon_subscription_id: null,
                  last_calculated_at: new Date().toISOString(),
                })
                .eq('workspace_id', record.workspace_id);

              if (resetError) {
                throw new Error(`Storage addon removal: write failed (${resetError.message})`);
              }
              
              logStep("Storage addon removed", { workspaceId: record.workspace_id });
            }
          }
          break;
        }

        if (classification.kind === 'unknown') {
          logDecision("Subscription deletion ignored: unknown product", {
            subscriptionId: subscription.id,
            productId,
          });
          break;
        }

        // Regular plan cancellation: only the stored plan subscription may
        // cancel the account
        const account = await findAccountForSubscription(subscription);
        if (!account) {
          break;
        }

        // A deletion never creates an account row
        if (!account.hasRow) {
          logDecision("Plan deletion ignored: account has no subscription row", {
            userId: account.userId,
            subscriptionId: subscription.id,
          });
          break;
        }

        const deletionDecision = decidePlanEvent({
          storedSubscriptionId: account.storedSubscriptionId,
          storedStatus: account.storedStatus,
          eventSubscriptionId: subscription.id,
          eventStatus: subscription.status,
          eventType: event.type,
        });

        if (!deletionDecision.apply) {
          logDecision("Plan deletion ignored", {
            userId: account.userId,
            subscriptionId: subscription.id,
            reason: deletionDecision.reason,
          });
          break;
        }

        const canceled = await updateUserSubscription(account.userId, {
          subscription_status: "canceled",
        });
        logStep("User subscription marked as canceled", { userId: account.userId });

        // The plan belongs to the account: copy it to the owned workspaces
        if (canceled) {
          await propagateAccountPlan(supabaseClient, account.userId);
        }
        
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.paid", { 
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: getInvoiceSubscriptionId(invoice)
        });

        const customerId = invoice.customer as string;
        const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);

        // Find user by Stripe customer ID
        const { data: userSubForInvoice } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id, stripe_subscription_id, subscription_status')
          .eq('stripe_customer_id', customerId)
          .single();

        // ========== EU VAT COMPLIANCE: Store fiscal evidence ==========
        try {
          // Extract customer country from billing address or tax IDs
          const customerCountry = invoice.customer_address?.country || 
                                  (invoice.customer_tax_ids && invoice.customer_tax_ids.length > 0 
                                    ? invoice.customer_tax_ids[0].value?.substring(0, 2) 
                                    : null);
          
          // Extract tax information
          const taxData = invoice.total_tax_amounts && invoice.total_tax_amounts.length > 0 
            ? invoice.total_tax_amounts[0] 
            : null;
          
          let taxRatePercent: number | null = null;
          let taxType: string | null = null;
          
          if (taxData?.tax_rate && typeof taxData.tax_rate === 'string') {
            const taxRateDetails = await stripe.taxRates.retrieve(taxData.tax_rate);
            taxRatePercent = taxRateDetails.percentage;
            taxType = taxRateDetails.tax_type || null;
          }
          
          // Extract customer VAT ID if provided
          const customerTaxId = invoice.customer_tax_ids && invoice.customer_tax_ids.length > 0 
            ? invoice.customer_tax_ids[0] 
            : null;

          // Find workspace from subscription metadata or user workspaces
          let workspaceIdForInvoice: string | null = null;
          if (userSubForInvoice?.user_id) {
            const { data: membership } = await supabaseClient
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', userSubForInvoice.user_id)
              .eq('role', 'admin')
              .single();
            workspaceIdForInvoice = membership?.workspace_id || null;
          }

          const invoiceData = {
            user_id: userSubForInvoice?.user_id || null,
            workspace_id: workspaceIdForInvoice,
            stripe_invoice_id: invoice.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: invoice.subscription as string || null,
            stripe_charge_id: invoice.charge as string || null,
            amount_total: invoice.total,
            amount_subtotal: invoice.subtotal,
            amount_tax: invoice.tax || 0,
            currency: invoice.currency,
            customer_country: customerCountry,
            tax_rate_percent: taxRatePercent,
            tax_type: taxType,
            customer_tax_id: customerTaxId?.value || null,
            customer_tax_id_valid: customerTaxId?.verification?.status === 'verified',
            status: 'paid',
            paid_at: new Date().toISOString(),
            invoice_pdf_url: invoice.invoice_pdf || null,
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            billing_reason: invoice.billing_reason || null,
          };

          const { error: invoiceInsertError } = await supabaseClient
            .from('subscription_invoices')
            .upsert(invoiceData, { onConflict: 'stripe_invoice_id' });

          if (invoiceInsertError) {
            logStep("WARNING: Failed to store invoice fiscal data", { error: invoiceInsertError.message });
          } else {
            logStep("Invoice fiscal evidence stored", { 
              invoiceId: invoice.id, 
              country: customerCountry, 
              taxRate: taxRatePercent,
              vatId: customerTaxId?.value 
            });
          }
        } catch (fiscalError) {
          const fiscalErrorMsg = fiscalError instanceof Error ? fiscalError.message : String(fiscalError);
          logStep("WARNING: Error processing fiscal data", { error: fiscalErrorMsg });
          // Don't throw - we still want to update the subscription status
        }
        // ========== END EU VAT COMPLIANCE ==========

        // Only an invoice of the stored PLAN subscription changes the account
        // status, and never when the account is already canceled (a redelivered
        // invoice.paid must not reactivate it). Addon or unknown-subscription
        // invoices leave it untouched.
        if (
          userSubForInvoice?.user_id &&
          shouldInvoicePaidActivate({
            invoiceSubscriptionId,
            storedSubscriptionId: userSubForInvoice.stripe_subscription_id,
            storedStatus: userSubForInvoice.subscription_status,
          })
        ) {
          const activated = await updateUserSubscription(userSubForInvoice.user_id, {
            subscription_status: "active",
          });

          // The plan belongs to the account: copy it to the owned workspaces
          if (activated) {
            await propagateAccountPlan(supabaseClient, userSubForInvoice.user_id);
          }
          
          logStep("Subscription status updated to active after invoice paid");
        } else if (invoiceSubscriptionId) {
          logDecision("Invoice paid: not the stored plan subscription or account canceled, account status untouched", {
            invoiceId: invoice.id,
            subscriptionId: invoiceSubscriptionId,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", { 
          invoiceId: invoice.id,
          customerId: invoice.customer
        });

        const customerId = invoice.customer as string;
        const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);

        // Find the account by Stripe customer ID
        const { data: userSub, error: userSubError } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id, stripe_subscription_id, subscription_status')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        // Only an invoice of the stored PLAN subscription changes the account
        // status, and only from active, trialing or past_due. Addon or
        // unknown-subscription invoices leave it untouched.
        if (
          !userSubError &&
          userSub?.user_id &&
          shouldInvoiceFailureMarkPastDue({
            invoiceSubscriptionId,
            storedSubscriptionId: userSub.stripe_subscription_id,
            storedStatus: userSub.subscription_status,
          })
        ) {
          const marked = await updateUserSubscription(userSub.user_id, {
            subscription_status: "past_due",
          });

          // The plan belongs to the account: copy it to the owned workspaces
          if (marked) {
            await propagateAccountPlan(supabaseClient, userSub.user_id);
          }
          
          logStep("Subscription status updated to past_due after payment failure");
        } else {
          logDecision("Invoice payment failed: not the stored plan subscription or account not running, account status untouched", {
            invoiceId: invoice.id,
            subscriptionId: invoiceSubscriptionId,
            error: userSubError?.message,
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Mark inbox row as processed (idempotent)
    if (inboxId) {
      await supabaseClient.rpc("webhook_inbox_mark_processed", { p_id: inboxId });
    }

    // Always return 200 to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });

    // Schedule retry via inbox (do not 200-and-forget anymore)
    if (inboxId) {
      await supabaseClient.rpc("webhook_inbox_mark_failed", { p_id: inboxId, p_error: errorMessage });
    }

    // For internal retries we surface 500 so the worker knows it failed
    const status = isInternalRetry ? 500 : 200;
    return new Response(JSON.stringify({ error: errorMessage, received: true, will_retry: !!inboxId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
