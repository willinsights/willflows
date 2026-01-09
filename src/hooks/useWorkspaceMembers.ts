import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  specialization: string[] | null;
  is_active: boolean;
}

export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        user_id,
        role,
        specialization,
        is_active,
        profiles!inner (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('workspace_id', currentWorkspace.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching workspace members:', error);
      setMembers([]);
    } else {
      const formattedMembers: WorkspaceMember[] = (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        specialization: member.specialization,
        is_active: member.is_active,
        full_name: member.profiles?.full_name,
        email: member.profiles?.email,
        avatar_url: member.profiles?.avatar_url,
      }));
      setMembers(formattedMembers);
    }
    
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refresh: fetchMembers };
}
