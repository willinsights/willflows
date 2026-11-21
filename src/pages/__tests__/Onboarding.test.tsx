import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => {
  const workspaceState: {
    currentWorkspace: { id: string } | null;
    allWorkspaces: { id: string; role: string; owner_id?: string | null }[];
  } = { currentWorkspace: null, allWorkspaces: [] };
  const authState: {
    subscription:
      | { plan: string | null; status: string | null; trialEndsAt: string | null; trialStartedAt?: string | null }
      | undefined;
  } = { subscription: undefined };
  const rpc = vi.fn();
  const toast = vi.fn();
  const superAdminState = { isSuperAdmin: false };
  return { workspaceState, authState, rpc, toast, superAdminState };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'teste@example.com', user_metadata: {} },
    subscription: mocks.authState.subscription,
  }),
}));

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    refreshWorkspaces: vi.fn(),
    currentWorkspace: mocks.workspaceState.currentWorkspace,
    allWorkspaces: mocks.workspaceState.allWorkspaces,
    isAdmin: mocks.workspaceState.allWorkspaces.some(
      (w) => w.id === mocks.workspaceState.currentWorkspace?.id && w.role === 'admin',
    ),
    isWorkspaceOwner: mocks.workspaceState.allWorkspaces.some(
      (w) => w.id === mocks.workspaceState.currentWorkspace?.id && w.owner_id === 'user-1',
    ),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/hooks/useSuperAdmin', () => ({
  useSuperAdmin: () => ({ isSuperAdmin: mocks.superAdminState.isSuperAdmin, loading: false }),
}));

vi.mock('@/lib/google-ads', () => ({
  trackTrialStarted: vi.fn(),
}));

// Import page after mocks
import Onboarding from '../Onboarding';

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Onboarding />
    </MemoryRouter>,
  );

describe('Onboarding', () => {
  beforeEach(() => {
    mocks.workspaceState.currentWorkspace = null;
    mocks.workspaceState.allWorkspaces = [];
    mocks.authState.subscription = undefined;
    mocks.superAdminState.isSuperAdmin = false;
    mocks.toast.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  const withOwnWorkspace = () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-1' };
    mocks.workspaceState.allWorkspaces = [{ id: 'workspace-1', role: 'admin', owner_id: 'user-1' }];
  };

  const rejectWith = (message: string) =>
    mocks.rpc.mockResolvedValue({ data: null, error: { message } });

  it('mostra «Voltar» para a app ao criar um workspace adicional', () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-1' };
    mocks.workspaceState.allWorkspaces = [{ id: 'workspace-1', role: 'admin', owner_id: 'user-1' }];

    renderAt('/onboarding?new=true');

    expect(screen.getByRole('heading', { name: 'Criar novo workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/app');
  });

  it('não mostra «Voltar» no primeiro onboarding, sem nenhum workspace', () => {
    renderAt('/onboarding');

    expect(screen.getByRole('heading', { name: 'Bem-vindo ao WillFlow!' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('não mostra «Voltar» com ?new=true se a conta não tiver workspaces', () => {
    renderAt('/onboarding?new=true');

    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('primeiro onboarding mostra a promessa de 7 dias grátis', () => {
    renderAt('/onboarding');

    expect(screen.getByText('7 dias grátis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Começar teste grátis/ })).toBeInTheDocument();
    expect(screen.getByText('Pode fazer upgrade a qualquer momento.')).toBeInTheDocument();
  });

  it('?new=true com workspace próprio não promete um novo teste', () => {
    withOwnWorkspace();

    renderAt('/onboarding?new=true');

    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar teste grátis/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Pode fazer upgrade a qualquer momento.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar workspace/ })).toBeInTheDocument();
    expect(screen.getByText('Usa o plano da sua conta')).toBeInTheDocument();
  });

  it('?new=true com plano pago ativo indica o plano da conta', () => {
    withOwnWorkspace();
    mocks.authState.subscription = { plan: 'pro', status: 'active', trialEndsAt: null };

    renderAt('/onboarding?new=true');

    expect(screen.getByText('Usa o seu plano Pro')).toBeInTheDocument();
    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
  });

  it('?new=true com teste a decorrer indica a data em que o teste termina', () => {
    withOwnWorkspace();
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    mocks.authState.subscription = { plan: 'starter', status: 'trialing', trialEndsAt: end.toISOString() };

    renderAt('/onboarding?new=true');

    const dayMonth = end.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    expect(screen.getByText('Usa o teste em curso')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`termina a ${dayMonth}`))).toBeInTheDocument();
  });

  it('?new=true sem workspace próprio (conta sem workspaces) mantém os textos do teste', () => {
    renderAt('/onboarding?new=true');

    expect(screen.getByText('7 dias grátis')).toBeInTheDocument();
  });

  it('conta com plano pago e sem workspace próprio não promete um teste', () => {
    mocks.authState.subscription = { plan: 'studio', status: 'active', trialEndsAt: null };

    renderAt('/onboarding?new=true');

    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.getByText('Usa o seu plano Studio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar workspace/ })).toBeInTheDocument();
  });

  it('WORKSPACE_LIMIT_REACHED sem plano pago ativo pede um plano ativo', async () => {
    withOwnWorkspace();
    mocks.authState.subscription = { plan: 'starter', status: 'trialing', trialEndsAt: null };
    rejectWith('WORKSPACE_LIMIT_REACHED');

    renderAt('/onboarding?new=true');
    fireEvent.click(screen.getByRole('button', { name: /Criar workspace/ }));

    expect(
      await screen.findByText('Para criar mais workspaces é preciso um plano ativo.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/mude para um plano superior/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/app/planos');
  });

  it('convidado sem workspace próprio vê os planos na página pública', async () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-anfitriao' };
    mocks.workspaceState.allWorkspaces = [{ id: 'workspace-anfitriao', role: 'edicao' }];
    rejectWith('TRIAL_ALREADY_USED');

    renderAt('/onboarding?new=true');
    fireEvent.click(screen.getByRole('button', { name: /Começar teste grátis/ }));

    expect(await screen.findByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/planos');
  });

  it('erro WORKSPACE_LIMIT_REACHED mostra a mensagem, os planos e o regresso à aplicação', async () => {
    withOwnWorkspace();
    mocks.authState.subscription = { plan: 'pro', status: 'active', trialEndsAt: null };
    rejectWith('WORKSPACE_LIMIT_REACHED');

    renderAt('/onboarding?new=true');
    fireEvent.click(screen.getByRole('button', { name: /Criar workspace/ }));

    expect(
      await screen.findByText(/já atingiu o número de workspaces incluído no plano/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/app/planos');
    expect(screen.getByRole('link', { name: 'Voltar à aplicação' })).toHaveAttribute('href', '/app');
    expect(screen.queryByText('WORKSPACE_LIMIT_REACHED')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tentar/ })).not.toBeInTheDocument();
  });

  it('conta com o teste já usado e sem plano ativo vê logo a explicação e os planos', () => {
    mocks.authState.subscription = {
      plan: 'starter',
      status: 'trialing',
      trialStartedAt: '2026-01-01T00:00:00Z',
      trialEndsAt: '2026-01-08T00:00:00Z',
    };

    renderAt('/onboarding');

    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sem cartão de crédito/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar teste grátis/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar workspace/ })).not.toBeInTheDocument();
    expect(screen.getByText('O período de teste desta conta já foi usado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver planos/ })).toHaveAttribute('href', '/planos');
  });

  it('teste começado sem data de fim: mostra «teste usado», como o servidor decide', () => {
    mocks.authState.subscription = {
      plan: 'starter',
      status: 'trialing',
      trialStartedAt: '2026-01-01T00:00:00Z',
      trialEndsAt: null,
    };

    renderAt('/onboarding');

    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar teste grátis/ })).not.toBeInTheDocument();
    expect(screen.getByText('O período de teste desta conta já foi usado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver planos/ })).toHaveAttribute('href', '/planos');
  });

  it('super admin com o teste usado mantém o botão de criar, sem «Ver planos»', () => {
    mocks.superAdminState.isSuperAdmin = true;
    mocks.authState.subscription = {
      plan: 'starter',
      status: 'expired',
      trialStartedAt: '2026-01-01T00:00:00Z',
      trialEndsAt: '2026-01-08T00:00:00Z',
    };

    renderAt('/onboarding');

    expect(screen.getByRole('button', { name: /Criar workspace/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver planos/ })).not.toBeInTheDocument();
    expect(screen.queryByText('O período de teste desta conta já foi usado')).not.toBeInTheDocument();
    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
  });

  it('teste em curso sem workspace próprio: mostra quando termina e não promete 7 dias', async () => {
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    mocks.authState.subscription = {
      plan: 'starter',
      status: 'trialing',
      trialStartedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: end.toISOString(),
    };

    renderAt('/onboarding');

    const fullDate = end.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
    expect(screen.getByText(`O seu período de teste termina a ${fullDate}.`)).toBeInTheDocument();
    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sem cartão de crédito/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar teste grátis/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Criar workspace/ }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('7 dias de teste ativados!')).not.toBeInTheDocument();
    const shown = JSON.stringify(mocks.toast.mock.calls[0][0]);
    expect(shown).not.toMatch(/7 dias/);
    expect(shown).toMatch(/período de teste em curso/);
  });

  it('teste já usado mas com plano ativo: usa o plano da conta e pode criar o workspace', () => {
    mocks.authState.subscription = {
      plan: 'pro',
      status: 'active',
      trialStartedAt: '2026-01-01T00:00:00Z',
      trialEndsAt: '2026-01-08T00:00:00Z',
    };

    renderAt('/onboarding');

    expect(screen.queryByText('O período de teste desta conta já foi usado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar workspace/ })).toBeInTheDocument();
  });

  it('administrador que não é dono mantém a oferta do teste ao criar o seu workspace', () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-anfitriao' };
    mocks.workspaceState.allWorkspaces = [
      { id: 'workspace-anfitriao', owner_id: 'outro-utilizador', role: 'admin' as string },
    ];

    renderAt('/onboarding?new=true');

    expect(screen.getByText('7 dias grátis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Começar teste grátis/ })).toBeInTheDocument();
  });

  it('erro TRIAL_ALREADY_USED sem workspace mostra a mensagem e a página pública de planos', async () => {
    rejectWith('P0001: TRIAL_ALREADY_USED');

    renderAt('/onboarding');
    fireEvent.click(screen.getByRole('button', { name: /Começar teste grátis/ }));

    expect(
      await screen.findByText(/O período de teste desta conta já foi usado/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/planos');
    expect(screen.queryByRole('link', { name: 'Voltar à aplicação' })).not.toBeInTheDocument();
  });

  it('outros erros continuam a mostrar a mensagem genérica com «Tentar»', async () => {
    rejectWith('Falha inesperada');

    renderAt('/onboarding');
    fireEvent.click(screen.getByRole('button', { name: /Começar teste grátis/ }));

    expect(await screen.findByText('Falha inesperada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver planos' })).not.toBeInTheDocument();
  });
});
