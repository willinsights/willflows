import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { logger } from '@/lib/logger';
export interface VideoStructure {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  min_duration_seconds: number;
  max_duration_seconds: number | null;
  position: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  min_duration_seconds: number;
  max_duration_seconds?: number;
  notes?: string;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  min_duration_seconds?: number;
  max_duration_seconds?: number | null;
  notes?: string;
}

export function useVideoStructure(projectId: string | null, workspaceId: string | null) {
  const [segments, setSegments] = useState<VideoStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSegments = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_structures')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      
      if (error) throw error;
      setSegments((data as VideoStructure[]) || []);
    } catch (error: any) {
      logger.error('Error fetching video structures:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Realtime removed — segment mutations call fetchSegments() to refresh.

  const addSegment = async (data: CreateSegmentInput) => {
    if (!projectId || !workspaceId || !user) return;

    try {
      const maxPosition = segments.length > 0 
        ? Math.max(...segments.map(s => s.position)) + 1 
        : 0;

      const { error } = await supabase
        .from('video_structures')
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          name: data.name,
          description: data.description || null,
          min_duration_seconds: data.min_duration_seconds,
          max_duration_seconds: data.max_duration_seconds || null,
          notes: data.notes || null,
          position: maxPosition,
          created_by: user.id,
        });

      if (error) throw error;
      
      toast({ title: 'Segmento adicionado' });
      await fetchSegments();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar segmento', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateSegment = async (id: string, data: UpdateSegmentInput) => {
    try {
      const { error } = await supabase
        .from('video_structures')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Segmento atualizado' });
      await fetchSegments();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar segmento', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const deleteSegment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_structures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Segmento removido' });
      await fetchSegments();
    } catch (error: any) {
      toast({ title: 'Erro ao remover segmento', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const reorderSegments = async (reorderedSegments: VideoStructure[]) => {
    try {
      const updates = reorderedSegments.map((segment, index) => ({
        id: segment.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('video_structures')
          .update({ position: update.position, updated_at: new Date().toISOString() })
          .eq('id', update.id);
      }

      setSegments(reorderedSegments.map((s, i) => ({ ...s, position: i })));
    } catch (error: any) {
      toast({ title: 'Erro ao reordenar', description: error.message, variant: 'destructive' });
      await fetchSegments();
    }
  };

  const applyTemplate = async (templateSegments: Array<{ name: string; description?: string; min_duration_seconds: number; max_duration_seconds?: number; notes?: string }>) => {
    if (!projectId || !workspaceId || !user) return;

    try {
      // Clear existing segments
      await supabase
        .from('video_structures')
        .delete()
        .eq('project_id', projectId);

      // Insert new segments from template
      const newSegments = templateSegments.map((segment, index) => ({
        project_id: projectId,
        workspace_id: workspaceId,
        name: segment.name,
        description: segment.description || null,
        min_duration_seconds: segment.min_duration_seconds,
        max_duration_seconds: segment.max_duration_seconds || null,
        notes: segment.notes || null,
        position: index,
        created_by: user.id,
      }));

      if (newSegments.length > 0) {
        const { error } = await supabase
          .from('video_structures')
          .insert(newSegments);

        if (error) throw error;
      }

      toast({ title: 'Template aplicado com sucesso' });
      await fetchSegments();
    } catch (error: any) {
      toast({ title: 'Erro ao aplicar template', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const clearAll = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('video_structures')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;
      
      toast({ title: 'Timeline limpa' });
      setSegments([]);
    } catch (error: any) {
      toast({ title: 'Erro ao limpar timeline', description: error.message, variant: 'destructive' });
    }
  };

  return {
    segments,
    loading,
    addSegment,
    updateSegment,
    deleteSegment,
    reorderSegments,
    applyTemplate,
    clearAll,
    refetch: fetchSegments,
  };
}
