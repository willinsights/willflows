import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface TaskTemplate {
  title: string;
  phase: 'captacao' | 'edicao';
}

export interface ChecklistTemplate {
  title: string;
}

export interface ProjectTemplate {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  item_type: string;
  default_priority: string;
  type: string;
  task_templates: TaskTemplate[];
  checklist_templates: ChecklistTemplate[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useProjectTemplates() {
  const { currentWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      
      // Fetch both system templates (workspace_id IS NULL) and workspace templates
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .or(`workspace_id.is.null,workspace_id.eq.${currentWorkspace.id}`)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      
      // Parse JSON fields
      const parsedTemplates: ProjectTemplate[] = (data || []).map((t: any) => ({
        ...t,
        task_templates: Array.isArray(t.task_templates) ? t.task_templates : [],
        checklist_templates: Array.isArray(t.checklist_templates) ? t.checklist_templates : [],
      }));
      
      setTemplates(parsedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    refresh: fetchTemplates,
  };
}
