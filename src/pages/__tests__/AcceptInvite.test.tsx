import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

const INVITED_EMAIL = 'convidado@example.com';

// Shared state between the mocks: who is signed in decides what the RPC returns,
// mirroring get_invitation_by_token (full email only for the signed-in invitee).
const mocks = vi.hoisted(() => {
  const authState: { user: { id: string; email: string } | null; loading: boolean } = {
    user: null,
    loading: false,
  };
  const invitedEmail = 'convidado@example.com';

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
      return Promise.resolve({ data: { success: true }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const membershipQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  membershipQuery.select.mockReturnValue(membershipQuery);
  membershipQuery.eq.mockReturnValue(membershipQuery);

  const signInWithPassword = vi.fn(({ email }: { email: string; password: string }) => {
    authState.user = { id: `user-${email}`, email };
    return Promise.resolve({ data: {}, error: null });
  });

  const toast = vi.fn();

  return { authState, rpc, membershipQuery, signInWithPassword, toast };
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

describe('AcceptInvite', () => {
  beforeEach(() => {
    mocks.authState.user = null;
    mocks.authState.loading = false;
    mocks.rpc.mockClear();
    mocks.signInWithPassword.mockClear();
    mocks.toast.mockClear();
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
