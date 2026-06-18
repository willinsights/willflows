// Edge function: get-video-approval-data - v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoVersion {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  created_at: string;
  workspace_id: string;
  task_id: string | null;
  project_id: string | null;
  stream_playback_url: string | null;
  cloudflare_stream_uid: string | null;
  stream_status: string | null;
  thumbnail_path: string | null;
}

interface VideoComment {
  id: string;
  video_version_id: string;
  timestamp_seconds: number;
  body: string;
  status: 'open' | 'resolved';
  is_client_comment: boolean;
  client_name: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('video_approval_tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError) {
      console.error('Token query error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Link de aprovação inválido ou expirado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link de aprovação expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query based on task_id or project_id
    let versionsQuery = supabase
      .from('video_versions')
      .select('*')
      .order('version_number', { ascending: false });

    let commentsQuery = supabase
      .from('video_comments')
      .select('*')
      .is('parent_id', null)
      .order('timestamp_seconds', { ascending: true });

    let approvalsQuery = supabase
      .from('video_approvals')
      .select('*, video_version:video_versions(version_number)')
      .order('approved_at', { ascending: false })
      .limit(1);

    // Filter by task_id if present, otherwise by project_id
    if (tokenData.task_id) {
      versionsQuery = versionsQuery.eq('task_id', tokenData.task_id);
      commentsQuery = commentsQuery.eq('task_id', tokenData.task_id);
      approvalsQuery = approvalsQuery.eq('task_id', tokenData.task_id);
    } else if (tokenData.project_id) {
      versionsQuery = versionsQuery.eq('project_id', tokenData.project_id);
      commentsQuery = commentsQuery.eq('project_id', tokenData.project_id);
      approvalsQuery = approvalsQuery.eq('project_id', tokenData.project_id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Token sem projeto ou tarefa associada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task/project info
    let taskTitle = 'Vídeo';
    let projectName = '';
    let taskId = tokenData.task_id;
    let projectId = tokenData.project_id;

    if (tokenData.task_id) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, project:projects(name)')
        .eq('id', tokenData.task_id)
        .single();
      
      if (taskData) {
        taskTitle = taskData.title || 'Vídeo';
        projectName = (taskData.project as any)?.name || '';
        projectId = (taskData as any).project_id;
      }
    } else if (tokenData.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', tokenData.project_id)
        .single();
      
      if (projectData) {
        taskTitle = 'Produção de Vídeo';
        projectName = projectData.name || '';
      }
    }

    // Fetch versions
    const { data: versions, error: versionsError } = await versionsQuery;
    if (versionsError) {
      console.error('Versions query error:', versionsError);
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await commentsQuery;
    if (commentsError) {
      console.error('Comments query error:', commentsError);
    }

    // Check if already approved
    const { data: approvals } = await approvalsQuery;
    const approval = approvals?.[0] || null;

    // Generate video URLs - prefer Cloudflare Stream replacement, then original, fallback to signed Supabase URLs
    const videoUrls: Record<string, string> = {};
    for (const version of (versions || []) as any[]) {
      // Prefer replacement (corrected) video when ready
      if (version.replacement_stream_uid && version.replacement_status === 'ready') {
        videoUrls[version.id] = `https://videodelivery.net/${version.replacement_stream_uid}/manifest/video.m3u8`;
      } else if (version.replacement_playback_url && version.replacement_status === 'ready') {
        videoUrls[version.id] = version.replacement_playback_url;
      } else if (version.cloudflare_stream_uid && version.stream_status === 'ready') {
        videoUrls[version.id] = `https://videodelivery.net/${version.cloudflare_stream_uid}/manifest/video.m3u8`;
      } else if (version.stream_playback_url) {
        // Use stored stream URL (already canonical)
        videoUrls[version.id] = version.stream_playback_url;
      } else {
        // Fallback to Supabase Storage signed URL for legacy videos
        const { data: urlData, error: urlError } = await supabase.storage
          .from('video-versions')
          .createSignedUrl(version.file_path, 1800); // 30 minutes

        if (urlData?.signedUrl && !urlError) {
          videoUrls[version.id] = urlData.signedUrl;
        } else if (urlError) {
          console.error(`Failed to create signed URL for ${version.id}:`, urlError);
        }
      }
    }

    // Build response
    const responseData = {
      task: {
        id: taskId || projectId,
        title: taskTitle,
        project_name: projectName,
      },
      versions: versions || [],
      comments: (comments || []) as VideoComment[],
      approval: approval ? {
        approved_at: approval.approved_at,
        client_name: approval.client_name,
        notes: approval.notes,
        version_number: (approval.video_version as any)?.version_number || null,
      } : null,
      client_name: tokenData.client_name,
      workspace_id: tokenData.workspace_id,
      signed_urls: videoUrls,
    };

    console.log(`Approval data fetched for token ${token.substring(0, 8)}... - ${(versions || []).length} versions, ${(comments || []).length} comments`);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
