import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

const INVITED_EMAIL = 'convidado@example.com';
// Same keys as WorkspaceContext
const HANDOFF_KEY = 'willflow_workspace_switch_to';
const WORKSPACE_CACHE_KEY = 'willflow_workspace_cache';

// Shared state between the mocks: who is signed in decides what the RPC returns,
// mirroring get_invitation_by_token (full email only for the signed-in invitee).
const mocks = vi.hoisted(() => {
  const authState: { user: { id: string; email: string } | null; loading: boolean } = {
    user: null,
    loading: false,
  };
  const invitedEmail = 'convidado@example.com';
  // What accept_workspace_invitation returns (workspace_id may be missing)
  const acceptState: { result: { success: boolean; workspace_id?: string; role?: string } } = {
    result: { success: true, workspace_id: 'workspace-1', role: 'edicao' },
  };

  const rpc = vi.fn((name: string, _args?: unknown) => {
    if (name === 'get_invitation_by_token') {
      return Promise.resolve({
        data: [
          {
            id: 'invitation-1',
            workspace_id: 'workspace-1',
            workspace_name: 'Workspace de Teste',
            email: authState.user?.email === invitedEmail ? invitedEmail : null,
            email_masked: 'c***@example.com',
            role: 'edicao',
            expires_at: '2999-01-01T00:00:00Z',
            accepted_at: null,
          },
        ],
        error: null,
      });
    }
    if (name === 'accept_workspace_invitation') {
      return Promise.resolve({ data: acceptState.result, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const membershipQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(
      (): Promise<{ data: { id: string } | null; error: null }> =>
        Promise.resolve({ data: null, error: null }),
    ),
  };
  membershipQuery.select.mockReturnValue(membershipQuery);
  membershipQuery.eq.mockReturnValue(membershipQuery);

  const signInWithPassword = vi.fn(({ email }: { email: string; password: string }) => {
    authState.user = { id: `user-${email}`, email };
    return Promise.resolve({ data: {}, error: null });
  });

  const toast = vi.fn();
  const navigate = vi.fn();

  return { authState, acceptState, rpc, membershipQuery, signInWithPassword, toast, navigate };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => mocks.membershipQuery),
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authState.user, loading: mocks.authState.loading }),
}));

// Entering the app must be a full reload, never a SPA navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/components/ui/logo', () => ({
  Logo: () => null,
}));

// Import page after mocks
import AcceptInvite from '../AcceptInvite';

// A fresh element each time, so rerender() really renders the page again
const page = () => (
  <MemoryRouter initialEntries={['/convite?token=tok-1']}>
    <AcceptInvite />
  </MemoryRouter>
);

const invitationLoads = () =>
  mocks.rpc.mock.calls.filter(([name]) => name === 'get_invitation_by_token').length;

const emailMismatchToasts = () =>
  mocks.toast.mock.calls.filter(([arg]) => arg?.title === 'Email diferente').length;

async function loginOnPage(rerender: (ui: ReactElement) => void, email: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer login' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'segredo123' } });
  const submit = screen.getByRole('button', { name: 'Entrar e aceitar' });
  fireEvent.submit(submit.closest('form') as HTMLFormElement);
  await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1));
  // The mocked useAuth is not reactive: render again with the new session
  rerender(page());
}

// The page's automatic redirect: the callback scheduled with the 2 s delay.
// Returns it together with the timer id, without waiting for real time.
function scheduledRedirect(spy: { mock: { calls: unknown[][]; results: { value: unknown }[] } }) {
  const index = spy.mock.calls.findIndex((args) => args[1] === 2000);
  if (index === -1) throw new Error('O redirecionamento automático não foi agendado');
  const callback = spy.mock.calls[index][0];
  if (typeof callback !== 'function') throw new Error('Callback do temporizador inválido');
  return { run: callback as () => void, timerId: spy.mock.results[index].value };
}

describe('AcceptInvite', () => {
  const originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
  const assign = vi.fn();

  beforeEach(() => {
    mocks.authState.user = null;
    mocks.authState.loading = false;
    mocks.acceptState.result = { success: true, workspace_id: 'workspace-1', role: 'edicao' };
    mocks.membershipQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.rpc.mockClear();
    mocks.signInWithPassword.mockClear();
    mocks.toast.mockClear();
    mocks.navigate.mockClear();
    assign.mockClear();
    sessionStorage.clear();
    localStorage.clear();
    // window.location.assign cannot be spied on in jsdom: swap the whole object
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, assign },
    });
  });

  afterEach(() => {
    if (originalLocation) Object.defineProperty(window, 'location', originalLocation);
  });

  it('sem sessão → login → o convite é recarregado e a aceitação avança', async () => {
    const { rerender } = render(page());

    // Without session the email comes back null: that is not an error
    expect(await screen.findByRole('button', { name: 'Criar conta e aceitar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(invitationLoads()).toBe(1);
    expect(emailMismatchToasts()).toBe(0);

    await loginOnPage(rerender, INVITED_EMAIL);

    // The invitation is loaded again as the signed-in invitee and the flow moves on
    const accept = await screen.findByRole('button', { name: 'Aceitar Convite' });
    expect(invitationLoads()).toBe(2);
    expect(emailMismatchToasts()).toBe(0);

    fireEvent.click(accept);
    expect(await screen.findByText('Bem-vindo!')).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith('accept_workspace_invitation', { p_token: 'tok-1' });
  });

  it('aceitar → grava o handoff do workspace e entra na app com recarregamento completo', async () => {
    mocks.authState.user = { id: 'user-1', email: INVITED_EMAIL };
    // The id returned by the RPC wins over the one of the loaded invitation
    mocks.acceptState.result = { success: true, workspace_id: 'workspace-rpc', role: 'edicao' };
    // Workspace list cached before the acceptance: must not survive it
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify({ userId: 'user-1' }));
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    try {
      const { unmount } = render(page());
      fireEvent.click(await screen.findByRole('button', { name: 'Aceitar Convite' }));
      expect(await screen.findByText('Bem-vindo!')).toBeInTheDocument();

      expect(sessionStorage.getItem(HANDOFF_KEY)).toBe('workspace-rpc');
      expect(localStorage.getItem(WORKSPACE_CACHE_KEY)).toBeNull();
      // Nothing happens before the 2 s are over
      expect(assign).not.toHaveBeenCalled();

      const redirect = scheduledRedirect(setTimeoutSpy);
      act(() => redirect.run());

      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith('/app');
      expect(mocks.navigate).not.toHaveBeenCalled();

      // The timer does not outlive the page
      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(redirect.timerId);
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    }
  });

  it('sem workspace_id na resposta → usa o do convite; o botão entra com recarregamento', async () => {
    mocks.authState.user = { id: 'user-1', email: INVITED_EMAIL };
    mocks.acceptState.result = { success: true };

    render(page());
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar Convite' }));
    expect(await screen.findByText('Bem-vindo!')).toBeInTheDocument();
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBe('workspace-1');

    fireEvent.click(screen.getByRole('button', { name: 'Ir para o Dashboard' }));

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/app');
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBe('workspace-1');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Ir para o Dashboard' })).not.toBeInTheDocument();
  });

  it('já é membro → o botão grava o handoff do workspace do convite e recarrega', async () => {
    mocks.authState.user = { id: 'user-1', email: INVITED_EMAIL };
    mocks.membershipQuery.maybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null });
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify({ userId: 'user-1' }));

    render(page());
    expect(await screen.findByText('Já é membro!')).toBeInTheDocument();
    // Nothing is written until the user decides to enter
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ir para o Dashboard' }));

    expect(sessionStorage.getItem(HANDOFF_KEY)).toBe('workspace-1');
    expect(localStorage.getItem(WORKSPACE_CACHE_KEY)).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/app');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('accept_workspace_invitation', expect.anything());
  });

  it('login com email diferente do convidado continua a mostrar o aviso', async () => {
    const { rerender } = render(page());
    await screen.findByRole('button', { name: 'Criar conta e aceitar' });

    await loginOnPage(rerender, 'outro@example.com');

    await waitFor(() => expect(emailMismatchToasts()).toBe(1));
    expect(invitationLoads()).toBe(2);
    // Back to the auth forms, keeping what the user typed
    expect(await screen.findByLabelText('Email')).toHaveValue('outro@example.com');
    expect(screen.queryByRole('button', { name: 'Aceitar Convite' })).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalledWith('accept_workspace_invitation', expect.anything());
  });
});
