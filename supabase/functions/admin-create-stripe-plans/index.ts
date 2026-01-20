// supabase/functions/admin-create-stripe-plans/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Currency = "eur" | "brl";
type Interval = "month" | "year";

type PlanKey = "starter" | "pro" | "studio";

const PLAN_SPECS: Record<PlanKey, { name: string; description: string; prices: Record<Currency, Record<Interval, number>> }> = {
  starter: {
    name: "Starter",
    description: "Plano ideal para freelancers e pequenas produtoras",
    prices: {
      eur: { month: 1400, year: 13400 },
      brl: { month: 7900, year: 75800 },
    },
  },
  pro: {
    name: "Pro",
    description: "Plano completo para equipas em crescimento",
    prices: {
      eur: { month: 2400, year: 23000 },
      brl: { month: 14900, year: 143000 },
    },
  },
  studio: {
    name: "Studio",
    description: "Plano premium para estúdios profissionais",
    prices: {
      eur: { month: 3200, year: 30700 },
      brl: { month: 19700, year: 189100 },
    },
  },
};

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-CREATE-STRIPE-PLANS] ${step}${suffix}`);
};

async function ensureAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError) throw new Error(`Auth error: ${userError.message}`);
  if (!userData.user) throw new Error("User not found");

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: isAdmin, error: adminError } = await adminClient
    .from("system_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) throw new Error(`Admin check failed: ${adminError.message}`);
  if (!isAdmin) throw new Error("Forbidden: user is not system admin");

  return { user: userData.user };
}

async function findOrCreateProduct(stripe: Stripe, name: string, description: string) {
  // Search is not always enabled; fallback to list.
  const productsAny = stripe.products as unknown as { search?: (args: any) => Promise<{ data: Stripe.Product[] }> };
  if (typeof productsAny.search === "function") {
    try {
      const searchRes = await productsAny.search({
        query: `name:'${name.replaceAll("'", "\\'")}'`,
        limit: 1,
      });
      if (searchRes?.data?.length) return searchRes.data[0];
    } catch {
      // ignore and fallback
    }
  }

  const listed = await stripe.products.list({ limit: 100 });
  const existing = listed.data.find((p: Stripe.Product) => (p.name || "").toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  return await stripe.products.create({ name, description, active: true });
}

async function findOrCreatePrice(params: {
  stripe: Stripe;
  productId: string;
  lookupKey: string;
  currency: Currency;
  unitAmount: number;
  interval: Interval;
}) {
  const { stripe, productId, lookupKey, currency, unitAmount, interval } = params;

  const pricesAny = stripe.prices as unknown as { search?: (args: any) => Promise<{ data: Stripe.Price[] }> };
  if (typeof pricesAny.search === "function") {
    try {
      const searchRes = await pricesAny.search({ query: `lookup_key:'${lookupKey}'`, limit: 1 });
      if (searchRes?.data?.length) return searchRes.data[0];
    } catch {
      // ignore and fallback
    }
  }

  const listed = await stripe.prices.list({ product: productId, limit: 100 });
  const existing = listed.data.find((p: Stripe.Price) => p.lookup_key === lookupKey);
  if (existing) return existing;

  return await stripe.prices.create({
    product: productId,
    currency,
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    nickname: lookupKey,
    active: true,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("start");
    await ensureAdmin(req);
    logStep("admin ok");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const result: Record<PlanKey, any> = {
      starter: {},
      pro: {},
      studio: {},
    };

    for (const planKey of Object.keys(PLAN_SPECS) as PlanKey[]) {
      const spec = PLAN_SPECS[planKey];
      logStep("ensure product", { planKey, name: spec.name });
      const product = await findOrCreateProduct(stripe, spec.name, spec.description);

      const prices: any = {
        product_id: product.id,
        eur: { monthly: "", yearly: "" },
        brl: { monthly: "", yearly: "" },
      };

      for (const currency of ["eur", "brl"] as const) {
        // monthly
        const monthlyLookupKey = `willflow_${planKey}_${currency}_monthly`;
        const monthly = await findOrCreatePrice({
          stripe,
          productId: product.id,
          lookupKey: monthlyLookupKey,
          currency,
          unitAmount: spec.prices[currency].month,
          interval: "month",
        });

        // yearly
        const yearlyLookupKey = `willflow_${planKey}_${currency}_yearly`;
        const yearly = await findOrCreatePrice({
          stripe,
          productId: product.id,
          lookupKey: yearlyLookupKey,
          currency,
          unitAmount: spec.prices[currency].year,
          interval: "year",
        });

        prices[currency] = {
          monthly: monthly.id,
          yearly: yearly.id,
        };
      }

      result[planKey] = prices;
    }

    logStep("done", result);
    return new Response(JSON.stringify({ ok: true, stripe: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { msg });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
