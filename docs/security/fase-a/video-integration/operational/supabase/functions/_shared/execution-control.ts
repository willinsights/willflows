type Db = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
export class MaintenanceStop extends Error {}
export async function beginExecution(db: Db, kind: 'issue' | 'process' | 'cleanup') {
  const id = crypto.randomUUID();
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await db.rpc(name, args);
    if (result.error || result.data !== true) throw new MaintenanceStop('VIDEO_MAINTENANCE');
  };
  await call('begin_video_execution', { p_id: id, p_kind: kind });
  let uncertain = false;
  return {
    id,
    check: () => call('check_video_execution', { p_id: id }),
    grant: (expiresAt: string) => call('record_video_grant', { p_execution: id, p_expires: expiresAt }),
    markUncertain: () => { uncertain = true; },
    finish: (ok: boolean) => call('finish_video_execution', { p_id: id, p_ok: ok && !uncertain }),
  };
}
// Runs only after existing auth/context validation. Paused cleanup performs zero effects.
export async function controlled<T>(db: Db, kind: 'issue' | 'process' | 'cleanup', work: (lease: Awaited<ReturnType<typeof beginExecution>>) => Promise<T>): Promise<T> {
  const lease = await beginExecution(db, kind);
  try {
    const result = await work(lease);
    await lease.finish(true);
    return result;
  } catch (error) {
    try { await lease.finish(false); } catch { /* Unfinished reservation remains visible; never infer a drain. */ }
    throw error;
  }
}