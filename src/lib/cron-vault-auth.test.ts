import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { cronTokenDigest, isVaultCronRequest } from '../../supabase/functions/_shared/cron-vault-auth.ts';

// Fictitious token only.
const TOKEN = 'wfcron_' + 'ab'.repeat(32);
const DIGEST = createHash('sha256').update(TOKEN).digest('hex');
const req = (auth?: string) => new Request('https://example.test/fn', { method: 'POST', headers: auth ? { authorization: auth } : {} });

describe('A1 — credencial dos jobs agendados no Vault', () => {
  it('só aceita o formato wfcron_ com 64 hex', () => {
    expect(cronTokenDigest(`Bearer ${TOKEN}`)).toBe(DIGEST);
    expect(cronTokenDigest('Bearer wfcron_123')).toBeNull();
    expect(cronTokenDigest(`Bearer ${TOKEN} extra`)).toBeNull();
    expect(cronTokenDigest(null)).toBeNull();
  });
  it('confirma o digest na base e nunca envia o token', async () => {
    const rpc = vi.fn(async (_n: string, a: Record<string, unknown>) => ({ data: a.p_digest === DIGEST, error: null }));
    expect(await isVaultCronRequest(req(`Bearer ${TOKEN}`), rpc)).toBe(true);
    expect(rpc.mock.calls[0][1]).toEqual({ p_digest: DIGEST });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(TOKEN);
  });
  it('recusa token desconhecido, erro da base ou ausência', async () => {
    const no = vi.fn(async () => ({ data: false, error: null }));
    const err = vi.fn(async () => ({ data: null, error: new Error('down') }));
    const thrown = vi.fn(async () => { throw new Error('down'); });
    expect(await isVaultCronRequest(req(`Bearer ${TOKEN}`), no)).toBe(false);
    expect(await isVaultCronRequest(req(`Bearer ${TOKEN}`), err)).toBe(false);
    expect(await isVaultCronRequest(req(`Bearer ${TOKEN}`), thrown)).toBe(false);
    expect(await isVaultCronRequest(req(), no)).toBe(false);
    expect(no).toHaveBeenCalledTimes(1); // sem token não consulta a base
  });
});
