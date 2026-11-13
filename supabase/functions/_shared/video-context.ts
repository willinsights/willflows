// Shared server-only policy. No providers, network or client storage dependencies.
export interface VideoContext { workspace_id: string; project_id: string | null; task_id: string | null }
export interface VideoVersionContext extends VideoContext { id?: string; r2_key?: string | null; uploaded_by?: string | null }
type QueryResult = { data: any; error: unknown };
export interface VideoDatabase { from(table: string): any }

export class VideoContextError extends Error {}
const deny = (): never => { throw new VideoContextError('Contexto de vídeo inválido ou não autorizado'); };
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Old task-only links are resolved from the actual task, never from client claims.
export async function resolveVideoContext(db: VideoDatabase, input: VideoContext): Promise<VideoContext & { project_id: string }> {
  if (!isUuid(input.workspace_id) || (input.task_id !== null && !isUuid(input.task_id)) || (input.project_id !== null && !isUuid(input.project_id))) deny();
  let projectId = input.project_id;
  if (input.task_id) {
    const { data: task, error }: QueryResult = await db.from('tasks').select('id,workspace_id,project_id').eq('id', input.task_id).maybeSingle();
    if (error || !task || task.workspace_id !== input.workspace_id || !isUuid(task.project_id) || (projectId && task.project_id !== projectId)) deny();
    projectId = task.project_id;
  }
  if (!isUuid(projectId)) return deny();
  const { data: project, error }: QueryResult = await db.from('projects').select('id,workspace_id').eq('id', projectId).maybeSingle();
  if (error || !project || project.workspace_id !== input.workspace_id) deny();
  return { workspace_id: input.workspace_id, project_id: projectId, task_id: input.task_id };
}

export function sameVideoContext(a: VideoContext, b: VideoContext): boolean {
  return a.workspace_id === b.workspace_id && a.project_id === b.project_id && a.task_id === b.task_id;
}
export function tokenCoversVersion(token: VideoContext, version: VideoContext): boolean {
  return !!token.project_id && token.workspace_id === version.workspace_id && token.project_id === version.project_id && (!token.task_id || token.task_id === version.task_id);
}
export function activeVideoToken(token: { is_active: boolean; expires_at: string | null }, now = Date.now()): boolean {
  return token.is_active === true && (token.expires_at === null || (Number.isFinite(Date.parse(token.expires_at)) && Date.parse(token.expires_at) > now));
}

export function safeObjectKey(key: unknown): key is string {
  return typeof key === 'string' && key.length <= 1024 && key.split('/').every(part => !!part && part !== '.' && part !== '..') && !/[\\%?#\s\u0000-\u001f]/.test(key);
}
// New keys encode context + uploader; old keys remain readable only through a coherent persisted version.
export function storedKeyMatchesVersion(key: unknown, version: VideoVersionContext): boolean {
  if (!safeObjectKey(key)) return false;
  const parts = key.split('/');
  if (parts[0] !== version.workspace_id) return false;
  if (parts.length === 5) return parts[1] === version.project_id && parts[2] === (version.task_id || 'project') && parts[3] === version.uploaded_by;
  if (parts.length === 3) return version.task_id ? parts[1] === version.task_id : ['undefined', 'null', version.project_id].includes(parts[1]);
  return false;
}

export function validateUploadFile(fileName: unknown, fileSize: unknown): void {
  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255 || /[\/\\\u0000-\u001f]/.test(fileName) || typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize <= 0) deny();
}

export async function requireScopedVersion(db: VideoDatabase, id: string, scope: VideoContext): Promise<VideoVersionContext> {
  if (!isUuid(id)) deny();
  const { data: version, error }: QueryResult = await db.from('video_versions').select('id,workspace_id,project_id,task_id,r2_key,uploaded_by').eq('id', id).maybeSingle();
  if (error || !version) deny();
  const context = await resolveVideoContext(db, version);
  if (!tokenCoversVersion(scope, context)) deny();
  return { ...version, ...context };
}