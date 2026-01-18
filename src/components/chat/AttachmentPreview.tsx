import { X, File, Image as ImageIcon, FileText, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AttachmentPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  previews: string[];
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return Film;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({ files, onRemove, previews }: AttachmentPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="px-3 py-2 border-t border-border/50 bg-muted/20">
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => {
          const isImage = file.type.startsWith('image/');
          const FileIcon = getFileIcon(file.type);

          return (
            <div
              key={`${file.name}-${index}`}
              className={cn(
                'relative group rounded-lg border border-border overflow-hidden',
                isImage ? 'w-20 h-20' : 'flex items-center gap-2 px-3 py-2 bg-muted/50'
              )}
            >
              {isImage && previews[index] ? (
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate max-w-[120px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </>
              )}
              
              {/* Remove button */}
              <Button
                variant="destructive"
                size="icon"
                className={cn(
                  'absolute h-5 w-5 rounded-full transition-opacity',
                  isImage 
                    ? 'top-1 right-1 opacity-0 group-hover:opacity-100' 
                    : '-right-1 -top-1'
                )}
                onClick={() => onRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
