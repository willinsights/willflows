import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[WEBHOOK-RETRY-WORKER] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

// Map provider → internal processor function name
const PROCESSOR_BY_PROVIDER: Record<string, string> = {
  stripe: "stripe-webhook",
  // google: "google-webhook", // future
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Require either service-role auth or shared CRON_SECRET
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const isCron = !!cronSecret && providedSecret === cronSecret;
  const isServiceRole = !!serviceKey && bearer === serviceKey;
  if (!isCron && !isServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    log("Worker tick start");

    // Claim a batch of up to 10 pending/failed events
    const { data: batch, error } = await supabase.rpc("webhook_inbox_claim_batch", { p_limit: 10 });
    if (error) throw new Error(`claim_batch failed: ${error.message}`);

    if (!batch || batch.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "no pending events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    log(`Claimed ${batch.length} events`);

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const row of batch) {
      const processor = PROCESSOR_BY_PROVIDER[row.provider];
      if (!processor) {
        await supabase.rpc("webhook_inbox_mark_failed", {
          p_id: row.id,
          p_error: `No processor configured for provider '${row.provider}'`,
        });
        results.push({ id: row.id, ok: false, error: "no processor" });
        continue;
      }

      try {
        const url = `${supabaseUrl}/functions/v1/${processor}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-retry-secret": serviceKey,
            "x-inbox-id": row.id,
            "Authorization": `Bearer ${serviceKey}`,
            "apikey": serviceKey,
          },
          body: JSON.stringify(row.payload),
        });

        if (res.ok) {
          // Processor itself calls mark_processed; nothing extra to do
          results.push({ id: row.id, ok: true });
        } else {
          const text = await res.text();
          await supabase.rpc("webhook_inbox_mark_failed", {
            p_id: row.id,
            p_error: `HTTP ${res.status}: ${text.substring(0, 500)}`,
          });
          results.push({ id: row.id, ok: false, error: `HTTP ${res.status}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase.rpc("webhook_inbox_mark_failed", { p_id: row.id, p_error: msg });
        results.push({ id: row.id, ok: false, error: msg });
      }
    }

    log("Worker tick done", { processed: results.length, results });
    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
