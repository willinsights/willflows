import { uploadIssuanceOpen } from '../supabase/functions/_shared/upload-barrier.ts';
const assert = (ok: boolean) => { if (!ok) throw new Error('barrier assertion failed'); };
Deno.test('explicit server-open state admits issuance', async () => {
  assert(await uploadIssuanceOpen({ rpc: async () => ({ data: true, error: null }) }));
});
Deno.test('closed state blocks new issuance', async () => {
  assert(!await uploadIssuanceOpen({ rpc: async () => ({ data: false, error: null }) }));
});
Deno.test('missing barrier never permits issuance', async () => {
  assert(!await uploadIssuanceOpen({ rpc: async () => ({ data: null, error: null }) }));
});
Deno.test('failed barrier query blocks issuance', async () => {
  assert(!await uploadIssuanceOpen({ rpc: async () => ({ data: true, error: 'unavailable' }) }));
});
Deno.test('unavailable backend blocks issuance', async () => {
  assert(!await uploadIssuanceOpen({ rpc: async () => { throw new Error('offline'); } }));
});