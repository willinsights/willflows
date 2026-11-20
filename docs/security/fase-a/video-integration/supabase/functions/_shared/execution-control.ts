// Candidate-local copy of the pre-cutover protocol; no active function imports.
type Db = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
export class MaintenanceStop extends Error {}
export type ExecutionKind = 'issue' | 'process' | 'abort' | 'recover' | 'cleanup';
export async function beginExecution(db: Db, kind: ExecutionKind) {
  const id = crypto.randomUUID();
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await db.rpc(name, args);
    if (result.error || result.data !== true) throw new MaintenanceStop('VIDEO_MAINTENANCE');
  };
  await call('begin_video_execution', { p_id: id, p_kind: kind });
  let uncertain = false;
  return {
    check: () => call('check_video_execution', { p_id: id }),
    grant: (expiresAt: string) => call('record_video_grant', { p_execution: id, p_expires: expiresAt }),
    markUncertain: () => { uncertain = true; },
    finish: (ok: boolean) => call('finish_video_execution', { p_id: id, p_ok: ok && !uncertain }),
  };
}
export type Execution = Awaited<ReturnType<typeof beginExecution>>;
export async function controlled<T>(db: Db, kind: ExecutionKind, work: (execution: Execution) => Promise<T>): Promise<T> {
  const execution = await beginExecution(db, kind);
  try {
    const result = await work(execution);
    await execution.finish(true);
    return result;
  } catch (error) {
    try { await execution.finish(false); } catch { /* Preserve unfinished evidence. */ }
    throw error;
  }
}