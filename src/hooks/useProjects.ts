import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { handleDatabaseError } from '@/lib/error-handler';
import { projectSchema, projectUpdateSchema, validateWithSchema } from '@/lib/validation-schemas';
import { logger } from '@/lib/logger';
import { fetchAllRows } from '@/lib/fetch-all';
import { PROJECTS_CHANGED_EVENT } from '@/lib/query-client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type Client = Tables<'clients'>;

export interface ProjectWithClient extends Project {
  clients: { name: string } | null;
}

export function useProjects() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canViewAllProjects, isLoading: permissionsLoading } = useFinancialPermissions();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;
  const enabled = Boolean(workspaceId && userId && !fetchError && !permissionsLoading);
  const queryKey = ['scoped-project-list', workspaceId, userId, canViewAllProjects] as const;
  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }): Promise<ProjectWithClient[]> => {
      if (!workspaceId || !userId) return [];

      let assignedProjectIds: string[] | undefined;
      if (!canViewAllProjects) {
        const { data, error } = await supabase
          .from('project_team')
          .select('project_id')
          .eq('user_id', userId)
          .abortSignal(signal);
        if (error) throw error;
        assignedProjectIds = data?.map(project => project.project_id) ?? [];
        if (assignedProjectIds.length === 0) return [];
      }

      return fetchAllRows(() => {
        let request = supabase
          .from('projects')
          .select('*, clients(name)')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true });
        if (assignedProjectIds) request = request.in('id', assignedProjectIds);
        return request.abortSignal(signal);
      });
    },
  });
  const projects = enabled ? query.data ?? [] : [];
  const loading = !fetchError && (permissionsLoading || (enabled && query.isFetching));
  const { refetch } = query;

  const fetchProjects = useCallback(async () => {
    if (enabled) await refetch();
  }, [enabled, refetch]);

  const setProjects = (update: (previous: ProjectWithClient[]) => ProjectWithClient[]) => {
    if (enabled) {
      queryClient.setQueryData<ProjectWithClient[]>(queryKey, previous => update(previous ?? []));
    }
  };

  // The bridge also receives changes from Kanban and existing project mutations.
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refetch({ cancelRefetch: false }), 300);
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, onChange);
      clearTimeout(timer);
    };
  }, [enabled, refetch]);

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
      const { data: firstColumn, error: columnError } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', initialPhase)
        .eq('is_final', false)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (columnError || !firstColumn) {
        toast({
          title: 'Não foi possível iniciar o projeto',
          description: `Configure uma coluna não final no Kanban de ${initialPhase === 'captacao' ? 'Captação' : 'Edição'} e tente novamente.`,
          variant: 'destructive',
        });
        return null;
      }

      // Set the correct column field based on phase
      const columnField = initialPhase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...validatedData,
          workspace_id: currentWorkspace.id,
          [columnField]: firstColumn.id,
          current_phase: initialPhase,
        } as any)
        .select('*, clients(name)')
        .single();

      if (error) throw error;

      toast({ title: 'Projeto criado com sucesso' }); window.dispatchEvent(new Event('willflow:projects-changed'));
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

      toast({ title: 'Projeto atualizado' }); window.dispatchEvent(new Event('willflow:projects-changed'));
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
      toast({ title: 'Projeto removido' }); window.dispatchEvent(new Event('willflow:projects-changed'));
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
      const { data: firstColumn, error: columnError } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', initialPhase)
        .eq('is_final', false)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (columnError || !firstColumn) {
        toast({
          title: 'Não foi possível iniciar o projeto',
          description: `Configure uma coluna não final no Kanban de ${initialPhase === 'captacao' ? 'Captação' : 'Edição'} e tente novamente.`,
          variant: 'destructive',
        });
        return null;
      }

      // Set the correct column field based on phase
      const columnField = initialPhase === 'captacao' ? 'captacao_column_id' : 'edicao_column_id';

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          ...projectCopy,
          [columnField]: firstColumn.id,
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

      toast({ title: 'Projeto duplicado com sucesso' }); window.dispatchEvent(new Event('willflow:projects-changed'));
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
    error: enabled ? query.error : null,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    refresh: fetchProjects,
  };
}
