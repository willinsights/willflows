import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type Client = Tables<'clients'>;

export interface ProjectWithClient extends Project {
  clients: { name: string } | null;
}

export function useProjects() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    // Only fetch if workspace ID changed
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchProjects();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  const createProject = async (project: Omit<ProjectInsert, 'workspace_id'>) => {
    if (!currentWorkspace) return null;

    try {
      // Get first column for captacao phase
      const { data: firstColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', 'captacao')
        .order('position', { ascending: true })
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          workspace_id: currentWorkspace.id,
          captacao_column_id: firstColumn?.id || null,
          current_phase: 'captacao',
        })
        .select('*, clients(name)')
        .single();

      if (error) throw error;

      toast({ title: 'Projeto criado com sucesso' });
      setProjects(prev => [data, ...prev]);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao criar projeto',
        description: handleDatabaseError('createProject', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, ...updates } : p))
      );

      toast({ title: 'Projeto atualizado' });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar projeto',
        description: handleDatabaseError('updateProject', error),
        variant: 'destructive',
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: 'Projeto removido' });
    } catch (error) {
      toast({
        title: 'Erro ao remover projeto',
        description: handleDatabaseError('deleteProject', error),
        variant: 'destructive',
      });
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refresh: fetchProjects,
  };
}
