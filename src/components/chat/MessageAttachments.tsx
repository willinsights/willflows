import { useState, useEffect, useMemo } from 'react';
import { FileIcon, FileText, FileImage, FileVideo, FileAudio, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from './ImageLightbox';
import { VideoModal } from './VideoModal';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

import { logger } from '@/lib/logger';
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

// Cache for signed URLs to avoid regenerating them
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function getSignedUrl(filePath: string): Promise<string | null> {
  // Check cache first
  const cached = signedUrlCache.get(filePath);
  const now = Date.now();
  
  // Return cached URL if still valid (with 5 min buffer)
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    logger.error('Failed to get signed URL:', error);
    return null;
  }

  // Cache the URL
  signedUrlCache.set(filePath, {
    url: data.signedUrl,
    expiresAt: now + 3600 * 1000
  });

  return data.signedUrl;
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ src: string; name: string } | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch signed URLs for all attachments
  useEffect(() => {
    if (!attachments?.length) {
      setIsLoading(false);
      return;
    }

    const fetchUrls = async () => {
      setIsLoading(true);
      const urls: Record<string, string> = {};
      
      await Promise.all(
        attachments.map(async (attachment) => {
          const url = await getSignedUrl(attachment.file_path);
          if (url) {
            urls[attachment.id] = url;
          }
        })
      );
      
      setSignedUrls(urls);
      setIsLoading(false);
    };

    fetchUrls();
  }, [attachments]);

  if (!attachments?.length) return null;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao descarregar');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      logger.error('Download error:', error);
      toast.error('Erro ao descarregar ficheiro');
    }
  };

  const images = attachments.filter(a => a.mime_type?.startsWith('image/'));
  const videos = attachments.filter(a => a.mime_type?.startsWith('video/'));
  const otherFiles = attachments.filter(a => 
    !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/')
  );

  // Show loading skeleton while fetching URLs
  if (isLoading) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex gap-2">
          {attachments.slice(0, 3).map((_, i) => (
            <Skeleton key={i} className="h-20 w-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-2 space-y-2">
        {/* Image Grid with Lightbox */}
        {images.length > 0 && (
          <div className={cn(
            'grid gap-2',
            images.length === 1 && 'grid-cols-1 max-w-xs',
            images.length === 2 && 'grid-cols-2 max-w-md',
            images.length >= 3 && 'grid-cols-3 max-w-lg'
          )}>
            {images.map((attachment) => {
              const url = signedUrls[attachment.id];
              if (!url) return null;
              return (
                <div
                  key={attachment.id}
                  className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setLightboxImage({ src: url, alt: attachment.file_name })}
                >
                  <img
                    src={url}
                    alt={attachment.file_name}
                    className="w-full h-auto max-h-[200px] object-cover"
                    loading="lazy"
                  />
                  {/* Always visible download button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background border border-border/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(url, attachment.file_name);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {/* Click hint overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}

        {/* Video Player with Modal */}
        {videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((attachment) => {
              const url = signedUrls[attachment.id];
              if (!url) return null;
              return (
                <div 
                  key={attachment.id} 
                  className="max-w-md relative group cursor-pointer"
                  onClick={() => setActiveVideo({ src: url, name: attachment.file_name })}
                >
                  <video
                    src={url}
                    className="w-full rounded-lg border border-border"
                    preload="metadata"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <svg className="h-5 w-5 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate flex-1">{attachment.file_name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(url, attachment.file_name);
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Other Files with Download */}
        {otherFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherFiles.map((attachment) => {
              const url = signedUrls[attachment.id];
              const IconComponent = getFileIcon(attachment.mime_type);
              if (!url) return null;
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted hover:border-primary/50 transition-all group max-w-[250px]"
                >
                  <IconComponent className="h-5 w-5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate group-hover:text-primary transition-colors block"
                    >
                      {attachment.file_name}
                    </a>
                    {attachment.file_size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-50 group-hover:opacity-100"
                    onClick={() => handleDownload(url, attachment.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
          onDownload={() => handleDownload(lightboxImage.src, lightboxImage.alt)}
        />
      )}

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          src={activeVideo.src}
          name={activeVideo.name}
          onClose={() => setActiveVideo(null)}
          onDownload={() => handleDownload(activeVideo.src, activeVideo.name)}
        />
      )}
    </>
  );
}
