import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { User } from '@supabase/supabase-js';
import { getWorkspaceAccessState } from '@/lib/billing/workspaceAccess';
import { isReturningFromPortal } from '@/lib/billing/portalReturn';
import {
  getCheckoutWorkspaceId,
  getOwnedWorkspaces,
  isWorkspaceOwner as checkWorkspaceOwner,
} from '@/lib/billing/accountPlan';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  country: 'PT' | 'BR';
  currency: string;
  timezone: string;
  locale: string;
  logo_url: string | null;
  subscription_plan: 'starter' | 'pro' | 'studio';
  subscription_status: string;
  trial_ends_at?: string | null;
  /**
   * Desde quando o pagamento está em atraso (preenchido pelo servidor). Ausente
   * ou null em `past_due` conta como «agora», como no servidor.
   */
  past_due_since?: string | null;
  /** Dono do workspace: o primeiro administrador. Null = sem dono registado. */
  owner_id?: string | null;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'edicao' | 'captacao' | 'gestao' | 'visualizacao';
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
  /**
   * O utilizador é o DONO do workspace atual (primeiro administrador).
   * Só o dono compra e gere o plano; `isAdmin` continua a valer para o resto.
   */
  isWorkspaceOwner: boolean;
  /** Workspaces de que o utilizador é dono (contam para o limite da conta). */
  ownedWorkspaces: WorkspaceWithRole[];
  /**
   * Workspace a indicar numa compra de plano: o atual quando o utilizador é o
   * dono; `undefined` nos outros casos (a compra é para a própria conta).
   */
  checkoutWorkspaceId: string | undefined;
  canEdit: boolean;
}

// Workspace ativo pela regra única partilhada com o servidor (workspace_is_active)
function isWorkspaceActive(workspace: WorkspaceWithRole): boolean {
  return getWorkspaceAccessState({
    status: workspace.subscription_status,
    trialEndsAt: workspace.trial_ends_at,
    pastDueSince: workspace.past_due_since,
  }).active;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const CACHE_KEY = 'willflow_workspace_cache';
const LAST_WORKSPACE_KEY_PREFIX = 'willflow_last_workspace_';
const SWITCH_HANDOFF_KEY = 'willflow_workspace_switch_to';
const FETCH_COOLDOWN_MS = 30000;
const MAX_RETRIES = 3;
const CACHE_VALID_MS = 1000 * 60 * 5; // Cache válido por 5 minutos - evita re-fetches ao navegar

// Roles válidos do enum app_role no banco de dados
const VALID_ROLES = ['admin', 'edicao', 'captacao', 'gestao', 'visualizacao'] as const;

function isValidRole(role: unknown): role is WorkspaceMember['role'] {
  return typeof role === 'string' && VALID_ROLES.includes(role as any);
}

// Versão do formato da cache local. Sobe sempre que o formato muda de modo que
// uma cache antiga daria uma resposta errada. v2: o workspace traz `owner_id`
// (quem é o dono). Cache sem versão, de versão antiga ou sem a chave `owner_id`
// é ignorada e apagada, e os dados são lidos do servidor.
const CACHE_VERSION = 2;

interface CachedWorkspaceData {
  v: number;
  userId: string;
  workspace: Workspace;
  membership: WorkspaceMember;
  allWorkspaces: WorkspaceWithRole[];
  cachedAt: number; // Timestamp para validar se cache ainda é recente
}

// `null` é um valor válido (workspace sem dono registado); o que invalida a
// cache é a chave não existir, porque aí não se sabe quem é o dono.
function hasOwnerKey(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'owner_id' in value &&
    (value as { owner_id?: unknown }).owner_id !== undefined
  );
}

function isCurrentCacheFormat(data: unknown): data is CachedWorkspaceData {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<CachedWorkspaceData>;
  if (candidate.v !== CACHE_VERSION) return false;
  if (!hasOwnerKey(candidate.workspace)) return false;
  if (candidate.allWorkspaces == null) return true;
  return Array.isArray(candidate.allWorkspaces) && candidate.allWorkspaces.every(hasOwnerKey);
}

// O servidor é a origem de `owner_id`. Um registo sem a coluna fica com dono
// nulo (ninguém é dono), para o objeto ter sempre a chave.
function withOwnerId<T extends { owner_id?: string | null }>(value: T): T & { owner_id: string | null } {
  return { ...value, owner_id: value.owner_id ?? null };
}

function getCachedWorkspace(): CachedWorkspaceData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedWorkspaceData;

      // Formato antigo (sem versão ou sem dono): não serve, lê-se do servidor
      if (!isCurrentCacheFormat(data)) {
        clearCachedWorkspace();
        return null;
      }

      // VALIDAR role também aqui (este helper é usado como fallback em erros de fetch)
      // para evitar reintroduzir roles inválidos (ex: "gestor") e causar erros de enum.
      if (data?.membership && !isValidRole((data.membership as any).role)) {
        logger.warn('[WorkspaceContext] Cached membership has invalid role, clearing cache');
        clearCachedWorkspace();
        return null;
      }

      // Validar roles do allWorkspaces (se existirem)
      if (Array.isArray(data?.allWorkspaces)) {
        data.allWorkspaces = data.allWorkspaces.filter(ws => isValidRole((ws as any).role));
      }

      return data;
    }
  } catch {
    // Cache corrompido - limpar
    clearCachedWorkspace();
  }
  return null;
}

function isCacheValid(cached: CachedWorkspaceData | null): boolean {
  if (!cached || !cached.cachedAt) return false;
  const age = Date.now() - cached.cachedAt;
  return age >= 0 && age < CACHE_VALID_MS;
}

function setCachedWorkspace(userId: string, workspace: Workspace, membership: WorkspaceMember, allWorkspaces: WorkspaceWithRole[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ 
      v: CACHE_VERSION,
      userId, 
      workspace, 
      membership, 
      allWorkspaces,
      cachedAt: Date.now()
    }));
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

// CRITICAL: Função síncrona para inicialização lazy do estado
// Isto garante que o cache é lido ANTES do primeiro render
function getInitialStateFromCache(): {
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
  allWorkspaces: WorkspaceWithRole[];
  hasValidCache: boolean;
  cachedUserId: string | null;
} {
  // Regresso do portal de faturação: o plano pode ter mudado no Stripe, por
  // isso a cache local é descartada e o workspace é lido do servidor.
  if (isReturningFromPortal()) {
    clearCachedWorkspace();
    return {
      workspace: null,
      membership: null,
      allWorkspaces: [],
      hasValidCache: false,
      cachedUserId: null,
    };
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedWorkspaceData;
      
      // VALIDAR formato (versão e dono) e role antes de usar cache: uma cache
      // antiga sem `owner_id` faria o dono passar por não-dono
      if (isCurrentCacheFormat(data) && isCacheValid(data) && data.workspace && data.membership && isValidRole(data.membership.role)) {
        // Também validar roles de allWorkspaces
        const validWorkspaces = (data.allWorkspaces || []).filter(ws => isValidRole(ws.role));
        
        return {
          workspace: data.workspace,
          membership: data.membership,
          allWorkspaces: validWorkspaces,
          hasValidCache: true,
          cachedUserId: data.userId,
        };
      } else {
        // Cache de formato antigo ou com role inválido - limpar automaticamente
        logger.warn('[WorkspaceContext] Outdated or invalid cache detected, clearing cache');
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch {
    // Cache corrompido - limpar
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  }
  return {
    workspace: null,
    membership: null,
    allWorkspaces: [],
    hasValidCache: false,
    cachedUserId: null,
  };
}

function getLastWorkspaceId(userId?: string): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(`${LAST_WORKSPACE_KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

function setLastWorkspaceId(userId: string, workspaceId: string) {
  try {
    localStorage.setItem(`${LAST_WORKSPACE_KEY_PREFIX}${userId}`, workspaceId);
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
  // CRITICAL: Lazy state initialization - lê cache SINCRONAMENTE antes do primeiro render
  // Isto elimina completamente o flash do onboarding pois o estado já vem preenchido
  const [initialCache] = useState(() => getInitialStateFromCache());
  
  // Manage our own auth state to avoid circular dependency with AuthContext
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // NOTA: NÃO usar dados do cache inicial até confirmar que pertence ao user atual
  // O useEffect vai aplicar os dados depois de verificar o userId
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMember | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceWithRole[]>([]);
  
  // Começar com loading=true, o useEffect vai mudar para false após verificar cache
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const lastErrorTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  // Guardar cache inicial para usar depois de verificar user
  const initialCacheRef = useRef(initialCache);

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
      logger.error('[setCurrentWorkspace] No user');
      return false;
    }
    
    // Find the workspace in our list
    const targetWorkspace = allWorkspaces.find(w => w.id === workspaceId);
    if (!targetWorkspace) {
      logger.error('[setCurrentWorkspace] Workspace not found:', workspaceId);
      return false;
    }

    try {
      // NOTA: NÃO limpar cache aqui - vamos sobrescrever diretamente
      // Isso evita race condition onde cache está vazio durante o reload
      
      // Fetch the membership for this workspace
      const { data: membershipData, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .single();

      if (error || !membershipData) {
        logger.error('[setCurrentWorkspace] Error fetching membership:', error);
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
        past_due_since: targetWorkspace.past_due_since ?? null,
        // Sem isto o dono passava a ser tratado como não-dono depois da troca
        owner_id: targetWorkspace.owner_id ?? null,
      };

      const mem: WorkspaceMember = {
        id: membershipData.id,
        workspace_id: membershipData.workspace_id,
        user_id: membershipData.user_id,
        role: membershipData.role,
        is_active: membershipData.is_active,
      };

      // IMPORTANTE: Guardar no localStorage PRIMEIRO antes de atualizar estado
      setLastWorkspaceId(user.id, workspaceId);
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

    let retryScheduled = false;
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
          ...withOwnerId(m.workspaces),
          role: m.role,
        }));

      setAllWorkspaces(workspacesWithRoles);

      // Determine which workspace to use - priority order:
      // 1. sessionStorage handoff (from explicit workspace switch)
      // 2. localStorage last workspace id (per user)
      // 3. First admin workspace
      // 4. First workspace in list
      const handoffWorkspaceId = getWorkspaceSwitchHandoff();
      const lastWorkspaceId = getLastWorkspaceId(user.id);
      let selectedMembership = membershipsData[0]; // Default to first

      // Priority 1: Check for explicit switch handoff
      if (handoffWorkspaceId) {
        const found = membershipsData.find((m: any) => m.workspace_id === handoffWorkspaceId);
        if (found) {
          selectedMembership = found;
          // Apply to localStorage and clear handoff
          setLastWorkspaceId(user.id, handoffWorkspaceId);
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
          // Last workspace ID is stale for this user - ignore (don't clear, might be valid for other sessions)
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
        const ws = withOwnerId(selectedMembership.workspaces as Workspace);
        const mem = {
          id: selectedMembership.id,
          workspace_id: selectedMembership.workspace_id,
          user_id: selectedMembership.user_id,
          role: selectedMembership.role,
          is_active: selectedMembership.is_active,
        } as WorkspaceMember;
        
        setWorkspace(ws);
        setMembership(mem);
        setLastWorkspaceId(user.id, ws.id);
        setCachedWorkspace(user.id, ws, mem, workspacesWithRoles);
        setFetchError(false);
        hasFetchedRef.current = true;
        retryCountRef.current = 0;
      }
    } catch (error: any) {
      logger.error('Error fetching workspace:', error);
      lastErrorTimeRef.current = Date.now();
      
      // Only retry if under max retries
      if (retryCountRef.current < MAX_RETRIES) {
        retryScheduled = true;
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        
        setTimeout(() => {
          isFetchingRef.current = false;
          refreshWorkspace();
        }, delay);
        
        // Try to use cached data while retrying
        const cached = getCachedWorkspace();
        if (cached?.userId === user.id && isCacheValid(cached)) {
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
      if (cached?.userId === user.id && isCacheValid(cached)) {
        setWorkspace(cached.workspace);
        setMembership(cached.membership);
        setAllWorkspaces(cached.allWorkspaces || []);
      }
    } finally {
      isFetchingRef.current = false;
      if (!retryScheduled) setLoading(false);
    }
  }, [user, fetchError]);

  useEffect(() => {
    if (authLoading) return;
    // CRITICAL: Verificar se o user do auth corresponde ao user do cache
    // Se não corresponder, precisamos limpar e fazer refetch
    const cachedUserId = initialCacheRef.current.cachedUserId;
    const cacheUserMismatch = cachedUserId && user?.id && cachedUserId !== user.id;
    
    // Reset if user changed
    if (user?.id !== currentUserIdRef.current) {
      // Só resetar hasFetchedRef se realmente mudou de user (não no primeiro load)
      if (currentUserIdRef.current !== null || cacheUserMismatch) {
        hasFetchedRef.current = false;
        retryCountRef.current = 0;
      }
      currentUserIdRef.current = user?.id || null;
    }

    if (user) {
      // Verificar se o cache inicial era de outro user
      if (cacheUserMismatch) {
        // Limpar dados do user anterior (mas não o lastWorkspaceId do user antigo)
        clearCachedWorkspace();
        // Note: We don't clear lastWorkspaceId here because it's now per-user
        setWorkspace(null);
        setMembership(null);
        setAllWorkspaces([]);
        // Resetar o ref do cache inicial
        initialCacheRef.current = {
          workspace: null,
          membership: null,
          allWorkspaces: [],
          hasValidCache: false,
          cachedUserId: null,
        };
      }
      
      // Verificar cache atual
      const cached = getCachedWorkspace();
      const cacheIsValid = cached && cached.userId === user.id && isCacheValid(cached);
      
      // Se temos dados do cache inicial do MESMO user, aplicar e marcar como fetched
      const initialCacheData = initialCacheRef.current;
      if (cacheIsValid && initialCacheData.hasValidCache && initialCacheData.cachedUserId === user.id && !hasFetchedRef.current) {
        // Aplicar dados do cache inicial agora que confirmamos o user
        setWorkspace(initialCacheData.workspace);
        setMembership(initialCacheData.membership);
        setAllWorkspaces(initialCacheData.allWorkspaces);
        hasFetchedRef.current = true;
        setLoading(false);
        return;
      }
      
      // Only use fresh cache if it belongs to the current user
      if (cached && cacheIsValid && !hasFetchedRef.current) {
        setWorkspace(cached.workspace);
        setMembership(cached.membership);
        setAllWorkspaces(cached.allWorkspaces || []);
        setLoading(false);
        hasFetchedRef.current = true;
      }
      
      // Fetch se: não temos cache válido OU cache expirou
      if (!hasFetchedRef.current && !cacheIsValid) {
        refreshWorkspace();
      }
    } else {
      // No user - clear everything except per-user lastWorkspaceId (preserved for next login)
      setWorkspace(null);
      setMembership(null);
      setAllWorkspaces([]);
      setLoading(false);
      clearCachedWorkspace();
      // Note: We intentionally do NOT clear lastWorkspaceId here
      // Each user has their own key, so it persists across logout/login
    }
  }, [user, authLoading, refreshWorkspace]);

  const isAdmin = membership?.role === 'admin';
  // Único sítio que decide «sou dono deste workspace?»: a regra pura vive em
  // lib/billing/accountPlan e todos os ecrãs leem o resultado daqui.
  const userId = user?.id ?? null;
  const isWorkspaceOwner = checkWorkspaceOwner(workspace, userId);
  const ownedWorkspaces = useMemo(
    () => getOwnedWorkspaces(allWorkspaces, userId),
    [allWorkspaces, userId],
  );
  // Único sítio que decide para que workspace é uma compra de plano
  const checkoutWorkspaceId = getCheckoutWorkspaceId(workspace, userId);
  // canEdit is now dynamic - will be computed by useFinancialPermissions hook
  // For backward compatibility, we still provide a basic check here
  // but components should use useFinancialPermissions for accurate permissions
  const canEdit = isAdmin || membership?.role === 'edicao' || membership?.role === 'captacao';

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
        isWorkspaceOwner,
        ownedWorkspaces,
        checkoutWorkspaceId,
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
    logger.warn('useWorkspace called outside WorkspaceProvider - returning fallback');
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
      isWorkspaceOwner: false,
      ownedWorkspaces: [] as WorkspaceWithRole[],
      checkoutWorkspaceId: undefined as string | undefined,
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
