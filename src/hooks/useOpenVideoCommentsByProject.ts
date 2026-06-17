import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * Returns a Map<projectId, openCommentsCount> with all unresolved video
 * comments (status='open') for the current workspace.
 * Shared across the Kanban board — React Query dedupes by workspaceId.
 */
export function useOpenVideoCommentsByProject() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const queryKey = ['kanban-open-video-comments', workspaceId];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workspaceId) return new Map<string, number>();
      const { data, error } = await supabase
        .from('video_comments')
        .select('project_id, video_versions:video_version_id(project_id)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'open');

      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data || []) {
        const r = row as {
          project_id: string | null;
          video_versions: { project_id: string | null } | null;
        };
        const pid = r.project_id || r.video_versions?.project_id || null;
        if (!pid) continue;
        map.set(pid, (map.get(pid) || 0) + 1);
      }
      return map;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // Realtime removed — comment mutations invalidate this query when needed.

  return data ?? new Map<string, number>();
}
