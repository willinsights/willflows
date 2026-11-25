import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/** Client photo activity that needs the studio: submitted selections not yet delivered and open client comments. */
export function usePhotoAttention() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ['photo-attention', ws],
    enabled: !!ws,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [sel, com] = await Promise.all([
        supabase.from('photo_galleries').select('id, project_id, selection_submitted_at').eq('workspace_id', ws!).eq('status', 'selection_submitted').order('selection_submitted_at'),
        supabase.from('photo_comments').select('gallery_id, photo_galleries!inner(project_id)').eq('workspace_id', ws!).eq('is_client', true).eq('status', 'open').is('parent_id', null),
      ]);
      if (sel.error) throw sel.error;
      if (com.error) throw com.error;
      const comments = (com.data ?? []) as unknown as { photo_galleries: { project_id: string } }[];
      const firstProject = sel.data?.[0]?.project_id ?? comments[0]?.photo_galleries.project_id ?? null;
      return { selections: sel.data?.length ?? 0, comments: comments.length, firstProject };
    },
  });
}
