import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan mapping by product ID
const PLAN_MAPPING: Record<string, string> = {
  'prod_Tko5hx2Pkr7ERk': 'essencial',
  'prod_Tko5cR05VWjok0': 'pro',
  'prod_Tko5DQ15DWTMhz': 'studio',
};

// Very small in-memory cache to reduce Stripe calls (best-effort; per edge instance)
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const subscriptionCache = new Map<
  string,
  { expiresAt: number; value: { subscribed: boolean; plan: string | null; subscription_end: string | null } }
>();

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
    logStep("User authenticated", { userId: user.id, email: user.email });

    const cacheKey = user.email.toLowerCase();
    const cached = subscriptionCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      logStep("Cache hit", { cacheKey });
      return new Response(JSON.stringify(cached.value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length === 0) {
        logStep("No customer found, returning unsubscribed state");
        const value = { subscribed: false, plan: null, subscription_end: null };
        subscriptionCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });
        return new Response(JSON.stringify(value), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      const hasActiveSub = subscriptions.data.length > 0;
      let plan: string | null = null;
      let subscriptionEnd: string | null = null;

      if (hasActiveSub) {
        const subscription = subscriptions.data[0];

        // Safely handle the date conversion
        const end = (subscription as any).current_period_end;
        if (typeof end === 'number' && Number.isFinite(end) && end > 0) {
          subscriptionEnd = new Date(end * 1000).toISOString();
        } else {
          logStep("Missing/invalid current_period_end", { value: end });
        }

        logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });

        const productId = subscription.items.data[0]?.price?.product as string | undefined;
        plan = (productId && PLAN_MAPPING[productId]) ? PLAN_MAPPING[productId] : (productId ? 'unknown' : null);
        logStep("Determined subscription plan", { productId, plan });
      } else {
        logStep("No active subscription found");
      }

      const value = {
        subscribed: hasActiveSub,
        plan,
        subscription_end: subscriptionEnd,
      };

      subscriptionCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });

      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      // Stripe rate limit (429) should not break the app; return cached (even stale) if available.
      const statusCode = stripeError?.statusCode ?? stripeError?.status ?? null;
      const message = stripeError?.message ? String(stripeError.message) : String(stripeError);

      if (statusCode === 429 || /rate limit/i.test(message)) {
        logStep("Stripe rate limited", { statusCode, message });

        if (cached) {
          logStep("Returning stale cache due to rate limit", { cacheKey });
          return new Response(JSON.stringify({ ...cached.value, rate_limited: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Soft-fail: avoid 500 blank screen
        return new Response(JSON.stringify({
          subscribed: false,
          plan: null,
          subscription_end: null,
          rate_limited: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      throw stripeError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
