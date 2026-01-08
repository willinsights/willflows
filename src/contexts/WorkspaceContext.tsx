import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  country: 'PT' | 'BR';
  currency: string;
  timezone: string;
  locale: string;
  logo_url: string | null;
  subscription_plan: 'essencial' | 'pro' | 'studio';
  subscription_status: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'captacao' | 'freelancer' | 'visualizador';
  is_active: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentMembership: WorkspaceMember | null;
  loading: boolean;
  fetchError: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  isAdmin: boolean;
  canEdit: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentMembership, setCurrentMembership] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const refreshWorkspaces = async (retries = 3, silent = false): Promise<void> => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentMembership(null);
      setLoading(false);
      setFetchError(false);
      return;
    }

    try {
      setFetchError(false);
      // Get user's workspace memberships
      const { data: memberships, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberError) throw memberError;

      if (memberships && memberships.length > 0) {
        const userWorkspaces = memberships.map((m: any) => m.workspaces as Workspace);
        setWorkspaces(userWorkspaces);

        // If no current workspace, set the first one
        if (!currentWorkspace) {
          const firstWorkspace = userWorkspaces[0];
          setCurrentWorkspace(firstWorkspace);
          
          const membership = memberships.find((m: any) => m.workspace_id === firstWorkspace.id);
          setCurrentMembership(membership as WorkspaceMember);
        } else {
          // Update current membership if workspace changed
          const membership = memberships.find((m: any) => m.workspace_id === currentWorkspace.id);
          setCurrentMembership(membership as WorkspaceMember);
        }
      } else {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setCurrentMembership(null);
      }
    } catch (error: any) {
      // Only log on first attempt to avoid spam
      if (!silent) {
        console.error('Error fetching workspaces:', error);
      }
      // Retry on network errors with exponential backoff
      if (retries > 0 && error.message?.includes('Failed to fetch')) {
        const delay = (4 - retries) * 2000; // 2s, 4s, 6s
        await new Promise(resolve => setTimeout(resolve, delay));
        return refreshWorkspaces(retries - 1, true);
      }
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, [user]);

  const handleSetCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    // Update membership for new workspace
    const membership = workspaces.find(w => w.id === workspace.id);
    if (membership) {
      // Refetch membership
      refreshWorkspaces();
    }
  };

  const isAdmin = currentMembership?.role === 'admin';
  const canEdit = ['admin', 'editor', 'captacao'].includes(currentMembership?.role || '');

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentMembership,
        loading,
        fetchError,
        setCurrentWorkspace: handleSetCurrentWorkspace,
        refreshWorkspaces,
        isAdmin,
        canEdit,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
