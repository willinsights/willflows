import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { logger } from '@/lib/logger';
export interface VideoApproval {
  id: string;
  task_id: string;
  video_version_id: string;
  workspace_id: string;
  approved_by_client: boolean;
  client_name: string | null;
  approved_by_user_id: string | null;
  approved_at: string;
  notes: string | null;
  // Joined data
  video_version?: {
    version_number: number;
  };
  approved_by?: {
    name: string | null;
  };
}

export interface VideoApprovalToken {
  id: string;
  task_id: string;
  workspace_id: string;
  token: string;
  client_email: string | null;
  client_name: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

interface ApproveVideoInput {
  taskId: string;
  videoVersionId: string;
  workspaceId: string;
  notes?: string;
}

interface ApproveVideoAsClientInput {
  taskId: string;
  videoVersionId: string;
  workspaceId: string;
  clientName: string;
  notes?: string;
}

export function useVideoApproval(taskId: string | null, projectId?: string | null) {
  const [approvals, setApprovals] = useState<VideoApproval[]>([]);
  const [token, setToken] = useState<VideoApprovalToken | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchApprovals = useCallback(async () => {
    if (!taskId && !projectId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('video_approvals')
        .select(`
          *,
          video_version:video_versions(version_number)
        `)
        .order('approved_at', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (projectId) {
        query = query.is('task_id', null).eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovals((data || []) as unknown as VideoApproval[]);
    } catch (error: any) {
      logger.error('Error fetching video approvals:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  const fetchToken = useCallback(async () => {
    if (!taskId && !projectId) return;

    try {
      let query = supabase
        .from('video_approval_tokens')
        .select('id, task_id, project_id, workspace_id, client_email, client_name, expires_at, is_active, created_by, created_at')
        .eq('is_active', true);

      if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (projectId) {
        query = query.is('task_id', null).eq('project_id', projectId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        setToken(null);
        return;
      }

      // Plaintext token is not readable via SELECT — fetch it via secure RPC
      const { data: rawToken, error: rpcError } = await supabase
        .rpc('get_video_approval_token', { p_token_id: data.id });

      if (rpcError) {
        logger.error('Error resolving approval token:', rpcError);
        setToken({ ...(data as any), token: '' } as VideoApprovalToken);
        return;
      }

      setToken({ ...(data as any), token: rawToken || '' } as VideoApprovalToken);
    } catch (error: any) {
      logger.error('Error fetching approval token:', error);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    fetchApprovals();
    fetchToken();
  }, [fetchApprovals, fetchToken]);

  // Realtime removed — approval mutations call fetchApprovals() to refresh.

  const approveVideo = async (input: ApproveVideoInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Resolve project_id from hook param or by querying the task
      let resolvedProjectId = projectId;
      let resolvedTaskId: string | null = input.taskId || null;
      if (!resolvedProjectId && resolvedTaskId) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('project_id')
          .eq('id', resolvedTaskId)
          .single();
        resolvedProjectId = taskData?.project_id || null;
      }
      // Fallback: read from video_versions
      if ((!resolvedProjectId || !resolvedTaskId) && input.videoVersionId) {
        const { data: vv } = await supabase
          .from('video_versions')
          .select('project_id, task_id')
          .eq('id', input.videoVersionId)
          .single();
        if (!resolvedProjectId) resolvedProjectId = vv?.project_id || null;
        if (!resolvedTaskId) resolvedTaskId = vv?.task_id || null;
      }

      const { error } = await supabase
        .from('video_approvals')
        .insert({
          task_id: resolvedTaskId,
          video_version_id: input.videoVersionId,
          workspace_id: input.workspaceId,
          project_id: resolvedProjectId || null,
          approved_by_user_id: user.id,
          approved_by_client: false,
          notes: input.notes || null,
        });

      if (error) throw error;

      toast({ title: 'Vídeo aprovado com sucesso' });
      await fetchApprovals();
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar vídeo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const approveVideoAsClient = async (input: ApproveVideoAsClientInput) => {
    try {
      // Resolve project_id from hook param or by querying the task
      let resolvedProjectId = projectId;
      let resolvedTaskId: string | null = input.taskId || null;
      if (!resolvedProjectId && resolvedTaskId) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('project_id')
          .eq('id', resolvedTaskId)
          .single();
        resolvedProjectId = taskData?.project_id || null;
      }
      // Fallback: read from video_versions
      if ((!resolvedProjectId || !resolvedTaskId) && input.videoVersionId) {
        const { data: vv } = await supabase
          .from('video_versions')
          .select('project_id, task_id')
          .eq('id', input.videoVersionId)
          .single();
        if (!resolvedProjectId) resolvedProjectId = vv?.project_id || null;
        if (!resolvedTaskId) resolvedTaskId = vv?.task_id || null;
      }

      const { error } = await supabase
        .from('video_approvals')
        .insert({
          task_id: resolvedTaskId,
          video_version_id: input.videoVersionId,
          workspace_id: input.workspaceId,
          project_id: resolvedProjectId || null,
          approved_by_client: true,
          client_name: input.clientName,
          notes: input.notes || null,
        });

      if (error) throw error;

      await fetchApprovals();
    } catch (error: any) {
      logger.error('Error approving video as client:', error);
      throw error;
    }
  };

  const generateToken = async (workspaceId: string, clientName?: string, clientEmail?: string, expiresInDays?: number) => {
    if ((!taskId && !projectId) || !user) throw new Error('Missing required data');

    try {
      // Deactivate existing tokens
      let deactivateQuery = supabase
        .from('video_approval_tokens')
        .update({ is_active: false });

      if (taskId) {
        deactivateQuery = deactivateQuery.eq('task_id', taskId);
      } else if (projectId) {
        deactivateQuery = deactivateQuery.is('task_id', null).eq('project_id', projectId);
      }

      await deactivateQuery;

      // Create new token
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('video_approval_tokens')
        .insert({
          task_id: taskId || null,
          project_id: projectId || null,
          workspace_id: workspaceId,
          client_name: clientName || null,
          client_email: clientEmail || null,
          expires_at: expiresAt,
          created_by: user.id,
        })
        .select('id, task_id, project_id, workspace_id, client_email, client_name, expires_at, is_active, created_by, created_at')
        .single();

      if (error) throw error;

      // Fetch the plaintext token via secure RPC (column SELECT is restricted)
      const { data: rawToken } = await supabase
        .rpc('get_video_approval_token', { p_token_id: data.id });

      const fullToken = { ...(data as any), token: rawToken || '' } as VideoApprovalToken;
      setToken(fullToken);
      toast({ title: 'Link de aprovação gerado' });
      return fullToken;
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar link',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const revokeToken = async () => {
    if (!token) return;

    try {
      const { error } = await supabase
        .from('video_approval_tokens')
        .update({ is_active: false })
        .eq('id', token.id);

      if (error) throw error;

      setToken(null);
      toast({ title: 'Link de aprovação revogado' });
    } catch (error: any) {
      toast({
        title: 'Erro ao revogar link',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getApprovalUrl = (token: string): string => {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://willflow.app';
    return `${base}/video-approval/${token}`;
  };

  // Check if video is approved (any version)
  const isApproved = approvals.length > 0;
  const latestApproval = approvals[0] || null;

  return {
    approvals,
    token,
    loading,
    isApproved,
    latestApproval,
    approveVideo,
    approveVideoAsClient,
    generateToken,
    revokeToken,
    getApprovalUrl,
    refetch: fetchApprovals,
  };
}
