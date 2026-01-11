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
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : '*',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan mapping by product ID
const PLAN_MAPPING: Record<string, string> = {
  'prod_Tl6rw16ZNqHrWd': 'essencial',
  'prod_Tl6rsZkoz6yqYu': 'pro',
  'prod_Tl6rxTvnCICjTL': 'studio',
};

// Very small in-memory cache to reduce Stripe calls
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const subscriptionCache = new Map<
  string,
  { 
    expiresAt: number; 
    value: { 
      subscribed: boolean; 
      plan: string | null; 
      subscription_end: string | null; 
      trial_expired?: boolean; 
      trial_ends_at?: string | null;
      limits?: { workspaces: number; users: number; projects: number };
      usage?: { workspaces: number; users: number; projects: number };
    } 
  }
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

    const cacheKey = user.id;
    const cached = subscriptionCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      logStep("Cache hit", { cacheKey });
      return new Response(JSON.stringify(cached.value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get user subscription from the centralized table
    const { data: userSubData, error: userSubError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get usage counts
    const [workspacesResult, usersResult, projectsResult] = await Promise.all([
      supabaseClient.rpc('count_admin_workspaces', { p_user_id: user.id }),
      supabaseClient.rpc('count_total_invited_users', { p_user_id: user.id }),
      supabaseClient.rpc('count_total_projects', { p_user_id: user.id }),
    ]);

    const usage = {
      workspaces: workspacesResult.data ?? 0,
      users: usersResult.data ?? 0,
      projects: projectsResult.data ?? 0,
    };

    logStep("Usage counts", usage);

    // If user has a subscription record
    if (userSubData) {
      const plan = userSubData.subscription_plan;
      const status = userSubData.subscription_status;
      const trialEndsAt = userSubData.trial_ends_at;
      const currentPeriodEnd = userSubData.current_period_end;

      // Define limits based on plan
      const limits = {
        workspaces: plan === 'studio' ? 10 : plan === 'pro' ? 3 : 1,
        users: plan === 'studio' ? 999 : plan === 'pro' ? 10 : 2,
        projects: plan === 'studio' ? 999 : plan === 'pro' ? 999 : 15,
      };

      const trialExpired = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
      const isActive = status === 'active' || (status === 'trialing' && !trialExpired);

      const value = {
        subscribed: isActive,
        plan,
        subscription_end: currentPeriodEnd || trialEndsAt,
        trial_expired: status === 'trialing' && trialExpired,
        trial_ends_at: trialEndsAt,
        limits,
        usage,
      };

      subscriptionCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });
      logStep("Returning user subscription from DB", { plan, status, isActive });

      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fall back to checking Stripe directly if no DB record
    logStep("No subscription record found, checking Stripe");

    // Get trial info from workspace as fallback
    const { data: membershipData } = await supabaseClient
      .from('workspace_members')
      .select('workspace_id, workspaces(trial_ends_at, subscription_status, subscription_plan)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('role', 'admin')
      .limit(1)
      .single();

    const workspaceData = membershipData?.workspaces as unknown as { 
      trial_ends_at: string | null; 
      subscription_status: string;
      subscription_plan: string;
    } | null;
    
    const trialEndsAt = workspaceData?.trial_ends_at ?? null;
    const workspacePlan = workspaceData?.subscription_plan ?? 'essencial';

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length === 0) {
        logStep("No Stripe customer found");
        
        const trialExpired = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
        
        const limits = {
          workspaces: 1,
          users: 2,
          projects: 15,
        };

        const value = { 
          subscribed: !trialExpired,
          plan: workspacePlan,
          subscription_end: trialEndsAt,
          trial_expired: trialExpired,
          trial_ends_at: trialEndsAt,
          limits,
          usage,
        };
        
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
      let plan: string | null = workspacePlan;
      let subscriptionEnd: string | null = null;

      if (hasActiveSub) {
        const subscription = subscriptions.data[0];
        const end = (subscription as any).current_period_end;
        if (typeof end === 'number' && Number.isFinite(end) && end > 0) {
          subscriptionEnd = new Date(end * 1000).toISOString();
        }

        const productId = subscription.items.data[0]?.price?.product as string | undefined;
        plan = (productId && PLAN_MAPPING[productId]) ? PLAN_MAPPING[productId] : workspacePlan;
        logStep("Active subscription found", { subscriptionId: subscription.id, plan });

        // Create/update user subscription record
        await supabaseClient
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            subscription_plan: plan,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_end: subscriptionEnd,
            trial_ends_at: null,
          }, { onConflict: 'user_id' });
      }

      const trialExpired = !hasActiveSub && trialEndsAt ? new Date(trialEndsAt) < new Date() : false;

      const limits = {
        workspaces: plan === 'studio' ? 10 : plan === 'pro' ? 3 : 1,
        users: plan === 'studio' ? 999 : plan === 'pro' ? 10 : 2,
        projects: plan === 'studio' ? 999 : plan === 'pro' ? 999 : 15,
      };

      const value = {
        subscribed: hasActiveSub || (!trialExpired && !!trialEndsAt),
        plan,
        subscription_end: hasActiveSub ? subscriptionEnd : (trialEndsAt ?? null),
        trial_expired: trialExpired,
        trial_ends_at: trialEndsAt ?? null,
        limits,
        usage,
      };

      subscriptionCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });

      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      const statusCode = stripeError?.statusCode ?? stripeError?.status ?? null;
      const message = stripeError?.message ? String(stripeError.message) : String(stripeError);

      if (statusCode === 429 || /rate limit/i.test(message)) {
        logStep("Stripe rate limited", { statusCode, message });

        if (cached) {
          return new Response(JSON.stringify({ ...cached.value, rate_limited: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        return new Response(JSON.stringify({
          subscribed: true,
          plan: workspacePlan,
          subscription_end: null,
          rate_limited: true,
          limits: { workspaces: 1, users: 2, projects: 15 },
          usage,
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
