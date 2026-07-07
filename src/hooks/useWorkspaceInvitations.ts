import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface WorkspaceInvitation {
  id: string;
  email: string;
  email_masked: string | null; // Masked email for display (e.g., w***n@gmail.com)
  role: AppRole;
  token?: string;
  expires_at: string;
  created_at: string;
  invited_by: string | null;
  accepted_at: string | null;
}

export interface InvitationResult {
  success: boolean;
  error?: string;
  requiresUpgrade?: boolean;
  currentUsage?: number;
  limit?: number;
}

export function useWorkspaceInvitations() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { limits, usage, canUseFeature } = usePlanFeatures();
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
      .select('id, workspace_id, email, email_masked, role, expires_at, created_at, invited_by, accepted_at')
      .eq('workspace_id', currentWorkspace.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching invitations:', error);
      setInvitations([]);
    } else {
      setInvitations(data || []);
    }
    
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (email: string, role: AppRole): Promise<InvitationResult> => {
    if (!currentWorkspace?.id || !user?.id) {
      return { success: false, error: 'Workspace ou utilizador não encontrado' };
    }

    // Check if user can invite more members based on their plan limits
    if (!canUseFeature('users')) {
      return { 
        success: false, 
        error: `Limite de ${limits.users} utilizadores atingido. Faça upgrade para convidar mais membros.`,
        requiresUpgrade: true,
        currentUsage: usage.users,
        limit: limits.users,
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    // Check if user is already a member via profiles
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
    const { data: invitation, error: insertError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: currentWorkspace.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select('id')
      .single();

    if (insertError || !invitation) {
      logger.error('Error creating invitation:', insertError);
      return { success: false, error: 'Erro ao criar convite' };
    }

    // Get inviter's profile name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Send invitation email via edge function (token resolved server-side from invitation_id)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            template: 'invitation',
            to: email.toLowerCase(),
            data: {
              workspaceName: currentWorkspace.name,
              inviterName: inviterProfile?.full_name || inviterProfile?.email || 'Um utilizador',
              role,
              invitation_id: invitation.id,
            },
          },
        });

        if (emailError) {
          logger.warn('Failed to send invitation email:', emailError);
          await fetchInvitations();
          return { 
            success: true, 
            error: 'Convite criado mas o email pode não ter sido enviado. Use "Reenviar" para tentar novamente.' 
          };
        }
      }
    } catch (emailErr) {
      logger.warn('Error sending invitation email:', emailErr);
      await fetchInvitations();
      return { 
        success: true, 
        error: 'Convite criado mas o email pode não ter sido enviado. Use "Reenviar" para tentar novamente.' 
      };
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
      logger.error('Error canceling invitation:', error);
      return { success: false, error: 'Erro ao cancelar convite' };
    }

    await fetchInvitations();
    return { success: true };
  };

  const resendInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentWorkspace?.id) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    // Fetch invitation directly from DB (not from memory list which may be stale)
    const { data: invitation, error: fetchError } = await supabase
      .from('workspace_invitations')
      .select('id, email, role')
      .eq('id', invitationId)
      .eq('workspace_id', currentWorkspace.id)
      .is('accepted_at', null)
      .single();

    if (fetchError || !invitation) {
      logger.error('Invitation not found:', fetchError);
      return { success: false, error: 'Convite não encontrado ou já aceite' };
    }

    // Extend expiration by 7 days
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    const { error } = await supabase
      .from('workspace_invitations')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', invitationId);

    if (error) {
      logger.error('Error resending invitation:', error);
      return { success: false, error: 'Erro ao reenviar convite' };
    }

    // Send the invitation email again (token resolved server-side)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && currentWorkspace) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id)
          .single();

        const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            template: 'invitation',
            to: invitation.email,
            data: {
              workspaceName: currentWorkspace.name,
              inviterName: inviterProfile?.full_name || inviterProfile?.email || 'Um utilizador',
              role: invitation.role,
              invitation_id: invitation.id,
            },
          },
        });

        if (emailError) {
          logger.warn('Failed to resend invitation email:', emailError);
          await fetchInvitations();
          return { success: true, error: 'Convite reenviado mas o email pode não ter sido entregue' };
        }
      }
    } catch (emailErr) {
      logger.warn('Error resending invitation email:', emailErr);
      await fetchInvitations();
      return { success: true, error: 'Convite reenviado mas o email pode não ter sido entregue' };
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
    // Expose limits for UI
    userLimits: {
      current: usage.users,
      max: limits.users,
      canInvite: canUseFeature('users'),
    },
  };
}
