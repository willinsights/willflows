import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Product ID to Plan mapping - now using 'starter' instead of 'essencial'
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_Tl6rw16ZNqHrWd': 'starter', // Starter plan
  'prod_Tl6rsZkoz6yqYu': 'pro',
  'prod_Tl6rxTvnCICjTL': 'studio',
};

// Storage Addon Product IDs to tier mapping
const STORAGE_ADDON_PRODUCTS: Record<string, { tier: '50gb' | '100gb' | '250gb'; bytes: number }> = {
  'prod_TsfrcvSlClixZM': { tier: '50gb', bytes: 50 * 1024 * 1024 * 1024 },
  'prod_TsfrGDXzlIOhaM': { tier: '100gb', bytes: 100 * 1024 * 1024 * 1024 },
  'prod_TsfrRubX5bCWEh': { tier: '250gb', bytes: 250 * 1024 * 1024 * 1024 },
};

// Check if a product is a storage addon
const isStorageAddon = (productId: string): boolean => {
  return productId in STORAGE_ADDON_PRODUCTS;
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
  const idFields = ['customerId', 'subscriptionId', 'invoiceId', 'sessionId', 'userId'];
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
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

    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
          
          // Check if this is a storage addon purchase
          if (isStorageAddon(productId)) {
            const workspaceId = session.metadata?.workspace_id;
            if (!workspaceId) {
              logStep("WARNING: Storage addon purchase without workspace_id");
              break;
            }
            
            const addonInfo = STORAGE_ADDON_PRODUCTS[productId];
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
              .single();
            
            if (existingStorage) {
              // Update existing record
              await supabaseClient
                .from('workspace_storage')
                .update({
                  extra_storage_bytes: addonInfo.bytes,
                  storage_limit_bytes: (existingStorage.base_storage_bytes || 10737418240) + addonInfo.bytes,
                  addon_tier: addonInfo.tier,
                  stripe_addon_subscription_id: session.subscription as string,
                  last_calculated_at: new Date().toISOString(),
                })
                .eq('workspace_id', workspaceId);
            } else {
              // Insert new record
              await supabaseClient
                .from('workspace_storage')
                .insert({
                  workspace_id: workspaceId,
                  storage_used_bytes: 0,
                  base_storage_bytes: 10737418240, // 10GB
                  extra_storage_bytes: addonInfo.bytes,
                  storage_limit_bytes: 10737418240 + addonInfo.bytes,
                  addon_tier: addonInfo.tier,
                  stripe_addon_subscription_id: session.subscription as string,
                });
            }
            
            logStep("Storage addon activated", { workspaceId, tier: addonInfo.tier });
            break;
          }
          
          // Regular subscription plan purchase
          const plan = PRODUCT_TO_PLAN[productId] || 'starter';
          
          const currentPeriodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          // Calculate trial_ends_at for trialing subscriptions
          let trialEndsAt: string | null = null;
          if (subscription.status === 'trialing' && subscription.trial_end) {
            trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
          } else if (subscription.status === 'trialing') {
            // Fallback: set trial to 30 days from now (BÓNUS DE LANÇAMENTO)
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 30);
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

          // Also update workspace for backward compatibility
          const workspaceId = session.metadata?.workspace_id;
          if (workspaceId) {
            await supabaseClient
              .from("workspaces")
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                subscription_plan: plan,
                subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
                trial_ends_at: trialEndsAt,
              })
              .eq("id", workspaceId);
          }
          
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
        const plan = PRODUCT_TO_PLAN[productId] || 'starter';
        
        const currentPeriodEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Calculate trial_ends_at for trialing subscriptions
        let trialEndsAt: string | null = null;
        if (subscription.status === 'trialing' && subscription.trial_end) {
          trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
        }

        // Map Stripe status to our status
        let subscriptionStatus: string;
        switch (subscription.status) {
          case "active":
            subscriptionStatus = "active";
            break;
          case "trialing":
            subscriptionStatus = "trialing";
            break;
          case "past_due":
            subscriptionStatus = "past_due";
            break;
          case "canceled":
          case "unpaid":
            subscriptionStatus = "canceled";
            break;
          default:
            subscriptionStatus = subscription.status;
        }

        // Find user by Stripe customer ID
        const { data: userSub } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userSub?.user_id) {
          await updateUserSubscription(userSub.user_id, {
            subscription_plan: plan,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
            current_period_end: currentPeriodEnd,
            trial_ends_at: trialEndsAt,
          });
          logStep("User subscription updated", { userId: userSub.user_id, plan, status: subscriptionStatus, trialEndsAt });
        }

        // Also update workspace for backward compatibility
        await supabaseClient
          .from("workspaces")
          .update({
            subscription_plan: plan,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
            trial_ends_at: trialEndsAt,
          })
          .eq("stripe_customer_id", customerId);
        
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

        // Check if this is a storage addon cancellation
        if (isStorageAddon(productId)) {
          logStep("Processing storage addon cancellation");
          
          // Find and update the workspace storage
          const { data: storageRecords } = await supabaseClient
            .from('workspace_storage')
            .select('workspace_id')
            .eq('stripe_addon_subscription_id', subscription.id);
          
          if (storageRecords && storageRecords.length > 0) {
            for (const record of storageRecords) {
              await supabaseClient
                .from('workspace_storage')
                .update({
                  extra_storage_bytes: 0,
                  storage_limit_bytes: 10737418240, // Reset to base 10GB
                  addon_tier: null,
                  stripe_addon_subscription_id: null,
                  last_calculated_at: new Date().toISOString(),
                })
                .eq('workspace_id', record.workspace_id);
              
              logStep("Storage addon removed", { workspaceId: record.workspace_id });
            }
          }
          break;
        }

        // Regular subscription cancellation
        // Update user subscription
        const { data: userSub } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userSub?.user_id) {
          await updateUserSubscription(userSub.user_id, {
            subscription_status: "canceled",
          });
          logStep("User subscription marked as canceled", { userId: userSub.user_id });
        }

        // Also update workspace for backward compatibility
        await supabaseClient
          .from("workspaces")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);
        
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.paid", { 
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        });

        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const { data: userSubForInvoice } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
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

        if (invoice.subscription) {
          if (userSubForInvoice?.user_id) {
            await updateUserSubscription(userSubForInvoice.user_id, {
              subscription_status: "active",
            });
          }

          // Also update workspace for backward compatibility
          await supabaseClient
            .from("workspaces")
            .update({ subscription_status: "active" })
            .eq("stripe_customer_id", customerId);
          
          logStep("Subscription status updated to active after invoice paid");
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

        // Update user subscription
        const { data: userSub } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userSub?.user_id) {
          await updateUserSubscription(userSub.user_id, {
            subscription_status: "past_due",
          });
        }

        // Also update workspace for backward compatibility
        await supabaseClient
          .from("workspaces")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
        
        logStep("Subscription status updated to past_due after payment failure");
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Always return 200 to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    
    // Return 200 even on error to prevent Stripe from retrying
    return new Response(JSON.stringify({ error: errorMessage, received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
