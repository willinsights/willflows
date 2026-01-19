import { FileIcon, FileText, FileImage, FileVideo, FileAudio, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface MessageAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return FileText;
  return FileIcon;
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments?.length) return null;

  const getPublicUrl = (filePath: string) => {
    return supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath).data.publicUrl;
  };

  const images = attachments.filter(a => a.mime_type?.startsWith('image/'));
  const videos = attachments.filter(a => a.mime_type?.startsWith('video/'));
  const otherFiles = attachments.filter(a => 
    !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/')
  );

  return (
    <div className="mt-2 space-y-2">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className={cn(
          'grid gap-2',
          images.length === 1 && 'grid-cols-1 max-w-xs',
          images.length === 2 && 'grid-cols-2 max-w-md',
          images.length >= 3 && 'grid-cols-3 max-w-lg'
        )}>
          {images.map((attachment) => {
            const url = getPublicUrl(attachment.file_path);
            return (
              <a
                key={attachment.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary/50 transition-colors"
              >
                <img
                  src={url}
                  alt={attachment.file_name}
                  className="w-full h-auto max-h-[200px] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Video Player */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((attachment) => {
            const url = getPublicUrl(attachment.file_path);
            return (
              <div key={attachment.id} className="max-w-md">
                <video
                  src={url}
                  controls
                  className="w-full rounded-lg border border-border"
                  preload="metadata"
                />
                <p className="text-xs text-muted-foreground mt-1">{attachment.file_name}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Other Files */}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((attachment) => {
            const url = getPublicUrl(attachment.file_path);
            const IconComponent = getFileIcon(attachment.mime_type);
            return (
              <a
                key={attachment.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted hover:border-primary/50 transition-all group max-w-[250px]"
              >
                <IconComponent className="h-5 w-5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {attachment.file_name}
                  </p>
                  {attachment.file_size && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  )}
                </div>
                <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
