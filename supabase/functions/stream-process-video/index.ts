import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STREAM-PROCESS-VIDEO] ${step}${detailsStr}`);
};

// Generate a signed R2 URL for reading the file
async function generateSignedR2Url(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: "auto",
    service: "s3",
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = new URL(`/${bucket}/${key}`, endpoint);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));

  const signedRequest = await r2.sign(
    new Request(url.toString(), {
      method: 'GET',
    }),
    {
      aws: { signQuery: true },
    }
  );

  return signedRequest.url.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Request received");

    // Validate environment variables
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const streamToken = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET");
    const r2AccessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY");
    const r2SecretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountId || !streamToken || !bucketName) {
      throw new Error("Missing Cloudflare configuration");
    }

    if (!r2AccessKeyId || !r2SecretAccessKey) {
      throw new Error("Missing R2 credentials for signed URL generation");
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
      logStep("Auth error", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    logStep("User authenticated", { userId });

    // Parse request body
    const { 
      key, 
      taskId, 
      workspaceId, 
      projectId, 
      fileName, 
      fileSize 
    } = await req.json();

    // taskId is optional - projectId is required when no taskId
    if (!key || !workspaceId || !projectId || !fileName || !fileSize) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get next version number - query by taskId if available, otherwise by projectId
    let versionsQuery = supabase
      .from("video_versions")
      .select("version_number")
      .order("version_number", { ascending: false })
      .limit(1);

    if (taskId) {
      versionsQuery = versionsQuery.eq("task_id", taskId);
    } else {
      versionsQuery = versionsQuery.is("task_id", null).eq("project_id", projectId);
    }

    const { data: existingVersions, error: versionsError } = await versionsQuery;

    if (versionsError) {
      logStep("Error fetching versions", { error: versionsError.message });
    }

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;
    logStep("Next version", { nextVersion });

    // Create video version record with pending status
    const { data: versionData, error: insertError } = await supabase
      .from("video_versions")
      .insert({
        task_id: taskId || null,
        workspace_id: workspaceId,
        project_id: projectId,
        version_number: nextVersion,
        file_path: `r2://${bucketName}/${key}`,
        file_name: fileName,
        file_size_bytes: fileSize,
        mime_type: "video/mp4",
        uploaded_by: userId,
        r2_key: key,
        stream_status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error inserting version", { error: insertError.message });
      throw new Error("Failed to create video version record");
    }

    logStep("Version record created", { versionId: versionData.id });

    // Generate signed R2 URL for Stream to fetch the video
    const signedR2Url = await generateSignedR2Url(
      accountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      bucketName,
      key,
      3600 // 1 hour expiry
    );
    
    logStep("Generated signed R2 URL for Stream");

    // Submit video to Cloudflare Stream using the signed URL
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${streamToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: signedR2Url,
          meta: {
            name: fileName,
            workspaceId,
            taskId,
            projectId,
            versionId: versionData.id,
          },
          requireSignedURLs: false,
          allowedOrigins: [],
        }),
      }
    );

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      logStep("Stream API error", { status: streamResponse.status, error: errorText });
      
      // Update version status to error
      await supabase
        .from("video_versions")
        .update({ stream_status: "error" })
        .eq("id", versionData.id);
      
      throw new Error(`Stream API error: ${errorText}`);
    }

    const streamData = await streamResponse.json();
    logStep("Stream response", { success: streamData.success });

    if (!streamData.success || !streamData.result) {
      throw new Error("Invalid Stream API response");
    }

    const streamUid = streamData.result.uid;
    // Use canonical videodelivery.net domain for better compatibility
    const playbackUrl = `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;
    const thumbnailUrl = `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg`;

    // Update version with Stream information
    const { error: updateError } = await supabase
      .from("video_versions")
      .update({
        cloudflare_stream_uid: streamUid,
        stream_playback_url: playbackUrl,
        thumbnail_path: thumbnailUrl,
        stream_status: streamData.result.status?.state || "processing",
      })
      .eq("id", versionData.id);

    if (updateError) {
      logStep("Error updating version with stream data", { error: updateError.message });
    }

    // Update workspace storage
    const { error: storageUpdateError } = await supabase.rpc("add_workspace_storage", {
      p_workspace_id: workspaceId,
      p_bytes: fileSize,
    });

    if (storageUpdateError) {
      logStep("Error updating storage", { error: storageUpdateError.message });
      // Non-fatal, continue
    }

    logStep("Video processing initiated", { 
      versionId: versionData.id, 
      streamUid,
      status: streamData.result.status?.state 
    });

    return new Response(JSON.stringify({
      success: true,
      versionId: versionData.id,
      versionNumber: nextVersion,
      streamUid,
      playbackUrl,
      thumbnailUrl,
      status: streamData.result.status?.state || "processing",
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
