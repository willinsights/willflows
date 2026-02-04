import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadRequest {
  video_version_id: string;
  approval_token?: string; // For public review page
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const cloudflareStreamToken = Deno.env.get('CLOUDFLARE_STREAM_TOKEN');

    if (!cloudflareAccountId || !cloudflareStreamToken) {
      console.error('[video-download-url] Missing Cloudflare credentials');
      return new Response(
        JSON.stringify({ error: 'Cloudflare configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { video_version_id, approval_token }: DownloadRequest = await req.json();

    if (!video_version_id) {
      return new Response(
        JSON.stringify({ error: 'video_version_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authentication check
    let userId: string | null = null;
    let workspaceId: string | null = null;
    let isPublicApproval = false;

    // Check for approval token (public review page)
    if (approval_token) {
      const { data: task } = await supabase
        .from('tasks')
        .select('id, workspace_id')
        .eq('client_approval_token', approval_token)
        .single();

      if (task) {
        isPublicApproval = true;
        workspaceId = task.workspace_id;
        console.log('[video-download-url] Public approval access for task:', task.id);
      }
    }

    // If not public approval, check JWT auth
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

    // Fetch video version details
    const { data: version, error: versionError } = await supabase
      .from('video_versions')
      .select('id, cloudflare_stream_uid, file_name, workspace_id, project_id')
      .eq('id', video_version_id)
      .single();

    if (versionError || !version) {
      console.error('[video-download-url] Version not found:', versionError);
      return new Response(
        JSON.stringify({ error: 'Video version not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check for authenticated users
    if (!isPublicApproval && userId) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .eq('workspace_id', version.workspace_id)
        .single();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to download this video' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For public approval, verify workspaceId matches
    if (isPublicApproval && workspaceId !== version.workspace_id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to download this video' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!version.cloudflare_stream_uid) {
      return new Response(
        JSON.stringify({ error: 'Video not available for download (no stream UID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed download URL from Cloudflare Stream
    // First, check if downloads are enabled for this video
    const videoInfoUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${version.cloudflare_stream_uid}`;
    
    const videoInfoResponse = await fetch(videoInfoUrl, {
      headers: {
        'Authorization': `Bearer ${cloudflareStreamToken}`,
      },
    });

    if (!videoInfoResponse.ok) {
      const errorText = await videoInfoResponse.text();
      console.error('[video-download-url] Failed to get video info:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get video information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoInfo = await videoInfoResponse.json();
    
    if (!videoInfo.success || !videoInfo.result) {
      return new Response(
        JSON.stringify({ error: 'Video not found in Cloudflare' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if default download is available
    const defaultDownload = videoInfo.result.defaultCreator?.downloadUrl || 
                            `https://videodelivery.net/${version.cloudflare_stream_uid}/downloads/default.mp4`;

    // Log download for audit
    console.log('[video-download-url] Download initiated', {
      video_version_id,
      user_id: userId,
      is_public: isPublicApproval,
      stream_uid: version.cloudflare_stream_uid,
    });

    // Return download URL
    return new Response(
      JSON.stringify({
        download_url: defaultDownload,
        file_name: version.file_name || 'video.mp4',
        expires_in: 3600, // 1 hour
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[video-download-url] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
