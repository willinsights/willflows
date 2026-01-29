import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommentPayload {
  type: 'comment';
  token: string;
  video_version_id: string;
  timestamp_seconds: number;
  body: string;
  client_name: string;
}

interface ApprovalPayload {
  type: 'approval';
  token: string;
  video_version_id: string;
  client_name: string;
  notes?: string;
}

type FeedbackPayload = CommentPayload | ApprovalPayload;

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
    const payload: FeedbackPayload = await req.json();

    if (!payload.token) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.type || !['comment', 'approval'].includes(payload.type)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de feedback inválido' }),
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

    // Get task_id or project_id from token
    const taskId = tokenData.task_id;
    const projectId = tokenData.project_id;
    const workspaceId = tokenData.workspace_id;

    if (payload.type === 'comment') {
      const commentPayload = payload as CommentPayload;

      // Validate required fields
      if (!commentPayload.video_version_id || !commentPayload.body?.trim() || !commentPayload.client_name?.trim()) {
        return new Response(
          JSON.stringify({ error: 'Dados do comentário incompletos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize client name (max 100 chars, only text)
      const sanitizedName = commentPayload.client_name.trim().slice(0, 100).replace(/[<>]/g, '');

      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from('video_comments')
        .insert({
          video_version_id: commentPayload.video_version_id,
          task_id: taskId,
          project_id: projectId,
          workspace_id: workspaceId,
          timestamp_seconds: Math.floor(commentPayload.timestamp_seconds || 0),
          body: commentPayload.body.trim().slice(0, 2000), // Max 2000 chars
          is_client_comment: true,
          client_name: sanitizedName,
          status: 'open',
          author_id: null,
        })
        .select()
        .single();

      if (commentError) {
        console.error('Comment insert error:', commentError);
        return new Response(
          JSON.stringify({ error: 'Erro ao guardar comentário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Comment added by client "${sanitizedName}" on version ${commentPayload.video_version_id}`);

      return new Response(
        JSON.stringify({ success: true, comment }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (payload.type === 'approval') {
      const approvalPayload = payload as ApprovalPayload;

      // Validate required fields
      if (!approvalPayload.video_version_id || !approvalPayload.client_name?.trim()) {
        return new Response(
          JSON.stringify({ error: 'Dados da aprovação incompletos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already approved
      let existingApprovalQuery = supabase
        .from('video_approvals')
        .select('id');

      if (taskId) {
        existingApprovalQuery = existingApprovalQuery.eq('task_id', taskId);
      } else if (projectId) {
        existingApprovalQuery = existingApprovalQuery.eq('project_id', projectId);
      }

      const { data: existingApproval } = await existingApprovalQuery.limit(1).maybeSingle();

      if (existingApproval) {
        return new Response(
          JSON.stringify({ error: 'Este vídeo já foi aprovado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize client name
      const sanitizedName = approvalPayload.client_name.trim().slice(0, 100).replace(/[<>]/g, '');

      // Insert approval
      const { data: approval, error: approvalError } = await supabase
        .from('video_approvals')
        .insert({
          task_id: taskId,
          project_id: projectId,
          video_version_id: approvalPayload.video_version_id,
          workspace_id: workspaceId,
          approved_by_client: true,
          client_name: sanitizedName,
          notes: approvalPayload.notes?.trim().slice(0, 1000) || null, // Max 1000 chars
          approved_by_user_id: null,
        })
        .select()
        .single();

      if (approvalError) {
        console.error('Approval insert error:', approvalError);
        return new Response(
          JSON.stringify({ error: 'Erro ao guardar aprovação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Video approved by client "${sanitizedName}" - version ${approvalPayload.video_version_id}`);

      return new Response(
        JSON.stringify({ success: true, approval }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Tipo de feedback desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
