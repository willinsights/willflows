import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deliveryId } from '../../../supabase/functions/_shared/automation-delivery';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const ids = { ws: '11111111-1111-4111-8111-111111111111', job: '22222222-2222-4222-8222-222222222222', project: '33333333-3333-4333-8333-333333333333', user: '44444444-4444-4444-8444-444444444444' };
let handler: (r: Request) => Promise<Response>;
let rows: Record<string, any[]>;
let sends: string[];
let failEmail: boolean;
let worker: typeof handler;
let completion: { _success: boolean } | undefined;

function client() {
  return { from(table: string) {
    const filters: ((r: any) => boolean)[] = []; let inserted: any; let single = false;
    const q: any = {
      select: () => q, eq: (k: string,v: any) => { filters.push(r => r[k] === v); return q; },
      in: (k: string,v: any[]) => { filters.push(r => v.includes(r[k])); return q; },
      order: () => q, limit: () => q,
      single: () => { single = true; return q; }, maybeSingle: () => { single = true; return q; },
      insert: (r: any) => { inserted = r; return q; },
      then(resolve: any) {
        if (inserted) { (rows[table] ??= []).push(inserted); return Promise.resolve({ data: null, error: null }).then(resolve); }
        const data = (rows[table] ?? []).filter(r => filters.every(f => f(r)));
        return Promise.resolve({ data: single ? data[0] ?? null : data, error: null }).then(resolve);
      },
    }; return q;
  } };
}

beforeEach(async () => {
  rows = {
    automation_jobs: [{ id: ids.job, workspace_id: ids.ws, event_type: 'delivered', payload: { project_id: ids.project, triggered_by: ids.user } }],
    workflow_automations: [
      { id: 'email', workspace_id: ids.ws, is_active: true, trigger_type: 'delivered', action_type: 'send_email', recipient_config: { type: 'fixed_emails', value: 'a@exemplo.invalid,b@exemplo.invalid' } },
      { id: 'notice', workspace_id: ids.ws, is_active: true, trigger_type: 'delivered', action_type: 'notify_in_app', recipient_config: { type: 'role', value: 'admin' } },
    ],
    projects: [{ id: ids.project, workspace_id: ids.ws, name: 'Projeto fictício' }],
    workspaces: [{ id: ids.ws, name: 'Estúdio fictício' }],
    profiles: [{ id: ids.user, email: 'a@exemplo.invalid', full_name: 'Pessoa fictícia' }],
    workspace_members: [{ workspace_id: ids.ws, user_id: ids.user, role: 'admin', is_active: true }],
  };
  sends = []; failEmail = false;
  vi.stubGlobal('fetch', () => { throw new Error('Network disabled'); });
  const source = readFileSync(new URL('../../../supabase/functions/execute-automations/index.ts', import.meta.url), 'utf8')
    .replace(/^import .*\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const deno = { env: { get: (key: string) => ({ SUPABASE_URL: 'http://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only', CRON_SECRET: 'fixture-only', LOVABLE_API_KEY: 'fixture-only' }[key]) }, serve: (fn: typeof handler) => { handler = fn; } };
  class EmailError extends Error { code = ''; }
  new Function('Deno', 'createClient', 'sendLovableEmail', 'EmailAPIError', 'secretEquals', 'deliveryId', js)(
    deno, client, async (p: any) => { sends.push(p.idempotency_key); if (failEmail && p.to.startsWith('b@')) throw new Error('Simulated transient failure'); },
    EmailError, (a: string,b: string) => Boolean(a && b && a === b), deliveryId,
  );
  completion = undefined;
  const workerSource = readFileSync(new URL('../../../supabase/functions/process-automation-jobs/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/gm, '');
  const workerJs = ts.transpileModule(workerSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const workerClient = () => ({
    rpc: async (name: string, args: any) => {
      if (name === 'claim_automation_jobs') return { data: rows.automation_jobs, error: null };
      completion = args; return { data: null, error: null };
    },
    functions: { invoke: async (_name: string, options: any) => {
      const response = await handler(new Request('http://fixture.invalid', { method: 'POST', headers: options.headers, body: JSON.stringify(options.body) }));
      return { data: await response.json(), error: response.ok ? null : { message: 'Simulated handler delivery failure' } };
    } },
  });
  new Function('Deno', 'createClient', 'secretEquals', workerJs)(
    { ...deno, serve: (fn: typeof worker) => { worker = fn; } }, workerClient, (a: string,b: string) => Boolean(a && b && a === b),
  );
});

async function run(job = ids.job) {
  return handler(new Request('http://fixture.invalid', { method: 'POST', headers: { 'x-cron-secret': 'fixture-only' }, body: JSON.stringify({ workspace_id: ids.ws, project_id: ids.project, triggered_by: ids.user, event_type: 'delivered', job_id: job }) }));
}

describe('Active handler, fictitious dependencies and no network', () => {
  it('processes a claimed job through the real executor and records completion', async () => {
    const response = await worker(new Request('http://fixture.invalid', { method: 'POST', headers: { 'x-cron-secret': 'fixture-only' } }));
    expect((await response.json()).succeeded).toBe(1);
    expect(completion?._success).toBe(true);
    expect(sends).toHaveLength(2); expect(rows.notifications).toHaveLength(1);
  });
  it('records retry rather than completion, then finishes without duplicate notification', async () => {
    const request = () => new Request('http://fixture.invalid', { method: 'POST', headers: { 'x-cron-secret': 'fixture-only' } });
    failEmail = true; await worker(request()); expect(completion?._success).toBe(false);
    failEmail = false; await worker(request()); expect(completion?._success).toBe(true);
    expect(sends).toHaveLength(3); expect(rows.notifications).toHaveLength(1);
  });
  it('delivers two emails and one notification then completes', async () => {
    expect((await run()).status).toBe(200);
    expect(sends).toHaveLength(2); expect(rows.notifications).toHaveLength(1);
  });
  it('retries a transient failure with the same key without duplicating completed deliveries', async () => {
    failEmail = true; expect((await run()).status).toBe(500);
    const failedKey = sends[1]; failEmail = false;
    expect((await run()).status).toBe(200);
    expect(sends).toHaveLength(3); expect(sends[2]).toBe(failedKey);
    expect(rows.notifications).toHaveLength(1);
  });
  it('keeps separate later events for the same project', async () => {
    await run();
    const other = '55555555-5555-4555-8555-555555555555';
    rows.automation_jobs.push({ ...rows.automation_jobs[0], id: other });
    await run(other);
    expect(sends).toHaveLength(4); expect(rows.notifications).toHaveLength(2);
    expect(sends[0]).not.toBe(sends[2]);
  });
  it('uses stable UTF-8 recipient identities across retries', async () => {
    const first = await deliveryId(ids.ws, ids.job, 'email', 'email', 'AÇÃO@exemplo.invalid');
    expect(await deliveryId(ids.ws, ids.job, 'email', 'email', 'ação@exemplo.invalid')).toBe(first);
    expect(await deliveryId(ids.ws, ids.job, 'email', 'in_app', 'ação@exemplo.invalid')).not.toBe(first);
  });
});