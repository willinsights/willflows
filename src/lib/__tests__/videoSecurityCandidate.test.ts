// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as policy from '../../../supabase/functions/_shared/video-context';
import * as tickets from '../../../supabase/functions/_shared/video-upload-ticket';

const workspace = '10000000-0000-4000-8000-000000000001';
const project = '20000000-0000-4000-8000-000000000001';
const task = '30000000-0000-4000-8000-000000000001';
const user = '40000000-0000-4000-8000-000000000001';
const versionId = '50000000-0000-4000-8000-000000000001';
const context = { workspace_id: workspace, project_id: project, task_id: task };
const key = `${workspace}/${project}/${task}/${user}/1_fixture.mp4`;
const version = { ...context, id: versionId, r2_key: key, uploaded_by: user, file_name: 'fixture.mp4', file_size_bytes: 8, version_number: 1, cloudflare_stream_uid: null };
const token = { ...context, is_active: true, expires_at: null };
function database(rows: Record<string, any>, calls: any[] = []) {
  return {
    calls,
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: user } }, error: null })) },
    rpc: vi.fn(async () => ({ data: false, error: null })),
    from(table: string) {
      const call = { table, operation: 'select', value: undefined as any, filters: [] as any[] }; calls.push(call);
      const result = () => ({ data: call.operation === 'insert' ? { ...call.value, id: versionId } : rows[table], error: null });
      const query: any = {
        select() { return query; }, eq(k: string, v: any) { call.filters.push([k, v]); return query; },
        is(k: string, v: any) { call.filters.push([k, v]); return query; }, order() { return query; }, limit() { return query; },
        update(value: any) { call.operation = 'update'; call.value = value; return query; },
        insert(value: any) { call.operation = 'insert'; call.value = value; return query; },
        delete() { call.operation = 'delete'; return query; },
        maybeSingle: async () => result(), single: async () => result(),
        then(resolve: any) { return Promise.resolve(result()).then(resolve); },
      }; return query;
    },
  };
}
const rows = () => ({ projects: { id: project, workspace_id: workspace }, tasks: { id: task, workspace_id: workspace, project_id: project, title: 'Fixture' }, workspace_members: { role: 'edicao' }, workspace_storage: { storage_used_bytes: 0, storage_limit_bytes: 100, extra_storage_bytes: 0 }, video_versions: version, video_approval_tokens: token, video_comments: { ...context, id: versionId, video_version_id: versionId, is_client_comment: true, client_name: 'Fictício' }, video_approvals: null });
async function handler(name: string, db: ReturnType<typeof database>) {
  let captured: (request: Request) => Promise<Response> = async () => new Response('', { status: 500 });
  // Compile entrypoints in-memory and inject all remote dependencies. Never load remote modules.
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import .*;\s*$/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const signer = vi.fn(async (req: Request) => req);
  const objectFetch = vi.fn(async () => new Response(null, { headers: { 'content-length': '8' } }));
  class FakeAws { sign = signer; fetch = objectFetch; }
  const deno = { env: { get: () => 'fictitious-test-only' }, serve: (fn: typeof captured) => { captured = fn; } };
  const injected = { Deno: deno, serve: deno.serve, createClient: () => db, AwsClient: FakeAws, corsHeaders: {}, ...policy, ...tickets, clientIdentifier: () => 'fixture', isRateLimited: async () => false, logAttempt: async () => {}, rateLimitResponse: () => new Response('', { status: 429 }) };
  new Function(...Object.keys(injected), js)(...Object.values(injected));
  return { run: captured, signer, objectFetch };
}
const request = (body: any) => new Request('http://fixture.invalid/', { method: 'POST', headers: { Authorization: 'Bearer fictitious' }, body: JSON.stringify(body) });
const ticketInput = { ...context, user_id: user, key, file_name: 'fixture.mp4', file_size: 8, replace_version_id: null };

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden in candidate tests'); })); });
afterEach(() => vi.unstubAllGlobals());
describe('G04/S03 positive flows — fictitious dependencies, no network', () => {
  it('resolves an existing task-only approval link from its real task/project', async () => {
    expect(await policy.resolveVideoContext(database(rows()), { ...context, project_id: null })).toEqual(context);
  });
  it('preserves project-wide links for versions of tasks in the same project', async () => {
    expect(policy.tokenCoversVersion({ ...context, task_id: null }, context)).toBe(true);
    expect(policy.activeVideoToken(token)).toBe(true);
  });
  it('preserves persisted legacy task and project-only keys', () => {
    expect(policy.storedKeyMatchesVersion(`${workspace}/${task}/1_fixture.mp4`, version)).toBe(true);
    expect(policy.storedKeyMatchesVersion(`${workspace}/undefined/1_fixture.mp4`, { ...version, task_id: null })).toBe(true);
    expect(policy.storedKeyMatchesVersion(`${workspace}/null/1_fixture.mp4`, { ...version, task_id: null })).toBe(true);
  });
  it('issues and verifies a server-bound upload ticket for a legitimate editor', async () => {
    const value = await tickets.issueUploadTicket({ ...ticketInput, expires_at: Date.now() + 60000 }, 'fictitious-test-only');
    expect(await tickets.verifyUploadTicket(value, ticketInput, 'fictitious-test-only')).toMatchObject(ticketInput);
  });
  it('upload signer returns a context/uploader key and ticket', async () => {
    const db = database(rows()); const h = await handler('r2-upload-url', db);
    const response = await h.run(request({ workspaceId: workspace, projectId: project, taskId: task, fileName: 'fixture.mp4', fileSize: 8 }));
    expect(response.status).toBe(200);
    const value = await response.json();
    expect(value.key.startsWith(`${workspace}/${project}/${task}/${user}/`)).toBe(true);
    expect(await tickets.verifyUploadTicket(value.uploadTicket, { ...ticketInput, key: value.key }, 'fictitious-test-only')).toMatchObject({ user_id: user, project_id: project });
    expect(h.signer).toHaveBeenCalledOnce();
  });
  it('authenticated download signs a coherent persisted version', async () => {
    const h = await handler('video-download-url', database(rows()));
    const response = await h.run(request({ video_version_id: versionId }));
    expect(response.status).toBe(200); expect(h.signer).toHaveBeenCalledOnce();
    expect((await response.json()).file_name).toBe('fixture.mp4');
  });
  it('existing public task link downloads its version', async () => {
    const h = await handler('video-download-url', database(rows()));
    expect((await h.run(request({ video_version_id: versionId, approval_token: 'fictitious-link' }))).status).toBe(200);
    expect(h.signer).toHaveBeenCalledOnce();
  });
  it('project link feedback derives the actual task from the authorized version', async () => {
    const db = database({ ...rows(), video_approval_tokens: { ...token, task_id: null } });
    const h = await handler('submit-video-feedback', db);
    expect((await h.run(request({ type: 'comment', token: 'fictitious-link', video_version_id: versionId, client_name: 'Fictício', body: 'Comentário fictício', timestamp_seconds: 2 }))).status).toBe(201);
    expect(db.calls.find(c => c.table === 'video_comments' && c.operation === 'insert')?.value).toMatchObject(context);
  });
  it('existing task link approves its authorized version', async () => {
    const db = database(rows()); const h = await handler('submit-video-feedback', db);
    expect((await h.run(request({ type: 'approval', token: 'fictitious-link', video_version_id: versionId, client_name: 'Fictício' }))).status).toBe(201);
    expect(db.calls.find(c => c.table === 'video_approvals' && c.operation === 'insert')?.value).toMatchObject(context);
  });
  it('existing coherent client comment remains removable within its task link', async () => {
    const db = database(rows()); const h = await handler('delete-video-comment', db);
    expect((await h.run(request({ token: 'fictitious-link', comment_id: versionId, client_name: 'Fictício' }))).status).toBe(200);
    expect(db.calls.find(c => c.table === 'video_comments' && c.operation === 'delete')).toBeDefined();
  });
  it.each([false, true])('processes a legitimate upload (replacement=%s) with mocked object and Stream', async (replacement) => {
    const db = database(rows()); const h = await handler('stream-process-video', db);
    const input = { ...ticketInput, replace_version_id: replacement ? versionId : null };
    const uploadTicket = await tickets.issueUploadTicket({ ...input, expires_at: Date.now() + 60000 }, 'fictitious-test-only');
    // The provider is a local mock; every other network request still throws.
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (!url.endsWith('/stream/copy')) throw new Error('Unexpected provider request');
      return Response.json({ success: true, result: { uid: 'fixture-stream', status: { state: 'processing' } } });
    }));
    const response = await h.run(request({ workspaceId: workspace, projectId: project, taskId: task, key, fileName: 'fixture.mp4', fileSize: 8, replaceVersionId: input.replace_version_id, uploadTicket }));
    expect(response.status).toBe(200); expect((await response.json()).versionId).toBe(versionId);
    expect(h.objectFetch).toHaveBeenCalledOnce();
    expect(db.calls.find(c => c.table === 'video_versions' && c.operation === (replacement ? 'update' : 'insert'))?.value).toMatchObject({ r2_key: key, uploaded_by: user });
  });
});