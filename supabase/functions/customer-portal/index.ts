import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { NEW_ACCOUNT_PLAN, NEW_ACCOUNT_STATUS } from "../_shared/stripe-billing.ts";

const allowedOrigins = [
  'https://willflow.app',
  'https://www.willflow.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

const getCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : 'https://willflow.app',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Confirme o seu email antes de gerir a faturação." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    let customerId: string;
    
    if (customers.data.length === 0) {
      // Create a new Stripe customer if one doesn't exist
      logStep("No Stripe customer found, creating one");
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });

      // Store the customer id on the account. An existing row only gets
      // stripe_customer_id (plan and status are never reset here); a row is
      // inserted only when the account has none, with the same minimal pair
      // a new account gets.
      const { data: updatedRows, error: updateError } = await supabaseClient
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
        .select('user_id');

      if (updateError) {
        logStep("Warning: Failed to update user subscription with customer ID", { error: updateError.message });
      } else if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            stripe_customer_id: customerId,
            subscription_plan: NEW_ACCOUNT_PLAN,
            subscription_status: NEW_ACCOUNT_STATUS,
          });

        if (insertError) {
          logStep("Warning: Failed to create user subscription with customer ID", { error: insertError.message });
        }
      }
    } else {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    const rawOrigin = req.headers.get("origin");
    const requestOrigin = rawOrigin && allowedOrigins.includes(rawOrigin) ? rawOrigin : "https://willflow.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${requestOrigin}/app/conta`,
    });
    
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
