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
  console.log(`[GET-BILLING-INFO] ${step}${detailsStr}`);
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        hasCustomer: false,
        invoices: [],
        paymentMethod: null,
        subscription: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customer = customers.data[0];
    const customerId = customer.id;
    logStep("Found Stripe customer", { customerId });

    // Fetch invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });
    logStep("Fetched invoices", { count: invoices.data.length });

    // Fetch payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1,
    });
    logStep("Fetched payment methods", { count: paymentMethods.data.length });

    // Fetch active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      description: invoice.lines?.data?.[0]?.description || 'Subscrição WillFlow',
    }));

    // Format payment method
    const paymentMethod = paymentMethods.data.length > 0 ? {
      id: paymentMethods.data[0].id,
      brand: paymentMethods.data[0].card?.brand,
      last4: paymentMethods.data[0].card?.last4,
      expMonth: paymentMethods.data[0].card?.exp_month,
      expYear: paymentMethods.data[0].card?.exp_year,
    } : null;

    // Format subscription
    const subscription = subscriptions.data.length > 0 ? {
      id: subscriptions.data[0].id,
      status: subscriptions.data[0].status,
      currentPeriodEnd: subscriptions.data[0].current_period_end,
      cancelAtPeriodEnd: subscriptions.data[0].cancel_at_period_end,
      priceId: subscriptions.data[0].items.data[0]?.price.id,
      productId: subscriptions.data[0].items.data[0]?.price.product,
    } : null;

    logStep("Returning billing info");

    return new Response(JSON.stringify({
      hasCustomer: true,
      invoices: formattedInvoices,
      paymentMethod,
      subscription,
    }), {
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
