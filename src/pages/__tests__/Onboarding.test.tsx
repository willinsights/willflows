import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => {
  const workspaceState: {
    currentWorkspace: { id: string } | null;
    allWorkspaces: { id: string; role: string }[];
  } = { currentWorkspace: null, allWorkspaces: [] };
  const authState: {
    subscription: { plan: string | null; status: string | null; trialEndsAt: string | null } | undefined;
  } = { subscription: undefined };
  const rpc = vi.fn();
  return { workspaceState, authState, rpc };
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
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  const withOwnWorkspace = () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-1' };
    mocks.workspaceState.allWorkspaces = [{ id: 'workspace-1', role: 'admin' }];
  };

  const rejectWith = (message: string) =>
    mocks.rpc.mockResolvedValue({ data: null, error: { message } });

  it('mostra «Voltar» para a app ao criar um workspace adicional', () => {
    mocks.workspaceState.currentWorkspace = { id: 'workspace-1' };
    mocks.workspaceState.allWorkspaces = [{ id: 'workspace-1', role: 'admin' }];

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
    expect(screen.getByRole('button', { name: /Começar trial grátis/ })).toBeInTheDocument();
    expect(screen.getByText('Pode fazer upgrade a qualquer momento.')).toBeInTheDocument();
  });

  it('?new=true com workspace próprio não promete um novo teste', () => {
    withOwnWorkspace();

    renderAt('/onboarding?new=true');

    expect(screen.queryByText('7 dias grátis')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar trial grátis/ })).not.toBeInTheDocument();
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

  it('erro WORKSPACE_LIMIT_REACHED mostra a mensagem, os planos e o regresso à aplicação', async () => {
    withOwnWorkspace();
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

  it('erro TRIAL_ALREADY_USED sem workspace mostra a mensagem e a página pública de planos', async () => {
    rejectWith('P0001: TRIAL_ALREADY_USED');

    renderAt('/onboarding');
    fireEvent.click(screen.getByRole('button', { name: /Começar trial grátis/ }));

    expect(
      await screen.findByText(/O período de teste desta conta já foi usado/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/planos');
    expect(screen.queryByRole('link', { name: 'Voltar à aplicação' })).not.toBeInTheDocument();
  });

  it('outros erros continuam a mostrar a mensagem genérica com «Tentar»', async () => {
    rejectWith('Falha inesperada');

    renderAt('/onboarding');
    fireEvent.click(screen.getByRole('button', { name: /Começar trial grátis/ }));

    expect(await screen.findByText('Falha inesperada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver planos' })).not.toBeInTheDocument();
  });
});
