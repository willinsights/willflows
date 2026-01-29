import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Upload, Video, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoVersions } from '@/hooks/useVideoVersions';
import { useWorkspaceStorage } from '@/hooks/useWorkspaceStorage';
import { useVideoCompression } from '@/hooks/useVideoCompression';

interface VideoVersionUploadProps {
  projectId: string;
  workspaceId: string;
  onUploadComplete?: () => void;
}

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export function VideoVersionUpload({ projectId, workspaceId, onUploadComplete }: VideoVersionUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enableCompression, setEnableCompression] = useState(true);
  const [compressionComplete, setCompressionComplete] = useState(false);
  const [compressionSavings, setCompressionSavings] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { uploadVersion, uploading, uploadProgress } = useVideoVersions(projectId, workspaceId);
  const { storage } = useWorkspaceStorage();
  const { compressVideo, compressing, loading: compressionLoading, cancelCompression, progress: compressionProgress, error: compressionError } = useVideoCompression();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato não suportado. Use MP4, MOV, WebM, AVI ou MKV.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Ficheiro muito grande. Máximo 5GB.';
    }
    if (!storage.canUpload(file.size)) {
      return `Espaço insuficiente. Disponível: ${storage.remainingGB.toFixed(2)} GB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setCompressionComplete(false);
    setCompressionSavings(null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [storage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      let fileToUpload = selectedFile;

      // Compress if enabled and not already compressed
      if (enableCompression && !compressionComplete) {
        try {
          console.log('[Upload] Starting compression...');
          const result = await compressVideo(selectedFile);
          fileToUpload = result.file;
          setCompressionSavings(result.savings);
          setCompressionComplete(true);
          console.log('[Upload] Compression complete, savings:', result.savings, '%');
        } catch (compErr: any) {
          // If compression fails, show error and proceed with original file
          console.error('[Upload] Compression failed:', compErr);
          setError(`Compressão falhou: ${compErr.message}. A enviar ficheiro original.`);
          // Continue with original file
        }
      }

      console.log('[Upload] Uploading file:', fileToUpload.name, 'Size:', fileToUpload.size);
      await uploadVersion({
        file: fileToUpload,
        workspaceId,
        projectId,
      });
      setSelectedFile(null);
      setCompressionComplete(false);
      setCompressionSavings(null);
      onUploadComplete?.();
    } catch (error) {
      // Error toast is handled in hook
      console.error('[Upload] Upload failed:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (storage.isFull) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Armazenamento cheio</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Apague vídeos de projetos concluídos ou adicione mais espaço para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Arraste o vídeo aqui</p>
            <p className="text-sm text-muted-foreground">
              ou{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-primary hover:underline"
                disabled={uploading}
              >
                escolha um ficheiro
              </button>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            MP4, MOV, WebM, AVI, MKV • Máximo 5GB
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && !uploading && !compressing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Video className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
                {compressionComplete && compressionSavings !== null && compressionSavings > 0 && (
                  <span className="ml-2 text-green-600">
                    <CheckCircle2 className="inline h-3 w-3 mr-1" />
                    Comprimido (-{compressionSavings}%)
                  </span>
                )}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
              setSelectedFile(null);
              setCompressionComplete(false);
              setCompressionSavings(null);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Compression toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="compression" className="text-sm font-medium">
                Comprimir vídeo
              </Label>
              <p className="text-xs text-muted-foreground">
                Reduz o tamanho do ficheiro antes de enviar
              </p>
            </div>
            <Switch
              id="compression"
              checked={enableCompression}
              onCheckedChange={setEnableCompression}
            />
          </div>

          <Button onClick={handleUpload} className="w-full">
            {enableCompression ? 'Comprimir e Carregar' : 'Carregar'}
          </Button>
        </div>
      )}

       {/* Compression progress */}
       {(compressionLoading || compressing) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
               {compressionLoading ? 'A preparar compressor (download ~31MB)...' : 'A comprimir vídeo...'}
            </span>
             <span>{compressionLoading ? '—' : `${compressionProgress}%`}</span>
          </div>
           <Progress value={compressionLoading ? 12 : compressionProgress} className="bg-muted" />
          <p className="text-xs text-muted-foreground">
             {compressionLoading
               ? 'A primeira vez pode demorar (o browser precisa de descarregar o motor de compressão).'
               : 'Isto pode demorar alguns minutos dependendo do tamanho do vídeo.'}
          </p>
           <Button
             type="button"
             variant="ghost"
             className="w-full"
             onClick={() => {
               cancelCompression();
               setError('Compressão cancelada. Pode tentar novamente ou enviar sem compressão.');
             }}
           >
             Cancelar compressão
           </Button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>A carregar...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
}
