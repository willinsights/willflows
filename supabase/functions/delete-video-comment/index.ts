// v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteCommentPayload {
  token: string;
  comment_id: string;
  client_name: string;
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
    const payload: DeleteCommentPayload = await req.json();

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
        JSON.stringify({ error: 'Apenas comentários de cliente podem ser apagados' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the client name matches (case-insensitive)
    const sanitizedPayloadName = payload.client_name.trim().toLowerCase();
    const sanitizedCommentName = (comment.client_name || '').trim().toLowerCase();
    
    if (sanitizedPayloadName !== sanitizedCommentName) {
      return new Response(
        JSON.stringify({ error: 'Não tem permissão para apagar este comentário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the comment belongs to this token's task/project
    const commentMatchesToken = 
      (tokenData.task_id && comment.task_id === tokenData.task_id) ||
      (tokenData.project_id && comment.project_id === tokenData.project_id);

    if (!commentMatchesToken) {
      return new Response(
        JSON.stringify({ error: 'Comentário não pertence a este contexto' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('video_comments')
      .delete()
      .eq('id', payload.comment_id);

    if (deleteError) {
      console.error('Delete comment error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao apagar comentário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Comment ${payload.comment_id} deleted by client "${payload.client_name}"`);

    return new Response(
      JSON.stringify({ success: true }),
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
