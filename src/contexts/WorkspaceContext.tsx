import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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
  trial_ends_at?: string | null;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'captacao' | 'freelancer' | 'visualizador';
  is_active: boolean;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
  loading: boolean;
  fetchError: boolean;
  refreshWorkspace: () => Promise<void>;
  isAdmin: boolean;
  canEdit: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const CACHE_KEY = 'willflow_workspace_cache';
const FETCH_COOLDOWN_MS = 30000; // 30 seconds cooldown after error
const MAX_RETRIES = 3;

function getCachedWorkspace(): { workspace: Workspace; membership: WorkspaceMember } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedWorkspace(workspace: Workspace, membership: WorkspaceMember) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ workspace, membership }));
  } catch {
    // Ignore cache errors
  }
}

function clearCachedWorkspace() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore cache errors
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const lastErrorTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const refreshWorkspace = async (): Promise<void> => {
    if (!user) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      setFetchError(false);
      clearCachedWorkspace();
      hasFetchedRef.current = false;
      currentUserIdRef.current = null;
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // If we had an error, enforce cooldown
    const now = Date.now();
    if (fetchError && (now - lastErrorTimeRef.current) < FETCH_COOLDOWN_MS) {
      return;
    }

    try {
      isFetchingRef.current = true;
      
      // Get user's first active workspace membership
      const { data: membershipData, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (memberError) {
        // No workspace found - this is not an error, user needs onboarding
        if (memberError.code === 'PGRST116') {
          setWorkspace(null);
          setMembership(null);
          clearCachedWorkspace();
          setLoading(false);
          setFetchError(false);
          hasFetchedRef.current = true;
          retryCountRef.current = 0;
          return;
        }
        throw memberError;
      }

      if (membershipData) {
        const ws = membershipData.workspaces as Workspace;
        const mem = {
          id: membershipData.id,
          workspace_id: membershipData.workspace_id,
          user_id: membershipData.user_id,
          role: membershipData.role,
          is_active: membershipData.is_active,
        } as WorkspaceMember;
        
        setWorkspace(ws);
        setMembership(mem);
        setCachedWorkspace(ws, mem);
        setFetchError(false);
        hasFetchedRef.current = true;
        retryCountRef.current = 0;
      }
    } catch (error: any) {
      console.error('Error fetching workspace:', error);
      lastErrorTimeRef.current = Date.now();
      
      // Only retry if under max retries
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
        
        // Schedule retry with exponential backoff
        setTimeout(() => {
          isFetchingRef.current = false;
          refreshWorkspace();
        }, delay);
        
        // Try to use cached data while retrying
        const cached = getCachedWorkspace();
        if (cached) {
          setWorkspace(cached.workspace);
          setMembership(cached.membership);
        }
        return;
      }
      
      // Max retries exceeded - show error
      setFetchError(true);
      
      // Try to use cached data on final error
      const cached = getCachedWorkspace();
      if (cached) {
        setWorkspace(cached.workspace);
        setMembership(cached.membership);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset if user changed
    if (user?.id !== currentUserIdRef.current) {
      hasFetchedRef.current = false;
      retryCountRef.current = 0;
      currentUserIdRef.current = user?.id || null;
    }

    if (user) {
      // Try to use cache first for faster initial load
      const cached = getCachedWorkspace();
      if (cached && !hasFetchedRef.current) {
        setWorkspace(cached.workspace);
        setMembership(cached.membership);
        setLoading(false);
      }
      
      // Only fetch if we haven't fetched yet for this user
      if (!hasFetchedRef.current) {
        refreshWorkspace();
      }
    } else {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      clearCachedWorkspace();
    }
  }, [user]);

  const isAdmin = membership?.role === 'admin';
  const canEdit = ['admin', 'editor', 'captacao'].includes(membership?.role || '');

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        membership,
        loading,
        fetchError,
        refreshWorkspace,
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
  
  // Return with aliases for backward compatibility
  return {
    ...context,
    currentWorkspace: context.workspace,
    currentMembership: context.membership,
    workspaces: context.workspace ? [context.workspace] : [],
    setCurrentWorkspace: () => {}, // No-op, single workspace
    refreshWorkspaces: context.refreshWorkspace,
  };
}
