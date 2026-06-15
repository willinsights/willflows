import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface WorkspaceOwner {
  userId: string;
  email: string;
  fullName: string | null;
  workspaceId: string;
  workspaceName: string;
  totalMembers: number;
  createdAt: string;
  plan: string | null;
}

export interface Collaborator {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  workspaceId: string;
  workspaceName: string;
  joinedAt: string;
  ownerEmail: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  workspaceId: string;
  workspaceName: string;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
  createdAt: string;
  wasInvited: boolean;
  invitedAt: string | null;
}

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface UsersSummary {
  totals: {
    profiles: number;
    workspaceOwners: number;
    collaborators: number;
    pendingInvites: number;
    waitlistTotal: number;
    waitlistWithoutAccount: number;
    waitlistWithAccount: number;
  };
  workspaceOwners: WorkspaceOwner[];
  collaborators: Collaborator[];
  pendingInvites: PendingInvite[];
  waitlistWithoutAccount: WaitlistEntry[];
  allWorkspaces: WorkspaceOption[];
}

export function useUsersSummary() {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-users-summary'],
    queryFn: async (): Promise<UsersSummary> => {
      // 1. Get all profiles count
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 2. Get workspace members with workspace and profile data
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          workspace:workspaces (
            id,
            name,
            created_at
          )
        `);

      // 3. Get all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      // 4. Get user subscriptions
      const { data: subscriptionsData } = await supabase
        .from('user_subscriptions')
        .select('user_id, subscription_plan');

      // 5. Get pending invitations (including token for resend)
      const { data: invitationsData } = await supabase
        .from('workspace_invitations')
        .select(`
          id,
          email,
          role,
          token,
          workspace_id,
          invited_by,
          created_at,
          expires_at,
          accepted_at
        `)
        .is('accepted_at', null);

      // 6. Get workspaces for invitation context
      const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('id, name');

      // 7. Get waitlist entries
      const { data: waitlistData } = await supabase
        .from('beta_waitlist')
        .select('id, email, name, company, source, created_at, invited_at');

      // Create lookup maps
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const subscriptionsMap = new Map(subscriptionsData?.map(s => [s.user_id, s.subscription_plan]) || []);
      const workspacesMap = new Map(workspacesData?.map(w => [w.id, w.name]) || []);

      // Get emails set for waitlist check
      const existingEmails = new Set(profilesData?.map(p => p.email.toLowerCase()) || []);

      // Count members per workspace
      const memberCountMap = new Map<string, number>();
      membersData?.forEach(m => {
        const wsId = (m.workspace as any)?.id;
        if (wsId) {
          memberCountMap.set(wsId, (memberCountMap.get(wsId) || 0) + 1);
        }
      });

      // Separate owners and collaborators
      const owners: WorkspaceOwner[] = [];
      const collaborators: Collaborator[] = [];
      const ownerByWorkspace = new Map<string, string>();

      // First pass: identify owners
      membersData?.forEach(m => {
        if (m.role === 'admin') {
          const ws = m.workspace as any;
          if (ws) {
            ownerByWorkspace.set(ws.id, m.user_id);
          }
        }
      });

      // Second pass: build owners and collaborators lists
      membersData?.forEach(m => {
        const profile = profilesMap.get(m.user_id);
        const ws = m.workspace as any;
        
        if (!profile || !ws) return;

        if (m.role === 'admin') {
          owners.push({
            userId: m.user_id,
            email: profile.email,
            fullName: profile.full_name,
            workspaceId: ws.id,
            workspaceName: ws.name,
            totalMembers: memberCountMap.get(ws.id) || 1,
            createdAt: ws.created_at,
            plan: subscriptionsMap.get(m.user_id) || null,
          });
        } else {
          const ownerId = ownerByWorkspace.get(ws.id);
          const ownerProfile = ownerId ? profilesMap.get(ownerId) : null;
          
          collaborators.push({
            userId: m.user_id,
            email: profile.email,
            fullName: profile.full_name,
            role: m.role,
            workspaceId: ws.id,
            workspaceName: ws.name,
            joinedAt: m.created_at,
            ownerEmail: ownerProfile?.email || 'N/A',
          });
        }
      });

      // Build pending invites list
      const pendingInvites: PendingInvite[] = (invitationsData || []).map(inv => {
        const inviterProfile = profilesMap.get(inv.invited_by);
        const now = new Date();
        const expiresAt = inv.expires_at ? new Date(inv.expires_at) : null;
        
        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          token: inv.token,
          workspaceId: inv.workspace_id,
          workspaceName: workspacesMap.get(inv.workspace_id) || 'N/A',
          invitedByEmail: inviterProfile?.email || 'N/A',
          createdAt: inv.created_at,
          expiresAt: inv.expires_at,
          isExpired: expiresAt ? expiresAt < now : false,
        };
      });

      // Build waitlist without account list
      const waitlistWithoutAccount: WaitlistEntry[] = (waitlistData || [])
        .filter(w => !existingEmails.has(w.email.toLowerCase()))
        .map(w => ({
          id: w.id,
          email: w.email,
          name: w.name,
          company: w.company,
          source: w.source,
          createdAt: w.created_at || '',
          wasInvited: !!w.invited_at,
          invitedAt: w.invited_at,
        }));

      const waitlistWithAccount = (waitlistData || []).filter(w => 
        existingEmails.has(w.email.toLowerCase())
      ).length;

      // Build all workspaces list for import modal
      const allWorkspaces: WorkspaceOption[] = (workspacesData || []).map(w => ({
        id: w.id,
        name: w.name,
      }));

      return {
        totals: {
          profiles: profilesCount || 0,
          workspaceOwners: owners.length,
          collaborators: collaborators.length,
          pendingInvites: pendingInvites.length,
          waitlistTotal: waitlistData?.length || 0,
          waitlistWithoutAccount: waitlistWithoutAccount.length,
          waitlistWithAccount,
        },
        workspaceOwners: owners.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        collaborators: collaborators.sort((a, b) => 
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        ),
        pendingInvites: pendingInvites.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        waitlistWithoutAccount: waitlistWithoutAccount.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        allWorkspaces: allWorkspaces.sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Resend invitation function (for workspace invites)
  const resendInvitation = useCallback(async (invite: PendingInvite): Promise<{ success: boolean; error?: string }> => {
    try {
      // Extend expiration by 7 days
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error: updateError } = await supabase
        .from('workspace_invitations')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', invite.id);

      if (updateError) {
        logger.error('Error updating invitation:', updateError);
        return { success: false, error: 'Erro ao atualizar convite' };
      }

      // Send invitation email via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            template: 'invitation',
            to: invite.email,
            data: {
              workspaceName: invite.workspaceName,
              inviterName: 'Administrador',
              role: invite.role,
              token: invite.token,
            },
          },
        });

        if (emailError) {
          logger.warn('Failed to send invitation email:', emailError);
          // Don't fail if just email fails
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-users-summary'] });
      
      return { success: true };
    } catch (error) {
      logger.error('Error resending invitation:', error);
      return { success: false, error: 'Erro ao reenviar convite' };
    }
  }, [queryClient]);

  // Bulk send beta invites function
  const bulkSendBetaInvites = useCallback(async (
    emails: string[], 
    freeDays: number
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: 0, failed: emails.length, errors: ['Sessão não encontrada'] };
    }

    for (const email of emails) {
      try {
        // Check if already has active beta invite
        const { data: existingInvite } = await supabase
          .from('beta_invite_tokens')
          .select('id')
          .eq('email', email.toLowerCase())
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (existingInvite) {
          results.errors.push(`${email}: já tem convite ativo`);
          results.failed++;
          continue;
        }

        // Check if already has account
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingProfile) {
          results.errors.push(`${email}: já tem conta`);
          results.failed++;
          continue;
        }

        // Create beta invite token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + freeDays);

        const { data: invite, error: insertError } = await supabase
          .from('beta_invite_tokens')
          .insert({
            email: email.toLowerCase(),
            notes: `Importação em massa - ${freeDays} dias grátis`,
            expires_at: expiresAt.toISOString(),
          })
          .select('token')
          .single();

        if (insertError || !invite) {
          results.errors.push(`${email}: erro ao criar convite`);
          results.failed++;
          continue;
        }

        // Send beta invite email
        const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            template: 'beta_invite',
            to: email.toLowerCase(),
            data: { inviteToken: invite.token, freeDays },
          },
        });

        if (emailError) {
          logger.warn(`Failed to send beta invite email to ${email}:`, emailError);
          // Still count as success since invite was created
        }

        results.success++;
      } catch (error: any) {
        logger.error(`Error sending beta invite to ${email}:`, error);
        results.errors.push(`${email}: ${error.message || 'erro desconhecido'}`);
        results.failed++;
      }
    }

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['admin-users-summary'] });
    queryClient.invalidateQueries({ queryKey: ['beta-invites'] });

    return results;
  }, [queryClient]);

  // Send beta invite to waitlist entry
  const sendBetaInviteToWaitlist = useCallback(async (
    email: string,
    name: string | null,
    freeDays: number = 30
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      // Check if already has active invite
      const { data: existingInvite } = await supabase
        .from('beta_invite_tokens')
        .select('id')
        .eq('email', email.toLowerCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvite) {
        return { success: false, error: 'Já tem convite ativo' };
      }

      // Create beta invite token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + freeDays);

      const { data: invite, error: insertError } = await supabase
        .from('beta_invite_tokens')
        .insert({
          email: email.toLowerCase(),
          notes: `Convite da waitlist - ${freeDays} dias grátis`,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, token')
        .single();

      if (insertError || !invite) {
        return { success: false, error: 'Erro ao criar convite' };
      }

      // Update waitlist entry
      await supabase
        .from('beta_waitlist')
        .update({ 
          invited_at: new Date().toISOString(),
          invite_token_id: invite.id,
        })
        .eq('email', email.toLowerCase());

      // Send beta invite email
      await supabase.functions.invoke('send-transactional-email', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          template: 'beta_invite',
          to: email.toLowerCase(),
          data: { name, inviteToken: invite.token, freeDays },
        },
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-users-summary'] });
      queryClient.invalidateQueries({ queryKey: ['beta-invites'] });
      queryClient.invalidateQueries({ queryKey: ['beta-waitlist'] });

      return { success: true };
    } catch (error: any) {
      logger.error('Error sending beta invite to waitlist:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  }, [queryClient]);

  // Resend beta invite
  const resendBetaInvite = useCallback(async (
    email: string,
    name: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      // Find existing invite
      const { data: invite } = await supabase
        .from('beta_invite_tokens')
        .select('id, token')
        .eq('email', email.toLowerCase())
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!invite) {
        return { success: false, error: 'Convite não encontrado' };
      }

      // Extend expiration by 7 days
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await supabase
        .from('beta_invite_tokens')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', invite.id);

      // Resend email
      await supabase.functions.invoke('send-transactional-email', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          template: 'beta_invite',
          to: email.toLowerCase(),
          data: { name, inviteToken: invite.token, freeDays: 7 },
        },
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-users-summary'] });
      queryClient.invalidateQueries({ queryKey: ['beta-invites'] });

      return { success: true };
    } catch (error: any) {
      logger.error('Error resending beta invite:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  }, [queryClient]);

  return {
    ...query,
    resendInvitation,
    bulkSendBetaInvites,
    sendBetaInviteToWaitlist,
    resendBetaInvite,
  };
}
