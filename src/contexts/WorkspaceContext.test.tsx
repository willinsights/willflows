import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CACHE_KEY = 'willflow_workspace_cache';
const USER_ID = 'user-1';

const mocks = vi.hoisted(() => ({
  memberships: [] as Array<Record<string, unknown>>,
  listReads: 0,
}));

// Cliente mínimo: `workspace_members` com a lista (await direto) e `.single()`.
vi.mock('@/integrations/supabase/client', () => {
  const query = () => {
    const filters: Record<string, unknown> = {};
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      single: async () => {
        const row = mocks.memberships.find((m) => m.workspace_id === filters.workspace_id);
        return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } };
      },
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        mocks.listReads += 1;
        return Promise.resolve({ data: mocks.memberships, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };
  return {
    supabase: {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
      },
      from: () => query(),
    },
  };
});

import { WorkspaceProvider, useWorkspace } from './WorkspaceContext';

const workspaceRow = (id: string, ownerId: string | null | undefined) => {
  const row: Record<string, unknown> = {
    id,
    name: `Workspace ${id}`,
    slug: id,
    country: 'PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    locale: 'pt-PT',
    logo_url: null,
    subscription_plan: 'pro',
    subscription_status: 'active',
    trial_ends_at: null,
  };
  if (ownerId !== undefined) row.owner_id = ownerId;
  return row;
};

const membershipRow = (workspaceId: string, ownerId: string | null | undefined, role = 'admin') => ({
  id: `member-${workspaceId}`,
  workspace_id: workspaceId,
  user_id: USER_ID,
  role,
  is_active: true,
  workspaces: workspaceRow(workspaceId, ownerId),
});

const cachedMembership = (workspaceId: string) => ({
  id: `member-${workspaceId}`,
  workspace_id: workspaceId,
  user_id: USER_ID,
  role: 'admin',
  is_active: true,
});

const readCache = () => JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');

const renderProvider = () => renderHook(() => useWorkspace(), { wrapper: WorkspaceProvider });

describe('WorkspaceProvider: dono do workspace e cache local', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.memberships = [];
    mocks.listReads = 0;
  });

  afterEach(cleanup);

  it('depois de trocar de workspace o dono continua dono e a cache guarda owner_id', async () => {
    mocks.memberships = [membershipRow('ws-a', 'outro-utilizador'), membershipRow('ws-b', USER_ID)];

    const { result } = renderProvider();
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Administrador do primeiro workspace, mas não é o dono
    expect(result.current.workspace?.id).toBe('ws-a');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isWorkspaceOwner).toBe(false);
    expect(result.current.checkoutWorkspaceId).toBeUndefined();

    let switched = false;
    await act(async () => {
      switched = await result.current.setCurrentWorkspace('ws-b');
    });

    expect(switched).toBe(true);
    expect(result.current.workspace?.id).toBe('ws-b');
    expect(result.current.workspace?.owner_id).toBe(USER_ID);
    expect(result.current.isWorkspaceOwner).toBe(true);
    expect(result.current.checkoutWorkspaceId).toBe('ws-b');

    const cache = readCache();
    expect(cache.v).toBe(2);
    expect(cache.workspace.id).toBe('ws-b');
    expect(cache.workspace.owner_id).toBe(USER_ID);
    expect(cache.allWorkspaces.every((w: object) => 'owner_id' in w)).toBe(true);
  });

  it('a cache gravada na troca é aceite no arranque seguinte, com o dono certo', async () => {
    mocks.memberships = [membershipRow('ws-a', 'outro-utilizador'), membershipRow('ws-b', USER_ID)];
    const first = renderProvider();
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await act(async () => {
      await first.result.current.setCurrentWorkspace('ws-b');
    });
    const saved = localStorage.getItem(CACHE_KEY) as string;
    first.unmount();

    // Recarregamento: a cache está lá e não é feita nova leitura ao servidor
    localStorage.setItem(CACHE_KEY, saved);
    mocks.listReads = 0;
    const second = renderProvider();
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    expect(second.result.current.workspace?.id).toBe('ws-b');
    expect(second.result.current.isWorkspaceOwner).toBe(true);
    expect(mocks.listReads).toBe(0);
  });

  it.each([
    ['sem versão e sem owner_id (versões anteriores da app)', undefined, undefined],
    ['sem versão, mesmo com owner_id', undefined, null],
    ['com versão atual mas sem a chave owner_id', 2, undefined],
    ['de versão antiga', 1, null],
  ])('cache %s é ignorada e os dados vêm do servidor', async (_label, version, cachedOwner) => {
    const stale: Record<string, unknown> = {
      userId: USER_ID,
      workspace: workspaceRow('ws-a', cachedOwner),
      membership: cachedMembership('ws-a'),
      allWorkspaces: [{ ...workspaceRow('ws-a', cachedOwner), role: 'admin' }],
      cachedAt: Date.now(),
    };
    if (version !== undefined) stale.v = version;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stale));
    mocks.memberships = [membershipRow('ws-a', USER_ID)];

    const { result } = renderProvider();

    // Enquanto o servidor não responde: a carregar, sem afirmar quem é o dono
    expect(result.current.loading).toBe(true);
    expect(result.current.workspace).toBeNull();

    // Nunca passa por «carregado e sem workspace» (ecrã de onboarding por instantes)
    const seenLoadedWithoutWorkspace: boolean[] = [];
    await waitFor(() => {
      seenLoadedWithoutWorkspace.push(!result.current.loading && result.current.workspace === null);
      expect(result.current.loading).toBe(false);
    });
    expect(seenLoadedWithoutWorkspace).not.toContain(true);

    expect(mocks.listReads).toBe(1);
    expect(result.current.workspace?.owner_id).toBe(USER_ID);
    expect(result.current.isWorkspaceOwner).toBe(true);
    expect(result.current.ownedWorkspaces.map((w) => w.id)).toEqual(['ws-a']);

    const cache = readCache();
    expect(cache.v).toBe(2);
    expect(cache.workspace.owner_id).toBe(USER_ID);
  });

  it('cache válida com owner_id nulo é aceite e dá não-dono, sem leitura ao servidor', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        v: 2,
        userId: USER_ID,
        workspace: workspaceRow('ws-a', null),
        membership: cachedMembership('ws-a'),
        allWorkspaces: [{ ...workspaceRow('ws-a', null), role: 'admin' }],
        cachedAt: Date.now(),
      }),
    );
    // Se a cache fosse ignorada, o servidor diria que o utilizador é o dono
    mocks.memberships = [membershipRow('ws-a', USER_ID)];

    const { result } = renderProvider();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workspace?.id).toBe('ws-a');
    expect(result.current.workspace?.owner_id).toBeNull();
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isWorkspaceOwner).toBe(false);
    expect(result.current.ownedWorkspaces).toEqual([]);
    expect(mocks.listReads).toBe(0);
  });

  it('servidor sem a coluna owner_id: dono nulo, cache válida e sem releituras em ciclo', async () => {
    mocks.memberships = [membershipRow('ws-a', undefined)];

    const first = renderProvider();
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    expect(first.result.current.workspace?.owner_id).toBeNull();
    expect(first.result.current.isWorkspaceOwner).toBe(false);
    expect(mocks.listReads).toBe(1);
    const saved = localStorage.getItem(CACHE_KEY) as string;
    expect(JSON.parse(saved).workspace.owner_id).toBeNull();
    first.unmount();

    localStorage.setItem(CACHE_KEY, saved);
    const second = renderProvider();
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(mocks.listReads).toBe(1);
  });

  it('conta sem workspaces: termina o carregamento sem dono', async () => {
    const { result } = renderProvider();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workspace).toBeNull();
    expect(result.current.isWorkspaceOwner).toBe(false);
    expect(mocks.listReads).toBe(1);
  });
});
