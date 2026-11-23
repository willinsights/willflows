import { describe, expect, it, vi } from 'vitest';
import { runPrivateRetention } from './worker';

// Fictitious keys and fake providers only — no network.
const pending = [
  { provider: 'r2', key: 'ws-demo/obj-1.mp4', version_id: 'v1' },
  { provider: 'stream', key: 'uid-demo-1', version_id: 'v1' },
  { provider: 'r2', key: 'ws-demo/obj-2.mp4', version_id: 'v2' },
];

function fakeRpc(opts: { pending?: unknown[]; withdrawError?: unknown } = {}) {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    calls.push([name, args]);
    if (name === 'private_video_retention_withdraw') return { data: opts.withdrawError ? null : 2, error: opts.withdrawError ?? null };
    if (name === 'private_video_retention_pending') return { data: opts.pending ?? pending, error: null };
    return { data: true, error: null };
  });
  return { rpc, calls };
}

describe('retenção privada (candidato)', () => {
  it('apaga no fornecedor e só confirma o que foi apagado', async () => {
    const { rpc, calls } = fakeRpc();
    const deleteR2 = vi.fn(async (k: string) => { if (k.endsWith('obj-2.mp4')) throw new Error('R2 500'); });
    const deleteStream = vi.fn(async () => {});
    const r = await runPrivateRetention(rpc, { deleteR2, deleteStream });
    expect(r).toEqual({ withdrawn: 2, deleted: 2, failed: 1 });
    const results = calls.filter(([n]) => n === 'private_video_retention_result').map(([, a]) => [a.p_key, a.p_ok]);
    expect(results).toEqual([['ws-demo/obj-1.mp4', true], ['uid-demo-1', true], ['ws-demo/obj-2.mp4', false]]);
  });

  it('se a retirada falha, não apaga nada', async () => {
    const { rpc } = fakeRpc({ withdrawError: new Error('Forbidden') });
    const deleteR2 = vi.fn();
    await expect(runPrivateRetention(rpc, { deleteR2, deleteStream: vi.fn() })).rejects.toThrow('Forbidden');
    expect(deleteR2).not.toHaveBeenCalled();
  });

  it('interruptor desligado: lista vazia, zero eliminações', async () => {
    const { rpc } = fakeRpc({ pending: [] });
    const deleteR2 = vi.fn();
    const r = await runPrivateRetention(rpc, { deleteR2, deleteStream: vi.fn() });
    expect(r.deleted).toBe(0);
    expect(deleteR2).not.toHaveBeenCalled();
  });
});
