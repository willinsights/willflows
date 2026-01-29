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
  const { toast } = useToast();
  const { user } = useAuth();
  const { storage, addStorageUsed, removeStorageUsed } = useWorkspaceStorage();

  const fetchVersions = useCallback(async () => {
    // Need either taskId or projectId to fetch
    if (!taskId && !projectId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('video_versions')
        .select('*')
        .order('version_number', { ascending: false });

      // Filter by taskId if available, otherwise by projectId
      if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVersions(data as VideoVersion[]);
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
    // Need either taskId or projectId for subscription
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
      // Get next version number
      const { data: existingVersions } = await supabase
        .from('video_versions')
        .select('version_number')
        .eq('task_id', taskId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `v${nextVersion}_${Date.now()}.${fileExt}`;
      const filePath = `${workspaceId}/${taskId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('video-versions')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Create database record
      const { data: versionData, error: insertError } = await supabase
        .from('video_versions')
        .insert({
          task_id: taskId,
          workspace_id: workspaceId,
          project_id: projectId,
          version_number: nextVersion,
          file_path: filePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback file upload
        await supabase.storage.from('video-versions').remove([filePath]);
        throw insertError;
      }

      // Update storage used
      await addStorageUsed(file.size);

      setUploadProgress(100);
      toast({ title: `Versão ${nextVersion} carregada com sucesso` });

      await fetchVersions();
      return versionData as VideoVersion;
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
      // Get version to find file path and size
      const version = versions.find(v => v.id === versionId);
      if (!version) throw new Error('Version not found');

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('video-versions')
        .remove([version.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }

      // Delete database record
      const { error } = await supabase
        .from('video_versions')
        .delete()
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

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
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

  return {
    versions,
    loading,
    uploading,
    uploadProgress,
    uploadVersion,
    deleteVersion,
    getSignedUrl,
    refetch: fetchVersions,
  };
}
