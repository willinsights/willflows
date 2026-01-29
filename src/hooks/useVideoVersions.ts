import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStorage } from './useWorkspaceStorage';

export interface VideoVersion {
  id: string;
  task_id: string;
  workspace_id: string;
  project_id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  mime_type: string | null;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Cloudflare fields
  cloudflare_stream_uid: string | null;
  r2_key: string | null;
  stream_status: string | null;
  stream_playback_url: string | null;
  is_deleted: boolean;
}

interface UploadVideoInput {
  file: File;
  taskId: string;
  workspaceId: string;
  projectId: string;
}

export function useVideoVersions(
  taskId: string | null, 
  workspaceId: string | null,
  projectId?: string | null
) {
  const [versions, setVersions] = useState<VideoVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingVersionId, setProcessingVersionId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { storage, addStorageUsed, removeStorageUsed } = useWorkspaceStorage();

  const fetchVersions = useCallback(async () => {
    if (!taskId && !projectId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('video_versions')
        .select('*')
        .eq('is_deleted', false)
        .order('version_number', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVersions((data || []) as VideoVersion[]);
    } catch (error: any) {
      console.error('Error fetching video versions:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Realtime subscription
  useEffect(() => {
    if (!taskId && !projectId) return;

    const filterColumn = taskId ? 'task_id' : 'project_id';
    const filterValue = taskId || projectId;

    const channel = supabase
      .channel(`video_versions:${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_versions',
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        () => {
          fetchVersions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, projectId, fetchVersions]);

  // Upload to R2 with progress tracking
  const uploadToR2 = useCallback(async (
    uploadUrl: string, 
    file: File, 
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
    });
  }, []);

  // Poll for processing status
  const pollProcessingStatus = useCallback(async (
    streamUid: string, 
    versionId: string
  ): Promise<void> => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;
      
      try {
        const { data, error } = await supabase.functions.invoke('stream-get-status', {
          body: { streamUid, versionId }
        });

        if (error) {
          console.error('Error polling status:', error);
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          }
          return;
        }

        if (data.status === 'ready') {
          setProcessingVersionId(null);
          toast({ title: 'Vídeo processado com sucesso' });
          await fetchVersions();
          return;
        }

        if (data.status === 'error') {
          setProcessingVersionId(null);
          toast({ 
            title: 'Erro no processamento', 
            description: 'O vídeo não pôde ser processado',
            variant: 'destructive' 
          });
          return;
        }

        // Still processing, continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setProcessingVersionId(null);
          toast({ 
            title: 'Processamento demorado', 
            description: 'O vídeo ainda está a ser processado. Atualiza a página mais tarde.',
            variant: 'default' 
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  }, [fetchVersions, toast]);

  const uploadVersion = async ({ file, taskId, workspaceId, projectId }: UploadVideoInput) => {
    if (!user) throw new Error('User not authenticated');

    // Check storage limit
    if (!storage.canUpload(file.size)) {
      toast({
        title: 'Armazenamento cheio',
        description: `Não há espaço suficiente. Disponível: ${storage.remainingGB.toFixed(2)} GB`,
        variant: 'destructive',
      });
      throw new Error('Storage limit reached');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL from R2
      const { data: urlData, error: urlError } = await supabase.functions.invoke('r2-upload-url', {
        body: {
          workspaceId,
          taskId,
          projectId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }
      });

      if (urlError || !urlData?.uploadUrl) {
        throw new Error(urlData?.error || 'Failed to get upload URL');
      }

      // Step 2: Upload directly to R2 with progress
      await uploadToR2(urlData.uploadUrl, file, (progress) => {
        // R2 upload is 0-80% of total progress
        setUploadProgress(Math.round(progress * 0.8));
      });

      setUploadProgress(80);

      // Step 3: Process video in Cloudflare Stream
      const { data: processData, error: processError } = await supabase.functions.invoke('stream-process-video', {
        body: {
          key: urlData.key,
          taskId,
          workspaceId,
          projectId,
          fileName: file.name,
          fileSize: file.size,
        }
      });

      if (processError || !processData?.versionId) {
        throw new Error(processData?.error || 'Failed to process video');
      }

      setUploadProgress(100);
      
      toast({ 
        title: `Versão ${processData.versionNumber} carregada`,
        description: 'O vídeo está a ser processado...'
      });

      // Step 4: Poll for processing status
      if (processData.streamUid) {
        setProcessingVersionId(processData.versionId);
        pollProcessingStatus(processData.streamUid, processData.versionId);
      }

      await fetchVersions();
      return processData as VideoVersion;
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar vídeo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteVersion = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) throw new Error('Version not found');

      // Mark as deleted in database (actual R2/Stream cleanup happens via cron)
      const { error } = await supabase
        .from('video_versions')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', versionId);

      if (error) throw error;

      // Update storage used
      await removeStorageUsed(version.file_size_bytes);

      toast({ title: 'Versão apagada' });
      await fetchVersions();
    } catch (error: any) {
      toast({
        title: 'Erro ao apagar versão',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Get playback URL - now uses Cloudflare Stream
  const getPlaybackUrl = useCallback((version: VideoVersion): string | null => {
    // If we have a Cloudflare Stream playback URL, use it
    if (version.stream_playback_url) {
      return version.stream_playback_url;
    }
    
    // If we have a stream UID, construct the iframe URL
    if (version.cloudflare_stream_uid) {
      // The playback URL should be the HLS manifest, not iframe
      // For direct video element playback, we need the HLS URL
      return `https://customer-${getAccountHash()}.cloudflarestream.com/${version.cloudflare_stream_uid}/manifest/video.m3u8`;
    }

    // Fallback to legacy Supabase Storage (for existing videos)
    if (version.file_path && !version.file_path.startsWith('r2://')) {
      return null; // Will need to use getSignedUrl
    }

    return null;
  }, []);

  // Legacy: Get signed URL for Supabase Storage videos
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    // Skip R2 paths
    if (filePath.startsWith('r2://')) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('video-versions')
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  // Helper to check if version is using Cloudflare
  const isCloudflareVersion = useCallback((version: VideoVersion): boolean => {
    return !!(version.cloudflare_stream_uid || version.r2_key);
  }, []);

  // Helper to check if version is still processing
  const isProcessing = useCallback((version: VideoVersion): boolean => {
    return version.stream_status === 'processing' || version.stream_status === 'pending';
  }, []);

  return {
    versions,
    loading,
    uploading,
    uploadProgress,
    processingVersionId,
    uploadVersion,
    deleteVersion,
    getSignedUrl,
    getPlaybackUrl,
    isCloudflareVersion,
    isProcessing,
    refetch: fetchVersions,
  };
}

// Helper to get account hash for Cloudflare customer subdomain
function getAccountHash(): string {
  // This would ideally come from environment or be stored after first Stream API call
  // For now, we'll return a placeholder that should be replaced with actual account hash
  return import.meta.env.VITE_CLOUDFLARE_CUSTOMER_HASH || 'unknown';
}
