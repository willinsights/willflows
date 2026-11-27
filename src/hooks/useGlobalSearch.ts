import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDebounce } from '@/hooks/use-debounce';
import { logger } from '@/lib/logger';
import { normalizeSearchText } from '@/lib/search-normalize';

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
    // Fold accents/punctuation so "josesilva" finds "Jose Silva". Mirrors the
    // server-side normalize_search_text() behind the *_search columns.
    const norm = normalizeSearchText(term);
    if (norm.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Search projects, clients, and tasks in parallel
      // UUID prefix search (UI shows the first 8 chars of the id).
      const idTerm = term.replace(/^#/, '').replace(/[^0-9a-f-]/g, '');
      const hex = idTerm.replace(/-/g, '');
      const isIdPrefix = idTerm.length === term.replace(/^#/, '').length && hex.length >= 4 && hex.length <= 32;
      const toUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
      const idQuery = isIdPrefix
        ? supabase
            .from('projects')
            .select('id, name, project_code, current_phase, is_delivered, clients(name)')
            .eq('workspace_id', currentWorkspace.id)
            .gte('id', toUuid(hex.padEnd(32, '0')))
            .lte('id', toUuid(hex.padEnd(32, 'f')))
            .limit(5).abortSignal(signal)
        : Promise.resolve({ data: [] as never[] });
      const [projectsRes, projectCodesRes, clientsRes, tasksRes, projectIdsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, project_code, current_phase, is_delivered, clients(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('search_name', `%${norm}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('projects')
          .select('id, name, project_code, current_phase, is_delivered, clients(name)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('search_code', `%${norm}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('clients')
          .select('id, name, company, email')
          .eq('workspace_id', currentWorkspace.id)
          .eq('is_active', true)
          .or(`search_name.ilike.%${norm}%,search_company.ilike.%${norm}%,email.ilike.%${safeTerm}%`)
          .limit(5).abortSignal(signal),
        supabase
          .from('tasks')
          .select('id, title, project_id, projects(name, current_phase, is_delivered)')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('search_title', `%${norm}%`)
          .limit(5).abortSignal(signal),
        idQuery,
      ]);

      if (signal.aborted) return;

      const searchResults: SearchResult[] = [];

      const projects = new Map(
        [...((projectIdsRes.data ?? []) as NonNullable<typeof projectCodesRes.data>), ...(projectCodesRes.data ?? []), ...(projectsRes.data ?? [])].map((project) => [project.id, project]),
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
