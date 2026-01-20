import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';

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
}

export function useUsersSummary() {
  const { isSuperAdmin } = useSuperAdmin();

  return useQuery({
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

      // 5. Get pending invitations
      const { data: invitationsData } = await supabase
        .from('workspace_invitations')
        .select(`
          id,
          email,
          role,
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
      };
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
