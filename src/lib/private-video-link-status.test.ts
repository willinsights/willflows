import { describe, expect, it, vi } from 'vitest';
import { sidecarRequest } from '../../supabase/functions/private-video/sidecar-handler';

const token = 'wf2_' + 'a'.repeat(64);
const post = (body: object) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const deps = (active: boolean) => ({
  rpc: vi.fn(async (_name: string, _args?: Record<string, unknown>) => ({ data: active, error: null })),
  authenticate: async () => null,
  sign: vi.fn(),
  ready: vi.fn(),
});

describe('approval link status check', () => {
  it('reports an active link as usable', async () => {
    const d = deps(true);
    const res = await sidecarRequest(post({ action: 'link-status', token }), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active: true });
    expect(d.rpc.mock.calls.some(([n, a]) => n === 'private_video_link_status' && typeof (a as { p_digest: string }).p_digest === 'string')).toBe(true);
  });
  it('reports a revoked link as unusable', async () => {
    const res = await sidecarRequest(post({ action: 'link-status', token }), deps(false));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active: false });
  });
  it('refuses a status check without a valid token', async () => {
    const d = deps(true);
    const res = await sidecarRequest(post({ action: 'link-status' }), d);
    expect(res.status).toBe(400);
    expect(d.rpc).not.toHaveBeenCalled();
  });
});
