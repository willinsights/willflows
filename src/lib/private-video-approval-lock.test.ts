import { describe, expect, it, vi } from 'vitest';
import { sidecarRequest } from '../../supabase/functions/private-video/sidecar-handler';

const version = '11111111-1111-4111-8111-111111111111';
const request = '22222222-2222-4222-8222-222222222222';
const token = 'wf2_' + 'a'.repeat(64);
function deps(approved: boolean, sibling = false) {
  const rpc = vi.fn(async (name: string) => name === 'private_video_sibling_approval' ? { data: sibling ? { version_id: 'x' } : null, error: null } : name === 'private_video_read'
    ? { data: { version: { id: version, workspace_id: 'w' }, comments: [], approval: approved ? { name: 'Cliente' } : null }, error: null }
    : { data: true, error: null });
  return { rpc, authenticate: async () => null, sign: vi.fn(), ready: vi.fn() };
}
const post = (body: object) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('approval closes comments on that version', () => {
  it('rejects a client comment after approval without saving it', async () => {
    const d = deps(true);
    const res = await sidecarRequest(post({ action: 'comment', token, versionId: version, requestId: request, name: 'Ana', body: 'mais', timestamp: 3 }), d);
    expect(res.status).toBe(409);
    expect(d.rpc.mock.calls.some(([n]) => n === 'private_video_feedback')).toBe(false);
  });
  it('accepts a client comment before approval', async () => {
    const d = deps(false);
    const res = await sidecarRequest(post({ action: 'comment', token, versionId: version, requestId: request, name: 'Ana', body: 'mais', timestamp: 3 }), d);
    expect(res.status).toBe(201);
  });
  it('rejects a comment when another version of the same video is approved', async () => {
    const d = deps(false, true);
    const res = await sidecarRequest(post({ action: 'comment', token, versionId: version, requestId: request, name: 'Ana', body: 'mais', timestamp: 3 }), d);
    expect(res.status).toBe(409);
    expect(d.rpc.mock.calls.some(([n]) => n === 'private_video_feedback')).toBe(false);
  });
  it('rejects editing an old comment when another version of the same video is approved', async () => {
    const d = deps(false, true);
    const res = await sidecarRequest(post({ action: 'comment-edit', token, versionId: version, requestId: request, body: 'novo' }), d);
    expect(res.status).toBe(409);
    expect(d.rpc.mock.calls.some(([n]) => n === 'private_video_comment_manage')).toBe(false);
  });
});
