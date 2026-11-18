import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { clientIdentifier, isRateLimited, logAttempt, rateLimitResponse } from '../_shared/rate-limit.ts';

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveVideoContext, tokenCoversVersion, activeVideoToken, requireScopedVersion, storedKeyMatchesVersion, safeObjectKey, VideoContextError } from '../_shared/video-context.ts';

interface DownloadRequest {
  video_version_id: string;
  approval_token?: string;
}

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
    region: 'auto',
    service: 's3',
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = new URL(`/${bucket}/${key}`, endpoint);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));

  const signedRequest = await r2.sign(
    new Request(url.toString(), { method: 'GET' }),
    { aws: { signQuery: true } }
  );

  return signedRequest.url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY');
    const r2SecretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_KEY');
    const r2Bucket = Deno.env.get('CLOUDFLARE_R2_BUCKET');

    if (!cloudflareAccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
      console.error('[video-download-url] Missing R2 credentials');
      return new Response(
        JSON.stringify({ error: 'R2 configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing server configuration');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { video_version_id, approval_token }: DownloadRequest = await req.json();

    if (!video_version_id) {
      return new Response(
        JSON.stringify({ error: 'video_version_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Authentication ---
    let userId: string | null = null;
    let workspaceId: string | null = null;
    let isPublicApproval = false;
    let approvalTaskId: string | null = null;
    let approvalProjectId: string | null = null;
    let approvalScope: Awaited<ReturnType<typeof resolveVideoContext>> | null = null;

    if (approval_token) {
      const rlId = clientIdentifier(req, approval_token);
      if (await isRateLimited(supabase, rlId, 'approval_token')) {
        return rateLimitResponse(corsHeaders);
      }

      // Unified approval token model: video_approval_tokens (active + not expired)
      const { data: tokenData } = await supabase
        .from('video_approval_tokens')
        .select('id, workspace_id, task_id, project_id, expires_at, is_active')
        .eq('token', approval_token)
        .eq('is_active', true)
        .maybeSingle();

      if (!tokenData || !activeVideoToken(tokenData)) {
        await logAttempt(supabase, rlId, 'approval_token', false);
        return new Response(
          JSON.stringify({ error: 'Link de aprovação inválido ou expirado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      approvalScope = await resolveVideoContext(supabase, tokenData);
      isPublicApproval = true;
      workspaceId = tokenData.workspace_id;
      approvalTaskId = tokenData.task_id;
      approvalProjectId = tokenData.project_id;
    }


    if (!isPublicApproval) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
    }

    // --- Fetch video version (including r2_key) ---
    const { data: version, error: versionError } = await supabase
      .from('video_versions')
      .select('id, file_name, workspace_id, project_id, task_id, r2_key, uploaded_by')
      .eq('id', video_version_id)
      .single();

    if (versionError || !version) {
      console.error('[video-download-url] Version not found:', versionError);
      return new Response(
        JSON.stringify({ error: 'Video version not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Authorization ---
    if (!isPublicApproval && userId) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .eq('workspace_id', version.workspace_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to download this video' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const versionContext = await resolveVideoContext(supabase, version);
    if (isPublicApproval && (!approvalScope || !tokenCoversVersion(approvalScope, versionContext))) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to download this video' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Generate signed R2 URL for original file ---
    if (!version.r2_key) {
      return new Response(
        JSON.stringify({ error: 'Ficheiro original não disponível para download (sem r2_key)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!storedKeyMatchesVersion(version.r2_key, { ...version, ...versionContext })) throw new VideoContextError('Arquivo de vídeo incoerente');
    const downloadUrl = await generateSignedR2Url(
      cloudflareAccountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      r2Bucket,
      version.r2_key,
      3600
    );

    console.log('[video-download-url] Signed R2 URL generated', {
      video_version_id,
      user_id: userId,
      is_public: isPublicApproval,
      r2_key: version.r2_key,
    });

    return new Response(
      JSON.stringify({
        download_url: downloadUrl,
        file_name: version.file_name || 'video.mp4',
        expires_in: 3600,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[video-download-url] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: error instanceof VideoContextError ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
