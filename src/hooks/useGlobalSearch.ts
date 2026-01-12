import { useState, useEffect, useMemo, useCallback } from 'react';
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
}

export function useGlobalSearch(query: string) {
  const { currentWorkspace } = useWorkspace();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (searchTerm: string) => {
    if (!currentWorkspace?.id || !searchTerm.trim()) {
      setResults([]);
      return;
    }

    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Search projects, clients, and tasks in parallel
      const [projectsRes, clientsRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, clients(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('name', `%${term}%`)
          .limit(5),
        supabase
          .from('clients')
          .select('id, name, company, email')
          .eq('workspace_id', currentWorkspace.id)
          .eq('is_active', true)
          .or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, project_id, projects(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('title', `%${term}%`)
          .limit(5),
      ]);

      const searchResults: SearchResult[] = [];

      // Add projects
      if (projectsRes.data) {
        projectsRes.data.forEach((project: any) => {
          searchResults.push({
            id: project.id,
            type: 'project',
            title: project.name,
            subtitle: project.clients?.name || undefined,
            meta: 'Projeto',
          });
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
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      logger.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return { results, loading, hasQuery: debouncedQuery.length >= 2 };
}
