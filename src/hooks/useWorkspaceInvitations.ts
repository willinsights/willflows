import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: string | null;
  accepted_at: string | null;
}

export function useWorkspaceInvitations() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    } else {
      setInvitations(data || []);
    }
    
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (email: string, role: AppRole): Promise<{ success: boolean; error?: string }> => {
    if (!currentWorkspace?.id || !user?.id) {
      return { success: false, error: 'Workspace ou utilizador não encontrado' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', currentWorkspace.id)
      .eq('is_active', true)
      .single();

    // We need to check via profiles since workspace_members doesn't have email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingProfile) {
      const { data: isMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', existingProfile.id)
        .eq('is_active', true)
        .single();

      if (isMember) {
        return { success: false, error: 'Este utilizador já é membro do workspace' };
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', currentWorkspace.id)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return { success: false, error: 'Já existe um convite pendente para este email' };
    }

    // Create the invitation
    const { error: insertError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: currentWorkspace.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      });

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return { success: false, error: 'Erro ao criar convite' };
    }

    await fetchInvitations();
    return { success: true };
  };

  const cancelInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Error canceling invitation:', error);
      return { success: false, error: 'Erro ao cancelar convite' };
    }

    await fetchInvitations();
    return { success: true };
  };

  const resendInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    // Extend expiration by 7 days
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    const { error } = await supabase
      .from('workspace_invitations')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', invitationId);

    if (error) {
      console.error('Error resending invitation:', error);
      return { success: false, error: 'Erro ao reenviar convite' };
    }

    await fetchInvitations();
    return { success: true };
  };

  return {
    invitations,
    loading,
    refresh: fetchInvitations,
    createInvitation,
    cancelInvitation,
    resendInvitation,
  };
}
