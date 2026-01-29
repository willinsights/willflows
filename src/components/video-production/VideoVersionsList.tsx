import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Trash2, 
  Download,
  Clock,
  User,
  HardDrive,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoVersion } from '@/hooks/useVideoVersions';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoVersionsListProps {
  versions: VideoVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: VideoVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onFixVideo?: (version: VideoVersion) => void;
  isFixingVideo?: boolean;
  className?: string;
}

export function VideoVersionsList({
  versions,
  selectedVersionId,
  onSelectVersion,
  onDeleteVersion,
  onFixVideo,
  isFixingVideo,
  className
}: VideoVersionsListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const handleDelete = (versionId: string) => {
    onDeleteVersion(versionId);
    setDeleteConfirmId(null);
  };

  if (versions.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma versão carregada</p>
        <p className="text-xs mt-1">Carregue um vídeo para começar</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Versões</span>
        <Badge variant="secondary">{versions.length}</Badge>
      </div>

      <TooltipProvider>
        {versions.map((version) => {
          const hasStreamError = version.stream_status === 'error' || 
            (version.cloudflare_stream_uid && !version.stream_playback_url);
          
          return (
            <button
              key={version.id}
              onClick={() => onSelectVersion(version)}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-colors",
                selectedVersionId === version.id
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
                hasStreamError && "border-destructive/50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
                    selectedVersionId === version.id
                      ? "bg-primary text-primary-foreground"
                      : hasStreamError
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {hasStreamError ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      `V${version.version_number}`
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-medium line-clamp-2 break-all">{version.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.created_at), "d MMM, HH:mm", { locale: pt })}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(version.file_size_bytes)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Fix button for videos with issues */}
                  {version.cloudflare_stream_uid && onFixVideo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7",
                            hasStreamError 
                              ? "text-destructive hover:text-destructive" 
                              : "text-muted-foreground hover:text-primary"
                          )}
                          disabled={isFixingVideo}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFixVideo(version);
                          }}
                        >
                          <RefreshCw className={cn("h-4 w-4", isFixingVideo && "animate-spin")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Corrigir configurações do vídeo</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(version.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </button>
          );
        })}
      </TooltipProvider>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente o ficheiro de vídeo e todos os comentários associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
