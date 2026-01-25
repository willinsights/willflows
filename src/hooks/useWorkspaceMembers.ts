import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

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

export interface PendingInvitation {
  id: string;
  invitation_id: string;
  email_masked: string | null;
  role: AppRole;
  expires_at: string;
  is_pending: true;
}

export type SelectableMember = WorkspaceMember | PendingInvitation;

export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setMembers([]);
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch active members
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
      logger.error('Error fetching workspace members:', error);
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

    // Fetch pending invitations
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('workspace_invitations')
      .select('id, email_masked, role, expires_at')
      .eq('workspace_id', currentWorkspace.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitationsError) {
      logger.error('Error fetching pending invitations:', invitationsError);
      setPendingInvitations([]);
    } else {
      const formattedInvitations: PendingInvitation[] = (invitationsData || []).map((inv: any) => ({
        id: `inv_${inv.id}`,
        invitation_id: inv.id,
        email_masked: inv.email_masked,
        role: inv.role,
        expires_at: inv.expires_at,
        is_pending: true as const,
      }));
      setPendingInvitations(formattedInvitations);
    }
    
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { 
    members, 
    pendingInvitations,
    loading, 
    refresh: fetchMembers 
  };
}
