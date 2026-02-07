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

      // Handle 202 - download is being prepared
      if (response.status === 202) {
        const data = await response.json();
        toast({
          title: 'Preparando download',
          description: data.error || 'Aguarde alguns segundos e tente novamente.',
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao obter link de download');
      }

      const data = await response.json();
      const { download_url, file_name } = data;

      if (!download_url) {
        // Download not ready yet - show informative message instead of error
        toast({
          title: 'Download em preparação',
          description: 'O ficheiro está a ser processado. Tenta novamente em alguns segundos.',
        });
        return;
      }

      // Fetch as blob so the download attribute works (cross-origin URLs ignore it)
      const blob = await fetch(download_url).then(r => r.blob());
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || file_name || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

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
