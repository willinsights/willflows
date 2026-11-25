import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const state = vi.hoisted(() => ({ manage: true, error: null as null | Error, updates: vi.fn(), filters: vi.fn() }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'workspace-a' } }) }));
vi.mock('@/hooks/useFinancialPermissions', () => ({ useFinancialPermissions: () => ({ canManagePayments: state.manage, canViewAllFinancials: true }) }));
const result = { id: 'project-a', agreed_value: 48, client_payment_status: 'pago', client_paid_at: '2026-11-25T12:00:00.000Z' };
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  if (table !== 'projects') throw new Error('Must not create a duplicate payments row');
  const builder: any = {
    update: (updates: unknown) => { state.updates(updates); return builder; },
    eq: (key: string, value: unknown) => { state.filters(key, value); return builder; },
    gt: (key: string, value: unknown) => { state.filters(key, value); return builder; },
    or: (value: string) => { state.filters('or', value); return builder; },
    select: () => builder,
    single: async () => ({ data: state.error ? null : result, error: state.error }),
  };
  return builder;
} } }));
import { useClientPayment } from '../useClientPayment';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}
describe('shared client receipt', () => {
  beforeEach(() => { vi.clearAllMocks(); state.manage = true; state.error = null; });
  it('records the receipt on existing revenue without changing the €48 price or costs', async () => {
    const { result: hook } = renderHook(() => useClientPayment(), { wrapper });
    let saved;
    await act(async () => { saved = await hook.current.register({ projectId: 'project-a', paidDate: '2026-11-25' }); });
    expect(state.updates).toHaveBeenCalledWith({ client_payment_status: 'pago', client_paid_at: new Date('2026-11-25T12:00:00').toISOString() });
    expect(saved).toEqual(result);
    expect(state.filters).toHaveBeenCalledWith('workspace_id', 'workspace-a');
    expect(state.filters).toHaveBeenCalledWith('is_delivered', true);
    expect(state.filters).toHaveBeenCalledWith('agreed_value', 0);
    expect(state.filters).toHaveBeenCalledWith('or', 'client_payment_status.is.null,client_payment_status.in.(pendente,vencido,atrasado)');
  });
  it('does not write without payment management permission', async () => {
    state.manage = false;
    const { result: hook } = renderHook(() => useClientPayment(), { wrapper });
    await act(async () => { await expect(hook.current.register({ projectId: 'project-a', paidDate: '2026-11-25' })).rejects.toThrow('Sem permissão'); });
    expect(state.updates).not.toHaveBeenCalled();
  });
  it('does not report success when the server rejects or no eligible row is returned', async () => {
    state.error = new Error('No rows returned');
    const { result: hook } = renderHook(() => useClientPayment(), { wrapper });
    await act(async () => { await expect(hook.current.register({ projectId: 'project-a', paidDate: '2026-11-25' })).rejects.toThrow('No rows returned'); });
  });
});