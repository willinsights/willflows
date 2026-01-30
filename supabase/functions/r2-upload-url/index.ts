import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[R2-UPLOAD-URL] ${step}${detailsStr}`);
};

// Generate presigned URL using aws4fetch (Deno-compatible)
async function generateR2PresignedUrl(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = new URL(`/${bucket}/${key}`, endpoint);

  // Let aws4fetch generate *all* AWS SigV4 query params.
  // Only set expiry explicitly (Cloudflare R2 docs pattern).
  url.searchParams.set('X-Amz-Expires', String(expiresIn));

  const signedRequest = await r2.sign(
    new Request(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
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
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing Cloudflare R2 configuration");
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
    const { workspaceId, taskId, projectId, fileName, fileSize, mimeType } = await req.json();

    // taskId is optional - projectId is required when no taskId
    if (!workspaceId || !projectId || !fileName || !fileSize) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a member of the workspace
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (membershipError || !membership) {
      logStep("Membership check failed", { error: membershipError?.message });
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check workspace storage limits
    const { data: storageData, error: storageError } = await supabase
      .from("workspace_storage")
      .select("storage_used_bytes, storage_limit_bytes, extra_storage_bytes")
      .eq("workspace_id", workspaceId)
      .single();

    if (storageError) {
      logStep("Storage check failed", { error: storageError.message });
      // Create storage record if it doesn't exist
      const { error: insertError } = await supabase
        .from("workspace_storage")
        .insert({
          workspace_id: workspaceId,
          storage_used_bytes: 0,
          storage_limit_bytes: 10 * 1024 * 1024 * 1024, // 10GB default
          extra_storage_bytes: 0,
        });
      
      if (insertError) {
        throw new Error("Failed to initialize workspace storage");
      }
    } else {
      const totalLimit = (storageData.storage_limit_bytes || 0) + (storageData.extra_storage_bytes || 0);
      const currentUsed = storageData.storage_used_bytes || 0;
      const remainingBytes = totalLimit - currentUsed;

      if (fileSize > remainingBytes) {
        logStep("Storage limit exceeded", { 
          totalLimit, 
          currentUsed, 
          remainingBytes, 
          fileSize 
        });
        return new Response(JSON.stringify({ 
          error: "Storage limit exceeded",
          remainingBytes,
          requiredBytes: fileSize
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate unique file key
    const fileExt = fileName.split('.').pop() || 'mp4';
    const timestamp = Date.now();
    const uniqueKey = `${workspaceId}/${taskId}/${timestamp}_${crypto.randomUUID()}.${fileExt}`;

    logStep("Generating presigned URL", { key: uniqueKey, fileSize, mimeType });

    // Generate presigned URL using aws4fetch
    const presignedUrl = await generateR2PresignedUrl(
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      uniqueKey,
      mimeType || "video/mp4",
      3600
    );

    logStep("Presigned URL generated successfully");

    return new Response(JSON.stringify({
      uploadUrl: presignedUrl,
      key: uniqueKey,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      workspaceId,
      taskId,
      projectId,
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
