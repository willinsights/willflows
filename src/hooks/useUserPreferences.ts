import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      console.error('Error fetching user preferences:', error);
      setPreferences(null);
    } else if (data) {
      setPreferences(data as UserPreferences);
    } else {
      // Create default preferences if none exist
      const { data: newData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...defaultPreferences,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user preferences:', insertError);
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
      console.error('Error updating user preferences:', error);
      return { success: false, error: error.message };
    }

    setPreferences(prev => prev ? { ...prev, ...updates } : null);
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
