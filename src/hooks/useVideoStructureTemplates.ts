import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { VideoStructure } from './useVideoStructure';
import type { Json } from '@/integrations/supabase/types';

export interface TemplateSegment {
  name: string;
  description?: string;
  min_duration_seconds: number;
  max_duration_seconds?: number;
  notes?: string;
}

export interface VideoStructureTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  segments: TemplateSegment[];
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function parseSegments(segments: Json): TemplateSegment[] {
  if (!segments || !Array.isArray(segments)) return [];
  
  return segments.map((s: any) => ({
    name: s.name || '',
    description: s.description,
    min_duration_seconds: s.min_duration_seconds || 0,
    max_duration_seconds: s.max_duration_seconds,
    notes: s.notes,
  }));
}

export function useVideoStructureTemplates(workspaceId: string | null) {
  const [templates, setTemplates] = useState<VideoStructureTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTemplates = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_structure_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');
      
      if (error) throw error;
      
      // Parse segments from JSONB
      const parsed = (data || []).map(t => ({
        ...t,
        segments: parseSegments(t.segments),
      })) as VideoStructureTemplate[];
      
      setTemplates(parsed);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (
    name: string, 
    segments: VideoStructure[], 
    description?: string
  ) => {
    if (!workspaceId || !user) return;

    try {
      const templateSegments = segments.map(s => ({
        name: s.name,
        description: s.description || undefined,
        min_duration_seconds: s.min_duration_seconds,
        max_duration_seconds: s.max_duration_seconds || undefined,
        notes: s.notes || undefined,
      }));

      const { error } = await supabase
        .from('video_structure_templates')
        .insert({
          workspace_id: workspaceId,
          name,
          description: description || null,
          segments: templateSegments as unknown as Json,
          created_by: user.id,
        });

      if (error) throw error;
      
      toast({ title: 'Template guardado com sucesso' });
      await fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Erro ao guardar template', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_structure_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Template removido' });
      await fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Erro ao remover template', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateTemplate = async (
    id: string, 
    data: { name?: string; description?: string; segments?: TemplateSegment[] }
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.segments !== undefined) updateData.segments = data.segments as unknown as Json;

      const { error } = await supabase
        .from('video_structure_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Template atualizado' });
      await fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar template', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    updateTemplate,
    refetch: fetchTemplates,
  };
}
