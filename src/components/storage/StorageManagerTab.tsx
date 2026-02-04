import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  HardDrive, 
  Video, 
  Image, 
  FileText, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceStorage } from '@/hooks/useWorkspaceStorage';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface VideoVersionWithProject {
  id: string;
  version_number: number;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
  cloudflare_stream_uid: string | null;
  stream_status: string | null;
  project_id: string | null;
  project_name?: string;
  client_name?: string;
  task_title?: string;
  approval_status?: string;
  approved_at?: string;
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  clientName?: string;
  totalBytes: number;
  versions: VideoVersionWithProject[];
}

// Retention period in days for approved videos (configurable per workspace in future)
const RETENTION_DAYS = 30;

export function StorageManagerTab() {
  const { storage, storageData, recalculate, isRecalculating } = useWorkspaceStorage();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Fetch all video versions with project info
  const { data: videoVersions = [], isLoading } = useQuery({
    queryKey: ['storage-manager-videos', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('video_versions')
        .select(`
          id,
          version_number,
          file_name,
          file_size_bytes,
          created_at,
          cloudflare_stream_uid,
          stream_status,
          project_id,
          task_id,
          projects!project_id (
            name,
            clients (name)
          ),
          tasks!task_id (
            title,
            client_approval_status,
            client_approved_at
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((v: any) => ({
        id: v.id,
        version_number: v.version_number,
        file_name: v.file_name,
        file_size_bytes: v.file_size_bytes,
        created_at: v.created_at,
        cloudflare_stream_uid: v.cloudflare_stream_uid,
        stream_status: v.stream_status,
        project_id: v.project_id,
        project_name: v.projects?.name,
        client_name: v.projects?.clients?.name,
        task_title: v.tasks?.title,
        approval_status: v.tasks?.client_approval_status,
        approved_at: v.tasks?.client_approved_at,
      })) as VideoVersionWithProject[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Group versions by project
  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const groups: Record<string, ProjectGroup> = {};
    
    videoVersions.forEach(version => {
      const projectId = version.project_id || 'no-project';
      
      if (!groups[projectId]) {
        groups[projectId] = {
          projectId,
          projectName: version.project_name || 'Sem Projeto',
          clientName: version.client_name,
          totalBytes: 0,
          versions: [],
        };
      }
      
      groups[projectId].totalBytes += version.file_size_bytes;
      groups[projectId].versions.push(version);
    });

    return Object.values(groups).sort((a, b) => b.totalBytes - a.totalBytes);
  }, [videoVersions]);

  // Calculate storage breakdown
  const storageBreakdown = useMemo(() => {
    let videos = 0;
    let images = 0;
    let raw = 0;
    let other = 0;

    videoVersions.forEach(v => {
      // All are videos for now
      videos += v.file_size_bytes;
    });

    return {
      videos,
      images,
      raw,
      other,
    };
  }, [videoVersions]);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleDeleteVersion = async (versionId: string) => {
    setIsDeleting(true);
    try {
      // Get version details first
      const { data: version } = await supabase
        .from('video_versions')
        .select('cloudflare_stream_uid, file_size_bytes')
        .eq('id', versionId)
        .single();

      // Delete from database
      const { error } = await supabase
        .from('video_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;

      // TODO: Delete from Cloudflare Stream if needed

      toast({
        title: 'Versão eliminada',
        description: 'O vídeo foi removido do armazenamento.',
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['storage-manager-videos', currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-storage', currentWorkspace?.id] });
      
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const getVersionStatus = (version: VideoVersionWithProject) => {
    if (version.approval_status === 'approved' && version.approved_at) {
      const daysUntilExpiry = RETENTION_DAYS - differenceInDays(new Date(), new Date(version.approved_at));
      if (daysUntilExpiry <= 0) {
        return { label: 'Expirado', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle };
      }
      if (daysUntilExpiry <= 7) {
        return { label: `Expira em ${daysUntilExpiry}d`, color: 'bg-warning/10 text-warning border-warning/30', icon: Clock };
      }
      return { label: 'Aprovado', color: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Armazenamento
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalculate()}
              disabled={isRecalculating}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isRecalculating && "animate-spin")} />
              Recalcular
            </Button>
            <Button size="sm" className="gradient-primary">
              <Sparkles className="h-4 w-4 mr-1" />
              Upgrade
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatBytes(storage.usedBytes)} usado de {formatBytes(storage.limitBytes)}
              </span>
              <span className={cn(
                "font-medium",
                storage.isFull ? "text-destructive" :
                storage.isNearLimit ? "text-warning" : "text-foreground"
              )}>
                {storage.percentUsed.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, storage.percentUsed)} 
              className={cn(
                "h-3",
                storage.isFull && "[&>div]:bg-destructive",
                storage.isNearLimit && !storage.isFull && "[&>div]:bg-warning"
              )}
            />
          </div>

          {/* Storage breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Vídeos</span>
              </div>
              <span className="text-lg font-semibold">{formatBytes(storageBreakdown.videos)}</span>
            </Card>
            <Card className="p-3 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Image className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Imagens</span>
              </div>
              <span className="text-lg font-semibold">{formatBytes(storageBreakdown.images)}</span>
            </Card>
            <Card className="p-3 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Raw/Projeto</span>
              </div>
              <span className="text-lg font-semibold">{formatBytes(storageBreakdown.raw)}</span>
            </Card>
            <Card className="p-3 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Outros</span>
              </div>
              <span className="text-lg font-semibold">{formatBytes(storageBreakdown.other)}</span>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Media list by project */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Mídias por Projeto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projectGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum vídeo armazenado</p>
            </div>
          ) : (
            projectGroups.map(group => (
              <Collapsible
                key={group.projectId}
                open={expandedProjects.has(group.projectId)}
                onOpenChange={() => toggleProject(group.projectId)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {expandedProjects.has(group.projectId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <span className="font-medium">{group.projectName}</span>
                        {group.clientName && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            • {group.clientName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{group.versions.length} versões</Badge>
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatBytes(group.totalBytes)}
                      </span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-10 pr-4 pb-2">
                  <div className="space-y-2 border-l-2 border-muted pl-4">
                    {group.versions.map(version => {
                      const status = getVersionStatus(version);
                      
                      return (
                        <motion.div
                          key={version.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 min-w-[2rem] rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 aspect-square">
                              V{version.version_number}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{version.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(version.file_size_bytes)} • {format(new Date(version.created_at), 'd MMM yyyy', { locale: pt })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {status && (
                              <Badge variant="outline" className={cn("text-xs", status.color)}>
                                <status.icon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm({ id: version.id, name: version.file_name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres apagar <strong>{deleteConfirm?.name}</strong>?
              Esta ação irá libertar espaço de armazenamento mas não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteVersion(deleteConfirm.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
