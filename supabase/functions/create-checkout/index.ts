import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  ALREADY_SUBSCRIBED_CODE,
  NEW_ACCOUNT_PLAN,
  NEW_ACCOUNT_STATUS,
  PLAN_CHECKOUT_KIND,
  decideCheckout,
  isStripeResourceMissing,
  isUsableStripeCustomer,
  pickEmailCustomerForUser,
} from "../_shared/stripe-billing.ts";

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

// Server-approved subscription prices (must match src/lib/plans.ts)
const ALLOWED_PRICE_IDS = new Set<string>([
  'price_1SrikWGr2lXbVyw9yonzyJlM',
  'price_1SrikXGr2lXbVyw9NqSZ9svF',
  'price_1SrikZGr2lXbVyw9359CeNDt',
  'price_1SrikZGr2lXbVyw9NI0jXQ52',
  'price_1SrikbGr2lXbVyw91Rz0i9zt',
  'price_1SrikcGr2lXbVyw9uMfHWw6L',
  'price_1SrikcGr2lXbVyw9JDMREfdR',
  'price_1SrikdGr2lXbVyw98tP1rsYd',
  'price_1SrikfGr2lXbVyw9fXBV7BGs',
  'price_1SrikfGr2lXbVyw9KpGstQ2S',
  'price_1SrikgGr2lXbVyw9Rt6xW57v',
  'price_1SrikhGr2lXbVyw9JnFXF1E2',
]);

// Helper logging function for debugging - only logs when DEBUG=true
const DEBUG = Deno.env.get("DEBUG") === "true";

const logStep = (step: string, details?: any) => {
  if (!DEBUG) return;
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Confirme o seu email antes de subscrever um plano." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("User authenticated", { userId: user.id });

    const { priceId, workspaceId } = await req.json();
    if (!priceId || typeof priceId !== "string" || !ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(JSON.stringify({ error: "Plano inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Request body parsed", { priceId, workspaceId });

    // Service role client: every query below MUST filter by the authenticated
    // user's id (user.id), never by a value taken from the request body.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Security: never trust the workspaceId from the body.
    // The caller must be an active admin of the workspace it is paying for.
    if (workspaceId) {
      const { data: membership, error: memberError } = await adminClient
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (memberError || !membership || membership.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Não tem permissão para subscrever este workspace." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      logStep("Workspace ownership verified", { workspaceId });
    }

    // The plan belongs to the ACCOUNT: one plan subscription per account.
    // Fail closed: if the account cannot be read, no session is created.
    const { data: account, error: accountError } = await adminClient
      .from("user_subscriptions")
      .select("subscription_status, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) {
      console.error("[CREATE-CHECKOUT] Could not read account subscription", accountError.message);
      return new Response(
        JSON.stringify({ error: "Não foi possível verificar a subscrição da conta. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutDecision = decideCheckout({
      accountStatus: account?.subscription_status ?? null,
      hasStripeSubscription: !!account?.stripe_subscription_id,
    });

    if (!checkoutDecision.allow) {
      logStep("Checkout refused", { reason: checkoutDecision.reason });
      return new Response(
        JSON.stringify({ error: ALREADY_SUBSCRIBED_CODE, code: ALREADY_SUBSCRIBED_CODE }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Stable Stripe customer: the id stored on the account first, then the
    // lookup by email, and only then a new customer.
    const storedCustomerId: string | null = account?.stripe_customer_id ?? null;
    let customerId: string | null = null;

    // The stored id is validated first. A customer that no longer exists in
    // Stripe (resource_missing) or is marked as deleted counts as "no stored
    // id": the lookup below replaces it. Any other Stripe error still fails.
    if (storedCustomerId) {
      try {
        const storedCustomer = await stripe.customers.retrieve(storedCustomerId);
        if (isUsableStripeCustomer(storedCustomer)) {
          customerId = storedCustomerId;
          logStep("Using the Stripe customer stored on the account");
        } else {
          logStep("Stored Stripe customer is deleted, replacing it");
        }
      } catch (retrieveError) {
        if (!isStripeResourceMissing(retrieveError)) throw retrieveError;
        logStep("Stored Stripe customer no longer exists, replacing it");
      }
    }

    if (!customerId) {
      // A customer found by email is reused only when it has no user_id or
      // the user_id of this account; one of another user is ignored.
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      customerId = pickEmailCustomerForUser(customers.data, user.id);

      if (customerId) {
        logStep("Found existing Stripe customer by email");
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer");
      }

      // Store the id on the account, found by email or new. Only
      // stripe_customer_id is written on an existing row; a missing row gets
      // the same minimal pair a new account gets (never a paid plan, trial
      // dates untouched). A failure is logged (no email) and the checkout
      // continues.
      const { error: saveError } = account
        ? await adminClient
            .from("user_subscriptions")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", user.id)
        : await adminClient
            .from("user_subscriptions")
            .insert({
              user_id: user.id,
              stripe_customer_id: customerId,
              subscription_plan: NEW_ACCOUNT_PLAN,
              subscription_status: NEW_ACCOUNT_STATUS,
            });

      if (saveError) {
        console.warn("[CREATE-CHECKOUT] Could not store the Stripe customer id on the account", saveError.message);
      }
    }

    const requestOrigin = origin && allowedOrigins.includes(origin) ? origin : "https://willflow.app";

    // Create a subscription checkout session with full EU VAT compliance
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      
      // The session always uses a customer: let checkout update its address/name
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      
      mode: "subscription",
      allow_promotion_codes: true,
      
      // EU VAT Compliance: Enable automatic tax calculation
      automatic_tax: {
        enabled: true,
      },
      
      // EU VAT Compliance: Require full billing address for tax determination
      billing_address_collection: 'required',
      
      // EU VAT Compliance: Allow B2B customers to enter VAT ID for reverse charge
      tax_id_collection: {
        enabled: true,
      },
      
      success_url: `${requestOrigin}/checkout-success`,
      cancel_url: `${requestOrigin}/planos?checkout=cancelled`,
      
      metadata: {
        kind: PLAN_CHECKOUT_KIND,
        user_id: user.id,
        workspace_id: workspaceId || "",
      },
      subscription_data: {
        metadata: {
          kind: PLAN_CHECKOUT_KIND,
          user_id: user.id,
          workspace_id: workspaceId || "",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
