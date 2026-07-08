import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STREAM-UPDATE-VIDEO] ${step}${detailsStr}`);
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

    logStep("User authenticated", { userId: claimsData.user.id });

    // Parse request
    const { streamUid, versionId, allowedOrigins = [] } = await req.json();

    if (!streamUid || !versionId) {
      return new Response(JSON.stringify({ error: "Missing streamUid or versionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize: caller must belong to the video version's workspace (admin/edicao)
    {
      const { data: versionRow, error: verErr } = await supabase
        .from("video_versions")
        .select("workspace_id")
        .eq("id", versionId)
        .maybeSingle();
      if (verErr || !versionRow) {
        return new Response(JSON.stringify({ error: "Version not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("user_id", claimsData.user.id)
        .eq("workspace_id", versionRow.workspace_id)
        .eq("is_active", true)
        .in("role", ["admin", "edicao"])
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logStep("Updating video settings", { streamUid, allowedOrigins });

    // Update video settings in Cloudflare Stream
    const updateResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamUid}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${streamToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowedOrigins: allowedOrigins,
          requireSignedURLs: false,
        }),
      }
    );

    const updateData = await updateResponse.json();
    logStep("Cloudflare response", { success: updateData.success, status: updateResponse.status });

    if (!updateResponse.ok || !updateData.success) {
      const errorMsg = updateData.errors?.[0]?.message || "Failed to update video";
      logStep("Update failed", { error: errorMsg, errors: updateData.errors });
      throw new Error(errorMsg);
    }

    // Extract data from the response
    const result = updateData.result;
    const duration = result?.duration;

    // Always use canonical videodelivery.net URL for best compatibility
    const canonicalPlaybackUrl = `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;

    // Preserve custom thumbnail time if set
    let thumbnailTimeParam = '?time=50p';
    if (versionId) {
      const { data: versionRow } = await supabase
        .from("video_versions")
        .select("thumbnail_time_seconds")
        .eq("id", versionId)
        .single();
      if (versionRow?.thumbnail_time_seconds != null) {
        thumbnailTimeParam = `?time=${versionRow.thumbnail_time_seconds}s`;
      }
    }
    const canonicalThumbnail = `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg${thumbnailTimeParam}`;

    logStep("Video updated successfully", { 
      streamUid, 
      canonicalPlaybackUrl,
      canonicalThumbnail,
      duration,
      allowedOrigins: result?.allowedOrigins 
    });

    // Update database record if versionId provided - always normalize URLs
    if (versionId) {
      const updateFields: Record<string, unknown> = {
        stream_status: result?.status?.state || "ready",
        stream_playback_url: canonicalPlaybackUrl,
        thumbnail_path: canonicalThumbnail,
      };

      if (duration) {
        updateFields.duration_seconds = Math.round(duration);
      }

      const { error: dbError } = await supabase
        .from("video_versions")
        .update(updateFields)
        .eq("id", versionId);

      if (dbError) {
        logStep("Database update error", { error: dbError.message });
      } else {
        logStep("Database updated", { versionId, fields: Object.keys(updateFields) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      streamUid,
      playbackUrl: canonicalPlaybackUrl,
      thumbnail: canonicalThumbnail,
      duration,
      allowedOrigins: result?.allowedOrigins || [],
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
