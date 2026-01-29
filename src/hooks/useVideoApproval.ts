import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  projectId: string;
  videoVersionId: string;
  workspaceId: string;
  notes?: string;
}

interface ApproveVideoAsClientInput {
  projectId: string;
  videoVersionId: string;
  workspaceId: string;
  clientName: string;
  notes?: string;
}

export function useVideoApproval(projectId: string | null) {
  const [approvals, setApprovals] = useState<VideoApproval[]>([]);
  const [token, setToken] = useState<VideoApprovalToken | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchApprovals = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_approvals')
        .select(`
          *,
          video_version:video_versions(version_number)
        `)
        .eq('project_id', projectId)
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setApprovals((data || []) as unknown as VideoApproval[]);
    } catch (error: any) {
      console.error('Error fetching video approvals:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchToken = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('video_approval_tokens')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setToken(data as VideoApprovalToken | null);
    } catch (error: any) {
      console.error('Error fetching approval token:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchApprovals();
    fetchToken();
  }, [fetchApprovals, fetchToken]);

  // Realtime subscription for approvals
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`video_approvals:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_approvals',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchApprovals]);

  const approveVideo = async (input: ApproveVideoInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('video_approvals')
        .insert({
          project_id: input.projectId,
          video_version_id: input.videoVersionId,
          workspace_id: input.workspaceId,
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
      const { error } = await supabase
        .from('video_approvals')
        .insert({
          project_id: input.projectId,
          video_version_id: input.videoVersionId,
          workspace_id: input.workspaceId,
          approved_by_client: true,
          client_name: input.clientName,
          notes: input.notes || null,
        });

      if (error) throw error;

      await fetchApprovals();
    } catch (error: any) {
      console.error('Error approving video as client:', error);
      throw error;
    }
  };

  const generateToken = async (workspaceId: string, clientName?: string, clientEmail?: string, expiresInDays?: number) => {
    if (!projectId || !user) throw new Error('Missing required data');

    try {
      // Deactivate existing tokens
      await supabase
        .from('video_approval_tokens')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // Create new token
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('video_approval_tokens')
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          client_name: clientName || null,
          client_email: clientEmail || null,
          expires_at: expiresAt,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setToken(data as VideoApprovalToken);
      toast({ title: 'Link de aprovação gerado' });
      return data as VideoApprovalToken;
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
    // Always use production domain for client-facing approval links
    const productionUrl = 'https://willflow.app';
    return `${productionUrl}/video-approval/${token}`;
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
