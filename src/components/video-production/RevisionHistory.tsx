import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { History, MessageSquare, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { formatTimecode } from '@/lib/duration-utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface RevisionHistoryProps {
  projectId: string;
  taskId: string | null;
  workspaceId: string;
  selectedVersionId: string | null;
  onSelectVersion?: (versionId: string) => void;
  onSeekTo?: (videoVersionId: string, timestampSeconds: number) => void;
}

interface HistoryComment {
  id: string;
  video_version_id: string;
  timestamp_seconds: number;
  body: string;
  status: 'open' | 'resolved';
  is_client_comment: boolean;
  client_name: string | null;
  created_at: string;
}

interface VersionGroup {
  version_id: string;
  version_number: number;
  file_name: string;
  replaced_at: string | null;
  comments: HistoryComment[];
}

export function RevisionHistory({
  projectId,
  taskId,
  workspaceId,
  selectedVersionId,
  onSelectVersion,
  onSeekTo,
}: RevisionHistoryProps) {
  const [groups, setGroups] = useState<VersionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      if (!workspaceId) return;
      setLoading(true);
      try {
        let vq = supabase
          .from('video_versions')
          .select('id, version_number, file_name, replaced_at, task_id, project_id')
          .eq('workspace_id', workspaceId)
          .eq('is_deleted', false)
          .order('version_number', { ascending: false });
        if (taskId) vq = vq.eq('task_id', taskId);
        else vq = vq.eq('project_id', projectId);

        const { data: versions, error: vErr } = await vq;
        if (vErr) throw vErr;
        const versionIds = (versions || []).map(v => v.id);
        if (versionIds.length === 0) {
          setGroups([]);
          return;
        }

        const { data: comments, error: cErr } = await supabase
          .from('video_comments')
          .select('id, video_version_id, timestamp_seconds, body, status, is_client_comment, client_name, created_at')
          .in('video_version_id', versionIds)
          .order('timestamp_seconds', { ascending: true });
        if (cErr) throw cErr;

        const grouped: VersionGroup[] = (versions || []).map(v => ({
          version_id: v.id,
          version_number: v.version_number,
          file_name: v.file_name,
          replaced_at: (v as any).replaced_at,
          comments: ((comments || []) as HistoryComment[]).filter(c => c.video_version_id === v.id),
        }));
        setGroups(grouped);
      } catch (err: any) {
        logger.error('Error loading revision history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, taskId, workspaceId, selectedVersionId]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        A carregar histórico...
      </div>
    );
  }

  const totalComments = groups.reduce((s, g) => s + g.comments.length, 0);
  if (totalComments === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Ainda não há comentários em nenhuma versão.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        if (group.comments.length === 0) return null;
        const isCollapsed = collapsed[group.version_id];
        const isCurrent = selectedVersionId === group.version_id;
        return (
          <div
            key={group.version_id}
            className={cn(
              "rounded-lg border",
              isCurrent ? "border-primary/50 bg-primary/5" : "border-muted"
            )}
          >
            <button
              onClick={() => setCollapsed(c => ({ ...c, [group.version_id]: !isCollapsed }))}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCollapsed ? <ChevronRight className="h-3 w-3 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 flex-shrink-0" />}
                <Badge variant={isCurrent ? "default" : "secondary"} className="flex-shrink-0">
                  V{group.version_number}
                </Badge>
                {group.replaced_at && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex-shrink-0">
                    substituída
                  </span>
                )}
                <span className="text-xs text-muted-foreground truncate" title={group.file_name}>
                  {group.file_name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <MessageSquare className="h-3 w-3" />
                {group.comments.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-1.5">
                {!isCurrent && onSelectVersion && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onSelectVersion(group.version_id)}
                  >
                    Abrir esta versão →
                  </Button>
                )}
                {group.comments.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSeekTo?.(c.video_version_id, c.timestamp_seconds)}
                    className="w-full text-left flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant="outline" className="font-mono text-[10px] flex-shrink-0">
                      {formatTimecode(c.timestamp_seconds)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs line-clamp-2 break-words">{c.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.is_client_comment ? (c.client_name || 'Cliente') : 'Equipa'}
                        {' · '}
                        {format(new Date(c.created_at), "d MMM, HH:mm", { locale: pt })}
                      </p>
                    </div>
                    {c.status === 'resolved' && (
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
