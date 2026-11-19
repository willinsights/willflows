import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { clientIdentifier, isRateLimited, logAttempt, rateLimitResponse } from '../_shared/rate-limit.ts';

import { resolveVideoContext, tokenCoversVersion, activeVideoToken, storedKeyMatchesVersion, safeObjectKey, VideoContextError } from '../_shared/video-context.ts';

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

export async function approvalData(req: Request, connect: () => SupabaseClient, corsHeaders: Record<string, string>): Promise<Response> {
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

    const supabase = connect();

    const rlId = clientIdentifier(req, token);
    if (await isRateLimited(supabase, rlId, 'approval_token')) {
      return rateLimitResponse(corsHeaders);
    }

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
      await logAttempt(supabase, rlId, 'approval_token', false);
      return new Response(
        JSON.stringify({ error: 'Link de aprovação inválido ou expirado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (!activeVideoToken(tokenData)) {
      return new Response(
        JSON.stringify({ error: 'Este link de aprovação expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scope = await resolveVideoContext(supabase, tokenData);
    // Build query based on task_id or project_id
    let versionsQuery = supabase
      .from('video_versions')
      .select('*')
      .not('is_deleted', 'is', true)
      .eq('workspace_id', scope.workspace_id).or(`project_id.eq.${scope.project_id},project_id.is.null`)
      .order('version_number', { ascending: false });

    const commentsQuery = supabase
      .from('video_comments')
      .select('*')
      .eq('workspace_id', scope.workspace_id)
      .is('parent_id', null)
      .order('timestamp_seconds', { ascending: true });

    const approvalsQuery = supabase
      .from('video_approvals')
      .select('*, video_version:video_versions(version_number)')
      .eq('workspace_id', scope.workspace_id)
      .order('approved_at', { ascending: false })
      .limit(1);

    if (tokenData.task_id) versionsQuery = versionsQuery.eq('task_id', tokenData.task_id);

    // Fetch task/project info
    let taskTitle = 'Vídeo';
    let projectName = '';
    let taskId = tokenData.task_id;
    let projectId = scope.project_id;

    if (tokenData.task_id) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, project_id, project:projects(name)')
        .eq('workspace_id', scope.workspace_id).eq('project_id', scope.project_id)
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
        .select('id, name').eq('workspace_id', scope.workspace_id)
        .eq('id', tokenData.project_id)
        .single();

      if (projectData) {
        taskTitle = 'Produção de Vídeo';
        projectName = projectData.name || '';
      }
    }

    // Fetch versions
    const { data: candidateVersions, error: versionsError } = await versionsQuery;
    if (versionsError) {
      throw new Error('Não foi possível confirmar as versões');
    }

    const versions: any[] = [];
    for (const version of candidateVersions || []) {
      const context = await resolveVideoContext(supabase, version);
      if (tokenCoversVersion(scope, context)) versions.push({ ...version, ...context });
    }
    const ids = versions.map(version => version.id);
    // Link historical review rows through their validated version, not a nullable project field.
    const [commentResult, approvalResult] = ids.length ? await Promise.all([
      commentsQuery.in('video_version_id', ids),
      approvalsQuery.in('video_version_id', ids),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (commentResult.error || approvalResult.error) {
      throw new Error('Não foi possível confirmar o histórico de aprovação');
    }
    const comments = commentResult.data || [];
    const approvals = approvalResult.data;
    const approval = approvals?.[0] || null;

    // Historical rows must also reference a version covered by this link.
    for (const item of [...(comments || []), ...(approval ? [approval] : [])]) {
      const version = versions.find(version => version.id === item.video_version_id);
      if (!version || item.workspace_id !== version.workspace_id || (item.project_id && item.project_id !== version.project_id) || (item.task_id && item.task_id !== version.task_id)) throw new VideoContextError('Revisão fora do escopo');
    }

    // Generate video URLs - prefer Cloudflare Stream replacement, then original, fallback to signed Supabase URLs
    const videoUrls: Record<string, string> = {};
    for (const version of versions) {
      if (version.r2_key && !storedKeyMatchesVersion(version.r2_key, version)) throw new VideoContextError('Arquivo de vídeo incoerente');
      if (version.replacement_r2_key && !storedKeyMatchesVersion(version.replacement_r2_key, version)) throw new VideoContextError('Arquivo corrigido incoerente');
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
      } else if (version.r2_key || version.cloudflare_stream_uid || version.file_path?.startsWith('r2://')) {
        // Keep the link and its history accessible while Stream has no playable URL.
        continue;
      } else {
        if (!safeObjectKey(version.file_path) || !version.file_path.startsWith(`${scope.workspace_id}/`)) throw new VideoContextError('Arquivo legado incoerente');
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

    console.log(`Approval data fetched: ${(versions || []).length} versions`);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: error instanceof VideoContextError ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
