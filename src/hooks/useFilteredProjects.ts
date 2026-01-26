import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialPermissions } from './useFinancialPermissions';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;

export interface ProjectWithClient extends Project {
  clients: { name: string } | null;
}

/**
 * Hook que retorna projetos filtrados baseado nas permissões do utilizador:
 * - Admin/Visualizador: Vê todos os projetos
 * - Editor/Captação/Freelancer: Vê apenas projetos onde está na equipa
 */
export function useFilteredProjects() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { user } = useAuth();
  const { canViewAllFinancials, userRole } = useFinancialPermissions();
  
  const [allProjects, setAllProjects] = useState<ProjectWithClient[]>([]);
  const [userProjectIds, setUserProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setAllProjects(projectsData || []);

      // Fetch user's project team memberships
      const { data: teamData, error: teamError } = await supabase
        .from('project_team')
        .select('project_id')
        .eq('user_id', user.id);

      if (teamError) throw teamError;
      
      const projectIds = new Set((teamData || []).map(t => t.project_id));
      setUserProjectIds(projectIds);
      
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      console.error('Error fetching filtered projects:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, fetchError]);

  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchData();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, fetchData]);

  // Filter projects based on dynamic permissions
  const projects = useMemo(() => {
    // If user can view all projects (admin or has visibility.all_projects permission)
    if (canViewAllFinancials || userRole === 'admin') {
      return allProjects;
    }
    
    // All other users see only projects where they are in the team
    return allProjects.filter(project => userProjectIds.has(project.id));
  }, [allProjects, userProjectIds, canViewAllFinancials, userRole]);

  return {
    projects,
    allProjects, // For cases where we need all projects regardless of permissions
    loading,
    userProjectIds, // For filtering in other components
    refresh: fetchData,
  };
}

/**
 * Hook para verificar se o utilizador está na equipa de um projeto específico
 */
export function useIsUserInProject(projectId: string | null | undefined) {
  const { user } = useAuth();
  const [isInTeam, setIsInTeam] = useState(false);
  const [teamPhases, setTeamPhases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMembership = async () => {
      if (!projectId || !user?.id) {
        setIsInTeam(false);
        setTeamPhases([]);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('project_team')
          .select('phase')
          .eq('project_id', projectId)
          .eq('user_id', user.id);

        const phases = (data || []).map(t => t.phase);
        setIsInTeam(phases.length > 0);
        setTeamPhases(phases);
      } catch (error) {
        console.error('Error checking project membership:', error);
        setIsInTeam(false);
        setTeamPhases([]);
      } finally {
        setLoading(false);
      }
    };

    checkMembership();
  }, [projectId, user?.id]);

  return { isInTeam, teamPhases, loading };
}
