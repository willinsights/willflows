import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Supabase client and verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check if user is system admin
    const { data: isAdmin, error: adminError } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Admin check error:", adminError);
      return new Response(
        JSON.stringify({ error: "Error checking permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.warn(`User ${user.id} attempted to create promo code without admin rights`);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Proceed with promo code creation
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { code, coupon_id } = await req.json();

    if (!code || !coupon_id) {
      throw new Error("Missing required fields: code and coupon_id");
    }

    console.log(`Admin ${user.id} creating promotion code: ${code} for coupon: ${coupon_id}`);

    // Check if promotion code already exists
    const existingCodes = await stripe.promotionCodes.list({
      code: code,
      limit: 1,
    });

    if (existingCodes.data.length > 0) {
      console.log("Promotion code already exists:", existingCodes.data[0]);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Promotion code already exists",
          promotion_code: existingCodes.data[0] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create the promotion code
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon_id,
      code: code,
      active: true,
    });

    console.log("Promotion code created successfully:", promotionCode);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Promotion code created successfully",
        promotion_code: promotionCode 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating promotion code:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
