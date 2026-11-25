// v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { clientIdentifier, isRateLimited, logAttempt, rateLimitResponse } from '../_shared/rate-limit.ts';

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { resolveVideoContext, tokenCoversVersion, activeVideoToken, requireScopedVersion, storedKeyMatchesVersion, safeObjectKey, VideoContextError } from '../_shared/video-context.ts';

interface ManageCommentPayload {
  token: string;
  comment_id: string;
  client_name: string;
  delete_key?: string;
  operation?: 'delete' | 'edit';
  body?: string;
}

async function sha256Hex(v: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: ManageCommentPayload = await req.json();
    const operation = payload.operation ?? 'delete';

    if (!['delete', 'edit'].includes(operation) || (operation === 'edit' && (!payload.body?.trim() || payload.body.length > 5000))) {
      return new Response(
        JSON.stringify({ error: 'Operação ou texto do comentário inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.token) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.comment_id) {
      return new Response(
        JSON.stringify({ error: 'ID do comentário não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.client_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Nome do cliente não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing server configuration');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rlId = clientIdentifier(req, payload.token);
    if (await isRateLimited(supabase, rlId, 'approval_token')) {
      return rateLimitResponse(corsHeaders);
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('video_approval_tokens')
      .select('*')
      .eq('token', payload.token)
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

    // Fetch the comment to verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('video_comments')
      .select('*')
      .eq('id', payload.comment_id)
      .maybeSingle();

    if (commentError) {
      console.error('Comment query error:', commentError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar comentário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!comment) {
      return new Response(
        JSON.stringify({ error: 'Comentário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is a client comment
    if (!comment.is_client_comment) {
      return new Response(
        JSON.stringify({ error: 'Apenas comentários de cliente podem ser alterados' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require the secret key issued when the comment was created
    const { data: keyRow } = await supabase
      .from('video_comment_delete_keys')
      .select('key_hash')
      .eq('comment_id', comment.id)
      .maybeSingle();
    if (!payload.delete_key || typeof payload.delete_key !== 'string' || payload.delete_key.length > 200 || !keyRow || keyRow.key_hash !== await sha256Hex(payload.delete_key)) {
      return new Response(
        JSON.stringify({ error: 'Não tem permissão para alterar este comentário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the client name matches (case-insensitive)
    const sanitizedPayloadName = payload.client_name.trim().toLowerCase();
    const sanitizedCommentName = (comment.client_name || '').trim().toLowerCase();
    
    if (sanitizedPayloadName !== sanitizedCommentName) {
      return new Response(
        JSON.stringify({ error: 'Não tem permissão para alterar este comentário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the comment belongs to this token's task/project
    const scope = await resolveVideoContext(supabase, tokenData);
    const version = await requireScopedVersion(supabase, comment.video_version_id, scope);
    const commentMatchesToken = tokenCoversVersion(scope, comment) && comment.workspace_id === version.workspace_id && comment.project_id === version.project_id && comment.task_id === version.task_id;

    if (!commentMatchesToken) {
      return new Response(
        JSON.stringify({ error: 'Comentário não pertence a este contexto' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Approval freezes the historical review, including direct API calls.
    let approvalQuery = supabase
      .from('video_approvals')
      .select('id')
      .eq('workspace_id', version.workspace_id)
      .eq('project_id', version.project_id);
    if (version.task_id) approvalQuery = approvalQuery.eq('task_id', version.task_id);
    const { data: existingApproval } = await approvalQuery.limit(1).maybeSingle();
    if (existingApproval) {
      return new Response(
        JSON.stringify({ error: 'Os comentários estão fechados depois da aprovação' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: mutationError } = operation === 'edit'
      ? await supabase.from('video_comments').update({ body: payload.body!.trim(), edited_at: new Date().toISOString() }).eq('id', payload.comment_id)
      : await supabase.from('video_comments').delete().eq('id', payload.comment_id);

    if (mutationError) {
      console.error('Comment mutation error:', mutationError);
      return new Response(
        JSON.stringify({ error: operation === 'edit' ? 'Erro ao editar comentário' : 'Erro ao apagar comentário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: error instanceof VideoContextError ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
