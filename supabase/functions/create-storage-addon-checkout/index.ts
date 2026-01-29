import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Storage addon tiers with their Stripe price IDs and storage amounts
const STORAGE_TIERS = {
  '50gb': {
    price_id: 'price_1SuuVQGr2lXbVyw9OybAtJ9i',
    product_id: 'prod_TsfrcvSlClixZM',
    bytes: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    display: '+50 GB',
    price_eur: 9,
  },
  '100gb': {
    price_id: 'price_1SuuVRGr2lXbVyw92Mnlgzj0',
    product_id: 'prod_TsfrGDXzlIOhaM',
    bytes: 100 * 1024 * 1024 * 1024, // 100GB in bytes
    display: '+100 GB',
    price_eur: 15,
  },
  '250gb': {
    price_id: 'price_1SuuVSGr2lXbVyw9XhaYRv0T',
    product_id: 'prod_TsfrRubX5bCWEh',
    bytes: 250 * 1024 * 1024 * 1024, // 250GB in bytes
    display: '+250 GB',
    price_eur: 29,
  },
} as const;

type StorageTier = keyof typeof STORAGE_TIERS;

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier, workspaceId } = await req.json();
    
    if (!tier || !STORAGE_TIERS[tier as StorageTier]) {
      throw new Error("Invalid storage tier. Valid options: 50gb, 100gb, 250gb");
    }
    
    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const tierInfo = STORAGE_TIERS[tier as StorageTier];
    logStep("Request parsed", { tier, workspaceId, priceId: tierInfo.price_id });

    // Verify user has access to this workspace and it's on Studio plan
    const { data: workspace, error: wsError } = await supabaseClient
      .from('workspaces')
      .select('id, subscription_plan, stripe_customer_id')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      throw new Error("Workspace not found");
    }

    // Verify workspace is on Studio plan
    if (workspace.subscription_plan !== 'studio') {
      throw new Error("Storage addons are only available for Studio plan workspaces");
    }

    // Check if user is admin of this workspace
    const { data: membership, error: memberError } = await supabaseClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (memberError || !membership || membership.role !== 'admin') {
      throw new Error("Only workspace admins can purchase storage addons");
    }

    logStep("Workspace verified", { plan: workspace.subscription_plan });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    let customerId = workspace.stripe_customer_id;
    
    if (!customerId) {
      // Try to find by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const requestOrigin = req.headers.get("origin") || "https://willflow.app";

    // Create checkout session for the storage addon
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: tierInfo.price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${requestOrigin}/app/planos?storage=success&tier=${tier}`,
      cancel_url: `${requestOrigin}/app/planos?storage=cancelled`,
      metadata: {
        user_id: user.id,
        workspace_id: workspaceId,
        storage_tier: tier,
        addon_type: 'storage',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          workspace_id: workspaceId,
          storage_tier: tier,
          addon_type: 'storage',
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
