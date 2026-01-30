/**
 * useAdminStorageMetrics - Hook for fetching storage metrics across all workspaces
 * Used in Super Admin panel to monitor storage usage (especially Studio 10GB)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';

export interface WorkspaceStorageMetrics {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  subscription_plan: string | null;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  extra_storage_bytes: number;
  addon_tier: string | null;
  percent_used: number;
  is_near_limit: boolean;
  is_full: boolean;
  last_recalculated_at: string | null;
  owner_email: string | null;
  owner_name: string | null;
}

export interface StorageOverview {
  totalWorkspaces: number;
  studioWorkspaces: number;
  workspacesWithStorage: number;
  totalUsedGB: number;
  totalAllocatedGB: number;
  workspacesNearLimit: number;
  workspacesFull: number;
  withAddons: number;
}

const bytesToGB = (bytes: number) => bytes / (1024 * 1024 * 1024);

export function useAdminStorageMetrics() {
  const { isSuperAdmin } = useSuperAdmin();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-storage-metrics'],
    queryFn: async (): Promise<{
      workspaces: WorkspaceStorageMetrics[];
      overview: StorageOverview;
    }> => {
      // Fetch workspaces with subscription info
      const { data: workspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, slug, subscription_plan')
        .order('name');

      if (wsError) throw wsError;

      // Fetch storage data
      const { data: storageData, error: storageError } = await supabase
        .from('workspace_storage')
        .select('*');

      if (storageError) throw storageError;

      // Fetch owners for context
      const { data: members } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          profile:profiles(email, full_name)
        `)
        .eq('role', 'admin')
        .eq('is_active', true);

      // Build owner map
      const ownerMap = new Map<string, { email: string; name: string | null }>();
      (members || []).forEach(m => {
        if (!ownerMap.has(m.workspace_id) && m.profile) {
          ownerMap.set(m.workspace_id, {
            email: (m.profile as any).email,
            name: (m.profile as any).full_name,
          });
        }
      });

      // Build storage map
      const storageMap = new Map(
        (storageData || []).map(s => [s.workspace_id, s])
      );

      // Filter to Studio workspaces (only they have video storage)
      const studioWorkspaces = workspaces?.filter(w => w.subscription_plan === 'studio') || [];

      const metricsData: WorkspaceStorageMetrics[] = studioWorkspaces.map(ws => {
        const storage = storageMap.get(ws.id);
        const owner = ownerMap.get(ws.id);
        
        const usedBytes = storage?.storage_used_bytes || 0;
        const baseLimit = storage?.storage_limit_bytes || 10 * 1024 * 1024 * 1024; // 10GB default
        const extraBytes = storage?.extra_storage_bytes || 0;
        const totalLimit = baseLimit + extraBytes;
        const percentUsed = totalLimit > 0 ? (usedBytes / totalLimit) * 100 : 0;

        return {
          workspace_id: ws.id,
          workspace_name: ws.name,
          workspace_slug: ws.slug,
          subscription_plan: ws.subscription_plan,
          storage_used_bytes: usedBytes,
          storage_limit_bytes: totalLimit,
          extra_storage_bytes: extraBytes,
          addon_tier: storage?.addon_tier || null,
          percent_used: percentUsed,
          is_near_limit: percentUsed >= 80,
          is_full: percentUsed >= 100,
          last_recalculated_at: storage?.last_calculated_at || null,
          owner_email: owner?.email || null,
          owner_name: owner?.name || null,
        };
      });

      // Sort by usage percentage (highest first)
      metricsData.sort((a, b) => b.percent_used - a.percent_used);

      // Calculate overview
      const overview: StorageOverview = {
        totalWorkspaces: workspaces?.length || 0,
        studioWorkspaces: studioWorkspaces.length,
        workspacesWithStorage: metricsData.filter(m => m.storage_used_bytes > 0).length,
        totalUsedGB: metricsData.reduce((sum, m) => sum + bytesToGB(m.storage_used_bytes), 0),
        totalAllocatedGB: metricsData.reduce((sum, m) => sum + bytesToGB(m.storage_limit_bytes), 0),
        workspacesNearLimit: metricsData.filter(m => m.is_near_limit && !m.is_full).length,
        workspacesFull: metricsData.filter(m => m.is_full).length,
        withAddons: metricsData.filter(m => m.addon_tier).length,
      };

      return { workspaces: metricsData, overview };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    workspaces: data?.workspaces || [],
    overview: data?.overview || {
      totalWorkspaces: 0,
      studioWorkspaces: 0,
      workspacesWithStorage: 0,
      totalUsedGB: 0,
      totalAllocatedGB: 0,
      workspacesNearLimit: 0,
      workspacesFull: 0,
      withAddons: 0,
    },
    isLoading,
    error,
    refetch,
  };
}
