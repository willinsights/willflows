import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseVideoDownloadOptions {
  approvalToken?: string;
}

export function useVideoDownload(options: UseVideoDownloadOptions = {}) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const downloadVideo = async (
    videoVersionId: string,
    fileName?: string
  ) => {
    setIsDownloading(videoVersionId);

    try {
      // Get current session for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };

      // Add auth header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-download-url`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            video_version_id: videoVersionId,
            approval_token: options.approvalToken,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao obter link de download');
      }

      const { download_url, file_name } = await response.json();

      if (!download_url) {
        throw new Error('Link de download não disponível');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = download_url;
      link.download = fileName || file_name || 'video.mp4';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download iniciado',
        description: 'O vídeo está a ser descarregado.',
      });

    } catch (error: any) {
      console.error('[useVideoDownload] Error:', error);
      toast({
        title: 'Erro no download',
        description: error.message || 'Não foi possível descarregar o vídeo.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(null);
    }
  };

  return {
    downloadVideo,
    isDownloading,
  };
}
