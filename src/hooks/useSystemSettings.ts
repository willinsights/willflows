import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';

import { logger } from '@/lib/logger';
export interface TrialSettings {
  default_days: number;
  warning_days: number;
}

export interface SystemSettings {
  trial: TrialSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  trial: {
    default_days: 30,
    warning_days: 2,
  },
};

export function useSystemSettings() {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) {
        logger.error('Error fetching system settings:', error);
        return DEFAULT_SETTINGS;
      }

      const settingsMap: SystemSettings = { ...DEFAULT_SETTINGS };
      
      for (const row of data || []) {
        if (row.key === 'trial' && row.value) {
          const value = row.value as unknown as TrialSettings;
          settingsMap.trial = {
            default_days: value.default_days ?? DEFAULT_SETTINGS.trial.default_days,
            warning_days: value.warning_days ?? DEFAULT_SETTINGS.trial.warning_days,
          };
        }
      }

      return settingsMap;
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateTrialSettings = useMutation({
    mutationFn: async (newSettings: TrialSettings) => {
      // Use raw SQL via RPC or direct update since upsert has type issues
      const { data: existing } = await supabase
        .from('system_settings')
        .select('key')
        .eq('key', 'trial')
        .maybeSingle();

      // Cast to any to bypass the strict Json type checking
      const valueJson = JSON.parse(JSON.stringify(newSettings));

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            value: valueJson,
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'trial');
        if (error) throw error;
      } else {
        // Insert requires going through the type system differently
        const insertPayload = {
          key: 'trial' as const,
          value: valueJson,
        };
        const { error } = await supabase
          .from('system_settings')
          .insert(insertPayload as never);
        if (error) throw error;
      }

      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    error,
    updateTrialSettings,
  };
}

/**
 * Hook to get trial settings for use in workspace creation
 * This is a simplified version that works for all users
 */
export function useTrialDuration() {
  const { data, isLoading } = useQuery({
    queryKey: ['trial-duration'],
    queryFn: async (): Promise<number> => {
      // Try to fetch from system_settings, fall back to default
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'trial')
        .maybeSingle();

      if (error || !data?.value) {
        return DEFAULT_SETTINGS.trial.default_days;
      }

      const value = data.value as unknown as TrialSettings;
      return value.default_days ?? DEFAULT_SETTINGS.trial.default_days;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    trialDays: data ?? DEFAULT_SETTINGS.trial.default_days,
    isLoading,
  };
}
