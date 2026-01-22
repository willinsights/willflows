import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface UserPreferences {
  id: string;
  user_id: string;
  // Email preferences
  email_project_updates: boolean;
  email_payment_reminders: boolean;
  email_team_activity: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  // Notification preferences
  notify_new_project: boolean;
  notify_task_assigned: boolean;
  notify_payment_received: boolean;
  notify_deadline_reminder: boolean;
  notify_team_updates: boolean;
  // UI preferences
  sidebar_auto_collapse: boolean;
}

const defaultPreferences: Omit<UserPreferences, 'id' | 'user_id'> = {
  email_project_updates: true,
  email_payment_reminders: true,
  email_team_activity: true,
  email_weekly_summary: false,
  email_marketing: true,
  notify_new_project: true,
  notify_task_assigned: true,
  notify_payment_received: true,
  notify_deadline_reminder: true,
  notify_team_updates: true,
  sidebar_auto_collapse: true,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching user preferences:', error);
      setPreferences(null);
    } else if (data) {
      setPreferences(data as UserPreferences);
    } else {
      // Create default preferences if none exist - use upsert to prevent race condition
      const { data: newData, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...defaultPreferences,
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) {
        logger.error('Error creating user preferences:', upsertError);
        setPreferences(null);
      } else {
        setPreferences(newData as UserPreferences);
      }
    }
    
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id'>>) => {
    if (!user?.id || !preferences) return { success: false, error: 'Preferências não encontradas' };

    // Store previous state for rollback
    const previousPreferences = { ...preferences };

    // 1. OPTIMISTIC UPDATE - Update state immediately
    setPreferences(prev => prev ? { ...prev, ...updates } : null);

    // 2. Cache sidebar preference in localStorage for instant load
    if (updates.sidebar_auto_collapse !== undefined) {
      localStorage.setItem('pref-sidebar-auto-collapse', String(updates.sidebar_auto_collapse));
    }

    setSaving(true);
    
    const { error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      logger.error('Error updating user preferences:', error);
      // Rollback on error
      setPreferences(previousPreferences);
      if (updates.sidebar_auto_collapse !== undefined) {
        localStorage.setItem('pref-sidebar-auto-collapse', String(previousPreferences.sidebar_auto_collapse));
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    refresh: fetchPreferences,
  };
}
