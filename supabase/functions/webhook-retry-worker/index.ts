import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { vaultWorkerAuthorization } from "../_shared/webhook-worker-vault.ts";
import { workerAuthorization } from "../_shared/webhook-worker-auth.ts";
import { handleWorkerRequest } from "../_shared/webhook-worker-request.ts";

import { handleSignedDispatch } from "../_shared/webhook-worker-dispatch.ts";

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

async function authorize(req: Request): Promise<Response | null> {
  if (req.headers.get("authorization")?.startsWith("Bearer wfworker_")) {
    return vaultWorkerAuthorization(req, async (digest) => {
      const database = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      });
      const { data, error } = await database.rpc("verify_webhook_worker_digest", { p_digest: digest });
      if (error) throw new Error("worker verifier unavailable");
      return data === true;
    });
  }
  return workerAuthorization(req, {
    service: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    legacy: Deno.env.get("CRON_SECRET"),
  }, authenticateCronRequest);
}

async function processBatch(): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
}

serve(req => {
  if (!req.headers.has("x-willflow-dispatch")) {
    return handleWorkerRequest(req, corsHeaders, authorize, processBatch);
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const call = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args);
    if (error) throw new Error("Worker dispatch database unavailable");
    return data === true;
  };
  return handleSignedDispatch(req,
    (id, intent, signature) => call("claim_webhook_worker_dispatch", { p_id: id, p_intent: intent, p_signature: signature }),
    (id, status) => call("finish_webhook_worker_dispatch", { p_id: id, p_status: status }),
    processBatch);
});
