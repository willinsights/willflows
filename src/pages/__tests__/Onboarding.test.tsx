import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => {
  const workspaceState: {
    currentWorkspace: { id: string } | null;
    allWorkspaces: { id: string; role: string }[];
  } = { currentWorkspace: null, allWorkspaces: [] };
  return { workspaceState };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(() => Promise.resolve({ data: null, error: null })) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'teste@example.com', user_metadata: {} } }),
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
  });

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
});
