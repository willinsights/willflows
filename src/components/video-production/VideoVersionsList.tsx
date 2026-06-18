import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Video,
  Trash2,
  Download,
  Clock,
  HardDrive,
  RefreshCw,
  ArrowUpDown,
  AlertTriangle,
  Loader2,
  ImageOff,
  MoreVertical,
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VideoVersionsListProps {
  versions: VideoVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: VideoVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onReplaceVersion?: (version: VideoVersion, file: File) => void | Promise<void>;
  onFixVideo?: (version: VideoVersion) => void;
  isFixingVideo?: boolean;
  className?: string;
}

function ThumbnailImage({
  src,
  versionNumber,
  isSelected,
}: {
  src: string | null;
  versionNumber: number;
  isSelected: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="relative w-16 h-9 min-w-[4rem] flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
        <ImageOff className="absolute top-0.5 right-0.5 h-3 w-3 text-muted-foreground/70" />
        <span
          className={cn(
            'text-[11px] font-bold leading-none',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          V{versionNumber}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-16 h-9 min-w-[4rem] flex-shrink-0 rounded overflow-hidden bg-muted">
      <img
        key={src}
        src={src}
        alt={`V${versionNumber}`}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
      <span
        className={cn(
          'absolute bottom-0 left-0 text-[10px] font-bold px-1 py-px leading-tight',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-black/70 text-white'
        )}
      >
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
  className,
}: VideoVersionsListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<VideoVersion | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [submittingReplace, setSubmittingReplace] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const { downloadVideo, isDownloading } = useVideoDownload();

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
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

  const handleConfirmReplace = async () => {
    if (!replaceTarget || !replaceFile || !onReplaceVersion) return;
    setSubmittingReplace(true);
    try {
      await onReplaceVersion(replaceTarget, replaceFile);
      setReplaceTarget(null);
      setReplaceFile(null);
    } finally {
      setSubmittingReplace(false);
    }
  };

  if (versions.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma versão carregada</p>
        <p className="text-xs mt-1">Carregue um vídeo para começar</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <TooltipProvider>
        {versions.map((version) => {
          const hasStreamError =
            version.stream_status === 'error' ||
            (version.cloudflare_stream_uid && !version.stream_playback_url);
          const isProcessing = ['processing', 'downloading', 'inprogress', 'pending'].includes(
            version.stream_status || ''
          );
          const hasReplacement = !!(version.replacement_stream_uid || version.replacement_playback_url);
          const thumbnailMissing = !version.thumbnail_path && !isProcessing;

          return (
            <div
              key={version.id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                selectedVersionId === version.id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/50',
                hasStreamError && 'border-destructive/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectVersion(version)}
                  className="flex flex-1 items-center gap-3 text-left min-w-0"
                >
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
                    <div
                      className={cn(
                        'flex items-center justify-center rounded',
                        'w-16 h-9 min-w-[4rem] flex-shrink-0 text-xs font-bold',
                        selectedVersionId === version.id
                          ? 'bg-primary/10 text-primary'
                          : hasStreamError
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {hasStreamError ? <AlertTriangle className="h-4 w-4" /> : `V${version.version_number}`}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p
                          className="font-medium line-clamp-2 break-all text-left cursor-help text-sm"
                          title={version.file_name}
                        >
                          {version.file_name}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[320px] break-all">
                        <p>{version.file_name}</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {isProcessing && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0"
                        >
                          Em processamento
                        </Badge>
                      )}
                      {hasStreamError && !isProcessing && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Erro
                        </Badge>
                      )}
                      {hasReplacement && !isProcessing && (
                        <Badge
                          variant="outline"
                          className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0"
                        >
                          Substituída
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.created_at), 'd MMM, HH:mm', { locale: pt })}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(version.file_size_bytes)}
                      </span>
                    </div>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Ações da versão"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {version.cloudflare_stream_uid && (
                      <DropdownMenuItem
                        disabled={isDownloading === version.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(version);
                        }}
                      >
                        {isDownloading === version.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Descarregar vídeo
                      </DropdownMenuItem>
                    )}

                    {onFixVideo && version.cloudflare_stream_uid && (hasStreamError || thumbnailMissing) && (
                      <DropdownMenuItem
                        disabled={isFixingVideo}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFixVideo(version);
                        }}
                      >
                        <RefreshCw className={cn('h-4 w-4 mr-2', isFixingVideo && 'animate-spin')} />
                        Reprocessar thumbnail
                      </DropdownMenuItem>
                    )}

                    {onReplaceVersion && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplaceTarget(version);
                          setReplaceFile(null);
                        }}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Substituir versão
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(version.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar versão
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </TooltipProvider>

      {/* Replace version dialog */}
      <Dialog
        open={!!replaceTarget}
        onOpenChange={(open) => {
          if (!open && !submittingReplace) {
            setReplaceTarget(null);
            setReplaceFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir V{replaceTarget?.version_number}</DialogTitle>
            <DialogDescription>
              Carrega um novo ficheiro de vídeo para substituir esta versão. Os comentários e o histórico
              da versão original serão mantidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              ref={replaceInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
              onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
              disabled={submittingReplace}
            />
            {replaceFile && (
              <p className="text-xs text-muted-foreground break-all">
                {replaceFile.name} ({formatFileSize(replaceFile.size)})
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplaceTarget(null);
                setReplaceFile(null);
              }}
              disabled={submittingReplace}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmReplace} disabled={!replaceFile || submittingReplace}>
              {submittingReplace && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Substituir vídeo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
