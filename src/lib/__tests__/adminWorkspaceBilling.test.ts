import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
import { manageWorkspaceBilling } from '../adminWorkspaceBilling';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden'); }));
  state.rpc.mockResolvedValue({ data: { workspace_id: 'synthetic', trial_ends_at: '2026-11-23T12:00:00Z' }, error: null });
});
describe('server-confirmed workspace billing candidates', () => {
  it('extends a legitimate trial using days/reason, not a browser-chosen date', async () => {
    const saved = await manageWorkspaceBilling('synthetic', 'extend_trial', { days: 3, reason: 'synthetic approval' });
    expect(state.rpc).toHaveBeenCalledWith('admin_manage_workspace_billing', {
      p_workspace_id: 'synthetic', p_action: 'extend_trial', p_days: 3, p_reason: 'synthetic approval',
    });
    expect(saved.trial_ends_at).toBe('2026-11-23T12:00:00Z');
  });
  it.each(['convert_trial', 'block', 'unblock'] as const)('delegates legitimate %s without client status', async action => {
    await manageWorkspaceBilling('synthetic', action, { reason: 'synthetic approval' });
    expect(state.rpc).toHaveBeenCalledWith('admin_manage_workspace_billing', {
      p_workspace_id: 'synthetic', p_action: action, p_days: null, p_reason: 'synthetic approval',
    });
  });
  it('propagates a save failure instead of confirming it', async () => {
    state.rpc.mockResolvedValue({ data: null, error: new Error('synthetic failure') });
    await expect(manageWorkspaceBilling('synthetic', 'block')).rejects.toThrow('synthetic failure');
  });
  it('requires the saved workspace to match', async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    await expect(manageWorkspaceBilling('synthetic', 'block')).rejects.toThrow('confirmar');
  });
});