import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Trash2, 
  Download,
  Clock,
  HardDrive,
  RefreshCw,
  Replace,
  AlertTriangle,
  Loader2,
  ImageOff

} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoVersion } from '@/hooks/useVideoVersions';
import { useVideoDownload } from '@/hooks/useVideoDownload';
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
  onReplaceVersion?: (version: VideoVersion) => void;
  onFixVideo?: (version: VideoVersion) => void;
  isFixingVideo?: boolean;
  className?: string;
}

function ThumbnailImage({ src, versionNumber, isSelected }: { src: string; versionNumber: number; isSelected: boolean }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="relative w-16 h-9 min-w-[4rem] flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
        <span className="absolute bottom-0 left-0 text-[10px] font-bold px-1 py-px leading-tight bg-black/70 text-white">
          V{versionNumber}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-16 h-9 min-w-[4rem] flex-shrink-0 rounded overflow-hidden bg-muted">
      <img
        src={src}
        alt={`V${versionNumber}`}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
      <span className={cn(
        "absolute bottom-0 left-0 text-[10px] font-bold px-1 py-px leading-tight",
        isSelected ? "bg-primary text-primary-foreground" : "bg-black/70 text-white"
      )}>
        V{versionNumber}
      </span>
    </div>
  );
}

export function VideoVersionsList({
  versions,
  selectedVersionId,
  onSelectVersion,
  onDeleteVersion,
  onReplaceVersion,
  onFixVideo,
  isFixingVideo,
  className
}: VideoVersionsListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { downloadVideo, isDownloading } = useVideoDownload();

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

  const handleDownload = (version: VideoVersion) => {
    if (!version.cloudflare_stream_uid) return;
    downloadVideo(version.id, version.file_name);
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
      <TooltipProvider>
        {versions.map((version) => {
          const hasStreamError = version.stream_status === 'error' || 
            (version.cloudflare_stream_uid && !version.stream_playback_url);
          const isProcessing = ['processing', 'downloading', 'inprogress', 'pending'].includes(version.stream_status || '');
          
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
                  {isProcessing ? (
                    <div className="relative w-16 h-9 min-w-[4rem] flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="absolute bottom-0 left-0 text-[10px] font-bold px-1 py-px leading-tight bg-black/70 text-white">
                        V{version.version_number}
                      </span>
                    </div>
                  ) : version.thumbnail_path ? (
                    <ThumbnailImage
                      src={version.thumbnail_path}
                      versionNumber={version.version_number}
                      isSelected={selectedVersionId === version.id}
                    />
                  ) : (
                    <div className={cn(
                      "flex items-center justify-center rounded-full",
                      "w-8 h-8 min-w-[2rem] min-h-[2rem] aspect-square flex-shrink-0",
                      "text-sm font-bold",
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
                  )}
                  
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
                  {/* Download button for Cloudflare Stream videos */}
                  {version.cloudflare_stream_uid && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          disabled={isDownloading === version.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(version);
                          }}
                        >
                          {isDownloading === version.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descarregar vídeo</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
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
