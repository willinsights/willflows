import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Product ID to Plan mapping from stripe-prices.ts
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_Tl6rw16ZNqHrWd': 'essencial', // Starter plan maps to 'essencial' in DB enum
  'prod_Tl6rsZkoz6yqYu': 'pro',
  'prod_Tl6rxTvnCICjTL': 'studio',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
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
          const workspaceId = session.metadata?.workspace_id;
          
          if (!workspaceId) {
            logStep("WARNING: No workspace_id in session metadata");
            break;
          }

          // Get subscription details to determine the plan
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price.product as string;
          const plan = PRODUCT_TO_PLAN[productId] || 'essencial';

          logStep("Updating workspace after checkout", { 
            workspaceId, 
            customerId: session.customer, 
            subscriptionId: session.subscription,
            productId,
            plan
          });

          const { error } = await supabaseClient
            .from("workspaces")
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_plan: plan,
              subscription_status: "active",
              trial_ends_at: null, // Clear trial when subscription starts
            })
            .eq("id", workspaceId);

          if (error) {
            logStep("ERROR: Failed to update workspace", { error: error.message });
          } else {
            logStep("Workspace updated successfully", { workspaceId, plan });
          }
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
        const plan = PRODUCT_TO_PLAN[productId] || 'essencial';

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

        logStep("Updating workspace subscription", { 
          customerId, 
          plan, 
          subscriptionStatus,
          productId
        });

        // Find and update the workspace by stripe_customer_id
        const { error } = await supabaseClient
          .from("workspaces")
          .update({
            subscription_plan: plan,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("ERROR: Failed to update workspace by customer_id", { error: error.message });
        } else {
          logStep("Workspace subscription updated successfully");
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

        const { error } = await supabaseClient
          .from("workspaces")
          .update({
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("ERROR: Failed to mark subscription as canceled", { error: error.message });
        } else {
          logStep("Subscription marked as canceled");
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.paid", { 
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        });

        if (invoice.subscription) {
          const customerId = invoice.customer as string;

          const { error } = await supabaseClient
            .from("workspaces")
            .update({
              subscription_status: "active",
            })
            .eq("stripe_customer_id", customerId);

          if (error) {
            logStep("ERROR: Failed to update status to active after invoice paid", { error: error.message });
          } else {
            logStep("Workspace status updated to active after invoice paid");
          }
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

        const { error } = await supabaseClient
          .from("workspaces")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          logStep("ERROR: Failed to update status to past_due", { error: error.message });
        } else {
          logStep("Workspace status updated to past_due after payment failure");
        }
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
    // Log the error for debugging
    return new Response(JSON.stringify({ error: errorMessage, received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
