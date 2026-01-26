import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { projectSchema, projectUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type Client = Tables<'clients'>;

export interface ProjectWithClient extends Project {
  clients: { name: string } | null;
}

export function useProjects() {
  const { currentWorkspace, fetchError, membership } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);
  
  // Check if user is a collaborator (freelancer) - they only see projects they're assigned to
  const isCollaborator = membership?.role === 'freelancer';
  const userId = user?.id;

  const fetchProjects = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // For freelancers, first get project IDs they're assigned to
      let assignedProjectIds: string[] | null = null;
      if (isCollaborator && userId) {
        const { data: assignedProjects } = await supabase
          .from('project_team')
          .select('project_id')
          .eq('user_id', userId);
        assignedProjectIds = assignedProjects?.map(p => p.project_id) || [];
        
        // If no assigned projects, return empty array
        if (assignedProjectIds.length === 0) {
          setProjects([]);
          lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
          return;
        }
      }
      
      let query = supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      // Filter by assigned projects for collaborators
      if (isCollaborator && assignedProjectIds !== null) {
        query = query.in('id', assignedProjectIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching projects:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, isCollaborator, userId]);

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

    // Validate input before database operation
    const validation = validateWithSchema(projectSchema, project);
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    const validatedData = validation.data;

    try {
      // Determine initial phase based on item_type
      const itemType = validatedData.item_type || 'projeto_completo';
      const initialPhase = itemType === 'projeto_edicao' ? 'edicao' : 'captacao';

      // Get first column for the correct phase
      const { data: firstColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', initialPhase)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      // Set the correct column field based on phase
      const columnField = initialPhase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...validatedData,
          workspace_id: currentWorkspace.id,
          [columnField]: firstColumn?.id || null,
          current_phase: initialPhase,
        } as any)
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
    // Validate update data
    const validation = validateWithSchema(projectUpdateSchema, updates);
    if (!validation.success) {
      toast({
        title: 'Dados inválidos',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const validatedData = validation.data;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ ...validatedData, updated_at: new Date().toISOString() } as any)
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

  const duplicateProject = async (projectId: string, newName?: string): Promise<ProjectWithClient | null> => {
    if (!currentWorkspace) return null;

    try {
      // 1. Fetch original project
      const { data: originalProject, error: fetchError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single();

      if (fetchError || !originalProject) throw fetchError;

      // 2. Create new project with copied data
      // Determine initial phase based on item_type
      const itemType = originalProject.item_type || 'projeto_completo';
      const initialPhase = itemType === 'projeto_edicao' ? 'edicao' : 'captacao';

      const projectCopy = {
        name: newName || `${originalProject.name} (cópia)`,
        workspace_id: currentWorkspace.id,
        item_type: originalProject.item_type,
        project_code: originalProject.project_code ? `${originalProject.project_code}-COPY` : null,
        type: originalProject.type,
        category: originalProject.category,
        custom_category_id: originalProject.custom_category_id,
        priority: originalProject.priority,
        client_id: originalProject.client_id,
        city: originalProject.city,
        address: originalProject.address,
        notes: originalProject.notes,
        internal_notes: originalProject.internal_notes,
        agreed_value: originalProject.agreed_value,
        custo_captacao: originalProject.custo_captacao,
        custo_edicao: originalProject.custo_edicao,
        custos_extras: originalProject.custos_extras,
        drive_folder_url: null, // Don't copy URLs
        dropbox_folder_url: null,
        google_meet_url: null,
        current_phase: initialPhase,
        is_delivered: false,
      };

      // Get first column for the correct phase
      const { data: firstColumn } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', initialPhase)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      // Set the correct column field based on phase
      const columnField = initialPhase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          ...projectCopy,
          [columnField]: firstColumn?.id || null,
        } as any)
        .select('*, clients(name)')
        .single();

      if (insertError) throw insertError;

      // 3. Copy tasks
      const { data: originalTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (originalTasks && originalTasks.length > 0) {
        const taskIdMap = new Map<string, string>();

        for (const task of originalTasks) {
          const { data: newTask } = await supabase
            .from('tasks')
            .insert({
              workspace_id: currentWorkspace.id,
              project_id: newProject.id,
              title: task.title,
              description: task.description,
              phase: task.phase,
              priority: task.priority,
              position: task.position,
              is_completed: false,
            })
            .select()
            .single();

          if (newTask) {
            taskIdMap.set(task.id, newTask.id);
          }
        }

        // 4. Copy task checklists
        const taskIds = originalTasks.map(t => t.id);
        const { data: originalChecklists } = await supabase
          .from('task_checklists')
          .select('*')
          .in('task_id', taskIds);

        if (originalChecklists && originalChecklists.length > 0) {
          const checklistsToInsert = originalChecklists
            .filter(cl => taskIdMap.has(cl.task_id))
            .map(cl => ({
              task_id: taskIdMap.get(cl.task_id)!,
              title: cl.title,
              position: cl.position,
              is_completed: false,
            }));

          if (checklistsToInsert.length > 0) {
            await supabase.from('task_checklists').insert(checklistsToInsert);
          }
        }
      }

      // 5. Copy project team
      const { data: originalTeam } = await supabase
        .from('project_team')
        .select('*')
        .eq('project_id', projectId);

      if (originalTeam && originalTeam.length > 0) {
        const teamToInsert = originalTeam.map(member => ({
          project_id: newProject.id,
          user_id: member.user_id,
          phase: member.phase,
          payment_amount: null, // Reset payment info
          payment_status: 'pendente' as const,
        }));

        await supabase.from('project_team').insert(teamToInsert);
      }

      // 6. Copy media links
      const { data: originalLinks } = await supabase
        .from('project_media_links')
        .select('*')
        .eq('project_id', projectId);

      if (originalLinks && originalLinks.length > 0) {
        const linksToInsert = originalLinks.map(link => ({
          project_id: newProject.id,
          link_type: link.link_type,
          url: link.url,
          title: link.title,
          description: link.description,
        }));

        await supabase.from('project_media_links').insert(linksToInsert);
      }

      toast({ title: 'Projeto duplicado com sucesso' });
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      logger.error('Error duplicating project:', error);
      toast({
        title: 'Erro ao duplicar projeto',
        description: handleDatabaseError('duplicateProject', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    refresh: fetchProjects,
  };
}
