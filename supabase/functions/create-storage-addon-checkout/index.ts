import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { decideStorageAddonPurchase, pickEmailCustomerForUser, isUsableStripeCustomer } from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Storage addon tiers with their Stripe price IDs (EUR + BRL) and storage amounts
const STORAGE_TIERS = {
  '25gb': {
    price_id: {
      eur: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
      brl: 'price_1Sw5TGGr2lXbVyw9u8hw1ul0',
    },
    product_id: 'prod_TtVyg9RmLKqwRS',
    bytes: 25 * 1024 * 1024 * 1024, // 25GB in bytes
    display: '+25 GB',
  },
  '50gb': {
    price_id: {
      eur: 'price_1SuuVQGr2lXbVyw9OybAtJ9i',
      brl: 'price_1Sw5TIGr2lXbVyw94wWjWSOz',
    },
    product_id: 'prod_TsfrcvSlClixZM',
    bytes: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    display: '+50 GB',
  },
  '100gb': {
    price_id: {
      eur: 'price_1SuuVRGr2lXbVyw92Mnlgzj0',
      brl: 'price_1Sw5TJGr2lXbVyw9pG3eUgiu',
    },
    product_id: 'prod_TsfrGDXzlIOhaM',
    bytes: 100 * 1024 * 1024 * 1024, // 100GB in bytes
    display: '+100 GB',
  },
  '250gb': {
    price_id: {
      eur: 'price_1SuuVSGr2lXbVyw9XhaYRv0T',
      brl: 'price_1Sw5TKGr2lXbVyw91lqsbx3Y',
    },
    product_id: 'prod_TsfrRubX5bCWEh',
    bytes: 250 * 1024 * 1024 * 1024, // 250GB in bytes
    display: '+250 GB',
  },
} as const;

type StorageTier = keyof typeof STORAGE_TIERS;
type Currency = 'eur' | 'brl';

const DEBUG = Deno.env.get("DEBUG") === "true";

const logStep = (step: string, details?: any) => {
  if (!DEBUG) return;
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORAGE-ADDON-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    const refuse = (status: number, error: string) => new Response(JSON.stringify({ error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status,
    });
    if (!authHeader?.startsWith("Bearer ")) return refuse(401, "Sessão inválida");

    // F9: identify the caller with their own session; read with the service role.
    const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user?.email) return refuse(401, "Sessão inválida");
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    logStep("User authenticated", { userId: user.id });

    const { tier, workspaceId, currency = 'eur' } = await req.json();
    
    if (!tier || !STORAGE_TIERS[tier as StorageTier]) {
      return refuse(400, "Invalid storage tier. Valid options: 25gb, 50gb, 100gb, 250gb");
    }
    if (!workspaceId) return refuse(400, "Workspace ID is required");

    // Validate currency
    const validCurrency: Currency = currency === 'brl' ? 'brl' : 'eur';
    
    const tierInfo = STORAGE_TIERS[tier as StorageTier];
    const priceId = tierInfo.price_id[validCurrency];
    
    logStep("Request parsed", { tier, workspaceId, currency: validCurrency, priceId });

    const { data: workspace } = await supabaseClient
      .from('workspaces')
      .select('id, subscription_plan, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    const refusal = decideStorageAddonPurchase({ userId: user.id, workspace });
    if (refusal === 'workspace_not_found') return refuse(404, "Workspace not found");
    if (refusal === 'not_studio') return refuse(403, "Storage addons are only available for Studio plan workspaces");
    if (refusal === 'not_owner') return refuse(403, "Só o dono do workspace pode comprar armazenamento adicional");
    if (refusal) return refuse(401, "Sessão inválida");

    logStep("Workspace verified", { plan: workspace!.subscription_plan });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // The billing customer belongs to the ACCOUNT (the owner), never to the
    // workspace row nor to whoever shares the email.
    let customerId: string | null = null;
    const { data: account } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (account?.stripe_customer_id) {
      try {
        const stored = await stripe.customers.retrieve(account.stripe_customer_id);
        if (isUsableStripeCustomer(stored)) customerId = account.stripe_customer_id;
      } catch { /* missing customer: fall back to email lookup */ }
    }
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      customerId = pickEmailCustomerForUser(customers.data, user.id);
    }
    if (!customerId) {
      const created = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = created.id;
    }

    const ALLOWED_RETURN_ORIGINS = ["https://willflow.app", "https://www.willflow.app", "http://localhost:8080", "http://localhost:5173"];
    const hdrOrigin = req.headers.get("origin");
    const requestOrigin = hdrOrigin && ALLOWED_RETURN_ORIGINS.includes(hdrOrigin) ? hdrOrigin : "https://willflow.app";

    // Create checkout session for the storage addon
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      
      // Allow updating customer address for existing customers
      customer_update: customerId ? {
        address: 'auto',
        name: 'auto',
      } : undefined,
      
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
      
      // EU VAT Compliance: Require billing address for tax determination
      billing_address_collection: 'required',
      
      // EU VAT Compliance: Allow B2B customers to enter VAT ID
      tax_id_collection: {
        enabled: true,
      },
      
      success_url: `${requestOrigin}/app/planos?storage=success&tier=${tier}`,
      cancel_url: `${requestOrigin}/app/planos?storage=cancelled`,
      metadata: {
        user_id: user.id,
        workspace_id: workspaceId,
        storage_tier: tier,
        addon_type: 'storage',
        currency: validCurrency,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          workspace_id: workspaceId,
          storage_tier: tier,
          addon_type: 'storage',
          currency: validCurrency,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url, currency: validCurrency });

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
