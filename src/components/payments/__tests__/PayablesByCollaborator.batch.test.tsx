import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayablesByCollaborator } from '../PayablesByCollaborator';
import { HideValuesProvider } from '@/contexts/HideValuesContext';

// Fictitious data only.
const state = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'ws-demo' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-demo' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => state.rpc(...a),
    storage: { from: () => ({ upload: state.upload, remove: state.remove }) },
  },
}));

const props = {
  teamPayments: [
    { id: 't1', project_id: 'p1', user_id: 'u1', payment_amount: 100, payment_status: 'pendente' },
    { id: 't2', project_id: 'p1', user_id: 'u1', payment_amount: 250, payment_status: 'pendente' },
  ] as never,
  projects: [{ id: 'p1', name: 'Projeto Demo', project_code: 'DEMO', delivered_at: '2026-10-10T00:00:00Z', is_delivered: true }],
  members: [{ user_id: 'u1', full_name: 'Colaborador Demo' }],
  onStatusChange: vi.fn(),
  formatCurrency: (n: number) => `${n} €`,
};
const renderIt = () => render(<QueryClientProvider client={new QueryClient()}><HideValuesProvider><PayablesByCollaborator {...props} /></HideValuesProvider></QueryClientProvider>);

describe('D3 — pagamento em lote atómico no ecrã', () => {
  beforeEach(() => { state.rpc.mockReset(); state.toast.mockReset(); props.onStatusChange.mockReset(); });

  it('chama uma só RPC com o total mostrado e nunca paga item a item', async () => {
    state.rpc.mockResolvedValue({ data: { paid: 2 }, error: null });
    renderIt();
    for (const cb of screen.getAllByRole('checkbox')) fireEvent.click(cb);
    fireEvent.click(screen.getByRole('button', { name: /Marcar pagos/ }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledTimes(1));
    const [fn, args] = state.rpc.mock.calls[0];
    expect(fn).toBe('pay_team_batch');
    expect(args).toMatchObject({ p_workspace_id: 'ws-demo', p_expected_total: 350 });
    expect(props.onStatusChange).not.toHaveBeenCalled();
  });

  it('em erro não anuncia pagamentos', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'BATCH_TOTAL_CHANGED' } });
    renderIt();
    for (const cb of screen.getAllByRole('checkbox')) fireEvent.click(cb);
    fireEvent.click(screen.getByRole('button', { name: /Marcar pagos/ }));
    await waitFor(() => expect(state.toast).toHaveBeenCalled());
    expect(state.toast.mock.calls[0][0].title).toBe('Nenhum pagamento foi registado');
  });
});
