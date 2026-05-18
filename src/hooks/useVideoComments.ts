import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { logger } from '@/lib/logger';
export interface VideoComment {
  id: string;
  video_version_id: string;
  task_id: string;
  workspace_id: string;
  timestamp_seconds: number;
  body: string;
  status: 'open' | 'resolved';
  is_client_comment: boolean;
  client_name: string | null;
  author_id: string | null;
  parent_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined data
  author?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  replies?: VideoComment[];
}

interface CreateCommentInput {
  videoVersionId: string;
  taskId: string;
  workspaceId: string;
  timestampSeconds: number;
  body: string;
  parentId?: string;
}

interface CreateClientCommentInput {
  videoVersionId: string;
  taskId: string;
  workspaceId: string;
  timestampSeconds: number;
  body: string;
  clientName: string;
}

export function useVideoComments(videoVersionId: string | null) {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchComments = useCallback(async () => {
    if (!videoVersionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_version_id', videoVersionId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;

      // Organize into threads (top-level + replies)
      const allComments = (data || []) as VideoComment[];
      const topLevel = allComments.filter(c => !c.parent_id);
      const replies = allComments.filter(c => c.parent_id);

      const organized = topLevel.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parent_id === comment.id),
      }));

      setComments(organized);
    } catch (error: any) {
      logger.error('Error fetching video comments:', error);
    } finally {
      setLoading(false);
    }
  }, [videoVersionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Realtime subscription
  useEffect(() => {
    if (!videoVersionId) return;

    const channel = supabase
      .channel(`video_comments:${videoVersionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_comments',
          filter: `video_version_id=eq.${videoVersionId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoVersionId, fetchComments]);

  const addComment = async (input: CreateCommentInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('video_comments')
        .insert({
          video_version_id: input.videoVersionId,
          task_id: input.taskId,
          workspace_id: input.workspaceId,
          timestamp_seconds: input.timestampSeconds,
          body: input.body,
          author_id: user.id,
          is_client_comment: false,
          parent_id: input.parentId || null,
        });

      if (error) throw error;

      toast({ title: 'Comentário adicionado' });
      await fetchComments();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar comentário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // For client comments via public approval page (uses service role in edge function)
  const addClientComment = async (input: CreateClientCommentInput) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .insert({
          video_version_id: input.videoVersionId,
          task_id: input.taskId,
          workspace_id: input.workspaceId,
          timestamp_seconds: input.timestampSeconds,
          body: input.body,
          is_client_comment: true,
          client_name: input.clientName,
          author_id: null,
        });

      if (error) throw error;

      await fetchComments();
    } catch (error: any) {
      logger.error('Error adding client comment:', error);
      throw error;
    }
  };

  const resolveComment = async (commentId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('video_comments')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário marcado como resolvido' });
      await fetchComments();
    } catch (error: any) {
      toast({
        title: 'Erro ao resolver comentário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const reopenComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .update({
          status: 'open',
          resolved_by: null,
          resolved_at: null,
        })
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário reaberto' });
      await fetchComments();
    } catch (error: any) {
      toast({
        title: 'Erro ao reabrir comentário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário apagado' });
      await fetchComments();
    } catch (error: any) {
      toast({
        title: 'Erro ao apagar comentário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Get counts by status
  const openCount = comments.filter(c => c.status === 'open').length;
  const resolvedCount = comments.filter(c => c.status === 'resolved').length;

  return {
    comments,
    loading,
    addComment,
    addClientComment,
    resolveComment,
    reopenComment,
    deleteComment,
    refetch: fetchComments,
    openCount,
    resolvedCount,
  };
}
