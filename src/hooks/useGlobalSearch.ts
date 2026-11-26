import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDebounce } from '@/hooks/use-debounce';
import { logger } from '@/lib/logger';

export interface SearchResult {
  id: string;
  type: 'project' | 'client' | 'task';
  title: string;
  subtitle?: string;
  meta?: string;
  currentPhase?: 'captacao' | 'edicao';
  isDelivered?: boolean;
  projectId?: string;
}

export function useGlobalSearch(query: string) {
  const { currentWorkspace } = useWorkspace();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (searchTerm: string, signal: AbortSignal) => {
    if (!currentWorkspace?.id || !searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const term = searchTerm.trim().toLowerCase();
    // Strip filter-grammar characters so typed text cannot alter the OR filter.
    const safeTerm = term.replace(/[,()*%\\"']/g, ' ').trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Search projects, clients, and tasks in parallel
      const [projectsRes, projectCodesRes, clientsRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, project_code, current_phase, is_delivered, clients(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('name', `%${term}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('projects')
          .select('id, name, project_code, current_phase, is_delivered, clients(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('project_code', `%${term}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('clients')
          .select('id, name, company, email')
          .eq('workspace_id', currentWorkspace.id)
          .eq('is_active', true)
          .or(`name.ilike.%${safeTerm}%,company.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('tasks')
          .select('id, title, project_id, projects(name, current_phase, is_delivered)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('title', `%${term}%`)
          .limit(5).abortSignal(signal),
      ]);

      if (signal.aborted) return;

      const searchResults: SearchResult[] = [];

      const projects = new Map(
        [...(projectCodesRes.data ?? []), ...(projectsRes.data ?? [])].map((project) => [project.id, project]),
      );
      for (const project of Array.from(projects.values()).slice(0, 5)) {
        searchResults.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: project.clients?.name || undefined,
          meta: project.project_code || 'Projeto',
          currentPhase: project.current_phase as SearchResult['currentPhase'],
          isDelivered: project.is_delivered ?? undefined,
        });
      }

      // Add clients
      if (clientsRes.data) {
        clientsRes.data.forEach((client: any) => {
          searchResults.push({
            id: client.id,
            type: 'client',
            title: client.name,
            subtitle: client.company || client.email || undefined,
            meta: 'Cliente',
          });
        });
      }

      // Add tasks
      if (tasksRes.data) {
        tasksRes.data.forEach((task: any) => {
          searchResults.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.projects?.name || undefined,
            meta: 'Tarefa',
            projectId: task.project_id,
            currentPhase: task.projects?.current_phase,
            isDelivered: task.projects?.is_delivered,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      if (signal.aborted) return;
      logger.error('Search error:', error);
      setResults([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    void search(debouncedQuery, controller.signal);
    return () => controller.abort();
  }, [debouncedQuery, search]);

  return { results, loading, hasQuery: debouncedQuery.length >= 2 };
}
