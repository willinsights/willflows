import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STREAM-GET-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Request received");

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const streamToken = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountId || !streamToken) {
      throw new Error("Missing Cloudflare configuration");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { streamUid, versionId } = await req.json();

    if (!streamUid) {
      return new Response(JSON.stringify({ error: "Missing streamUid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Checking stream status", { streamUid });

    // Get video status from Cloudflare Stream
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamUid}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${streamToken}`,
        },
      }
    );

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      logStep("Stream API error", { status: streamResponse.status, error: errorText });
      throw new Error(`Stream API error: ${errorText}`);
    }

    const streamData = await streamResponse.json();

    if (!streamData.success || !streamData.result) {
      throw new Error("Invalid Stream API response");
    }

    const status = streamData.result.status?.state || "unknown";
    const readyToStream = streamData.result.readyToStream || false;
    const duration = streamData.result.duration || null;
    const thumbnail = streamData.result.thumbnail || null;
    const playback = streamData.result.playback || null;

    logStep("Stream status retrieved", { status, readyToStream, duration });

    // Update the version record if status changed
    if (versionId && (status === "ready" || status === "error")) {
      const updateData: Record<string, unknown> = {
        stream_status: status,
      };

      if (duration) {
        updateData.duration_seconds = Math.round(duration);
      }

      // Preserve custom thumbnail time if set, otherwise default to 50%
      const { data: versionRow } = await supabase
        .from("video_versions")
        .select("thumbnail_time_seconds")
        .eq("id", versionId)
        .single();

      const timeParam = versionRow?.thumbnail_time_seconds != null
        ? `?time=${versionRow.thumbnail_time_seconds}s`
        : '?time=50p';

      updateData.thumbnail_path = `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg${timeParam}`;
      updateData.stream_playback_url = `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;

      const { error: updateError } = await supabase
        .from("video_versions")
        .update(updateData)
        .eq("id", versionId);

      if (updateError) {
        logStep("Error updating version", { error: updateError.message });
      }

      // Auto-enable downloads when video is ready
      if (status === "ready") {
        logStep("Enabling download for ready video", { streamUid });
        
        try {
          const downloadsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamUid}/downloads`;
          
          // Check if download already exists
          const checkResponse = await fetch(downloadsUrl, {
            headers: { "Authorization": `Bearer ${streamToken}` },
          });
          
          const checkData = await checkResponse.json();
          
          // Only create if not exists
          if (!checkData.result?.default) {
            const createResponse = await fetch(downloadsUrl, {
              method: "POST",
              headers: { "Authorization": `Bearer ${streamToken}` },
            });
            
            const createData = await createResponse.json();
            logStep("Download creation initiated", { 
              success: createData.success,
              status: createData.result?.status 
            });
          } else {
            logStep("Download already exists", { 
              status: checkData.result.default.status 
            });
          }
        } catch (downloadError) {
          // Non-fatal - log and continue
          logStep("Download creation error (non-fatal)", { 
            error: downloadError instanceof Error ? downloadError.message : String(downloadError) 
          });
        }
      }
    }

    return new Response(JSON.stringify({
      streamUid,
      status,
      readyToStream,
      duration,
      thumbnail,
      playback,
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
