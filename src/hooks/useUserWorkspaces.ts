import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  role: string;
  logo_url?: string | null;
}

export function useUserWorkspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspaces (
            id,
            name,
            slug,
            subscription_plan,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const userWorkspaces: UserWorkspace[] = (data || [])
        .filter((m: any) => m.workspaces)
        .map((m: any) => ({
          id: m.workspaces.id,
          name: m.workspaces.name,
          slug: m.workspaces.slug,
          subscription_plan: m.workspaces.subscription_plan,
          role: m.role,
          logo_url: m.workspaces.logo_url,
        }));

      setWorkspaces(userWorkspaces);
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return { workspaces, loading, refresh: fetchWorkspaces };
}
