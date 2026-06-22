import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStorage } from './useWorkspaceStorage';

import { logger } from '@/lib/logger';
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
  thumbnail_time_seconds: number | null;
  // Replacement (corrected video kept inside same version)
  replacement_stream_uid?: string | null;
  replacement_playback_url?: string | null;
  replacement_r2_key?: string | null;
  replacement_status?: string | null;
  replacement_file_name?: string | null;
  replacement_file_size_bytes?: number | null;
  replacement_thumbnail_path?: string | null;
  replaced_at?: string | null;
}

interface UploadVideoInput {
  file: File;
  taskId: string | null;
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
  const [checkingStatusIds, setCheckingStatusIds] = useState<Set<string>>(new Set());

  // Track polling timers so we can clear them on unmount
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (bgPollTimerRef.current) {
        clearInterval(bgPollTimerRef.current);
        bgPollTimerRef.current = null;
      }
    };
  }, []);
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
      logger.error('Error fetching video versions:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Manual / background status check: poll Cloudflare via stream-get-status
  const checkVersionStatus = useCallback(async (version: VideoVersion): Promise<void> => {
    const streamUid = version.replacement_stream_uid || version.cloudflare_stream_uid;
    if (!streamUid) return;
    const isReplacementCheck = !!(
      version.replacement_stream_uid &&
      version.replacement_status &&
      ['processing', 'pending', 'downloading', 'inprogress'].includes(version.replacement_status)
    );
    setCheckingStatusIds((prev) => {
      const next = new Set(prev);
      next.add(version.id);
      return next;
    });
    try {
      const { data, error } = await supabase.functions.invoke('stream-get-status', {
        body: { streamUid, versionId: version.id, isReplacement: isReplacementCheck },
      });
      if (error) {
        logger.error('Manual status check failed:', error);
        return;
      }
      if (data?.status === 'ready' || data?.status === 'error') {
        await fetchVersions();
      }
    } catch (err) {
      logger.error('Manual status check error:', err);
    } finally {
      if (isMountedRef.current) {
        setCheckingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(version.id);
          return next;
        });
      }
    }
  }, [fetchVersions]);

  // Background polling: every 10s, check Cloudflare status for any version still processing
  useEffect(() => {
    if (bgPollTimerRef.current) {
      clearInterval(bgPollTimerRef.current);
      bgPollTimerRef.current = null;
    }

    const PROCESSING_STATES = ['processing', 'pending', 'downloading', 'inprogress'];
    const hasProcessing = versions.some(
      (v) =>
        (v.cloudflare_stream_uid && PROCESSING_STATES.includes(v.stream_status || '')) ||
        (v.replacement_stream_uid && PROCESSING_STATES.includes(v.replacement_status || ''))
    );
    if (!hasProcessing) return;

    bgPollTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      // Snapshot current processing versions and check each
      versions.forEach((v) => {
        const mainProcessing =
          v.cloudflare_stream_uid && PROCESSING_STATES.includes(v.stream_status || '');
        const replacementProcessing =
          v.replacement_stream_uid && PROCESSING_STATES.includes(v.replacement_status || '');
        if (mainProcessing || replacementProcessing) {
          checkVersionStatus(v).catch(() => {});
        }
      });
    }, 10000);

    return () => {
      if (bgPollTimerRef.current) {
        clearInterval(bgPollTimerRef.current);
        bgPollTimerRef.current = null;
      }
    };
  }, [versions, checkVersionStatus]);

  // Realtime removed — version mutations call fetchVersions() to refresh.

  // Upload to R2 with progress tracking
  const uploadToR2 = useCallback(async (
    uploadUrl: string, 
    file: File, 
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 30 * 60 * 1000; // 30 min
      
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
          const details = xhr.responseText ? ` - ${xhr.responseText.slice(0, 500)}` : '';
          reject(new Error(`Upload failed (status ${xhr.status})${details}`));
        }
      });

      xhr.addEventListener('error', () => {
        // status 0 is common for CORS/network errors
        const msg = xhr.status === 0
          ? 'Upload falhou (erro de rede/CORS). Verifica se o bucket R2 permite PUT (CORS) a partir do domínio da app.'
          : `Upload failed (status ${xhr.status})`;
        reject(new Error(msg));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload demorou demasiado e expirou (timeout).'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
    });
  }, []);

  // Poll for processing status
  const pollProcessingStatus = useCallback(async (
    streamUid: string, 
    versionId: string,
    isReplacement: boolean = false
  ): Promise<void> => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const schedule = () => {
      if (!isMountedRef.current) return;
      pollTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) poll();
      }, 5000);
    };

    const poll = async (): Promise<void> => {
      if (!isMountedRef.current) return;
      attempts++;

      try {
        const { data, error } = await supabase.functions.invoke('stream-get-status', {
          body: { streamUid, versionId, isReplacement }
        });

        if (!isMountedRef.current) return;

        if (error) {
          logger.error('Error polling status:', error);
          if (attempts < maxAttempts) schedule();
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
          schedule();
        } else {
          setProcessingVersionId(null);
          toast({
            title: 'Processamento demorado',
            description: 'O vídeo ainda está a ser processado. Atualiza a página mais tarde.',
            variant: 'default'
          });
        }
      } catch (err) {
        logger.error('Polling error:', err);
        if (isMountedRef.current && attempts < maxAttempts) schedule();
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

  const replaceVersion = async (versionId: string, file: File) => {
    if (!user) throw new Error('User not authenticated');

    const target = versions.find(v => v.id === versionId);
    if (!target) throw new Error('Version not found');

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
      // Step 1: Presigned R2 URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('r2-upload-url', {
        body: {
          workspaceId: target.workspace_id,
          taskId: target.task_id,
          projectId: target.project_id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }
      });

      if (urlError || !urlData?.uploadUrl) {
        throw new Error(urlData?.error || 'Failed to get upload URL');
      }

      // Step 2: Upload to R2
      await uploadToR2(urlData.uploadUrl, file, (p) => setUploadProgress(Math.round(p * 0.8)));
      setUploadProgress(80);

      // Step 3: Process as replacement
      const { data: processData, error: processError } = await supabase.functions.invoke('stream-process-video', {
        body: {
          key: urlData.key,
          taskId: target.task_id,
          workspaceId: target.workspace_id,
          projectId: target.project_id,
          fileName: file.name,
          fileSize: file.size,
          replaceVersionId: versionId,
        }
      });

      if (processError || !processData?.versionId) {
        throw new Error(processData?.error || 'Failed to process replacement');
      }

      setUploadProgress(100);

      toast({
        title: `Versão ${target.version_number} substituída`,
        description: 'O vídeo corrigido está a ser processado...'
      });

      if (processData.streamUid) {
        setProcessingVersionId(processData.versionId);
        pollProcessingStatus(processData.streamUid, processData.versionId, true);
      }

      await fetchVersions();
      return processData;
    } catch (error: any) {
      toast({
        title: 'Erro ao substituir vídeo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Get playback URL - now uses Cloudflare Stream with canonical videodelivery.net domain
  const getPlaybackUrl = useCallback((version: VideoVersion): string | null => {
    // If we have a Cloudflare Stream playback URL, normalize to canonical domain
    if (version.stream_playback_url) {
      // Ensure we always use videodelivery.net domain for CORS compatibility
      if (version.stream_playback_url.includes('cloudflarestream.com')) {
        return `https://videodelivery.net/${version.cloudflare_stream_uid}/manifest/video.m3u8`;
      }
      return version.stream_playback_url;
    }
    
    // If we have a stream UID, construct the HLS URL using canonical domain
    if (version.cloudflare_stream_uid) {
      return `https://videodelivery.net/${version.cloudflare_stream_uid}/manifest/video.m3u8`;
    }

    // Fallback to legacy Supabase Storage (for existing videos)
    if (version.file_path && !version.file_path.startsWith('r2://')) {
      return null; // Will need to use getSignedUrl
    }

    return null;
  }, []);

  // Legacy: Get signed URL for Supabase Storage videos - memoized to prevent infinite loops
  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    // Skip R2 paths or empty paths
    if (!filePath || filePath.startsWith('r2://')) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('video-versions')
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      logger.error('Error getting signed URL:', error);
      return null;
    }
  }, []);

  // Helper to check if version is using Cloudflare
  const isCloudflareVersion = useCallback((version: VideoVersion): boolean => {
    return !!(version.cloudflare_stream_uid || version.r2_key);
  }, []);

  // Helper to check if version is still processing
  const isProcessing = useCallback((version: VideoVersion): boolean => {
    return version.stream_status === 'processing' || version.stream_status === 'pending';
  }, []);

  // Set thumbnail time for a version
  const setThumbnailTime = useCallback(async (versionId: string, seconds: number) => {
    const version = versions.find(v => v.id === versionId);
    if (!version?.cloudflare_stream_uid) return;

    const thumbnailPath = `https://videodelivery.net/${version.cloudflare_stream_uid}/thumbnails/thumbnail.jpg?time=${seconds}s`;

    const { error } = await supabase
      .from('video_versions')
      .update({ 
        thumbnail_time_seconds: seconds,
        thumbnail_path: thumbnailPath,
      })
      .eq('id', versionId);

    if (error) {
      toast({ title: 'Erro ao definir thumbnail', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Thumbnail atualizada' });
    await fetchVersions();
  }, [versions, fetchVersions, toast]);

  return {
    versions,
    loading,
    uploading,
    uploadProgress,
    processingVersionId,
    uploadVersion,
    deleteVersion,
    replaceVersion,
    getSignedUrl,
    getPlaybackUrl,
    isCloudflareVersion,
    isProcessing,
    setThumbnailTime,
    refetch: fetchVersions,
  };
}

// Helper to get account hash for Cloudflare customer subdomain
function getAccountHash(): string {
  // This would ideally come from environment or be stored after first Stream API call
  // For now, we'll return a placeholder that should be replaced with actual account hash
  return import.meta.env.VITE_CLOUDFLARE_CUSTOMER_HASH || 'unknown';
}
