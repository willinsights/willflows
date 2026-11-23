// Private (wf2_) retention worker. Effects only when the server switch
// willflow_video_private.retention_settings.enabled is true (off by default).
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
export type Providers = {
  deleteR2: (key: string) => Promise<void>;
  /** Must resolve for 2xx and 404 (already gone); reject otherwise. */
  deleteStream: (uid: string) => Promise<void>;
};
type Pending = { provider: 'r2' | 'stream'; key: string; version_id: string };

export async function runPrivateRetention(rpc: Rpc, providers: Providers, limit = 100) {
  const withdrawn = await rpc('private_video_retention_withdraw', { p_limit: limit });
  if (withdrawn.error) throw withdrawn.error;
  const pending = await rpc('private_video_retention_pending', { p_limit: limit });
  if (pending.error) throw pending.error;
  let deleted = 0, failed = 0;
  for (const item of (pending.data ?? []) as Pending[]) {
    let ok = true, message: string | null = null;
    try {
      if (item.provider === 'r2') await providers.deleteR2(item.key);
      else if (item.provider === 'stream') await providers.deleteStream(item.key);
      else throw new Error('unknown provider');
    } catch (e) {
      ok = false; message = e instanceof Error ? e.message : String(e);
    }
    // Only a confirmed provider deletion is recorded as deleted; failures retry next run.
    const result = await rpc('private_video_retention_result', { p_provider: item.provider, p_key: item.key, p_ok: ok, p_error: message });
    if (result.error) throw result.error;
    if (ok) deleted++; else failed++;
  }
  return { withdrawn: Number(withdrawn.data ?? 0), deleted, failed };
}
