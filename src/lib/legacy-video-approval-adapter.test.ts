import { beforeEach, describe, expect, it, vi } from 'vitest';
import { legacyVideoApprovalRequest } from './legacy-video-approval-adapter';
import { loadReviewCommentKeys, reviewCommentKeyHash } from './review-comment-keys';

const version = (id: string, name = 'hotel.mp4') => ({ id, file_name: name, created_at: '2026-11-20T10:00:00Z', duration_seconds: 20 });
const data = () => ({
  branding: { name: 'In-Sights', logo_url: null },
  task: { title: 'Hotel Savoy', project_name: 'Savoy' },
  versions: [version('v2', 'hotel-v2.mp4'), version('v1', 'hotel-v1.mp4')],
  comments: [
    { id: 'root', video_version_id: 'v1', timestamp_seconds: 6, body: 'Ajustar', status: 'resolved', is_client_comment: true, client_name: 'Cliente', parent_id: null, resolved_at: '2026-11-21T10:00:00Z', created_at: '2026-11-20T11:00:00Z' },
    { id: 'reply', video_version_id: 'v1', timestamp_seconds: 0, body: 'Feito', status: 'open', is_client_comment: false, client_name: null, parent_id: 'root', resolved_at: null, created_at: '2026-11-20T12:00:00Z' },
  ],
  approval: null,
  signed_urls: { v1: 'https://videodelivery.net/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/manifest/video.m3u8', v2: 'https://videodelivery.net/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/manifest/video.m3u8' },
});

function mockData(payload = data()) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('legacy Review Studio adapter', () => {
  it('keeps all legacy versions in one deliverable and uses the existing task identity', async () => {
    mockData();
    const result = await legacyVideoApprovalRequest({ action: 'list', token: 'old-token' });
    expect(result.versions.map(item => item.label)).toEqual(['Hotel Savoy', 'Hotel Savoy']);
    expect(result.versions.map(item => item.id)).toEqual(['v2', 'v1']);
  });

  it('maps playback, team replies and resolved history into the canonical review', async () => {
    mockData();
    const result = await legacyVideoApprovalRequest({ action: 'read', token: 'old-token', versionId: 'v1' });
    expect(result.playback.url).toContain('video.m3u8');
    expect(result.playback.thumbnail).toContain('time=10s');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0]).toMatchObject({ id: 'root', resolved_at: '2026-11-21T10:00:00Z' });
    expect(result.comments[1]).toMatchObject({ id: 'reply', parent_id: 'root', from_team: true, client_name: 'Equipa' });
  });

  it('marks the approved version and locks sibling versions like the new studio', async () => {
    const payload = { ...data(), approval: { approved_at: '2026-11-22T10:00:00Z', client_name: 'Cliente', notes: 'OK', video_version_id: 'v1' } };
    mockData(payload);
    const approved = await legacyVideoApprovalRequest({ action: 'read', token: 'old-token', versionId: 'v1' });
    const sibling = await legacyVideoApprovalRequest({ action: 'read', token: 'old-token', versionId: 'v2' });
    expect(approved.approval).toMatchObject({ client_name: 'Cliente', notes: 'OK' });
    expect(approved.group_approval).toBeNull();
    expect(sibling.approval).toBeNull();
    expect(sibling.group_approval).toMatchObject({ version_id: 'v1', name: 'Cliente' });
  });

  it('stores a new comment secret and exposes edit capability only in this browser', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ comment: { id: 'new-comment' }, delete_key: 'secret-key' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...data(), comments: [{ ...data().comments[0], id: 'new-comment', status: 'open', resolved_at: null }] }), { status: 200 }));
    await legacyVideoApprovalRequest({ action: 'comment', token: 'old-token', versionId: 'v1', requestId: 'request-id', name: 'Cliente', body: 'Novo', timestamp: 4 });
    expect(JSON.parse(localStorage.getItem('willflow_comment_delete_keys')!)).toEqual({ 'new-comment': 'secret-key' });
    const result = await legacyVideoApprovalRequest({ action: 'read', token: 'old-token', versionId: 'v1' });
    const key = await reviewCommentKeyHash('secret-key');
    expect(result.comments[0].key).toBe(key);
    expect(loadReviewCommentKeys()[key]).toBe('secret-key');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends the secret and exact comment identity for edit and delete', async () => {
    localStorage.setItem('willflow_comment_delete_keys', JSON.stringify({ root: 'secret-key' }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await legacyVideoApprovalRequest({ action: 'comment-edit', token: 'old-token', versionId: 'v1', commentId: 'root', requestId: 'secret-key', clientName: 'Cliente', body: 'Corrigido' });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ operation: 'edit', comment_id: 'root', delete_key: 'secret-key', client_name: 'Cliente', body: 'Corrigido' });
    await legacyVideoApprovalRequest({ action: 'comment-delete', token: 'old-token', versionId: 'v1', commentId: 'root', requestId: 'secret-key', clientName: 'Cliente' });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ operation: 'delete', comment_id: 'root', delete_key: 'secret-key' });
    expect(JSON.parse(localStorage.getItem('willflow_comment_delete_keys')!)).toEqual({});
  });

  it('never sends a private capability to the legacy backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(legacyVideoApprovalRequest({ action: 'list', token: 'wf2_' + 'a'.repeat(64) })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
