import { describe, expect, it, vi } from 'vitest';
import { approvalData } from '../supabase/functions/get-video-approval-data/handler';

const ws = '11111111-1111-4111-8111-111111111111';
const project = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const uploader = '44444444-4444-4444-8444-444444444444';
const scope = { workspace_id: ws, project_id: project, task_id: null };
const key = [ws, project, 'project', uploader, 'review.mp4'].join('/');
const version = { ...scope, id, version_number: 1, uploaded_by: uploader, is_deleted: false,
  file_path: 'r2://' + key, r2_key: key, stream_status: 'processing' };
const comment = { ...scope, id: 'comment', parent_id: null, video_version_id: id,
  body: 'Manter o plano inicial', timestamp_seconds: 2.5 };
const approval = { ...scope, id: 'approval', video_version_id: id, notes: 'Aprovado',
  approved_at: '2026-01-01T10:00:00Z', video_version: { version_number: 1 } };
type Row = Record<string, unknown>;

function fixture(versions: Row[], failedTable?: string) {
  const rows: Record<string, Row[]> = {
    projects: [{ id: project, workspace_id: ws, name: 'Projeto de teste' }],
    video_approval_tokens: [{ ...scope, token: 'fixture-link', expires_at: null, is_active: true }],
    video_versions: versions, video_comments: [comment], video_approvals: [approval],
  };
  const sign = vi.fn(async (path: string) => ({ data: { signedUrl: 'https://example.test/' + path } }));
  function from(table: string) {
    let result = [...(rows[table] || [])];
    const finish = (data: unknown) => ({ data, error: table === failedTable ? { message: 'fixture unavailable' } : null });
    const query = {
      select: () => query, order: () => query, or: () => query,
      eq(column: string, value: unknown) { result = result.filter(row => row[column] === value); return query; },
      is(column: string, value: unknown) { return query.eq(column, value); },
      not(column: string, _operator: string, value: unknown) { result = result.filter(row => row[column] !== value); return query; },
      in(column: string, values: unknown[]) { result = result.filter(row => values.includes(row[column])); return query; },
      limit(n: number) { result = result.slice(0, n); return query; },
      single: async () => finish(result[0]), maybeSingle: async () => finish(result[0]),
      then(resolve: (value: unknown) => void) { resolve(finish(result)); },
    };
    return query;
  }
  const db = { from, rpc: async () => ({ data: true }), storage: { from: () => ({ createSignedUrl: sign }) } };
  const get = () => approvalData(new Request('https://example.test/approval?token=fixture-link'),
    () => db as unknown as ReturnType<Parameters<typeof approvalData>[1]>, {});
  return { get, sign };
}

describe('public approval link', () => {
  it.each(['processing', 'pending', 'error'])('keeps the comment and approval when Stream is %s', async stream_status => {
    const f = fixture([{ ...version, stream_status }]);
    const res = await f.get();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      versions: [{ id, version_number: 1 }], comments: [comment], approval: { notes: 'Aprovado', version_number: 1 }, signed_urls: {},
    });
    expect(f.sign).not.toHaveBeenCalled();
  });
  it('serves a ready replacement on the same link and retains the review', async () => {
    const res = await fixture([{ ...version, replacement_status: 'ready', replacement_stream_uid: 'fixture-stream' }]).get();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ comments: [comment], approval: { notes: 'Aprovado' },
      signed_urls: { [id]: 'https://videodelivery.net/fixture-stream/manifest/video.m3u8' } });
  });
  it('signs a scoped legacy file and keeps rows with an older null deletion flag', async () => {
    const file_path = ws + '/archived/video.mp4';
    const f = fixture([{ ...version, r2_key: null, is_deleted: null, file_path }]);
    const res = await f.get();
    expect(res.status).toBe(200);
    expect((await res.json()).signed_urls[id]).toBe('https://example.test/' + file_path);
    expect(f.sign).toHaveBeenCalledWith(file_path, 1800);
  });
  it('omits withdrawn versions and their activity from a public link', async () => {
    const f = fixture([{ ...version, is_deleted: true }]);
    const res = await f.get();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ versions: [], comments: [], approval: null, signed_urls: {} });
    expect(f.sign).not.toHaveBeenCalled();
  });
  it.each(['video_comments', 'video_approvals'])('reports an unavailable history when %s cannot be read', async table => {
    expect((await fixture([version], table).get()).status).toBe(500);
  });
});
