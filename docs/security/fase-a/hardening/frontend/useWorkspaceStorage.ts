import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface WorkspaceStorageData {
  id: string;
  workspace_id: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  base_storage_bytes: number;
  extra_storage_bytes: number;
  stripe_addon_subscription_id: string | null;
  addon_tier: '50gb' | '100gb' | '250gb' | null;
  last_calculated_at: string;
}

export interface WorkspaceStorageInfo {
  usedBytes: number;
  limitBytes: number;
  usedGB: number;
  limitGB: number;
  percentUsed: number;
  isFull: boolean;
  isNearLimit: boolean; // >80%
  addonTier: string | null;
  canUpload: (fileSizeBytes: number) => boolean;
  remainingBytes: number;
  remainingGB: number;
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

export function useWorkspaceStorage() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch storage data
  const { data: storageData, isLoading, error } = useQuery({
    queryKey: ['workspace-storage', workspace?.id],
    queryFn: async (): Promise<WorkspaceStorageData | null> => {
      if (!workspace?.id) return null;

      const { data, error } = await supabase
        .from('workspace_storage')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no record exists, return default values
      if (!data) {
        return null;
      }

      return data as WorkspaceStorageData;
    },
    enabled: !!workspace?.id,
    staleTime: 60000, // 1 minute
  });

  // Initialize storage record if it doesn't exist
  const initializeMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('workspace_storage')
        .insert({
          workspace_id: workspace.id,
          storage_used_bytes: 0,
          storage_limit_bytes: 10737418240, // 10GB
          base_storage_bytes: 10737418240,
          extra_storage_bytes: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-storage', workspace?.id] });
    },
  });

  // Counter is server-owned. Legacy callbacks only refresh, never mutate bytes.
  const refreshStorage = useCallback(async (_bytes?: number) => {
    await queryClient.invalidateQueries({ queryKey: ['workspace-storage', workspace?.id] });
  }, [workspace?.id, queryClient]);
  const addStorageUsed = refreshStorage;
  const removeStorageUsed = refreshStorage;

  // Computed storage info
  const storageInfo: WorkspaceStorageInfo = useMemo(() => {
    const usedBytes = storageData?.storage_used_bytes || 0;
    const limitBytes = storageData?.storage_limit_bytes || (10 * BYTES_PER_GB);
    const usedGB = usedBytes / BYTES_PER_GB;
    const limitGB = limitBytes / BYTES_PER_GB;
    const percentUsed = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
    const remainingBytes = Math.max(0, limitBytes - usedBytes);
    const remainingGB = remainingBytes / BYTES_PER_GB;

    return {
      usedBytes,
      limitBytes,
      usedGB,
      limitGB,
      percentUsed,
      isFull: usedBytes >= limitBytes,
      isNearLimit: percentUsed >= 80,
      addonTier: storageData?.addon_tier || null,
      canUpload: (fileSizeBytes: number) => (usedBytes + fileSizeBytes) <= limitBytes,
      remainingBytes,
      remainingGB,
    };
  }, [storageData]);

  // Initialize storage on first load if needed
  useEffect(() => {
    if (workspace?.id && storageData === null && !isLoading) {
      initializeMutation.mutate();
    }
  }, [workspace?.id, storageData, isLoading]);

  return {
    storage: storageInfo,
    storageData,
    loading: isLoading,
    error,
    addStorageUsed,
    removeStorageUsed,
    recalculate: refreshStorage,
    isRecalculating: false,
  };
}
