import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { User } from '@supabase/supabase-js';
import { differenceInDays, parseISO } from 'date-fns';

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

interface WorkspaceWithRole extends Workspace {
  role: WorkspaceMember['role'];
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
  allWorkspaces: WorkspaceWithRole[];
  activeWorkspaces: WorkspaceWithRole[];
  loading: boolean;
  fetchError: boolean;
  refreshWorkspace: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => Promise<boolean>;
  isAdmin: boolean;
  canEdit: boolean;
}

// Helper to check if a workspace is active (not expired)
function isWorkspaceActive(workspace: WorkspaceWithRole): boolean {
  const status = workspace.subscription_status;
  
  // Active or trialing with valid trial
  if (status === 'active') return true;
  
  if (status === 'trialing') {
    if (workspace.trial_ends_at) {
      try {
        const daysRemaining = differenceInDays(
          parseISO(workspace.trial_ends_at),
          new Date()
        );
        return daysRemaining >= 0;
      } catch {
        return false;
      }
    }
    // No trial end date means trial is still valid
    return true;
  }
  
  return false;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const CACHE_KEY = 'willflow_workspace_cache';
const LAST_WORKSPACE_KEY = 'willflow_last_workspace_id';
const SWITCH_HANDOFF_KEY = 'willflow_workspace_switch_to';
const FETCH_COOLDOWN_MS = 30000;
const MAX_RETRIES = 3;

interface CachedWorkspaceData {
  userId: string;
  workspace: Workspace;
  membership: WorkspaceMember;
  allWorkspaces: WorkspaceWithRole[];
}

function getCachedWorkspace(): CachedWorkspaceData | null {
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

function setCachedWorkspace(userId: string, workspace: Workspace, membership: WorkspaceMember, allWorkspaces: WorkspaceWithRole[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, workspace, membership, allWorkspaces }));
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

function getLastWorkspaceId(): string | null {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function setLastWorkspaceId(workspaceId: string) {
  try {
    localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  } catch {
    // Ignore
  }
}

// SessionStorage helpers for deterministic workspace switch handoff
function getWorkspaceSwitchHandoff(): string | null {
  try {
    return sessionStorage.getItem(SWITCH_HANDOFF_KEY);
  } catch {
    return null;
  }
}

function setWorkspaceSwitchHandoff(workspaceId: string) {
  try {
    sessionStorage.setItem(SWITCH_HANDOFF_KEY, workspaceId);
  } catch {
    // Ignore
  }
}

function clearWorkspaceSwitchHandoff() {
  try {
    sessionStorage.removeItem(SWITCH_HANDOFF_KEY);
  } catch {
    // Ignore
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Manage our own auth state to avoid circular dependency with AuthContext
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMember | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const lastErrorTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Listen to auth state changes directly from supabase
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const setCurrentWorkspace = useCallback(async (workspaceId: string): Promise<boolean> => {
    if (!user) {
      console.error('[setCurrentWorkspace] No user');
      return false;
    }
    
    // Find the workspace in our list
    const targetWorkspace = allWorkspaces.find(w => w.id === workspaceId);
    if (!targetWorkspace) {
      console.error('[setCurrentWorkspace] Workspace not found:', workspaceId);
      return false;
    }

    try {
      // IMPORTANTE: Limpar cache antigo PRIMEIRO para garantir que nenhum dado stale persiste
      clearCachedWorkspace();
      
      // Fetch the membership for this workspace
      const { data: membershipData, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .single();

      if (error || !membershipData) {
        console.error('[setCurrentWorkspace] Error fetching membership:', error);
        return false;
      }

      const ws: Workspace = {
        id: targetWorkspace.id,
        name: targetWorkspace.name,
        slug: targetWorkspace.slug,
        country: targetWorkspace.country,
        currency: targetWorkspace.currency,
        timezone: targetWorkspace.timezone,
        locale: targetWorkspace.locale,
        logo_url: targetWorkspace.logo_url,
        subscription_plan: targetWorkspace.subscription_plan,
        subscription_status: targetWorkspace.subscription_status,
        trial_ends_at: targetWorkspace.trial_ends_at,
      };

      const mem: WorkspaceMember = {
        id: membershipData.id,
        workspace_id: membershipData.workspace_id,
        user_id: membershipData.user_id,
        role: membershipData.role,
        is_active: membershipData.is_active,
      };

      // IMPORTANTE: Guardar no localStorage PRIMEIRO antes de atualizar estado
      setLastWorkspaceId(workspaceId);
      setCachedWorkspace(user.id, ws, mem, allWorkspaces);
      
      // Reset hasFetchedRef para forçar refetch após reload
      hasFetchedRef.current = false;
      
      // Atualizar estado local
      setWorkspace(ws);
      setMembership(mem);
      
      logger.debug('[setCurrentWorkspace] Successfully switched to:', workspaceId);
      return true;
    } catch (error) {
      logger.error('[setCurrentWorkspace] Exception:', error);
      return false;
    }
  }, [user, allWorkspaces]);

  const refreshWorkspace = useCallback(async (): Promise<void> => {
    if (!user) {
      setWorkspace(null);
      setMembership(null);
      setAllWorkspaces([]);
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
      
      // Get ALL user's active workspace memberships
      const { data: membershipsData, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberError) {
        // No workspace found - this is not an error, user needs onboarding
        if (memberError.code === 'PGRST116') {
          setWorkspace(null);
          setMembership(null);
          setAllWorkspaces([]);
          clearCachedWorkspace();
          setLoading(false);
          setFetchError(false);
          hasFetchedRef.current = true;
          retryCountRef.current = 0;
          return;
        }
        throw memberError;
      }

      if (!membershipsData || membershipsData.length === 0) {
        // No workspaces found - user needs onboarding
        setWorkspace(null);
        setMembership(null);
        setAllWorkspaces([]);
        clearCachedWorkspace();
        setLoading(false);
        setFetchError(false);
        hasFetchedRef.current = true;
        retryCountRef.current = 0;
        return;
      }

      // Build list of all workspaces with roles
      const workspacesWithRoles: WorkspaceWithRole[] = membershipsData
        .filter((m: any) => m.workspaces)
        .map((m: any) => ({
          ...m.workspaces,
          role: m.role,
        }));

      setAllWorkspaces(workspacesWithRoles);

      // Determine which workspace to use - priority order:
      // 1. sessionStorage handoff (from explicit workspace switch)
      // 2. localStorage last workspace id
      // 3. First admin workspace
      // 4. First workspace in list
      const handoffWorkspaceId = getWorkspaceSwitchHandoff();
      const lastWorkspaceId = getLastWorkspaceId();
      let selectedMembership = membershipsData[0]; // Default to first

      // Priority 1: Check for explicit switch handoff
      if (handoffWorkspaceId) {
        const found = membershipsData.find((m: any) => m.workspace_id === handoffWorkspaceId);
        if (found) {
          selectedMembership = found;
          // Apply to localStorage and clear handoff
          setLastWorkspaceId(handoffWorkspaceId);
        }
        // Always clear handoff after reading, even if workspace not found
        clearWorkspaceSwitchHandoff();
      }
      // Priority 2: Try to use last workspace if available and user still has access
      else if (lastWorkspaceId) {
        const found = membershipsData.find((m: any) => m.workspace_id === lastWorkspaceId);
        if (found) {
          selectedMembership = found;
        } else {
          // Last workspace ID is stale - clear it
          localStorage.removeItem(LAST_WORKSPACE_KEY);
        }
      }
      // Priority 3: If no last workspace, prefer admin workspaces first
      else {
        const adminWorkspace = membershipsData.find((m: any) => m.role === 'admin');
        if (adminWorkspace) {
          selectedMembership = adminWorkspace;
        }
      }

      if (selectedMembership) {
        const ws = selectedMembership.workspaces as Workspace;
        const mem = {
          id: selectedMembership.id,
          workspace_id: selectedMembership.workspace_id,
          user_id: selectedMembership.user_id,
          role: selectedMembership.role,
          is_active: selectedMembership.is_active,
        } as WorkspaceMember;
        
        setWorkspace(ws);
        setMembership(mem);
        setLastWorkspaceId(ws.id);
        setCachedWorkspace(user.id, ws, mem, workspacesWithRoles);
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
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        
        setTimeout(() => {
          isFetchingRef.current = false;
          refreshWorkspace();
        }, delay);
        
        // Try to use cached data while retrying
        const cached = getCachedWorkspace();
        if (cached) {
          setWorkspace(cached.workspace);
          setMembership(cached.membership);
          setAllWorkspaces(cached.allWorkspaces || []);
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
        setAllWorkspaces(cached.allWorkspaces || []);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user, fetchError]);

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
      
      // Only use cache if it belongs to the current user
      if (cached && cached.userId === user.id && !hasFetchedRef.current) {
        setWorkspace(cached.workspace);
        setMembership(cached.membership);
        setAllWorkspaces(cached.allWorkspaces || []);
        setLoading(false);
      } else if (cached && cached.userId !== user.id) {
        // Different user - clear the stale cache
        clearCachedWorkspace();
        localStorage.removeItem(LAST_WORKSPACE_KEY);
      }
      
      // Only fetch if we haven't fetched yet for this user
      if (!hasFetchedRef.current) {
        refreshWorkspace();
      }
    } else {
      // No user - clear everything
      setWorkspace(null);
      setMembership(null);
      setAllWorkspaces([]);
      setLoading(false);
      clearCachedWorkspace();
      localStorage.removeItem(LAST_WORKSPACE_KEY);
    }
  }, [user, refreshWorkspace]);

  const isAdmin = membership?.role === 'admin';
  const canEdit = ['admin', 'editor', 'captacao'].includes(membership?.role || '');

  // Filter to only active workspaces (not expired)
  const activeWorkspaces = useMemo(() => 
    allWorkspaces.filter(isWorkspaceActive),
    [allWorkspaces]
  );

  // Include authLoading in overall loading state
  const isLoading = authLoading || loading;

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        membership,
        allWorkspaces,
        activeWorkspaces,
        loading: isLoading,
        fetchError,
        refreshWorkspace,
        setCurrentWorkspace,
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
    console.warn('useWorkspace called outside WorkspaceProvider - returning fallback');
    return {
      workspace: null,
      membership: null,
      allWorkspaces: [] as WorkspaceWithRole[],
      activeWorkspaces: [] as WorkspaceWithRole[],
      loading: true,
      fetchError: false,
      refreshWorkspace: async () => {},
      setCurrentWorkspace: async () => false,
      isAdmin: false,
      canEdit: false,
      currentWorkspace: null,
      currentMembership: null,
      workspaces: [] as WorkspaceWithRole[],
      refreshWorkspaces: async () => {},
    };
  }
  
  // Return with aliases for backward compatibility
  return {
    ...context,
    currentWorkspace: context.workspace,
    currentMembership: context.membership,
    workspaces: context.allWorkspaces,
    refreshWorkspaces: context.refreshWorkspace,
  };
}
